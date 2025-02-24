import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { Contract } from 'ethers';
import { config } from './config';
import { UniswapService } from './services/UniswapService';
import { SwapService } from './services/SwapService';
import type { IDeployment, IPoolInfo } from './types';

const app = express();
app.use(cors());
app.use(express.json());

const uniswapService = new UniswapService(config.rpcUrl);

// Initialize and start swap service
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
if (!ADMIN_PRIVATE_KEY) {
    console.error('Warning: ADMIN_PRIVATE_KEY not found in environment variables. Automated swaps will not be available.');
} else {
    // const swapService = new SwapService(ADMIN_PRIVATE_KEY);
    // swapService.start().catch(error => {
    //     console.error('Error starting swap service:', error);
    // });

    // // Handle graceful shutdown
    // process.on('SIGINT', () => {
    //     console.log('Received SIGINT. Gracefully shutting down swap service...');
    //     swapService.stop();
    // });

    // process.on('SIGTERM', () => {
    //     console.log('Received SIGTERM. Gracefully shutting down swap service...');
    //     swapService.stop();
    // });
}

// First, collect all token prices and calculate ranges
interface TokenPrices {
    lst: number[];
    lrt: number[];
}

function calculatePriceRanges(poolInfos: Array<{
    name: string;
    tokenReserve: string;
    usdcReserve: string;
}>): TokenPrices {
    const prices = {
        lst: [] as number[],
        lrt: [] as number[]
    };

    for (const info of poolInfos) {
        const reserve0Big = BigInt(info.tokenReserve);
        const reserve1Big = BigInt(info.usdcReserve);
        const price = Number(reserve0Big * BigInt(1000000) / reserve1Big) / 1000000;
        
        if (info.name.includes('LST')) {
            prices.lst.push(price);
        } else {
            prices.lrt.push(price);
        }
    }

    return prices;
}

// Helper function to generate correlated APY and slashing history
function generateTokenMetrics(
    isLRT: boolean,
    tokenReserve: string,
    usdcReserve: string,
    priceRanges: TokenPrices
): { apy: number; slashingHistory: number } {
    // Calculate price (reserve0/reserve1) considering decimals
    const reserve0Big = BigInt(tokenReserve);
    const reserve1Big = BigInt(usdcReserve);
    const price = Number(reserve0Big * BigInt(1000000) / reserve1Big) / 1000000; // Adjust for 12 decimal difference (18-6)
    
    // Get min and max APY based on token type
    const [minAPY, maxAPY] = isLRT ? [7, 12] : [3, 7];
    const APYRange = maxAPY - minAPY;
    
    // Get current price range for this token type
    const prices = isLRT ? priceRanges.lrt : priceRanges.lst;
    const priceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices)
    };
    
    // Calculate normalized price
    const normalizedPrice = (price - priceRange.min) / (priceRange.max - priceRange.min);
    
    // Direct relationship with APY (higher price = lower APY)
    const apy = Number((minAPY + ((1 - normalizedPrice) * APYRange)).toFixed(2));
    
    // Direct relationship with slashing (higher price = lower slashing)
    const slashingHistory = Number((4 * (1 - normalizedPrice)).toFixed(2));
    
    return {
        apy,
        slashingHistory
    };
}

app.get('/api/pool-reserves', async (req: Request, res: Response) => {
    try {
        // Read deployments.json
        const deploymentsData = await fs.readFile(config.deploymentPath, 'utf-8');
        const deployments: IDeployment = JSON.parse(deploymentsData);

        // Validate deployments data
        if (!deployments || !deployments.tokens || typeof deployments.tokens !== 'object') {
            throw new Error('Invalid deployments data format');
        }

        // Create factory contract instance
        const factoryContract = new Contract(
            deployments.factory,
            [
                'function getPair(address tokenA, address tokenB) view returns (address)'
            ],
            uniswapService['provider']
        );

        // Get all LST and LRT contracts
        const tokenContracts = Object.entries(deployments.tokens)
            .filter(([name]) => name.includes('LST') || name.includes('LRT'));

        if (tokenContracts.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'No LST or LRT contracts found'
            });
        }

        // First pass: collect all reserves and calculate price ranges
        const tokenData: Array<{
            name: string;
            address: string;
            tokenReserve: string;
            usdcReserve: string;
            pairAddress: string;
            token0: string;
            token1: string;
            symbol: string;
            usdcSymbol: string;
            isToken0LST: boolean;
        }> = [];

        for (const [name, address] of tokenContracts) {
            try {
                if (!address) {
                    console.error(`Missing address for token ${name}`);
                    continue;
                }

                const tokenContract = new Contract(
                    address,
                    ['function symbol() view returns (string)'],
                    uniswapService['provider']
                );
                const symbol = await tokenContract.symbol();

                const pairAddress = await factoryContract.getPair(address, deployments.usdc);

                if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
                    console.error(`No Uniswap pair found for ${name}`);
                    continue;
                }

                const { reserve0, reserve1 } = await uniswapService.getPoolReserves(pairAddress);
                const { token0, token1 } = await uniswapService.getTokenAddresses(pairAddress);

                const usdcContract = new Contract(
                    deployments.usdc,
                    ['function symbol() view returns (string)'],
                    uniswapService['provider']
                );
                const usdcSymbol = await usdcContract.symbol();

                const isToken0LST = token0.toLowerCase() === address.toLowerCase();
                const tokenReserve = isToken0LST ? reserve0 : reserve1;
                const usdcReserve = isToken0LST ? reserve1 : reserve0;

                tokenData.push({
                    name,
                    address,
                    tokenReserve: tokenReserve.toString(),
                    usdcReserve: usdcReserve.toString(),
                    pairAddress,
                    token0,
                    token1,
                    symbol,
                    usdcSymbol,
                    isToken0LST
                });
            } catch (error) {
                console.error(`Error processing ${name}:`, error);
            }
        }

        // Calculate price ranges from collected data
        const priceRanges = calculatePriceRanges(tokenData.map(data => ({
            name: data.name,
            tokenReserve: data.tokenReserve,
            usdcReserve: data.usdcReserve
        })));

        // Second pass: generate metrics using dynamic price ranges
        const poolInfos = tokenData.map(data => {
            const isLRT = data.name.includes('LRT');
            const { apy, slashingHistory } = generateTokenMetrics(
                isLRT,
                data.tokenReserve,
                data.usdcReserve,
                priceRanges
            );

            return {
                pairAddress: data.pairAddress,
                token0: data.isToken0LST ? data.token0 : data.token1,
                token1: data.isToken0LST ? data.token1 : data.token0,
                reserve0: data.tokenReserve,
                reserve1: data.usdcReserve,
                token0Symbol: data.symbol,
                token1Symbol: data.usdcSymbol,
                apy,
                slashingHistory
            };
        });

        res.json({
            success: true,
            data: poolInfos,
            message: poolInfos.length > 0 ? 'Pool information retrieved successfully' : 'No valid pools found'
        });
    } catch (error) {
        console.error('Error fetching pool reserves:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch pool reserves'
        });
    }
});

app.get('/api/agent-info', async (req: Request, res: Response) => {
    try {
        // Read deployments file
        const deploymentsData = await fs.readFile(config.deploymentPath, 'utf-8');
        const deployments: IDeployment = JSON.parse(deploymentsData);

        // Create agent contract instance with minimal ABI
        const agentABI = [
            'function tradeStrategy() public view returns (uint256)',
            'function riskLevel() public view returns (uint256)'
        ];
        const agentContract = new Contract(deployments.agent, agentABI, uniswapService['provider']);

        // Create ERC20 interface for token balance checks
        const erc20ABI = [
            'function balanceOf(address) view returns (uint256)',
            'function decimals() view returns (uint8)',
            'function symbol() view returns (string)'
        ];

        // Create factory contract instance for LP token checks
        const factoryContract = new Contract(
            deployments.factory,
            ['function getPair(address tokenA, address tokenB) view returns (address)'],
            uniswapService['provider']
        );

        // Get agent's configuration
        const [tradeStrategy, riskLevel] = await Promise.all([
            agentContract.tradeStrategy(),
            agentContract.riskLevel()
        ]);

        // Get USDC balance
        const usdcContract = new Contract(deployments.usdc, erc20ABI, uniswapService['provider']);
        const [usdcDecimals, usdcBalance] = await Promise.all([
            usdcContract.decimals(),
            usdcContract.balanceOf(deployments.agent)
        ]);

        // Initialize arrays for token and LP balances
        const tokenBalances = [];
        const lpBalances = [];

        // Process all LST and LRT tokens
        const tokenEntries = Object.entries(deployments.tokens);
        for (const [symbol, address] of tokenEntries) {
            // Get token balance
            const tokenContract = new Contract(address, erc20ABI, uniswapService['provider']);
            const [decimals, balance] = await Promise.all([
                tokenContract.decimals(),
                tokenContract.balanceOf(deployments.agent)
            ]);

            // Get LP token balance
            const pairAddress = await factoryContract.getPair(address, deployments.usdc);
            let lpBalance = BigInt(0);

            if (pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000') {
                const lpContract = new Contract(pairAddress, erc20ABI, uniswapService['provider']);
                lpBalance = await lpContract.balanceOf(deployments.agent);
            }

            // Add token balance
            tokenBalances.push({
                symbol,
                address,
                balance: balance.toString(),
                formatted: Number(balance) / 10 ** Number(decimals)
            });

            // Add LP balance
            lpBalances.push({
                symbol: `${symbol}/USDC`,
                pairAddress,
                balance: lpBalance.toString(),
                formatted: Number(lpBalance) / 10 ** 18
            });
        }

        // Prepare response
        const response = {
            success: true,
            data: {
                configuration: {
                    tradeStrategy: Number(tradeStrategy),
                    riskLevel: Number(riskLevel)
                },
                balances: {
                    usdc: {
                        balance: usdcBalance.toString(),
                        formatted: Number(usdcBalance) / 10 ** Number(usdcDecimals)
                    },
                    tokens: tokenBalances,
                    liquidityPools: lpBalances
                }
            },
            message: 'Agent information retrieved successfully'
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching pool data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pool data'
        });
    }
});

export { app }; 