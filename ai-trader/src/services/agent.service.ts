import { ethers } from 'ethers';
import { OpenAIService } from './openai.service';
import { PoolService } from './pool.service';
import { HistoryService } from './history.service';
import { GelatoRelay } from '@gelatonetwork/relay-sdk';
import type { SponsoredCallRequest } from '@gelatonetwork/relay-sdk';
import type { TradeAction, AgentInfo } from '../types';

export class AgentService {
  private readonly openai: OpenAIService;
  private readonly pool: PoolService;
  private readonly history: HistoryService;
  private readonly provider: ethers.Provider;
  private readonly agentContract: ethers.Contract;
  private readonly relay: GelatoRelay;
  private readonly sponsorKey: string;
  private readonly usdcAddress: string = '0x5b4Df904F6DDb52fa6c92a8e175d44B89bEec30b'; // USDC address from deployments.json

  constructor(
    openaiApiKey: string,
    sponsorKey: string,
    provider: ethers.Provider,
    agentAddress: string,
    agentAbi: ethers.InterfaceAbi,
    historyService: HistoryService
  ) {
    this.provider = provider;
    this.sponsorKey = sponsorKey;
    this.agentContract = new ethers.Contract(agentAddress, agentAbi, provider);
    this.history = historyService;
    this.relay = new GelatoRelay();
    this.pool = new PoolService('http://localhost:3000');
    this.openai = new OpenAIService(openaiApiKey, this.usdcAddress);
  }

  async startTrading(): Promise<void> {
    while (true) {
      try {
        // Get current pool data and agent info
        const pools = await this.pool.getPoolReserves();
        const agentInfo = await this.getAgentInfo();

        console.log('Current agent balances:', {
          usdc: agentInfo.balances.usdc.formatted,
          tokens: agentInfo.balances.tokens.map(t => `${t.symbol}: ${t.formatted}`),
          liquidityPools: agentInfo.balances.liquidityPools.map(lp => `${lp.symbol}: ${lp.formatted}`)
        });

        // Get trade action from OpenAI
        const action = await this.openai.getTradeAction(pools, agentInfo);

        // If no action is needed or USDC balance is 0, wait for next check
        if (action.type === 'none' || agentInfo.balances.usdc.formatted === 0) {
          console.log(`No action needed: ${action.reason}`);
          console.log('TEST MODE: Waiting for 5 seconds before next market check...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        // Execute the trade
        console.log('Executing strategy:', agentInfo.configuration.tradeStrategy, 'with risk level:', agentInfo.configuration.riskLevel);
        const taskId = await this.executeTransaction(action);
        console.log('Transaction submitted to ABC Testnet. Task ID:', taskId);

        // Wait for transaction confirmation
        const taskInfo = await this.waitForRelay(taskId);
        
        // Record trade history
        await this.history.recordTrade(action, taskInfo);
        console.log('Trade history recorded');

        // Wait before next market check
        console.log('TEST MODE: Waiting for 5 seconds before next market check...');
        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (error) {
        console.error('Error in trading loop:', error);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async waitForRelay(taskId: string): Promise<any> {
    let retries = 0;
    const maxRetries = 10;
    
    while (retries < maxRetries) {
      try {
        const status = await this.relay.getTaskStatus(taskId);
        if (!status) {
          console.log(`No status yet for task ${taskId}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          retries++;
          continue;
        }

        console.log(`Task ${taskId} status: ${status.taskState}`);

        if (status.taskState === 'ExecSuccess') {
          return status;
        } else if (status.taskState === 'ExecReverted') {
          throw new Error(`Transaction reverted: ${status.taskState}`);
        } else if (status.taskState === 'Cancelled') {
          throw new Error(`Transaction cancelled: ${status.taskState}`);
        } 
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        retries++;
      } catch (error) {
        console.error(`Error checking relay status (attempt ${retries + 1}/${maxRetries}):`, error);
        await new Promise(resolve => setTimeout(resolve, 5000));
        retries++;
      }
    }
    
    throw new Error(`Transaction timed out after ${maxRetries} attempts`);
  }

  private async executeTransaction(
    action: TradeAction
  ): Promise<string> {
    try {
      let functionData: string;

      // Get network information
      const network = await this.provider.getNetwork();
      if (network.chainId !== BigInt(112)) {
        throw new Error(`Invalid network. Expected ABC Testnet (Chain ID: 112), got Chain ID: ${network.chainId}`);
      }

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

      switch (action.type) {
        case 'swap':
          if (!action.tokenA || !action.tokenB) {
            throw new Error('Missing token addresses for swap');
          }
          // Check if USDC is the input token
          const isUsdcIn = action.tokenA.toLowerCase() === this.usdcAddress.toLowerCase();
          functionData = this.agentContract.interface.encodeFunctionData(
            'executeSwap',
            [
              isUsdcIn ? action.tokenB : action.tokenA, // token address
              action.amountA,           // amountIn
              action.amountB || '0',    // minAmountOut
              isUsdcIn                  // isUsdcIn
            ]
          );
          break;

        case 'addLiquidity':
          if (!action.tokenA || !action.tokenB) {
            throw new Error('Missing token addresses for liquidity');
          }
          const tokenForLiquidity = action.tokenA.toLowerCase() === this.usdcAddress.toLowerCase() 
            ? action.tokenB 
            : action.tokenA;
          functionData = this.agentContract.interface.encodeFunctionData(
            'addLiquidity',
            [
              tokenForLiquidity,        // token address
              action.amountA,           // tokenAmount
              action.amountB,           // usdcAmount
              action.amountA,           // minTokenAmount
              action.amountB            // minUsdcAmount
            ]
          );
          break;

        case 'removeLiquidity':
          if (!action.tokenA || !action.tokenB) {
            throw new Error('Missing token addresses for liquidity removal');
          }
          const tokenForRemoval = action.tokenA.toLowerCase() === this.usdcAddress.toLowerCase() 
            ? action.tokenB 
            : action.tokenA;
          functionData = this.agentContract.interface.encodeFunctionData(
            'removeLiquidity',
            [
              tokenForRemoval,          // token address
              action.amountA,           // lpTokens
              '0',                      // minTokenAmount
              '0'                       // minUsdcAmount
            ]
          );
          break;

        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      // Prepare relay request with ABC Testnet configuration
      const request: SponsoredCallRequest = {
        chainId: BigInt(112), // ABC Testnet Chain ID
        target: this.agentContract.target as string,
        data: functionData
      };

      // Add delay before final transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Send the relay request
      const response = await this.relay.sponsoredCall(
        request,
        this.sponsorKey
      );

      if (!response?.taskId) {
        throw new Error('Failed to get task ID from relay');
      }

      console.log(`Transaction submitted to ABC Testnet. Task ID: ${response.taskId}`);

      return response.taskId;
    } catch (error) {
      if (error.message?.includes('Too many requests')) {
        console.log('Rate limit hit, waiting 30 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        throw error;
      }
      console.error('Failed to execute transaction:', error);
      throw error;
    }
  }

  private async getAgentInfo(): Promise<AgentInfo> {
    try {
      const response = await fetch(`${this.pool.baseUrl}/api/agent-info`);
      if (!response.ok) {
        throw new Error(`Failed to fetch agent info: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching agent info:', error);
      throw error;
    }
  }
} 