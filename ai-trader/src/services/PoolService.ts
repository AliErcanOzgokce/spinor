import type { PoolInfo, PoolResponse } from '../models/Pool';
import { RiskLevel } from '../models/Agent';

export class PoolService {
    private readonly API_URL = 'http://localhost:3000/api/pool-reserves';

    async getPoolData(): Promise<PoolInfo[]> {
        try {
            const response = await fetch(this.API_URL);
            const result = await response.json() as PoolResponse;

            if (!result.success) {
                throw new Error(result.message || 'Failed to fetch pool information');
            }

            return result.data;
        } catch (error) {
            console.error('Error fetching pool data:', error);
            return [];
        }
    }

    findBestLST(pools: PoolInfo[], riskLevel: RiskLevel): PoolInfo | null {
        const lstPools = pools.filter(pool => pool.token0Symbol.startsWith('LST'));
        
        if (lstPools.length === 0) return null;

        return lstPools.reduce((best, current) => {
            const currentApy = current.apy ?? 0;
            const currentSlashing = current.slashingHistory ?? 0;
            const bestApy = best?.apy ?? 0;
            const bestSlashing = best?.slashingHistory ?? 0;

            // Higher risk levels prioritize APY over slashing history
            const apyWeight = riskLevel / 4;  // 0.25 to 1
            const slashingWeight = (5 - riskLevel) / 4;  // 1 to 0.25

            const currentScore = (currentApy * apyWeight) - (currentSlashing * slashingWeight);
            const bestScore = (bestApy * apyWeight) - (bestSlashing * slashingWeight);

            return currentScore > bestScore ? current : best;
        }, null as PoolInfo | null);
    }

    findBestLRT(pools: PoolInfo[], riskLevel: RiskLevel): PoolInfo | null {
        const lrtPools = pools.filter(pool => pool.token0Symbol.startsWith('LRT'));
        
        if (lrtPools.length === 0) return null;

        return lrtPools.reduce((best, current) => {
            const currentApy = current.apy ?? 0;
            const bestApy = best?.apy ?? 0;

            // For LRT, we primarily focus on APY as they don't have slashing
            return currentApy > bestApy ? current : best;
        }, null as PoolInfo | null);
    }
} 