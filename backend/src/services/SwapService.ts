import { Contract, Wallet } from 'ethers';
import { UniswapService } from './UniswapService';
import type { IDeployment } from '../types';
import fs from 'fs/promises';
import { config } from '../config';

export class SwapService {
    private uniswapService: UniswapService;
    private adminWallet: Wallet;
    private deployments!: IDeployment;
    private isRunning: boolean = false;

    constructor(privateKey: string) {
        this.uniswapService = new UniswapService(config.rpcUrl);
        this.adminWallet = new Wallet(privateKey, this.uniswapService['provider']);
    }

    private async loadDeployments(): Promise<void> {
        const deploymentsData = await fs.readFile(config.deploymentPath, 'utf-8');
        this.deployments = JSON.parse(deploymentsData);
    }

    private async ensureTokenBalance(tokenAddress: string, tokenSymbol: string): Promise<void> {
        const tokenContract = new Contract(
            tokenAddress,
            [
                'function balanceOf(address) view returns (uint256)',
                'function mint(address to, uint256 amount) returns (bool)',
                'function decimals() view returns (uint8)'
            ],
            this.adminWallet
        );

        const decimals = await tokenContract.decimals();
        const balance = await tokenContract.balanceOf(this.adminWallet.address);

        // If balance is less than 1000 tokens, mint 10000 tokens
        const minBalance = BigInt(1000) * BigInt(10) ** BigInt(decimals);
        const mintAmount = BigInt(10000) * BigInt(10) ** BigInt(decimals);

        if (balance < minBalance) {
            console.log(`Minting ${tokenSymbol}...`);
            try {
                const tx = await tokenContract.mint(this.adminWallet.address, mintAmount);
                await tx.wait();
                console.log(`Minted ${mintAmount.toString()} ${tokenSymbol}`);
            } catch (error) {
                console.error(`Error minting ${tokenSymbol}:`, error);
            }
        }
    }

    private async initializeTokenBalances(): Promise<void> {
        console.log('Initializing token balances...');

        // Mint USDC first
        await this.ensureTokenBalance(this.deployments.usdc, 'USDC');

        // Get all LST and LRT tokens
        const tokens = Object.entries(this.deployments.tokens)
            .filter(([name]) => name.includes('LST') || name.includes('LRT'));

        // Mint each token
        for (const [name, address] of tokens) {
            await this.ensureTokenBalance(address, name);
        }

        console.log('Token balances initialized');
    }

    private async checkPairLiquidity(
        pairAddress: string,
        tokenAddress: string
    ): Promise<{ hasLiquidity: boolean; tokenReserve: bigint; usdcReserve: bigint }> {
        const { reserve0, reserve1 } = await this.uniswapService.getPoolReserves(pairAddress);
        const { token0 } = await this.uniswapService.getTokenAddresses(pairAddress);

        const isToken0Target = token0.toLowerCase() === tokenAddress.toLowerCase();
        const tokenReserve = isToken0Target ? reserve0 : reserve1;
        const usdcReserve = isToken0Target ? reserve1 : reserve0;

        console.log('Pool reserves:', {
            tokenReserve: tokenReserve.toString(),
            usdcReserve: usdcReserve.toString(),
            token0,
            tokenAddress
        });

        // Check if there's sufficient liquidity (both reserves must be > 0)
        const hasLiquidity = tokenReserve > BigInt(0) && usdcReserve > BigInt(0);

        if (!hasLiquidity) {
            console.log('Insufficient liquidity:', {
                tokenReserve: tokenReserve.toString(),
                usdcReserve: usdcReserve.toString()
            });
        }

        return { hasLiquidity, tokenReserve, usdcReserve };
    }

    private calculateSwapAmount(reserve: bigint): bigint {
        // Calculate amount between 5% and 15% of reserve
        const minAmount = reserve * BigInt(5) / BigInt(100); // 5%
        const maxAmount = reserve * BigInt(15) / BigInt(100); // 15%
        
        const randomAmount = minAmount + (BigInt(Math.floor(Math.random() * 100)) * (maxAmount - minAmount) / BigInt(100));
        console.log('Calculated swap amount:', {
            minAmount: minAmount.toString(),
            maxAmount: maxAmount.toString(),
            randomAmount: randomAmount.toString()
        });
        
        return randomAmount;
    }

    private async performRandomSwap(
        tokenAddress: string,
        pairAddress: string,
        tokenSymbol: string
    ): Promise<void> {
        try {
            // Check liquidity first
            const { hasLiquidity, tokenReserve, usdcReserve } = await this.checkPairLiquidity(pairAddress, tokenAddress);
            
            if (!hasLiquidity) {
                console.log(`Insufficient liquidity for ${tokenSymbol}/USDC pair`);
                return;
            }

            // Randomly decide swap direction (true = token->USDC, false = USDC->token)
            const isTokenToUsdc = Math.random() < 0.5;

            // Create contract instances with full ABI
            const tokenContract = new Contract(
                tokenAddress,
                [
                    'function balanceOf(address) view returns (uint256)',
                    'function approve(address spender, uint256 amount) returns (bool)',
                    'function transfer(address to, uint256 amount) returns (bool)',
                    'function allowance(address owner, address spender) view returns (uint256)',
                    'function decimals() view returns (uint8)'
                ],
                this.adminWallet
            );

            const usdcContract = new Contract(
                this.deployments.usdc,
                [
                    'function balanceOf(address) view returns (uint256)',
                    'function approve(address spender, uint256 amount) returns (bool)',
                    'function allowance(address owner, address spender) view returns (uint256)',
                    'function decimals() view returns (uint8)'
                ],
                this.adminWallet
            );

            const routerContract = new Contract(
                this.deployments.router,
                [
                    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
                ],
                this.adminWallet
            );

            // Get token decimals
            const tokenDecimals = await tokenContract.decimals();
            const usdcDecimals = await usdcContract.decimals();
            console.log(`Token ${tokenSymbol} decimals: ${tokenDecimals}, USDC decimals: ${usdcDecimals}`);

            // Calculate swap amount based on input token's reserve
            const swapAmount = this.calculateSwapAmount(isTokenToUsdc ? tokenReserve : usdcReserve);
            console.log(`Calculated swap amount for ${isTokenToUsdc ? tokenSymbol : 'USDC'}: ${swapAmount.toString()}`);

            // Set path based on direction
            const path = isTokenToUsdc 
                ? [tokenAddress, this.deployments.usdc]
                : [this.deployments.usdc, tokenAddress];
            
            // Calculate expected output amount using x * y = k formula
            // (x + dx)(y - dy) = xy
            // dy = (y * dx) / (x + dx)
            const [inputReserve, outputReserve] = isTokenToUsdc 
                ? [tokenReserve, usdcReserve]
                : [usdcReserve, tokenReserve];

            const amountInWithFee = swapAmount * BigInt(997); // 0.3% fee
            const numerator = amountInWithFee * outputReserve;
            const denominator = (inputReserve * BigInt(1000)) + amountInWithFee;
            const expectedOutput = numerator / denominator;

            console.log('Swap details:', {
                operation: isTokenToUsdc ? `${tokenSymbol} -> USDC` : `USDC -> ${tokenSymbol}`,
                amountIn: swapAmount.toString(),
                expectedOutput: expectedOutput.toString(),
                path,
                tokenReserve: tokenReserve.toString(),
                usdcReserve: usdcReserve.toString()
            });
            
            // Check balance of input token
            const inputContract = isTokenToUsdc ? tokenContract : usdcContract;
            const inputBalance = await inputContract.balanceOf(this.adminWallet.address);
            console.log(`Input token balance: ${inputBalance.toString()}`);
            
            if (inputBalance < swapAmount) {
                console.log(`Insufficient ${isTokenToUsdc ? tokenSymbol : 'USDC'} balance for swap`);
                return;
            }

            // Check allowance and approve if needed
            const allowance = await inputContract.allowance(this.adminWallet.address, this.deployments.router);
            if (allowance < swapAmount) {
                console.log(`Approving ${isTokenToUsdc ? tokenSymbol : 'USDC'} for router...`);
                const approveTx = await inputContract.approve(this.deployments.router, BigInt(2) ** BigInt(256) - BigInt(1));
                await approveTx.wait();
                console.log('Approval completed');
            }

            try {
                // Calculate minimum output with 10% slippage tolerance
                const slippage = BigInt(90); // 10% slippage tolerance
                const minOutWithSlippage = (expectedOutput * slippage) / BigInt(100);

                // Execute swap with deadline
                const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes deadline
                console.log(`Executing swap: ${isTokenToUsdc ? tokenSymbol : 'USDC'} -> ${isTokenToUsdc ? 'USDC' : tokenSymbol}`);
                console.log(`Amount In: ${swapAmount.toString()}`);
                console.log(`Min Amount Out: ${minOutWithSlippage.toString()}`);

                const tx = await routerContract.swapExactTokensForTokens(
                    swapAmount,
                    minOutWithSlippage,
                    path,
                    this.adminWallet.address,
                    deadline,
                    { gasLimit: 500000 }
                );

                console.log(`Swap transaction sent: ${tx.hash}`);
                await tx.wait();
                console.log('Swap completed successfully');
            } catch (error) {
                console.error(`Error in swap for ${isTokenToUsdc ? tokenSymbol : 'USDC'}:`, error);
                // Add longer delay before retrying on error
                await new Promise(resolve => setTimeout(resolve, 10000));
                return;
            }
        } catch (error) {
            console.error(`Error performing swap:`, error);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }

    public async start(): Promise<void> {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            await this.loadDeployments();
            console.log('Deployments loaded');
            
            await this.initializeTokenBalances();
            console.log('Token balances initialized');

            // Get LST and LRT tokens
            const tokens = Object.entries(this.deployments.tokens)
                .filter(([name]) => name.includes('LST') || name.includes('LRT'));

            console.log('Starting automated swap service...');
            console.log('Available tokens:', tokens.map(([name]) => name).join(', '));

            // Main loop
            while (this.isRunning) {
                for (const [name, address] of tokens) {
                    if (!this.isRunning) break;

                    try {
                        // Get pair address
                        const factoryContract = new Contract(
                            this.deployments.factory,
                            ['function getPair(address, address) view returns (address)'],
                            this.adminWallet
                        );
                        const pairAddress = await factoryContract.getPair(address, this.deployments.usdc);

                        if (pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000') {
                            await this.performRandomSwap(address, pairAddress, name);
                        } else {
                            console.log(`No liquidity pool found for ${name}/USDC`);
                        }
                    } catch (error) {
                        console.error(`Error processing ${name}:`, error);
                    }

                    // Random delay between 5-15 seconds between tokens
                    if (this.isRunning) {
                        await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 10000));
                    }
                }

                // Wait for 1 minute before next round
                if (this.isRunning) {
                    await new Promise(resolve => setTimeout(resolve, 60000));
                }
            }
        } catch (error) {
            console.error('Error in swap service:', error);
            this.isRunning = false;
        }
    }

    public stop(): void {
        this.isRunning = false;
        console.log('Stopping automated swap service...');
    }
} 