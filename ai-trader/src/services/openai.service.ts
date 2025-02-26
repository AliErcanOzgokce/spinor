import OpenAI from 'openai';
import { TradeStrategy } from '../types';
import type { PoolReserves, AgentInfo, TradeAction, TokenMetrics } from '../types';

export class OpenAIService {
  private openai: OpenAI;
  private readonly usdcAddress: string;
  private readonly systemPrompt = `You are an AI trading assistant for a DeFi protocol. Your role is to analyze pool data and make trading decisions based on:
1. Current pool reserves and metrics
2. User's trade strategy and risk level
3. Current token balances

Trade Strategies:
1. Best LST - Select and trade the best Liquid Staking Token based on risk level
2. Best LST + Liquidity - Select best LST and provide liquidity
3. Best LRT - Select and trade the best Liquid Restaking Token based on risk level
4. Best LRT + Liquidity - Select best LRT and provide liquidity
5. Arbitrage - Find and execute arbitrage opportunities

Risk levels (1-4):
- Lower risk = Lower APY, lower slashing history
- Higher risk = Higher APY, higher slashing history

Respond with a strict JSON format containing:
{
  "type": "swap" | "addLiquidity" | "removeLiquidity" | "none",
  "tokenA": "token_address",
  "tokenB": "token_address",
  "amountA": "amount_in_wei",
  "amountB": "amount_in_wei",
  "reason": "detailed_explanation"
}`;

  constructor(apiKey: string, usdcAddress: string) {
    this.openai = new OpenAI({ apiKey });
    this.usdcAddress = usdcAddress;
  }

  private calculateRiskScore(apy: number, slashingHistory: number): number {
    // Normalize APY and slashing history to 0-1 range
    const normalizedApy = apy / 12; // Assuming max APY is 12%
    const normalizedSlashing = slashingHistory / 4; // Assuming max slashing history is 4

    // Weight factors (can be adjusted)
    const apyWeight = 0.6;
    const slashingWeight = 0.4;

    return (normalizedApy * apyWeight) - (normalizedSlashing * slashingWeight);
  }

  private findBestToken(
    pools: PoolReserves[],
    riskLevel: number,
    tokenType: 'LST' | 'LRT'
  ): TokenMetrics | null {
    if (!pools || pools.length === 0) {
      console.log(`No pools available for ${tokenType} tokens`);
      return null;
    }

    const relevantPools = pools.filter(pool => 
      tokenType === 'LST' 
        ? pool.token0Symbol.startsWith('LST')
        : pool.token0Symbol.startsWith('LRT')
    );

    if (relevantPools.length === 0) {
      console.log(`No ${tokenType} pools found in the available pools`);
      return null;
    }

    const tokenMetrics = relevantPools.map(pool => ({
      address: pool.token0,
      symbol: pool.token0Symbol,
      apy: pool.apy,
      slashingHistory: pool.slashingHistory,
      riskScore: this.calculateRiskScore(pool.apy, pool.slashingHistory)
    }));

    // Adjust risk tolerance based on user's risk level (1-4)
    const riskTolerance = riskLevel / 4;

    // Find the token that best matches the risk tolerance
    return tokenMetrics.reduce((best, current) => {
      if (!best) return current;
      const bestDiff = Math.abs(best.riskScore - riskTolerance);
      const currentDiff = Math.abs(current.riskScore - riskTolerance);
      return currentDiff < bestDiff ? current : best;
    });
  }

  private async generateTradeDecision(
    pools: PoolReserves[],
    agentInfo: AgentInfo,
    bestToken: TokenMetrics | null
  ): Promise<TradeAction> {
    const prompt = `
Current pool data: ${JSON.stringify(pools)}
Agent configuration: ${JSON.stringify(agentInfo.configuration)}
Agent balances: ${JSON.stringify(agentInfo.balances)}
Best token found: ${JSON.stringify(bestToken)}

Based on this data, what trading action should be taken? Consider:
1. Current token balances
2. Trading strategy (${agentInfo.configuration.tradeStrategy})
3. Risk level (${agentInfo.configuration.riskLevel})
4. Pool reserves and metrics

Respond with the optimal trading action in the specified JSON format.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('Empty response from OpenAI');
        return {
          type: 'none',
          reason: 'Failed to get response from OpenAI'
        };
      }

      const decision = JSON.parse(content) as TradeAction;
      
      // Validate the decision
      if (!decision.type || !['swap', 'addLiquidity', 'removeLiquidity', 'none'].includes(decision.type)) {
        console.error('Invalid action type in OpenAI response:', decision);
        return {
          type: 'none',
          reason: 'Invalid action type received'
        };
      }

      // For actions other than 'none', validate required fields
      if (decision.type !== 'none') {
        if (!decision.tokenA || !decision.tokenB || !decision.amountA || !decision.amountB) {
          console.error('Missing required fields in OpenAI response:', decision);
          return {
            type: 'none',
            reason: 'Missing required fields in trading decision'
          };
        }
      }

      return decision;
    } catch (error) {
      console.error('Failed to generate trade decision:', error);
      return {
        type: 'none',
        reason: 'Failed to generate valid trading decision'
      };
    }
  }

  async getTradeAction(
    pools: PoolReserves[],
    agentInfo: AgentInfo
  ): Promise<TradeAction> {
    try {
      if (!pools || pools.length === 0) {
        console.error('No pool data available');
        return {
          type: 'none',
          reason: 'No pool data available for trading'
        };
      }

      if (!agentInfo || !agentInfo.configuration) {
        console.error('Invalid agent configuration');
        return {
          type: 'none',
          reason: 'Invalid agent configuration'
        };
      }

      const strategy = agentInfo.configuration.tradeStrategy;
      const riskLevel = agentInfo.configuration.riskLevel;

      console.log(`Executing strategy: ${strategy} with risk level: ${riskLevel}`);

      let bestToken: TokenMetrics | null = null;

      // Find best token based on strategy
      if (strategy === TradeStrategy.BestLST || strategy === TradeStrategy.BestLSTWithLiquidity) {
        console.log('Finding best LST token...');
        bestToken = this.findBestToken(pools, riskLevel, 'LST');
      } else if (strategy === TradeStrategy.BestLRT || strategy === TradeStrategy.BestLRTWithLiquidity) {
        console.log('Finding best LRT token...');
        bestToken = this.findBestToken(pools, riskLevel, 'LRT');
      }

      if (!bestToken && strategy !== TradeStrategy.Arbitrage) {
        console.log('No suitable token found for the current strategy');
        return {
          type: 'none',
          reason: 'No suitable token found for the current strategy'
        };
      }

      if (bestToken) {
        console.log(`Best token found: ${bestToken.symbol} with APY: ${bestToken.apy}% and risk score: ${bestToken.riskScore}`);
        
        // Check if we have USDC balance but no token balance
        const usdcBalance = agentInfo.balances.usdc.balance;
        const tokenBalance = agentInfo.balances.tokens.find(t => t.address.toLowerCase() === bestToken.address.toLowerCase())?.balance || '0';
        
        if (BigInt(usdcBalance) > BigInt(0) && BigInt(tokenBalance) === BigInt(0)) {
          // We have USDC but no tokens, suggest a swap
          return {
            type: 'swap',
            tokenA: this.usdcAddress, // USDC as input
            tokenB: bestToken.address, // Best token as output
            amountA: (BigInt(usdcBalance) * BigInt(8000) / BigInt(10000)).toString(), // Use 80% of USDC balance
            amountB: '0', // Min amount out will be calculated by the contract
            reason: `Swapping USDC for ${bestToken.symbol} to initiate trading position`
          };
        }
      }

      return this.generateTradeDecision(pools, agentInfo, bestToken);
    } catch (error) {
      console.error('Error in getTradeAction:', error);
      return {
        type: 'none',
        reason: `Failed to execute trading strategy: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
} 