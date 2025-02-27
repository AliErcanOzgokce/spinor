import { ethers } from 'ethers';
import { NextResponse } from 'next/server';
import { SPINOR_HISTORY_ABI } from '@/constants/abis';

const HISTORY_ADDRESS = '0xB1ea9b87B5F7551F15aa620970ED13E4C0A85eC8';
const RPC_URL = 'https://rpc.abc.t.raas.gelato.cloud';

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL, {
      chainId: 112,
      name: 'ABC Testnet'
    });
    
    const historyContract = new ethers.Contract(HISTORY_ADDRESS, SPINOR_HISTORY_ABI, provider);

    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    // Get events from last 50,000 blocks (adjust this number based on your needs)
    const fromBlock = Math.max(0, currentBlock - 50000);

    // Get trade history
    const events = await historyContract.queryFilter(
      historyContract.filters.TradeRecorded(),
      fromBlock,
      'latest'
    );

    // Format events
    const trades = events
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
          tradeStrategy,
          riskLevel,
          pnl,
          apy
        ] = args;

        return {
          timestamp: Number(timestamp),
          action: {
            type: actionType,
            tokenA,
            tokenB,
            amountA: amountA.toString(),
            amountB: amountB.toString(),
            reason
          },
          txHash,
          status,
          tradeStrategy: Number(tradeStrategy),
          riskLevel: Number(riskLevel),
          pnl: Number(pnl) / 1e6, // Convert from USDC decimals
          apy: Number(apy) / 100 // Convert from percentage * 100
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp descending

    return NextResponse.json({
      success: true,
      data: trades,
    });
  } catch (error: any) {
    console.error('Failed to fetch trade history:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
} 