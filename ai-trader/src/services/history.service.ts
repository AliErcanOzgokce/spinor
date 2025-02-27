import { ethers } from 'ethers';
import type { TradeHistory, TradeAction, AgentInfo } from '../types';
import axios from 'axios';

interface GelatoTask {
  chainId: number;
  taskId: string;
  taskState: string;
  creationDate: string;
  transactionHash?: string;
  executionDate?: string;
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

interface TradeRecordedEvent {
  args: {
    timestamp: bigint;
    actionType: string;
    tokenA: string;
    tokenB: string;
    amountA: bigint;
    amountB: bigint;
    reason: string;
    txHash: string;
    status: string;
    gasUsed: bigint;
    blockNumber: bigint;
    tradeStrategy: bigint;
    riskLevel: bigint;
    pnl: bigint;
    apy: bigint;
  };
}

export class HistoryService {
  private readonly provider: ethers.Provider;
  private readonly signer: ethers.Signer;
  private readonly historyContract: ethers.Contract;
  private readonly agentContract: ethers.Contract;

  constructor(
    historyAddress: string,
    historyAbi: ethers.InterfaceAbi,
    signer: ethers.Signer,
    agentAddress: string,
    agentAbi: ethers.InterfaceAbi
  ) {
    this.signer = signer;
    this.provider = signer.provider as ethers.Provider;
    this.historyContract = new ethers.Contract(historyAddress, historyAbi, signer);
    this.agentContract = new ethers.Contract(agentAddress, agentAbi, signer);
  }

  async recordTrade(
    action: TradeAction,
    taskInfo: any,
    agentInfo: AgentInfo,
    pnl: number,
    apy: number
  ): Promise<void> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const txHash = ethers.getBytes(taskInfo.transactionHash || '0x');
      const strategy = agentInfo.configuration.tradeStrategy;

      // Get current APY from API for strategies 1-4
      let currentApy = 0;
      if (strategy !== 5) {
        try {
          const response = await fetch('http://localhost:3000/api/pool-reserves');
          const data = await response.json();
          if (data.success && data.data) {
            const pools = data.data;
            // Find the pool for the token we're trading
            const pool = pools.find(p => 
              (action.tokenA && p.token0.toLowerCase() === action.tokenA.toLowerCase()) ||
              (action.tokenA && p.token1.toLowerCase() === action.tokenA.toLowerCase()) ||
              (action.tokenB && p.token0.toLowerCase() === action.tokenB.toLowerCase()) ||
              (action.tokenB && p.token1.toLowerCase() === action.tokenB.toLowerCase())
            );
            if (pool) {
              currentApy = pool.apy;
            }
          }
        } catch (error) {
          console.error('Failed to fetch APY from API:', error);
        }
      }

      // For strategies 1-4, get amounts from Gelato API response
      if (strategy >= 1 && strategy <= 4) {
        try {
          const response = await fetch(
            `https://explorer.abc.t.raas.gelato.cloud/api/v2/transactions/${taskInfo.transactionHash}/token-transfers?type=ERC-20%2CERC-721%2CERC-1155`
          );
          
          if (!response.ok) {
            throw new Error(`Failed to fetch token transfers: ${response.statusText}`);
          }

          const transferData = await response.json();
          
          if (transferData.items && transferData.items.length > 0) {
            let amountA = BigInt(0);
            let amountB = BigInt(0);

            // For strategies 1 and 3 (swap only)
            if (strategy === 1 || strategy === 3) {
              // Find USDC transfer (amountA)
              const usdcTransfer = transferData.items.find(item =>
                item.token.address.toLowerCase() === action.tokenA?.toLowerCase() &&
                item.from.hash.toLowerCase() === this.agentContract.target.toLowerCase()
              );

              // Find LST/LRT token transfer (amountB)
              const tokenTransfer = transferData.items.find(item =>
                item.token.address.toLowerCase() === action.tokenB?.toLowerCase() &&
                item.to.hash.toLowerCase() === this.agentContract.target.toLowerCase()
              );

              amountA = usdcTransfer ? BigInt(usdcTransfer.total.value) : BigInt(0);
              amountB = tokenTransfer ? BigInt(tokenTransfer.total.value) : BigInt(0);
            } 
            // For strategies 2 and 4 (liquidity)
            else {
              // Find token transfers for tokenA and tokenB
              const tokenATransfer = transferData.items.find(item =>
                item.token.address.toLowerCase() === action.tokenA?.toLowerCase() &&
                item.from.hash.toLowerCase() === this.agentContract.target.toLowerCase()
              );

              const tokenBTransfer = transferData.items.find(item =>
                item.token.address.toLowerCase() === action.tokenB?.toLowerCase() &&
                item.from.hash.toLowerCase() === this.agentContract.target.toLowerCase()
              );

              amountA = tokenATransfer ? BigInt(tokenATransfer.total.value) : BigInt(0);
              amountB = tokenBTransfer ? BigInt(tokenBTransfer.total.value) : BigInt(0);
            }

            console.log('\nRecording trade history with parameters:');
            console.log('----------------------------------------');
            console.log('timestamp:', timestamp);
            console.log('action type:', action.type);
            console.log('tokenA:', action.tokenA || ethers.ZeroAddress);
            console.log('tokenB:', action.tokenB || ethers.ZeroAddress);
            console.log('amountA:', amountA.toString());
            console.log('amountB:', amountB.toString());
            console.log('reason:', action.reason);
            console.log('txHash:', taskInfo.transactionHash);
            console.log('status:', taskInfo.taskState === 'ExecSuccess' ? 'success' : 'failed');
            console.log('tradeStrategy:', strategy);
            console.log('riskLevel:', agentInfo.configuration.riskLevel);
            console.log('pnl:', pnl);
            console.log('apy:', currentApy);
            console.log('----------------------------------------\n');

            const tx = await this.historyContract.recordTradeHistory(
              timestamp,
              action.type,
              action.tokenA || ethers.ZeroAddress,
              action.tokenB || ethers.ZeroAddress,
              amountA,
              amountB,
              action.reason,
              txHash,
              taskInfo.taskState === 'ExecSuccess' ? 'success' : 'failed',
              strategy,
              agentInfo.configuration.riskLevel,
              ethers.parseUnits(pnl.toFixed(6), 6),
              ethers.getBigInt(Math.round(currentApy * 100))
            );

            await tx.wait();
            console.log('Trade history recorded successfully');
            return;
          }
        } catch (error) {
          console.error('Error fetching token transfers:', error);
        }
      }

      // For strategy 5 or if API call fails, use original logic
      let amountA = action.amountA ? BigInt(action.amountA) : BigInt(0);
      let amountB = action.amountB ? BigInt(action.amountB) : BigInt(0);

      console.log('\nRecording trade history with parameters:');
      console.log('----------------------------------------');
      console.log('timestamp:', timestamp);
      console.log('action type:', action.type);
      console.log('tokenA:', action.tokenA || ethers.ZeroAddress);
      console.log('tokenB:', action.tokenB || ethers.ZeroAddress);
      console.log('amountA:', amountA.toString());
      console.log('amountB:', amountB.toString());
      console.log('reason:', action.reason);
      console.log('txHash:', taskInfo.transactionHash);
      console.log('status:', taskInfo.taskState === 'ExecSuccess' ? 'success' : 'failed');
      console.log('tradeStrategy:', strategy);
      console.log('riskLevel:', agentInfo.configuration.riskLevel);
      console.log('pnl:', pnl);
      console.log('apy:', strategy === 5 ? 0 : currentApy);
      console.log('----------------------------------------\n');

      // For strategy 5 (arbitrage), find the token transfer amount
      if (strategy === 5) {
        try {
          const response = await axios.get(`https://explorer.abc.t.raas.gelato.cloud/api/v2/transactions/${taskInfo.transactionHash}/token-transfers`);
          const transferData = response.data;

          // Find USDC transfer (amountA) - from agent to pool
          const usdcTransfer = transferData.items.find(item =>
            item.token.address.toLowerCase() === action.tokenA?.toLowerCase() &&
            item.from.hash.toLowerCase() === this.agentContract.target.toLowerCase()
          );

          // Find LST/LRT token transfer (amountB) - from pool to agent
          const tokenTransfers = transferData.items.filter(item =>
            item.token.address.toLowerCase() === action.tokenB?.toLowerCase() &&
            item.to.hash.toLowerCase() === this.agentContract.target.toLowerCase()
          );

          // For arbitrage, we want the first token transfer where we receive tokens
          const tokenTransfer = tokenTransfers[0];

          if (usdcTransfer) {
            console.log('\nFound USDC transfer:');
            console.log('Amount:', usdcTransfer.total.value);
            console.log('From:', usdcTransfer.from.hash);
            console.log('To:', usdcTransfer.to.hash);
            amountA = BigInt(usdcTransfer.total.value);
          }

          if (tokenTransfer) {
            console.log('\nFound token transfer:');
            console.log('Token:', tokenTransfer.token.symbol);
            console.log('Amount:', tokenTransfer.total.value);
            console.log('From:', tokenTransfer.from.hash);
            console.log('To:', tokenTransfer.to.hash);
            amountB = BigInt(tokenTransfer.total.value);
          }
        } catch (error) {
          console.error('Error fetching token transfers for strategy 5:', error);
        }
      }

      const tx = await this.historyContract.recordTradeHistory(
        timestamp,
        action.type,
        action.tokenA || ethers.ZeroAddress,
        action.tokenB || ethers.ZeroAddress,
        amountA,
        amountB,
        action.reason,
        txHash,
        taskInfo.taskState === 'ExecSuccess' ? 'success' : 'failed',
        strategy,
        agentInfo.configuration.riskLevel,
        ethers.parseUnits(pnl.toFixed(6), 6),
        ethers.getBigInt(Math.round((strategy === 5 ? 0 : currentApy) * 100))
      );

      await tx.wait();
      console.log('Trade history recorded successfully');
    } catch (error) {
      console.error('Failed to record trade history:', error);
      throw error;
    }
  }

  async getTradeHistory(
    startBlock: number = 0,
    endBlock: number | 'latest' = 'latest'
  ): Promise<TradeHistory[]> {
    try {
      const events = await this.historyContract.queryFilter(
        this.historyContract.filters.TradeRecorded()
      );

      return events
        .filter((e): e is ethers.Log & { args: any[] } => 'args' in e)
        .map(event => {
          const args = event.args as [
            bigint,    // timestamp
            string,    // actionType
            string,    // tokenA
            string,    // tokenB
            bigint,    // amountA
            bigint,    // amountB
            string,    // reason
            string,    // txHash
            string,    // status
            bigint,    // gasUsed
            bigint,    // blockNumber
            bigint,    // tradeStrategy
            bigint,    // riskLevel
            bigint,    // pnl
            bigint     // apy
          ];

          const [
            timestamp,
            actionType,
            tokenA,
            tokenB,
            amountA,
            amountB,
            reason,
            txHash,
            status,
            gasUsed,
            blockNumber,
            tradeStrategy,
            riskLevel,
            pnl,
            apy
          ] = args;

          return {
            timestamp: Number(timestamp),
            action: {
              type: actionType as TradeAction['type'],
              tokenA,
              tokenB,
              amountA: amountA.toString(),
              amountB: amountB.toString(),
              reason
            },
            txHash,
            status: status as 'success' | 'failed',
            gasUsed: gasUsed.toString(),
            blockNumber: Number(blockNumber),
            tradeStrategy: Number(tradeStrategy),
            riskLevel: Number(riskLevel),
            pnl: Number(pnl) / 1e6, // Convert from USDC decimals
            apy: Number(apy) / 100 // Convert from percentage * 100
          };
        });
    } catch (error) {
      console.error('Failed to fetch trade history:', error);
      throw error;
    }
  }

  async getRecentTrades(limit: number = 10): Promise<TradeHistory[]> {
    const currentBlock = await this.provider.getBlockNumber();
    const history = await this.getTradeHistory(
      currentBlock - 10000, // Look back ~10000 blocks
      currentBlock
    );

    return history
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
} 