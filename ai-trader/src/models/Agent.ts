export enum TradeStrategy {
    BEST_LST = 1,
    LST_LIQUIDITY = 2,
    BEST_LRT = 3,
    LRT_LIQUIDITY = 4,
    ARBITRAGE = 5
}

export enum RiskLevel {
    VERY_LOW = 1,
    LOW = 2,
    MEDIUM = 3,
    HIGH = 4
}

export interface AgentConfig {
    configuration: {
        tradeStrategy: TradeStrategy;
        riskLevel: RiskLevel;
    };
    balances: {
        usdc: {
            balance: string;
            formatted: number;
        };
    };
}

export interface AgentResponse {
    success: boolean;
    message?: string;
    data: AgentConfig;
} 