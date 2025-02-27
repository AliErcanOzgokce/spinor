import { ethers } from 'ethers';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { SPINOR_AGENT_ABI } from '@/constants/abis';

export async function GET(request: Request) {
  try {
    // Get agent address from query params
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    // Read agents.json
    const agentsPath = path.resolve(process.cwd(), '../../hardhat/agents.json');
    let agents = {};
    if (fs.existsSync(agentsPath)) {
      agents = JSON.parse(fs.readFileSync(agentsPath, 'utf8'));
    }

    const provider = new ethers.JsonRpcProvider('https://rpc.abc.t.raas.gelato.cloud');

    // If specific agent address is provided, return only that agent's info
    if (address) {
      const contract = new ethers.Contract(address, SPINOR_AGENT_ABI, provider);
      const [tradeStrategy, riskLevel, isActive] = await Promise.all([
        contract.tradeStrategy(),
        contract.riskLevel(),
        contract.isActive()
      ]);

      // Get USDC balance
      const usdcContract = new ethers.Contract(
        '0x5b4Df904F6DDb52fa6c92a8e175d44B89bEec30b',
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      const balance = await usdcContract.balanceOf(address);
      const formatted = Number(ethers.formatUnits(balance, 6));

      return NextResponse.json({
        success: true,
        data: {
          configuration: {
            tradeStrategy: Number(tradeStrategy),
            riskLevel: Number(riskLevel)
          },
          isActive,
          balances: {
            usdc: {
              balance: balance.toString(),
              formatted
            }
          }
        }
      });
    }

    // Otherwise, return info for all agents
    const agentInfoPromises = Object.entries(agents).map(async ([name, addr]) => {
      const contract = new ethers.Contract(addr as string, SPINOR_AGENT_ABI, provider);
      const [tradeStrategy, riskLevel, isActive] = await Promise.all([
        contract.tradeStrategy(),
        contract.riskLevel(),
        contract.isActive()
      ]);

      // Get USDC balance
      const usdcContract = new ethers.Contract(
        '0x5b4Df904F6DDb52fa6c92a8e175d44B89bEec30b',
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      const balance = await usdcContract.balanceOf(addr);
      const formatted = Number(ethers.formatUnits(balance, 6));

      return {
        name,
        address: addr,
        configuration: {
          tradeStrategy: Number(tradeStrategy),
          riskLevel: Number(riskLevel)
        },
        isActive,
        balances: {
          usdc: {
            balance: balance.toString(),
            formatted
          }
        }
      };
    });

    const agentsInfo = await Promise.all(agentInfoPromises);

    return NextResponse.json({
      success: true,
      data: agentsInfo
    });

  } catch (error: any) {
    console.error('Agent info error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
} 