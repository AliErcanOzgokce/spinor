import { ethers } from 'ethers';
import { OpenAIService } from './openai.service';
import { GelatoRelay } from '@gelatonetwork/relay-sdk';
import type { SponsoredCallRequest } from '@gelatonetwork/relay-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import type { PoolReserves, AgentInfo, TradeAction } from '../types';

/**
 * Service for detecting and executing arbitrage opportunities
 * between two different Uniswap V2 compatible exchanges
 */
export class ArbitrageService {
  private readonly provider: ethers.Provider;
  private readonly openai: OpenAIService;
  private readonly relay: GelatoRelay;
  private readonly sponsorKey: string;
  private readonly usdcAddress: string = '0x5b4Df904F6DDb52fa6c92a8e175d44B89bEec30b'; // USDC from deployments.json
  
  // Contract instances
  private readonly agentContract: ethers.Contract;
  private router1!: ethers.Contract;
  private factory1!: ethers.Contract;
  private router2!: ethers.Contract;
  private factory2!: ethers.Contract;
  
  // Minimum arbitrage profit in percentage (e.g., 1% = 100 basis points)
  private readonly MIN_PROFIT_BPS: number = 10; // 0.1%
  private readonly MAX_SLIPPAGE_BPS: number = 50; // 0.5%
  
  /**
   * Constructor for ArbitrageService
   * @param provider Ethereum provider
   * @param openaiApiKey OpenAI API key
   * @param sponsorKey Gelato sponsor key
   * @param agentAddress SpinorAgent contract address
   * @param agentAbi SpinorAgent contract ABI
   */
  constructor(
    provider: ethers.Provider,
    openaiApiKey: string,
    sponsorKey: string,
    agentAddress: string,
    agentAbi: ethers.InterfaceAbi
  ) {
    this.provider = provider;
    this.sponsorKey = sponsorKey;
    this.relay = new GelatoRelay();
    this.openai = new OpenAIService(openaiApiKey, this.usdcAddress);
    this.agentContract = new ethers.Contract(agentAddress, agentAbi, provider);
    
    this.initializeContracts().catch(error => {
      console.error('Failed to initialize contracts:', error);
      throw error;
    });
  }
  
  private async initializeContracts() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const deploymentsPath = path.join(__dirname, '../../../hardhat/deployments.json');
    const deployments2Path = path.join(__dirname, '../../../hardhat/deployments2.json');
    
    console.log('Loading deployments from:', deploymentsPath);
    console.log('Loading deployments2 from:', deployments2Path);
    
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    const deployments2 = JSON.parse(fs.readFileSync(deployments2Path, 'utf8'));
    
    console.log('Deployments loaded successfully');
    console.log('Primary Router:', deployments.router);
    console.log('Primary Factory:', deployments.factory);
    console.log('Secondary Router:', deployments2.router);
    console.log('Secondary Factory:', deployments2.factory);
    
    const routerAbi = [
      'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
      'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
    ];
    
    const factoryAbi = [
      'function getPair(address tokenA, address tokenB) external view returns (address pair)'
    ];
    
    this.router1 = new ethers.Contract(deployments.router, routerAbi, this.provider);
    this.factory1 = new ethers.Contract(deployments.factory, factoryAbi, this.provider);
    
    this.router2 = new ethers.Contract(deployments2.router, routerAbi, this.provider);
    this.factory2 = new ethers.Contract(deployments2.factory, factoryAbi, this.provider);
    
    // Verify contracts are initialized
    const [factory1Address, factory2Address] = await Promise.all([
      this.factory1.getAddress(),
      this.factory2.getAddress()
    ]);
    
    console.log('Factory1 initialized:', !!this.factory1, factory1Address);
    console.log('Factory2 initialized:', !!this.factory2, factory2Address);
    
    console.log('Alternative router and factory configured for arbitrage');
  }
  
  /**
   * Get reserves from both pools
   * @returns Promise with pool reserves from both exchanges 
   */
  async getPoolReservesFromBothFactories(): Promise<{
    primaryPools: PoolReserves[],
    secondaryPools: PoolReserves[]
  }> {
    try {
      console.log('Getting pool reserves from both factories...');
      
      let primaryPools: PoolReserves[] = [];
      let secondaryPools: PoolReserves[] = [];
      
      // Safety check to ensure factories are initialized
      if (!this.factory1) {
        console.error('Primary factory not initialized');
        // Try to initialize via API instead of failing
        try {
          console.log('Fetching primary pools directly from API...');
          const response = await axios.get('http://localhost:3000/api/pool-reserves');
          if (response.status === 200 && response.data.success) {
            primaryPools = response.data.data;
            console.log(`Fetched ${primaryPools.length} primary pools from API`);
          }
        } catch (error) {
          console.error('Failed to fetch primary pools from API:', error);
        }
      } else {
        // Get primary pool reserves using factory1 (primary factory)
        primaryPools = await this.loadPoolReserves(this.factory1);
      }
      
      console.log(`Found ${primaryPools.length} primary pools`);
      
      // Get secondary pool reserves
      if (!this.factory2) {
        console.error('Secondary factory not initialized');
        // Try to fetch secondary pools from deployments2.json directly
        try {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const projectRoot = path.resolve(__dirname, '../../../');
          const deployments2Path = path.join(projectRoot, 'hardhat/deployments2.json');
          
          console.log('Loading secondary pools from:', deployments2Path);
          const deployments2 = JSON.parse(fs.readFileSync(deployments2Path, 'utf8'));
          
          if (deployments2.pairs) {
            for (const [symbol, pairData] of Object.entries(deployments2.pairs)) {
              const pair = pairData as any;
              
              const isUsdcToken0 = pair.token0 === this.usdcAddress;
              const token0Symbol = isUsdcToken0 ? 'USDC' : symbol;
              const token1Symbol = isUsdcToken0 ? symbol : 'USDC';
              
              secondaryPools.push({
                pairAddress: pair.address,
                token0: pair.token0,
                token1: pair.token1,
                reserve0: pair.reserve0 || '0',
                reserve1: pair.reserve1 || '0',
                token0Symbol,
                token1Symbol,
                apy: 5,
                slashingHistory: 0
              });
            }
          }
          console.log(`Loaded ${secondaryPools.length} secondary pools from file`);
        } catch (error) {
          console.error('Failed to load secondary pools from file:', error);
        }
      } else {
        // Get secondary pool reserves using factory2 (secondary factory)
        secondaryPools = await this.loadPoolReserves(this.factory2);
      }
      
      console.log(`Found ${secondaryPools.length} secondary pools`);
      
      return { primaryPools, secondaryPools };
    } catch (error) {
      console.error('Error fetching pool reserves from both factories:', error);
      return { primaryPools: [], secondaryPools: [] };
    }
  }
  
  /**
   * Helper to load pool reserves from a factory
   * @param factory Factory contract
   * @returns Promise with pool reserves
   */
  private async loadPoolReserves(factory: ethers.Contract): Promise<PoolReserves[]> {
    try {
      if (!factory) {
        console.error('Factory contract is not properly initialized');
        return [];
      }

      const factoryAddress = await factory.getAddress();
      const isSecondaryFactory = factoryAddress.toLowerCase() === await this.factory2.getAddress().then(addr => addr.toLowerCase());

      if (isSecondaryFactory) {
        // Load from deployments2.json for secondary factory
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const deployments2Path = path.join(__dirname, '../../../hardhat/deployments2.json');
        
        const deployments2 = JSON.parse(fs.readFileSync(deployments2Path, 'utf8'));
        const pools: PoolReserves[] = [];

        if (deployments2.pairs) {
          for (const [symbol, pairData] of Object.entries(deployments2.pairs)) {
            const pair = pairData as any;
            pools.push({
              pairAddress: pair.address,
              token0: pair.token0,
              token1: pair.token1,
              reserve0: pair.reserve0,
              reserve1: pair.reserve1,
              token0Symbol: pair.token0 === this.usdcAddress ? 'USDC' : symbol,
              token1Symbol: pair.token1 === this.usdcAddress ? 'USDC' : symbol,
              apy: 5,
              slashingHistory: 0
            });
          }
        }

        console.log(`Loaded ${pools.length} secondary pools from file`);
        return pools;
      } else {
        // Load from API for primary factory
        try {
          console.log('Fetching primary pools from API...');
          const response = await axios.get('http://localhost:3000/api/pool-reserves');
          if (response.status === 200 && response.data.success) {
            console.log(`Fetched ${response.data.data.length} primary pools from API`);
            return response.data.data;
          }
        } catch (error) {
          console.error('Failed to fetch primary pools from API:', error);
          return [];
        }
      }
    } catch (error) {
      console.error('Failed to load pool reserves:', error);
      return [];
    }
  }
  
  /**
   * Find arbitrage opportunities between pools
   * @param primaryPools Primary pool reserves
   * @param secondaryPools Secondary pool reserves
   * @returns Array of arbitrage opportunities
   */
  findArbitrageOpportunities(
    primaryPools: PoolReserves[], 
    secondaryPools: PoolReserves[]
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Log pool details
    console.log('\nPool Details:');
    console.log('-------------');
    
    for (const primaryPool of primaryPools) {
      // Find matching secondary pool for the same token pair
      const secondaryPool = secondaryPools.find(pool => 
        (pool.token0 === primaryPool.token0 && pool.token1 === primaryPool.token1) ||
        (pool.token0 === primaryPool.token1 && pool.token1 === primaryPool.token0)
      );
      
      if (!secondaryPool) continue;
      
      // Log pool reserves
      console.log(`\nToken Pair: ${primaryPool.token0Symbol}/${primaryPool.token1Symbol}`);
      console.log('Primary Pool:');
      console.log(`- Address: ${primaryPool.pairAddress}`);
      console.log(`- Reserve0: ${primaryPool.reserve0} (${primaryPool.token0Symbol})`);
      console.log(`- Reserve1: ${primaryPool.reserve1} (${primaryPool.token1Symbol})`);
      
      console.log('Secondary Pool:');
      console.log(`- Address: ${secondaryPool.pairAddress}`);
      console.log(`- Reserve0: ${secondaryPool.reserve0} (${secondaryPool.token0Symbol})`);
      console.log(`- Reserve1: ${secondaryPool.reserve1} (${secondaryPool.token1Symbol})`);
      
      // Ensure we're comparing the same direction (token -> USDC)
      const primaryPrice = this.calculateTokenPrice(primaryPool);
      const secondaryPrice = this.calculateTokenPrice(secondaryPool);
      
      if (primaryPrice && secondaryPrice) {
        // Calculate price difference
        const priceDiff = Math.abs(primaryPrice - secondaryPrice);
        const priceDiffPercent = (priceDiff / Math.min(primaryPrice, secondaryPrice)) * 100;
        
        console.log('Prices:');
        console.log(`- Primary: ${primaryPrice.toFixed(6)} USDC`);
        console.log(`- Secondary: ${secondaryPrice.toFixed(6)} USDC`);
        console.log(`- Difference: ${priceDiffPercent.toFixed(2)}%`);
        
        // Check if difference is significant enough (> MIN_PROFIT_BPS)
        if (priceDiffPercent > (this.MIN_PROFIT_BPS / 100)) {
          // Determine buy/sell direction
          const buyFromPrimary = primaryPrice < secondaryPrice;
          
          // Get non-USDC token address
          const tokenAddress = primaryPool.token0 === this.usdcAddress 
            ? primaryPool.token1 
            : primaryPool.token0;
            
          // Get token symbol  
          const tokenSymbol = primaryPool.token0 === this.usdcAddress
            ? primaryPool.token1Symbol
            : primaryPool.token0Symbol;
          
          opportunities.push({
            tokenAddress,
            tokenSymbol,
            primaryPool,
            secondaryPool,
            primaryPrice,
            secondaryPrice,
            priceDiffPercent,
            buyFromPrimary,
            estimatedProfit: priceDiffPercent - (this.MAX_SLIPPAGE_BPS / 100)
          });
          
          console.log('*** Arbitrage Opportunity Found! ***');
        }
      }
    }
    
    // Sort by estimated profit (highest first)
    return opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  }
  
  /**
   * Calculate token price from pool reserves
   * @param pool Pool reserves
   * @returns Token price in USDC
   */
  private calculateTokenPrice(pool: PoolReserves): number | null {
    try {
      // Convert string reserves to BigInt
      const reserve0 = BigInt(pool.reserve0);
      const reserve1 = BigInt(pool.reserve1);
      
      // Constants for decimal adjustments
      const usdcDecimals = BigInt(6);
      const tokenDecimals = BigInt(18);
      
      // Calculate price based on which token is USDC
      if (pool.token0 === this.usdcAddress) {
        // USDC is token0, calculate price of token1 in USDC
        // Price = (USDC amount * 10^token decimals) / (Token amount * 10^USDC decimals)
        const priceInUSDC = (reserve0 * (BigInt(10) ** tokenDecimals)) / (reserve1 * (BigInt(10) ** usdcDecimals));
        return Number(priceInUSDC) / (10 ** 12); // Adjust for display (18 - 6 = 12)
      } else if (pool.token1 === this.usdcAddress) {
        // USDC is token1, calculate price of token0 in USDC
        // Price = (USDC amount * 10^token decimals) / (Token amount * 10^USDC decimals)
        const priceInUSDC = (reserve1 * (BigInt(10) ** tokenDecimals)) / (reserve0 * (BigInt(10) ** usdcDecimals));
        return Number(priceInUSDC) / (10 ** 12); // Adjust for display (18 - 6 = 12)
      }
      
      console.log('Warning: Pool does not contain USDC:', {
        token0: pool.token0,
        token1: pool.token1,
        usdcAddress: this.usdcAddress,
        reserve0: pool.reserve0,
        reserve1: pool.reserve1
      });
      
      return null; // Not a USDC pair
    } catch (error) {
      console.error('Error calculating token price:', error);
      console.log('Pool details:', {
        token0: pool.token0,
        token1: pool.token1,
        reserve0: pool.reserve0,
        reserve1: pool.reserve1
      });
      return null;
    }
  }
  
  /**
   * Get AI analysis of arbitrage opportunities
   * @param opportunities Arbitrage opportunities
   * @param agentInfo Agent information
   * @returns Promise with AI arbitrage decision
   */
  async getAIArbitrageDecision(
    opportunities: ArbitrageOpportunity[],
    agentInfo: AgentInfo
  ): Promise<ArbitrageDecision> {
    if (opportunities.length === 0) {
      return {
        shouldArbitrage: false,
        reason: 'No arbitrage opportunities found',
      };
    }
    
    // Get the best opportunity
    const bestOpportunity = opportunities[0];
    
    // Create prompt with arbitrage data for OpenAI
    const prompt = `
Analyze this arbitrage opportunity:
- Token: ${bestOpportunity.tokenSymbol} (${bestOpportunity.tokenAddress})
- Price in Primary Pool: ${bestOpportunity.primaryPrice} USDC
- Price in Secondary Pool: ${bestOpportunity.secondaryPrice} USDC
- Price Difference: ${bestOpportunity.priceDiffPercent.toFixed(2)}%
- Buy from ${bestOpportunity.buyFromPrimary ? 'Primary' : 'Secondary'} Pool
- Estimated Profit: ${bestOpportunity.estimatedProfit.toFixed(2)}%

Agent Info:
- USDC Balance: ${agentInfo.balances.usdc.formatted} USDC
- Strategy: ${agentInfo.configuration.tradeStrategy}
- Risk Level: ${agentInfo.configuration.riskLevel}

Should I execute this arbitrage? Provide a brief analysis and indicate Yes or No.
`;
    
    try {
      // Call OpenAI
      const response = await this.openai.generateAIArbitrageAnalysis(prompt);
      
      // Parse the response to determine decision
      const lowerCaseResponse = response.toLowerCase();
      const shouldArbitrage = 
        lowerCaseResponse.includes('yes') && 
        !lowerCaseResponse.includes('no');
      
      return {
        shouldArbitrage,
        reason: response,
        opportunity: bestOpportunity
      };
    } catch (error) {
      console.error('Error getting AI arbitrage decision:', error);
      return {
        shouldArbitrage: false,
        reason: 'Error connecting to AI service',
      };
    }
  }
  
  /**
   * Execute an arbitrage transaction using Gelato Relay
   * @param opportunity Arbitrage opportunity
   * @param agentInfo Agent information
   * @returns Promise with task ID
   */
  async executeArbitrage(
    opportunity: ArbitrageOpportunity,
    agentInfo: AgentInfo
  ): Promise<string> {
    // Calculate reasonable USDC amount to use (based on balance and risk)
    const usdcBalance = BigInt(agentInfo.balances.usdc.balance);
    
    // Use 10-30% of balance based on risk level (1-4)
    const riskPercent = BigInt(10 + (agentInfo.configuration.riskLevel - 1) * 5);
    const usdcToUse = (usdcBalance * riskPercent) / BigInt(100);
    
    // Calculate minimum profit amount (at least 0.5%)
    const minProfitAmount = (usdcToUse * BigInt(this.MIN_PROFIT_BPS)) / BigInt(10000);
    
    // Prepare contract call data
    const arbitrageData = this.agentContract.interface.encodeFunctionData(
      'arbitrage',
      [
        opportunity.tokenAddress,
        usdcToUse.toString(),
        opportunity.buyFromPrimary, // true if buying from primary pool
        minProfitAmount.toString()
      ]
    );
    
    // Create Gelato relay request
    const request: SponsoredCallRequest = {
      chainId: await this.provider.getNetwork().then(n => BigInt(n.chainId)),
      target: await this.agentContract.getAddress(),
      data: arbitrageData,
      user: await this.agentContract.getAddress()
    };
    
    try {
      // Submit to Gelato Relay
      const response = await this.relay.sponsoredCall(request, this.sponsorKey);
      console.log('Arbitrage transaction submitted to Gelato Relay');
      return response.taskId;
    } catch (error) {
      console.error('Failed to execute arbitrage transaction:', error);
      throw error;
    }
  }
  
  /**
   * Wait for Gelato Relay response
   * @param taskId Gelato task ID
   * @returns Promise with task status
   */
  async waitForRelay(taskId: string): Promise<any> {
    let retries = 0;
    const maxRetries = 12; // 1 minute with 5-second intervals
    
    while (retries < maxRetries) {
      try {
        const status = await this.relay.getTaskStatus(taskId);
        if (!status) {
          console.log(`No status yet for task ${taskId}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          retries++;
          continue;
        }

        console.log(`Task ${taskId} status: ${status.taskState}`);

        if (status.taskState === 'ExecSuccess') {
          return status;
        } else if (status.taskState === 'ExecReverted') {
          throw new Error(`Transaction reverted: ${status.taskState}`);
        } else if (status.taskState === 'Cancelled') {
          throw new Error(`Transaction cancelled: ${status.taskState}`);
        } 
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        retries++;
      } catch (error) {
        console.error(`Error checking relay status (attempt ${retries + 1}/${maxRetries}):`, error);
        await new Promise(resolve => setTimeout(resolve, 5000));
        retries++;
      }
    }
    
    throw new Error(`Transaction timed out after ${maxRetries} attempts`);
  }
}

// Types for arbitrage functionality
export interface ArbitrageOpportunity {
  tokenAddress: string;
  tokenSymbol: string;
  primaryPool: PoolReserves;
  secondaryPool: PoolReserves;
  primaryPrice: number;
  secondaryPrice: number;
  priceDiffPercent: number;
  buyFromPrimary: boolean;
  estimatedProfit: number;
}

export interface ArbitrageDecision {
  shouldArbitrage: boolean;
  reason: string;
  opportunity?: ArbitrageOpportunity;
} 