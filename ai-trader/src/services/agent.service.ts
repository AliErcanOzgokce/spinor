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
  private readonly router: ethers.Contract;
  private readonly factory: ethers.Contract;

  constructor(
    openaiApiKey: string,
    sponsorKey: string,
    provider: ethers.Provider,
    agentAddress: string,
    agentAbi: ethers.InterfaceAbi,
    historyService: HistoryService,
    routerAddress: string,
    routerAbi: ethers.InterfaceAbi,
    factoryAddress: string,
    factoryAbi: ethers.InterfaceAbi
  ) {
    this.provider = provider;
    this.sponsorKey = sponsorKey;
    this.agentContract = new ethers.Contract(agentAddress, agentAbi, provider);
    this.history = historyService;
    this.relay = new GelatoRelay();
    this.pool = new PoolService('http://localhost:3000');
    this.openai = new OpenAIService(openaiApiKey, this.usdcAddress);
    this.router = new ethers.Contract(routerAddress, routerAbi, provider);
    this.factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
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

      switch (action.type) {
        case 'addLiquidity':
          if (!action.tokenA || !action.tokenB) {
            throw new Error('Token addresses required for addLiquidity');
          }

          // Determine token and USDC addresses precisely
          const isTokenA = action.tokenA.toLowerCase() !== this.usdcAddress.toLowerCase();
          const tokenAddress = isTokenA ? action.tokenA : action.tokenB;
          const usdcAddress = isTokenA ? action.tokenB : action.tokenA;

          // Get token decimals
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ['function decimals() view returns (uint8)'],
            this.provider
          );
          const tokenDecimals = await tokenContract.decimals();
          console.log(`Token decimals: ${tokenDecimals}`);

          // Get pair and reserves
          const pairAddress = await this.factory.getPair(tokenAddress, this.usdcAddress);
          if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error('Pair does not exist');
          }
          
          const [reserveA, reserveB] = await this.getPairReserves(pairAddress);
          const token0 = await this.getToken0(pairAddress);
          const isTokenToken0 = token0.toLowerCase() === tokenAddress.toLowerCase();
          
          // Get reserves in correct order (token, USDC)
          const reserveToken = isTokenToken0 ? reserveA : reserveB;
          const reserveUsdc = isTokenToken0 ? reserveB : reserveA;
          
          console.log('Executing strategy:', action.type);
          console.log('Initial state:', {
            tokenAddress,
            usdcAddress: this.usdcAddress,
            isTokenToken0,
            reserveToken: reserveToken.toString(),
            reserveUsdc: reserveUsdc.toString(),
            amountToken: action.amountA,
            amountUsdc: action.amountB,
            optimalRatio: (reserveToken * BigInt(1000000) / reserveUsdc).toString()
          });

          // Use only a small percentage of the pool size for liquidity (0.001%)
          const scaledAmountUsdc = reserveUsdc / BigInt(100000);
          
          // Calculate token amount based on current pool ratio, with a 400% buffer for safety
          const optimalTokenAmount = (scaledAmountUsdc * reserveToken) / reserveUsdc;
          const finalAmountToken = optimalTokenAmount * BigInt(500) / BigInt(100);  // 400% extra buffer
          
          // Set minimum amounts with 10% slippage (90% of actual amounts)
          const minAmountToken = finalAmountToken * BigInt(10) / BigInt(100);
          const minAmountUsdc = scaledAmountUsdc * BigInt(10) / BigInt(100);

          console.log('Final amounts:', {
            scaledAmountToken: finalAmountToken.toString(),
            scaledAmountUsdc: scaledAmountUsdc.toString(),
            minAmountToken: minAmountToken.toString(),
            minAmountUsdc: minAmountUsdc.toString(),
            extraBuffer: '400%',
            slippage: '10%'
          });

          // Prepare function data with token address first
          functionData = this.agentContract.interface.encodeFunctionData(
            'addLiquidity',
            [
              tokenAddress,  // Always use the actual token address (not USDC)
              finalAmountToken.toString(),
              scaledAmountUsdc.toString(),
              minAmountToken.toString(),
              minAmountUsdc.toString()
            ]
          );
          break;

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

  private async submitToRelay(functionData: string): Promise<string> {
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

  private async getPairReserves(pair: string): Promise<[bigint, bigint]> {
    const pairContract = new ethers.Contract(
      pair,
      [
        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
      ],
      this.provider
    );
    const { reserve0, reserve1 } = await pairContract.getReserves();
    return [BigInt(reserve0.toString()), BigInt(reserve1.toString())];
  }

  private async getToken0(pair: string): Promise<string> {
    const pairContract = new ethers.Contract(
      pair,
      [
        'function token0() external view returns (address)'
      ],
      this.provider
    );
    return await pairContract.token0();
  }
} 