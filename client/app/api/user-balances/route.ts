import { ethers } from 'ethers';
import { NextResponse } from 'next/server';
import { TOKENS } from '@/constants/tokens';

const RPC_URL = 'https://rpc.abc.t.raas.gelato.cloud';

export async function GET(request: Request) {
  try {
    // Get address from query params
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    // Return empty balances if address is not provided or invalid
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({
        success: true,
        data: {
          usdc: {
            balance: '0',
            formatted: 0
          },
          tokens: []
        }
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL, {
      chainId: 112,
      name: 'ABC Testnet',
    });
    
    // Get USDC balance
    const usdc = new ethers.Contract(
      TOKENS.USDC.address,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    
    const usdcBalance = await usdc.balanceOf(address);
    const usdcFormatted = Number(ethers.formatUnits(usdcBalance, TOKENS.USDC.decimals));

    // Get token balances
    const tokens = await Promise.all(
      Object.values(TOKENS)
        .filter(token => token.symbol !== 'USDC')
        .map(async (token) => {
          const contract = new ethers.Contract(
            token.address,
            ['function balanceOf(address) view returns (uint256)'],
            provider
          );
          const balance = await contract.balanceOf(address);
          const formatted = Number(ethers.formatUnits(balance, token.decimals));
          
          return {
            symbol: token.symbol,
            address: token.address,
            balance: balance.toString(),
            formatted
          };
        })
    );

    return NextResponse.json({
      success: true,
      data: {
        usdc: {
          balance: usdcBalance.toString(),
          formatted: usdcFormatted
        },
        tokens: tokens.filter(t => t.formatted > 0)
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch user balances:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
} 