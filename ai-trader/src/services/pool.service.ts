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

    // Calculate risk scores
    const poolsWithScores = relevantPools.map(pool => ({
      pool,
      score: this.calculateRiskScore(pool.apy, pool.slashingHistory, riskLevel)
    }));

    // Sort by score (higher is better)
    poolsWithScores.sort((a, b) => b.score - a.score);

    return poolsWithScores[0].pool;
  }

  private calculateRiskScore(apy: number, slashingHistory: number, riskLevel: number): number {
    // Normalize risk level to 0-1
    const normalizedRisk = riskLevel / 4;

    // Calculate base score from APY
    const apyScore = apy / 12; // Normalize APY (assuming max 12%)

    // Calculate risk penalty from slashing history
    const slashingPenalty = slashingHistory / 4; // Normalize slashing (assuming max 4)

    // Adjust weights based on risk level
    const apyWeight = normalizedRisk;
    const slashingWeight = 1 - normalizedRisk;

    // Final score calculation
    return (apyScore * apyWeight) - (slashingPenalty * slashingWeight);
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