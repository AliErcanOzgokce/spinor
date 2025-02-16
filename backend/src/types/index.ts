export interface IUniswapV2Pair {
    getReserves(): Promise<[bigint, bigint, number]>;
    token0(): Promise<string>;
    token1(): Promise<string>;
}

export interface IPoolInfo {
    pairAddress: string;
    token0: string;
    token1: string;
    reserve0: string;
    reserve1: string;
    token0Symbol: string;
    token1Symbol: string;
    apy: number;
    slashingHistory: number;
}

export interface IDeployment {
    factory: string;
    router: string;
    usdc: string;
    tokens: {
        [key: string]: string;  // key: token name (LST1, LRT1, etc.), value: token address
    };
} 
 
 