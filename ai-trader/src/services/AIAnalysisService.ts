import OpenAI from 'openai';
import type { PoolInfo } from '../models/Pool';
import type { RiskLevel } from '../models/Agent';

export class AIAnalysisService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async analyzePool(pool: PoolInfo, riskLevel: RiskLevel): Promise<string> {
        const prompt = `
Analyze this liquidity pool data with risk level ${riskLevel} (1=Very Low, 4=High):

Pool: ${pool.token0Symbol}/${pool.token1Symbol}
APY: ${pool.apy}%
Slashing History: ${pool.slashingHistory}
Reserves: ${pool.reserve0}/${pool.reserve1}

Provide a brief analysis of:
1. Risk assessment
2. Potential rewards
3. Trade recommendation (Buy/Hold/Sell)
4. Key factors to watch
Keep it concise and focused on the most important points.
`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a DeFi trading expert specializing in LST and LRT analysis. Provide concise, practical advice."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 200,
            temperature: 0.7
        });

        return response.choices[0]?.message?.content || "No analysis available";
    }

    async getMarketSentiment(pools: PoolInfo[]): Promise<string> {
        const poolsData = pools.map(pool => 
            `${pool.token0Symbol}/${pool.token1Symbol}: APY=${pool.apy}%, Slashing=${pool.slashingHistory}`
        ).join('\n');

        const prompt = `
Analyze these liquidity pools and provide overall market sentiment:

${poolsData}

Provide a brief market overview:
1. Overall market sentiment
2. Key trends
3. Notable opportunities or risks
Keep it concise and actionable.
`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a DeFi market analyst. Provide concise market insights."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 150,
            temperature: 0.7
        });

        return response.choices[0]?.message?.content || "No analysis available";
    }
} 