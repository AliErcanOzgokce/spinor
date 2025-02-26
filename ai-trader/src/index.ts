import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { AgentService } from './services/agent.service';
import { HistoryService } from './services/history.service';
import { ArbitrageService } from './services/arbitrage.service';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TradeStrategy } from './types';

// Load environment variables
dotenv.config();

// ES Module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load deployments and ABIs
const deploymentsPath = path.join(__dirname, '../../hardhat/deployments.json');
const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

// Try to load deployments2.json for arbitrage
let deployments2 = null;
const deployments2Path = path.join(__dirname, '../../hardhat/deployments2.json');
try {
  deployments2 = JSON.parse(fs.readFileSync(deployments2Path, 'utf8'));
  console.log('Loaded arbitrage environment from deployments2.json');
} catch (error) {
  console.log('No arbitrage environment found (deployments2.json not loaded)');
}

// Load ABIs
const agentAbiPath = path.join(__dirname, '../../hardhat/artifacts/contracts/agents/SpinorAgent.sol/SpinorAgent.json');
const historyAbiPath = path.join(__dirname, '../../hardhat/artifacts/contracts/history/SpinorHistory.sol/SpinorHistory.json');

const AGENT_ABI = JSON.parse(fs.readFileSync(agentAbiPath, 'utf8')).abi;
const HISTORY_ABI = JSON.parse(fs.readFileSync(historyAbiPath, 'utf8')).abi;

// Minimal Router and Factory ABIs
const ROUTER_ABI = ['function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)'];
const FACTORY_ABI = ['function getPair(address tokenA, address tokenB) external view returns (address pair)'];

// Environment variables
const {
  RPC_URL,
  CHAIN_ID,
  NETWORK_NAME,
  CURRENCY_SYMBOL,
  OPENAI_API_KEY,
  GELATO_SPONSOR_KEY,
  PRIVATE_KEY,
  STRATEGY_MODE = 'REGULAR' // Default to regular trading if not specified
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

/**
 * Start arbitrage trading loop
 * @param arbitrageService Arbitrage service instance
 * @param agentService Agent service instance for access to agent info
 */
async function startArbitrageTrading(
  arbitrageService: ArbitrageService,
  agentService: AgentService
): Promise<void> {
  while (true) {
    try {
      console.log('\n--- Starting arbitrage market check ---');
      
      // Get agent info for current balances
      const agentInfo = await agentService.getAgentInfo();
      
      console.log('Current agent balances:', {
        usdc: agentInfo.balances.usdc.formatted,
        tokens: agentInfo.balances.tokens.map(t => `${t.symbol}: ${t.formatted}`)
      });
      
      // Get pool reserves from both factories
      const { primaryPools, secondaryPools } = await arbitrageService.getPoolReservesFromBothFactories();
      console.log(`Found ${primaryPools.length} primary pools and ${secondaryPools.length} secondary pools`);
      
      // Find arbitrage opportunities
      const opportunities = arbitrageService.findArbitrageOpportunities(
        primaryPools,
        secondaryPools
      );
      
      console.log(`Found ${opportunities.length} potential arbitrage opportunities`);
      
      if (opportunities.length > 0) {
        console.log('Top opportunity:');
        console.log(`- Token: ${opportunities[0].tokenSymbol}`);
        console.log(`- Price difference: ${opportunities[0].priceDiffPercent.toFixed(2)}%`);
        console.log(`- Estimated profit: ${opportunities[0].estimatedProfit.toFixed(2)}%`);
        
        // Ask AI for analysis and decision
        const aiDecision = await arbitrageService.getAIArbitrageDecision(
          opportunities,
          agentInfo
        );
        
        console.log(`AI analysis: ${aiDecision.reason}`);
        
        // Execute arbitrage if AI recommends it
        if (aiDecision.shouldArbitrage && aiDecision.opportunity) {
          console.log('Executing arbitrage as recommended by AI...');
          
          // Submit transaction
          const taskId = await arbitrageService.executeArbitrage(
            aiDecision.opportunity,
            agentInfo
          );
          
          console.log(`Arbitrage transaction submitted. Task ID: ${taskId}`);
          
          // Wait for confirmation
          try {
            const result = await arbitrageService.waitForRelay(taskId);
            console.log('Arbitrage transaction confirmed:', result.transactionHash);
          } catch (error) {
            console.error('Arbitrage transaction failed:', error);
          }
        } else {
          console.log('AI decided not to execute arbitrage at this time');
        }
      }
      
      // Wait before next check
      console.log('Waiting 60 seconds before next arbitrage check...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      
    } catch (error) {
      console.error('Error in arbitrage loop:', error);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
}

async function main() {
  try {
    // Load deployments
    const deploymentsPath = path.join(__dirname, '../../hardhat/deployments.json');
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

    // Try to load deployments2.json for arbitrage
    let deployments2 = null;
    const deployments2Path = path.join(__dirname, '../../hardhat/deployments2.json');
    try {
      deployments2 = JSON.parse(fs.readFileSync(deployments2Path, 'utf8'));
    } catch (error) {
      console.log('deployments2.json not found, arbitrage mode will not be available');
    }

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    // Create signer from private key
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    // Verify network connection
    const connectedNetwork = await provider.getNetwork();
    console.log(`Connected to network: ${process.env.NETWORK_NAME} (Chain ID: ${connectedNetwork.chainId})`);

    // Initialize history service
    const historyService = new HistoryService(
      signer,
      deployments.history,
      HISTORY_ABI
    );

    // Initialize agent service
    const agentService = new AgentService(
      process.env.OPENAI_API_KEY!,
      process.env.GELATO_SPONSOR_KEY!,
      provider,
      deployments.agent,
      AGENT_ABI,
      historyService,
      deployments.router,
      ROUTER_ABI,
      deployments.factory,
      FACTORY_ABI
    );

    // Initialize arbitrage service
    const arbitrageService = new ArbitrageService(
      provider,
      process.env.OPENAI_API_KEY!,
      process.env.GELATO_SPONSOR_KEY!,
      deployments.agent,
      AGENT_ABI
    );

    // Get agent's current strategy
    const agentContract = new ethers.Contract(deployments.agent, AGENT_ABI, provider);
    const tradeStrategy = await agentContract.tradeStrategy();

    // Start appropriate trading mode based on agent's strategy
    if (tradeStrategy.toString() === '5') { // 5 = Arbitrage strategy
      if (!deployments2) {
        throw new Error('Arbitrage strategy requires deployments2.json, but it was not found');
      }
      console.log('Starting AI trader in Arbitrage mode...');
      await startArbitrageTrading(arbitrageService, agentService);
    } else {
      console.log(`Starting AI trader with strategy ${tradeStrategy}...`);
      await agentService.startTrading();
    }

    console.log('AI trader started successfully on ABC Testnet');
    console.log('Using contracts:');
    console.log('- Agent:', deployments.agent);
    console.log('- History:', deployments.history);

  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

// Start the application
main(); 