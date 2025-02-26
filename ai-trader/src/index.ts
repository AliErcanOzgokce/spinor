import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { AgentService } from './services/agent.service';
import { HistoryService } from './services/history.service';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// ES Module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load deployments and ABIs
const deploymentsPath = path.join(__dirname, '../../hardhat/deployments.json');
const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

// Load ABIs
const agentAbiPath = path.join(__dirname, '../../hardhat/artifacts/contracts/agents/SpinorAgent.sol/SpinorAgent.json');
const historyAbiPath = path.join(__dirname, '../../hardhat/artifacts/contracts/history/SpinorHistory.sol/SpinorHistory.json');

const AGENT_ABI = JSON.parse(fs.readFileSync(agentAbiPath, 'utf8')).abi;
const HISTORY_ABI = JSON.parse(fs.readFileSync(historyAbiPath, 'utf8')).abi;

// Environment variables
const {
  RPC_URL,
  CHAIN_ID,
  NETWORK_NAME,
  CURRENCY_SYMBOL,
  OPENAI_API_KEY,
  GELATO_SPONSOR_KEY,
  PRIVATE_KEY,
} = process.env;

// Validate environment variables
if (!RPC_URL || !OPENAI_API_KEY || !GELATO_SPONSOR_KEY || !PRIVATE_KEY) {
  throw new Error('Missing required environment variables');
}

// Validate deployments
if (!deployments.agent || !deployments.history) {
  throw new Error('Missing contract addresses in deployments.json');
}

// Network configuration
const network = {
  name: NETWORK_NAME || 'ABC Testnet',
  chainId: parseInt(CHAIN_ID || '112'),
  currency: CURRENCY_SYMBOL || 'TEST'
};

async function main() {
  try {
    // Initialize provider with network configuration
    const provider = new ethers.JsonRpcProvider(RPC_URL, {
      name: network.name,
      chainId: network.chainId
    });

    // Create signer from private key
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Verify network connection
    const connectedNetwork = await provider.getNetwork();
    console.log(`Connected to network: ${connectedNetwork.name} (Chain ID: ${connectedNetwork.chainId})`);

    // Initialize history service
    const historyService = new HistoryService(
      signer,
      deployments.history,
      HISTORY_ABI,
      GELATO_SPONSOR_KEY
    );

    // Initialize agent service
    const agentService = new AgentService(
      OPENAI_API_KEY as string,
      GELATO_SPONSOR_KEY as string,
      provider,
      deployments.agent,
      AGENT_ABI,
      historyService
    );

    // Start trading bot
    await agentService.startTrading();

    console.log('AI trader started successfully on ABC Testnet');
    console.log('Using contracts:');
    console.log('- Agent:', deployments.agent);
    console.log('- History:', deployments.history);

  } catch (error) {
    console.error('Failed to start AI trader:', error);
    process.exit(1);
  }
}

// Start the application
main(); 