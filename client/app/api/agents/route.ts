import { ethers } from 'ethers';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TOKENS } from '@/constants/tokens';

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider('https://rpc.abc.t.raas.gelato.cloud');

    // Read agents.json from workspace root
    const workspaceRoot = path.join(process.cwd(), '..'); // Go up to workspace root from client directory
    const agentsPath = path.join(workspaceRoot, 'hardhat', 'agents.json');
    console.log('Looking for agents.json at:', agentsPath);
    
    if (!fs.existsSync(agentsPath)) {
      console.error('agents.json not found at:', agentsPath);
      // Try alternative path
      const altPath = path.join(process.cwd(), '../../hardhat/agents.json');
      console.log('Trying alternative path:', altPath);
      
      if (!fs.existsSync(altPath)) {
        console.error('agents.json not found at alternative path either');
        return NextResponse.json({
          success: false,
          message: 'agents.json not found'
        });
      }
      
      // Use alternative path if found
      const agentsContent = fs.readFileSync(altPath, 'utf8');
      console.log('agents.json content:', agentsContent);
      const agents = JSON.parse(agentsContent);
      
      // Get USDC contract
      const usdc = new ethers.Contract(
        TOKENS.USDC.address,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );

      // Get USDC balances for all agents from agents.json
      const otherAgents = await Promise.all(
        Object.entries(agents).map(async ([name, data]: [string, any]) => {
          const balance = await usdc.balanceOf(data.address);
          return {
            address: data.address,
            name, // Use the name from agents.json
            riskLevel: data.riskLevel,
            strategy: data.tradeStrategy,
            isActive: false,
            holdings: ethers.formatUnits(balance, TOKENS.USDC.decimals),
            profit: "0.00",
            totalPL: "0.00"
          };
        })
      );

      console.log('Found agents:', otherAgents);

      return NextResponse.json({
        success: true,
        data: otherAgents // Only return the additional agents
      });
    }

    const agentsContent = fs.readFileSync(agentsPath, 'utf8');
    console.log('agents.json content:', agentsContent);
    
    const agents = JSON.parse(agentsContent);

    // Get USDC contract
    const usdc = new ethers.Contract(
      TOKENS.USDC.address,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );

    // Get USDC balances for all agents from agents.json
    const otherAgents = await Promise.all(
      Object.entries(agents).map(async ([name, data]: [string, any]) => {
        const balance = await usdc.balanceOf(data.address);
        return {
          address: data.address,
          name, // Use the name from agents.json
          riskLevel: data.riskLevel,
          strategy: data.tradeStrategy,
          isActive: false,
          holdings: ethers.formatUnits(balance, TOKENS.USDC.decimals),
          profit: "0.00",
          totalPL: "0.00"
        };
      })
    );

    console.log('Found agents:', otherAgents);

    return NextResponse.json({
      success: true,
      data: otherAgents // Only return the additional agents
    });

  } catch (error: any) {
    console.error('Agent info error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
} 