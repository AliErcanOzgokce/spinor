import type { AgentConfig, AgentResponse } from '../models/Agent';
import { RiskLevel, TradeStrategy } from '../models/Agent';

export class AgentService {
    private readonly API_URL = 'http://localhost:3000/api/agent-info';

    async getAgentConfig(): Promise<AgentConfig | null> {
        try {
            const response = await fetch(this.API_URL);
            const result = await response.json() as AgentResponse;

            if (!result.success) {
                throw new Error(result.message || 'Failed to fetch agent information');
            }

            return result.data;
        } catch (error) {
            console.error('Error fetching agent data:', error);
            return null;
        }
    }

    getCurrentStrategy(): TradeStrategy {
        // Default to BEST_LST if no configuration is available
        return TradeStrategy.BEST_LST;
    }

    getCurrentRiskLevel(): RiskLevel {
        // Default to LOW risk if no configuration is available
        return RiskLevel.LOW;
    }
} 