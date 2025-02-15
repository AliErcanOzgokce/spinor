import { BigNumber, providers, Signer } from 'ethers';

/**
 * Configuration for trading services
 */
export interface TradingConfig {
    agentAddress: string;
    routerAddress: string;
    factoryAddress: string;
    usdcAddress: string;
    provider: providers.Provider;
    signer: Signer;
}

/**
 * Trading parameters
 */
export interface TradeParams {
    tokenAddress: string;
    amount: BigNumber;
    minAmountOut: BigNumber;
    isUsdcIn: boolean;
}

/**
 * Liquidity parameters
 */
export interface LiquidityParams {
    tokenAddress: string;
    tokenAmount: BigNumber;
    usdcAmount: BigNumber;
    minTokenAmount: BigNumber;
    minUsdcAmount: BigNumber;
}

/**
 * Remove liquidity parameters
 */
export interface RemoveLiquidityParams {
    tokenAddress: string;
    lpTokens: BigNumber;
    minTokenAmount: BigNumber;
    minUsdcAmount: BigNumber;
}

/**
 * Trade result
 */
export interface TradeResult {
    success: boolean;
    amountIn: BigNumber;
    amountOut: BigNumber;
    error?: string;
}

/**
 * Liquidity result
 */
export interface LiquidityResult {
    success: boolean;
    tokenAmount: BigNumber;
    usdcAmount: BigNumber;
    lpTokens?: BigNumber;
    error?: string;
}

/**
 * Trading service interface
 */
export interface ITradingService {
    executeSwap(params: TradeParams): Promise<TradeResult>;
    addLiquidity(params: LiquidityParams): Promise<LiquidityResult>;
    removeLiquidity(params: RemoveLiquidityParams): Promise<LiquidityResult>;
    getExpectedOutputAmount(tokenIn: string, tokenOut: string, amountIn: BigNumber): Promise<BigNumber>;
    getLPTokenBalance(tokenAddress: string): Promise<BigNumber>;
    getTokenBalance(tokenAddress: string): Promise<BigNumber>;
} 