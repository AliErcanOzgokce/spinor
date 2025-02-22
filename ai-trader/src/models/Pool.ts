export interface PoolInfo {
    pairAddress: string;
    token0: string;
    token1: string;
    reserve0: string;
    reserve1: string;
    token0Symbol: string;
    token1Symbol: string;
    apy: number | null;
    slashingHistory: number | null;
}

export interface PoolResponse {
    success: boolean;
    message?: string;
    data: PoolInfo[];
} 