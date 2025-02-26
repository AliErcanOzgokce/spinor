import { ethers } from 'ethers';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

class ArbitrageService {
  private async loadPoolReserves(factory: ethers.Contract): Promise<PoolReserves[]> {
    try {
      // Safety check: Make sure factory is defined
      if (!factory) {
        console.error('Factory contract is null or undefined');
        return [];
      }
      
      // Check if factory has an address property that we can access
      let factoryAddress: string;
      try {
        factoryAddress = factory.address;
        console.log('Factory address:', factoryAddress);
        if (!factoryAddress) {
          throw new Error('Factory address is empty or undefined');
        }
      } catch (error) {
        console.error('Error accessing factory address:', error);
        return [];
      }
      
      // Check if we're using factory1 (primary) or factory2 (secondary)
      const isSecondaryFactory = this.factory2 && factoryAddress.toLowerCase() === 
        (this.factory2.address?.toLowerCase() || '');
      
      if (isSecondaryFactory) {
        // We're loading from secondary factory (factory2)
        try {
          console.log('Fetching secondary pool reserves...');
          
          // First try to load from API
          try {
            const response = await axios.get('http://localhost:3000/api/pool-reserves');
            
            if (response.status === 200 && response.data.success) {
              console.log(`Received ${response.data.data.length} secondary pools from API`);
              return response.data.data;
            }
          } catch (apiError) {
            console.log('Secondary pool API not available, falling back to file');
            // Continue to file-based fallback below
          }
          
          // Fallback to file-based loading
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          
          const projectRoot = path.resolve(__dirname, '../../../');
          const deployments2Path = path.join(projectRoot, 'hardhat/deployments2.json');
          
          console.log('Looking for deployments2.json at:', deployments2Path);
          const deployments2 = JSON.parse(fs.readFileSync(deployments2Path, 'utf8'));
          
          const pools: PoolReserves[] = [];
          
          if (deployments2.pairs) {
            for (const [symbol, pairData] of Object.entries(deployments2.pairs)) {
              // Type assertion to access properties
              const pair = pairData as any;
              
              // Determine token order based on token0 field
              const isUsdcToken0 = pair.token0 === this.usdcAddress;
              const token0Symbol = isUsdcToken0 ? 'USDC' : symbol;
              const token1Symbol = isUsdcToken0 ? symbol : 'USDC';
              
              // Default values for APY and slashing
              const apy = 5; // Default APY value
              const slashingHistory = 0; // Default slashing history
              
              pools.push({
                pairAddress: pair.address,
                token0: pair.token0,
                token1: pair.token1,
                reserve0: pair.reserve0 || '0',
                reserve1: pair.reserve1 || '0',
                token0Symbol,
                token1Symbol,
                apy,
                slashingHistory
              });
            }
          }
          
          console.log(`Loaded ${pools.length} secondary pools from file`);
          return pools;
          
        } catch (err) {
          console.error('Error loading secondary pools:', err);
          return [];
        }
      } else {
        // For primary pools, use the API endpoint
        try {
          console.log('Fetching primary pool reserves from API...');
          const response = await axios.get('http://localhost:3000/api/pool-reserves');
          
          if (response.status !== 200 || !response.data.success) {
            throw new Error(`API returned error: ${response.data.message || 'Unknown error'}`);
          }
          
          console.log(`Received ${response.data.data.length} primary pools from API`);
          return response.data.data;
          
        } catch (error) {
          console.error('Error fetching from API:', error);
          
          // Fallback: Create mock data from tokens in deployments.json
          console.log('Using fallback method for primary pools...');
          
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          
          const projectRoot = path.resolve(__dirname, '../../../');
          const deploymentsPath = path.join(projectRoot, 'hardhat/deployments.json');
          
          console.log('Looking for deployments.json at:', deploymentsPath);
          const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
          
          const pools: PoolReserves[] = [];
          
          if (deployments.tokens) {
            const usdcAddress = deployments.usdc;
            
            for (const [symbol, tokenAddress] of Object.entries(deployments.tokens)) {
              // Default values for APY and slashing
              const apy = symbol.startsWith('LST') ? 3 : 7; // Higher APY for LRT tokens
              const slashingHistory = symbol.startsWith('LST') ? 0 : 1; // Higher slashing for LRT tokens
              
              pools.push({
                pairAddress: ethers.constants.AddressZero, // Placeholder
                token0: usdcAddress as string,
                token1: tokenAddress as string,
                reserve0: '100000000000', // 100,000 USDC with 6 decimals
                reserve1: '100000000000000000000000', // 100,000 tokens with 18 decimals
                token0Symbol: 'USDC',
                token1Symbol: symbol,
                apy,
                slashingHistory
              });
            }
          }
          
          console.log(`Created ${pools.length} mock primary pools`);
          return pools;
        }
      }
    } catch (error) {
      console.error('Failed to load pool reserves:', error);
      return [];
    }
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
      
      // Directly fetch from API for primary pools
      try {
        console.log('Fetching primary pools directly from API...');
        const response = await axios.get('http://localhost:3000/api/pool-reserves');
        if (response.status === 200 && response.data.success) {
          primaryPools = response.data.data;
          console.log(`Fetched ${primaryPools.length} primary pools from API`);
        }
      } catch (error) {
        console.error('Failed to fetch primary pools from API:', error);
        
        // Fallback to loading from deployments.json
        try {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const projectRoot = path.resolve(__dirname, '../../../');
          const deploymentsPath = path.join(projectRoot, 'hardhat/deployments.json');
          
          console.log('Loading primary pools from:', deploymentsPath);
          const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
          
          if (deployments.tokens) {
            const usdcAddress = deployments.usdc;
            
            for (const [symbol, tokenAddress] of Object.entries(deployments.tokens)) {
              // Default values for APY and slashing
              const apy = symbol.startsWith('LST') ? 3 : 7; // Higher APY for LRT tokens
              const slashingHistory = symbol.startsWith('LST') ? 0 : 1; // Higher slashing for LRT tokens
              
              primaryPools.push({
                pairAddress: ethers.constants.AddressZero, // Placeholder
                token0: usdcAddress as string,
                token1: tokenAddress as string,
                reserve0: '100000000000', // 100,000 USDC with 6 decimals
                reserve1: '100000000000000000000000', // 100,000 tokens with 18 decimals
                token0Symbol: 'USDC',
                token1Symbol: symbol,
                apy,
                slashingHistory
              });
            }
          }
          console.log(`Created ${primaryPools.length} mock primary pools`);
        } catch (fileError) {
          console.error('Failed to load primary pools from file:', fileError);
        }
      }
      
      // Load secondary pools from deployments2.json directly
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
        console.error('Failed to load secondary pools:', error);
      }
      
      console.log(`Found ${primaryPools.length} primary pools and ${secondaryPools.length} secondary pools`);
      
      return { primaryPools, secondaryPools };
    } catch (error) {
      console.error('Error fetching pool reserves from both factories:', error);
      return { primaryPools: [], secondaryPools: [] };
    }
  }
} 