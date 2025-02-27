import { ethers } from 'ethers';
import { NextResponse } from 'next/server';
import { SPINOR_HISTORY_ABI } from '@/constants/abis';
import { SPINOR_HISTORY_ADDRESS } from '@/constants/contracts';

// Known block range where trades exist
const FIRST_TRADE_BLOCK = 7087951;
const BLOCK_RANGE = 1000; // Small buffer for new trades

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider('https://rpc.abc.t.raas.gelato.cloud');
    const contract = new ethers.Contract(SPINOR_HISTORY_ADDRESS, SPINOR_HISTORY_ABI, provider);
    
    console.log('Fetching trade history...');
    
    // Get current block
    const currentBlock = await provider.getBlockNumber();
    console.log('Current block:', currentBlock);
    
    // Get trade count for verification
    const tradeCount = await contract.getTradeCount();
    console.log('Total trades:', tradeCount.toString());
    
    // Query only the known block range
    const fromBlock = FIRST_TRADE_BLOCK;
    const toBlock = FIRST_TRADE_BLOCK + BLOCK_RANGE;
    
    console.log(`Fetching events from block ${fromBlock} to ${toBlock}...`);
    
    const filter = contract.filters.TradeRecorded();
    const events = await contract.queryFilter(filter, fromBlock, toBlock);
    console.log('Found events:', events.length);
    
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
    
    console.log('Processed trades:', trades.length);
    
    return NextResponse.json({
      success: true,
      data: trades
    });
    
  } catch (error: any) {
    console.error('Trade history error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
} 