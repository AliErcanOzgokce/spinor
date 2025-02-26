import axios from 'axios';
import type { PoolReserves, ApiResponse } from '../types';

export class PoolService {
  private readonly baseUrl: string;
  private pools: PoolReserves[] = [];

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async getPoolReserves(): Promise<PoolReserves[]> {
    try {
      const response = await axios.get<ApiResponse<PoolReserves[]>>(
        `${this.baseUrl}/api/pool-reserves`
      );

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      this.pools = response.data.data;
      return this.pools;
    } catch (error) {
      console.error('Failed to fetch pool reserves:', error);
      throw error;
    }
  }

  async findBestLSTPool(riskLevel: number): Promise<PoolReserves | null> {
    await this.updatePools();
    return this.findBestPool('LST', riskLevel);
  }

  async findBestLRTPool(riskLevel: number): Promise<PoolReserves | null> {
    await this.updatePools();
    return this.findBestPool('LRT', riskLevel);
  }

  private async updatePools(): Promise<void> {
    this.pools = await this.getPoolReserves();
  }

  private findBestPool(tokenType: 'LST' | 'LRT', riskLevel: number): PoolReserves | null {
    const relevantPools = this.pools.filter(pool => 
      pool.token0Symbol.startsWith(tokenType)
    );

    if (relevantPools.length === 0) return null;

    // For high risk (level 4), directly sort by APY
    if (riskLevel === 4) {
      const poolsByApy = [...relevantPools].sort((a, b) => b.apy - a.apy);
      const bestPool = poolsByApy[0];
      // Add the APY as the score for display purposes
      (bestPool as any).riskScore = bestPool.apy;
      return bestPool;
    }

    // For other risk levels, calculate risk scores
    const poolsWithScores = relevantPools.map(pool => {
      const score = this.calculateRiskScore(pool.apy, pool.slashingHistory, riskLevel);
      // Store the score in the pool object for display purposes
      (pool as any).riskScore = score;
      return { pool, score };
    });

    // Sort by score (higher is better)
    poolsWithScores.sort((a, b) => b.score - a.score);

    return poolsWithScores[0].pool;
  }

  private calculateRiskScore(apy: number, slashingHistory: number, riskLevel: number): number {
    // For low risk (risk level 1), heavily penalize slashing history
    if (riskLevel === 1) {
      const slashingPenalty = slashingHistory / 4;
      return Math.max(0, apy * (1 - slashingPenalty));
    }

    // For medium risk (risk levels 2-3), use weighted approach
    const weights = {
      2: { apy: 0.7, slashing: 0.3 },
      3: { apy: 0.9, slashing: 0.1 }
    };

    const { apy: apyWeight, slashing: slashingWeight } = weights[riskLevel as 2 | 3];
    const slashingPenalty = (slashingHistory / 4) * slashingWeight;
    
    return Math.max(0, apy * apyWeight * (1 - slashingPenalty));
  }

  async findArbitragePairs(): Promise<{
    tokenA: string;
    tokenB: string;
    poolA: PoolReserves;
    poolB: PoolReserves;
    profitPercentage: number;
  } | null> {
    await this.updatePools();
    
    // Group pools by token pairs
    const poolsByPair = new Map<string, PoolReserves[]>();
    
    this.pools.forEach(pool => {
      const pairKey = `${pool.token0}_${pool.token1}`;
      if (!poolsByPair.has(pairKey)) {
        poolsByPair.set(pairKey, []);
      }
      poolsByPair.get(pairKey)!.push(pool);
    });

    let bestArbitrage = null;
    let maxProfit = 0;

    // Check each pair for arbitrage opportunities
    for (const [_, pairPools] of poolsByPair) {
      if (pairPools.length < 2) continue;

      for (let i = 0; i < pairPools.length; i++) {
        for (let j = i + 1; j < pairPools.length; j++) {
          const poolA = pairPools[i];
          const poolB = pairPools[j];

          // Calculate price in each pool
          const priceA = this.calculatePrice(poolA);
          const priceB = this.calculatePrice(poolB);

          // Calculate potential profit
          const profitPercentage = Math.abs((priceA - priceB) / priceA) * 100;

          if (profitPercentage > maxProfit) {
            maxProfit = profitPercentage;
            bestArbitrage = {
              tokenA: poolA.token0,
              tokenB: poolA.token1,
              poolA,
              poolB,
              profitPercentage
            };
          }
        }
      }
    }

    return bestArbitrage;
  }

  private calculatePrice(pool: PoolReserves): number {
    const reserve0 = BigInt(pool.reserve0);
    const reserve1 = BigInt(pool.reserve1);
    return Number(reserve1) / Number(reserve0);
  }
} 