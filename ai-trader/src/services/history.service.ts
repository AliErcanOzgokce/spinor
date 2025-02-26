import { ethers } from 'ethers';
import type { TradeHistory, TradeAction } from '../types';

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
  };
}

export class HistoryService {
  private readonly provider: ethers.Provider;
  private readonly signer: ethers.Signer;
  private readonly historyContract: ethers.Contract;

  constructor(
    signer: ethers.Signer,
    historyContractAddress: string,
    historyContractABI: ethers.InterfaceAbi
  ) {
    this.signer = signer;
    this.provider = signer.provider as ethers.Provider;
    this.historyContract = new ethers.Contract(
      historyContractAddress,
      historyContractABI,
      signer
    );
  }

  async recordTrade(
    action: TradeAction,
    taskInfo: GelatoTask
  ): Promise<void> {
    try {
      // Create history entry using Gelato task information
      const history: TradeHistory = {
        timestamp: Math.floor(Date.now() / 1000),
        action,
        txHash: taskInfo.transactionHash || taskInfo.taskId,
        status: taskInfo.taskState === 'ExecSuccess' ? 'success' : 'failed',
        gasUsed: taskInfo.gasUsed || '0',
        blockNumber: taskInfo.blockNumber || 0
      };

      // Record trade history
      const tx = await this.historyContract.recordTradeHistory(
        history.timestamp,
        history.action.type,
        history.action.tokenA || ethers.ZeroAddress,
        history.action.tokenB || ethers.ZeroAddress,
        history.action.amountA || '0',
        history.action.amountB || '0',
        history.action.reason,
        history.txHash,
        history.status,
        history.gasUsed,
        history.blockNumber
      );

      console.log('Trade history record submitted:', tx.hash);
      await tx.wait();
      console.log('Trade history record confirmed');

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
            bigint     // blockNumber
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
            blockNumber
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
            blockNumber: Number(blockNumber)
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