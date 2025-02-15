import { BigNumber } from 'ethers';
import { BaseTradingService } from './BaseTradingService';
import { TradingConfig, TradeParams, LiquidityParams, RemoveLiquidityParams } from './types';

/**
 * Trading service for LRT tokens
 */
export class LRTTradingService extends BaseTradingService {
    private constructor(config: TradingConfig) {
        super(config);
    }

    /**
     * Initialize a new instance of LRTTradingService
     */
    public static async initialize(config: TradingConfig): Promise<LRTTradingService> {
        const service = new LRTTradingService(config);
        await service.initializeContracts(config);
        return service;
    }

    /**
     * Calculate optimal swap amount based on current pool reserves and reward tokens
     */
    public async calculateOptimalSwapAmount(
        tokenAddress: string,
        maxAmount: BigNumber,
        rewardTokens: string[]
    ): Promise<BigNumber> {
        // Get expected output for main token
        const mainPath = [tokenAddress, await this.agent.usdc()];
        const mainAmounts = await this.router.getAmountsOut(maxAmount, mainPath);
        
        // Get expected outputs for reward tokens
        const rewardAmounts = await Promise.all(
            rewardTokens.map(async (rewardToken) => {
                const rewardPath = [rewardToken, await this.agent.usdc()];
                const amounts = await this.router.getAmountsOut(
                    maxAmount.div(rewardTokens.length), // Distribute amount among reward tokens
                    rewardPath
                );
                return amounts[1];
            })
        );

        // Sum up all expected outputs
        const totalExpectedOutput = rewardAmounts.reduce(
            (total, amount) => total.add(amount),
            mainAmounts[1]
        );
        
        // Use 98% of the optimal amount to account for price impact and reward token conversions
        return maxAmount.mul(98).div(100);
    }

    /**
     * Calculate optimal liquidity amounts considering reward tokens
     */
    public async calculateOptimalLiquidityAmounts(
        tokenAddress: string,
        maxTokenAmount: BigNumber,
        rewardTokens: string[]
    ): Promise<{ tokenAmount: BigNumber; usdcAmount: BigNumber }> {
        const pairAddress = await this.factory.getPair(tokenAddress, await this.agent.usdc());
        const pairContract = new Contract(
            pairAddress,
            [
                'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
                'function token0() external view returns (address)',
                'function token1() external view returns (address)'
            ],
            this.signer
        );

        const [reserve0, reserve1] = await pairContract.getReserves();
        const token0 = await pairContract.token0();
        
        // Determine which reserve corresponds to which token
        const [tokenReserve, usdcReserve] = token0 === tokenAddress ? [reserve0, reserve1] : [reserve1, reserve0];
        
        // Calculate base USDC amount based on current ratio
        let usdcAmount = maxTokenAmount.mul(usdcReserve).div(tokenReserve);
        
        // Adjust USDC amount based on reward tokens (reduce by 2% for each reward token)
        const rewardTokenAdjustment = rewardTokens.length * 2;
        usdcAmount = usdcAmount.mul(100 - rewardTokenAdjustment).div(100);
        
        return {
            tokenAmount: maxTokenAmount,
            usdcAmount
        };
    }

    /**
     * Execute a swap with optimal amounts considering reward tokens
     */
    public async executeOptimalSwap(
        tokenAddress: string,
        maxAmount: BigNumber,
        rewardTokens: string[],
        slippageTolerance: number = 0.5 // 0.5% default slippage tolerance
    ) {
        const optimalAmount = await this.calculateOptimalSwapAmount(
            tokenAddress,
            maxAmount,
            rewardTokens
        );
        
        const expectedOutput = await this.getExpectedOutputAmount(
            tokenAddress,
            await this.agent.usdc(),
            optimalAmount
        );

        // Add extra slippage tolerance for reward token conversions
        const adjustedSlippage = slippageTolerance + (rewardTokens.length * 0.1);
        const minAmountOut = expectedOutput
            .mul(1000 - Math.floor(adjustedSlippage * 10))
            .div(1000);

        return this.executeSwap({
            tokenAddress,
            amount: optimalAmount,
            minAmountOut,
            isUsdcIn: false
        });
    }

    /**
     * Add liquidity with optimal amounts considering reward tokens
     */
    public async addOptimalLiquidity(
        tokenAddress: string,
        maxTokenAmount: BigNumber,
        rewardTokens: string[],
        slippageTolerance: number = 0.5 // 0.5% default slippage tolerance
    ) {
        const { tokenAmount, usdcAmount } = await this.calculateOptimalLiquidityAmounts(
            tokenAddress,
            maxTokenAmount,
            rewardTokens
        );

        // Add extra slippage tolerance for reward token conversions
        const adjustedSlippage = slippageTolerance + (rewardTokens.length * 0.1);
        const minTokenAmount = tokenAmount
            .mul(1000 - Math.floor(adjustedSlippage * 10))
            .div(1000);
        const minUsdcAmount = usdcAmount
            .mul(1000 - Math.floor(adjustedSlippage * 10))
            .div(1000);

        return this.addLiquidity({
            tokenAddress,
            tokenAmount,
            usdcAmount,
            minTokenAmount,
            minUsdcAmount
        });
    }

    /**
     * Remove liquidity with optimal amounts considering reward tokens
     */
    public async removeOptimalLiquidity(
        tokenAddress: string,
        lpTokens: BigNumber,
        rewardTokens: string[],
        slippageTolerance: number = 0.5 // 0.5% default slippage tolerance
    ) {
        const pairAddress = await this.factory.getPair(tokenAddress, await this.agent.usdc());
        const pairContract = new Contract(
            pairAddress,
            [
                'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
                'function totalSupply() external view returns (uint256)',
                'function token0() external view returns (address)'
            ],
            this.signer
        );

        const [reserve0, reserve1] = await pairContract.getReserves();
        const totalSupply = await pairContract.totalSupply();
        const token0 = await pairContract.token0();

        // Determine which reserve corresponds to which token
        const [tokenReserve, usdcReserve] = token0 === tokenAddress ? [reserve0, reserve1] : [reserve1, reserve0];

        // Calculate expected amounts
        const expectedTokenAmount = lpTokens.mul(tokenReserve).div(totalSupply);
        const expectedUsdcAmount = lpTokens.mul(usdcReserve).div(totalSupply);

        // Add extra slippage tolerance for reward token conversions
        const adjustedSlippage = slippageTolerance + (rewardTokens.length * 0.1);
        const minTokenAmount = expectedTokenAmount
            .mul(1000 - Math.floor(adjustedSlippage * 10))
            .div(1000);
        const minUsdcAmount = expectedUsdcAmount
            .mul(1000 - Math.floor(adjustedSlippage * 10))
            .div(1000);

        return this.removeLiquidity({
            tokenAddress,
            lpTokens,
            minTokenAmount,
            minUsdcAmount
        });
    }
} 