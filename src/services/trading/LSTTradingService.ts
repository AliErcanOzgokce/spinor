import { BigNumber } from 'ethers';
import { BaseTradingService } from './BaseTradingService';
import { TradingConfig, TradeParams, LiquidityParams, RemoveLiquidityParams } from './types';

/**
 * Trading service for LST tokens
 */
export class LSTTradingService extends BaseTradingService {
    private constructor(config: TradingConfig) {
        super(config);
    }

    /**
     * Initialize a new instance of LSTTradingService
     */
    public static async initialize(config: TradingConfig): Promise<LSTTradingService> {
        const service = new LSTTradingService(config);
        await service.initializeContracts(config);
        return service;
    }

    /**
     * Calculate optimal swap amount based on current pool reserves
     */
    public async calculateOptimalSwapAmount(
        tokenAddress: string,
        maxAmount: BigNumber
    ): Promise<BigNumber> {
        const path = [tokenAddress, await this.agent.usdc()];
        const amounts = await this.router.getAmountsOut(maxAmount, path);
        
        // Use 99% of the optimal amount to account for price impact
        return amounts[0].mul(99).div(100);
    }

    /**
     * Calculate optimal liquidity amounts based on current pool reserves
     */
    public async calculateOptimalLiquidityAmounts(
        tokenAddress: string,
        maxTokenAmount: BigNumber
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
        
        // Calculate optimal USDC amount based on current ratio
        const usdcAmount = maxTokenAmount.mul(usdcReserve).div(tokenReserve);
        
        return {
            tokenAmount: maxTokenAmount,
            usdcAmount
        };
    }

    /**
     * Execute a swap with optimal amounts
     */
    public async executeOptimalSwap(
        tokenAddress: string,
        maxAmount: BigNumber,
        slippageTolerance: number = 0.5 // 0.5% default slippage tolerance
    ) {
        const optimalAmount = await this.calculateOptimalSwapAmount(tokenAddress, maxAmount);
        const expectedOutput = await this.getExpectedOutputAmount(
            tokenAddress,
            await this.agent.usdc(),
            optimalAmount
        );

        const minAmountOut = expectedOutput.mul(1000 - Math.floor(slippageTolerance * 10)).div(1000);

        return this.executeSwap({
            tokenAddress,
            amount: optimalAmount,
            minAmountOut,
            isUsdcIn: false
        });
    }

    /**
     * Add liquidity with optimal amounts
     */
    public async addOptimalLiquidity(
        tokenAddress: string,
        maxTokenAmount: BigNumber,
        slippageTolerance: number = 0.5 // 0.5% default slippage tolerance
    ) {
        const { tokenAmount, usdcAmount } = await this.calculateOptimalLiquidityAmounts(
            tokenAddress,
            maxTokenAmount
        );

        const minTokenAmount = tokenAmount.mul(1000 - Math.floor(slippageTolerance * 10)).div(1000);
        const minUsdcAmount = usdcAmount.mul(1000 - Math.floor(slippageTolerance * 10)).div(1000);

        return this.addLiquidity({
            tokenAddress,
            tokenAmount,
            usdcAmount,
            minTokenAmount,
            minUsdcAmount
        });
    }

    /**
     * Remove liquidity with optimal amounts
     */
    public async removeOptimalLiquidity(
        tokenAddress: string,
        lpTokens: BigNumber,
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

        // Apply slippage tolerance
        const minTokenAmount = expectedTokenAmount.mul(1000 - Math.floor(slippageTolerance * 10)).div(1000);
        const minUsdcAmount = expectedUsdcAmount.mul(1000 - Math.floor(slippageTolerance * 10)).div(1000);

        return this.removeLiquidity({
            tokenAddress,
            lpTokens,
            minTokenAmount,
            minUsdcAmount
        });
    }
} 