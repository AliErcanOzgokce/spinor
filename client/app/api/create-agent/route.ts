import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, tradeStrategy, riskLevel } = body;

    // Validate inputs
    if (!name || !tradeStrategy || !riskLevel) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate trade strategy and risk level
    if (tradeStrategy < 1 || tradeStrategy > 5) {
      return NextResponse.json(
        { success: false, message: 'Trade strategy must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (riskLevel < 1 || riskLevel > 4) {
      return NextResponse.json(
        { success: false, message: 'Risk level must be between 1 and 4' },
        { status: 400 }
      );
    }

    // Get the hardhat directory path
    const hardhatDir = path.join(process.cwd(), '../hardhat');

    // Execute the createAgent task
    const { stdout, stderr } = await execAsync(
      `cd ${hardhatDir} && npx hardhat create-agent --name "${name}" --strategy ${tradeStrategy} --risk ${riskLevel} --network abc`
    );

    // Ignore punycode deprecation warning in stderr
    if (stderr && !stderr.includes('punycode')) {
      console.error('Script error:', stderr);
      return NextResponse.json(
        { success: false, message: 'Failed to create agent' },
        { status: 500 }
      );
    }

    // Parse the output to find the agent address
    const addressMatch = stdout.match(/Agent deployed to: (0x[a-fA-F0-9]{40})/);
    if (!addressMatch) {
      return NextResponse.json(
        { success: false, message: 'Could not find agent address in output' },
        { status: 500 }
      );
    }

    const agentAddress = addressMatch[1];
    
    return NextResponse.json({
      success: true,
      data: {
        name,
        address: agentAddress,
        tradeStrategy,
        riskLevel
      }
    });

  } catch (error: any) {
    console.error('Create agent error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
} 