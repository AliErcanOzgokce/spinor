// Pool and Token Types
export interface PoolReserves {
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

export interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
  formatted: number;
}

export interface LiquidityPoolBalance {
  symbol: string;
  pairAddress: string;
  balance: string;
  formatted: number;
}

// Agent Types
export interface AgentBalances {
  usdc: {
    balance: string;
    formatted: number;
  };
  tokens: TokenBalance[];
  liquidityPools: LiquidityPoolBalance[];
}

export interface AgentConfiguration {
  tradeStrategy: number;
  riskLevel: number;
}

export interface AgentInfo {
  configuration: AgentConfiguration;
  balances: AgentBalances;
}

// API Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// Trade Types
export interface TradeAction {
  type: 'swap' | 'addLiquidity' | 'removeLiquidity' | 'none';
  tokenA?: string; // Token address
  tokenB?: string; // Token address
  amountA?: string;
  amountB?: string;
  reason: string;
}

export interface TradeHistory {
  timestamp: number;
  action: TradeAction;
  txHash: string;
  status: 'success' | 'failed';
  gasUsed: string;
  blockNumber: number;
}

export enum TradeStrategy {
  BestLST = 1,
  BestLSTWithLiquidity = 2,
  BestLRT = 3,
  BestLRTWithLiquidity = 4,
  Arbitrage = 5
}

export interface TokenMetrics {
  address: string;
  symbol: string;
  apy: number;
  slashingHistory: number;
  riskScore: number;
} 