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

  /**
   * Generate AI-powered analysis of arbitrage opportunities
   * @param prompt Detailed prompt with arbitrage opportunity data
   * @returns AI-generated analysis and recommendation
   */
  async generateAIArbitrageAnalysis(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a DeFi arbitrage specialist. Analyze opportunities and provide clear advice.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent responses
        max_tokens: 150 // Keep responses concise
      });

      const analysis = response.choices[0]?.message?.content?.trim() || 'Unable to generate analysis';
      return analysis;
    } catch (error) {
      console.error('Error generating arbitrage analysis:', error);
      return 'Error: Unable to analyze arbitrage opportunity due to AI service issue.';
    }
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
      riskScore: riskLevel === 4 ? pool.apy : this.calculateRiskScore(pool.apy, pool.slashingHistory)
    }));

    // For high risk (level 4), directly sort by APY
    if (riskLevel === 4) {
      return tokenMetrics.reduce((best, current) => 
        !best || current.apy > best.apy ? current : best
      );
    }

    // For other risk levels, use risk score calculation
    const riskTolerance = riskLevel / 4;
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
    if (!bestToken) {
      return {
        type: 'none',
        reason: 'No suitable token found'
      };
    }

    const { usdc, tokens, liquidityPools } = agentInfo.balances;
    const usdcBalance = usdc.formatted;
    const strategy = agentInfo.configuration.tradeStrategy;

    // Find token balance
    const tokenBalance = tokens.find(t => t.address.toLowerCase() === bestToken.address.toLowerCase());
    const tokenAmount = tokenBalance ? tokenBalance.formatted : 0;

    // Find LP balance
    const lpBalance = liquidityPools.find(lp => lp.symbol.startsWith(bestToken.symbol));
    const lpAmount = lpBalance ? lpBalance.formatted : 0;

    // Strategy 2 and 4: Add Liquidity for LST/LRT
    if (strategy === 2 || strategy === 4) {
      // If we have no USDC, check if we should remove liquidity
      if (usdcBalance === 0 && lpAmount > 0 && lpBalance) {
        return {
          type: 'removeLiquidity',
          tokenA: bestToken.address,
          tokenB: this.usdcAddress,
          amountA: lpBalance.balance,
          reason: `Removing liquidity from ${bestToken.symbol}/USDC pool to rebalance`
        };
      }

      // If we have USDC, calculate optimal amounts
      if (usdcBalance > 0) {
        // Find pool reserves
        const pool = pools.find(p => 
          p.token0.toLowerCase() === bestToken.address.toLowerCase() || 
          p.token1.toLowerCase() === bestToken.address.toLowerCase()
        );

        // Check if we have enough USDC to make meaningful transactions (at least 1 USDC)
        if (usdcBalance < 1) {
          return {
            type: 'none',
            reason: `USDC balance (${usdcBalance}) too low for meaningful transactions`
          };
        }

        // Use 20% of USDC balance for better capital efficiency (reduced from 95%)
        // Convert USDC amount to wei (6 decimals)
        const totalUsdcToUse = BigInt(Math.floor(usdcBalance * 0.2 * 1e6));

        if (pool) {
          // Get reserves in correct order
          const [reserveToken, reserveUsdc] = pool.token0.toLowerCase() === bestToken.address.toLowerCase() 
            ? [BigInt(pool.reserve0), BigInt(pool.reserve1)]
            : [BigInt(pool.reserve1), BigInt(pool.reserve0)];

          // Convert current token amount to wei (18 decimals)
          const currentTokenAmount = BigInt(Math.floor(tokenAmount * 1e18));

          // If we have no LP tokens yet, split USDC between swap and liquidity
          // For strategy 2 and 4, always try to add liquidity regardless of LP token amount
          if (lpAmount === 0 || strategy === 2 || strategy === 4) {
            // Use 50% of USDC for swap and 50% for liquidity
            const usdcForSwap = totalUsdcToUse / BigInt(2);
            const usdcForLiquidity = totalUsdcToUse - usdcForSwap;

            // Calculate optimal token amount for liquidity based on current pool ratio
            // Current ratio = reserveToken / (reserveUsdc * 1e12)
            // We want: optimalTokenAmount / (usdcForLiquidity * 1e12) = reserveToken / (reserveUsdc * 1e12)
            // Therefore: optimalTokenAmount = (usdcForLiquidity * reserveToken) / reserveUsdc
            const optimalTokenAmount = (usdcForLiquidity * reserveToken) / reserveUsdc;

            // Log the amounts for debugging
            console.log('Liquidity addition calculation:', {
              totalUsdcToUse: totalUsdcToUse.toString(),
              usdcForSwap: usdcForSwap.toString(),
              usdcForLiquidity: usdcForLiquidity.toString(),
              currentTokenAmount: currentTokenAmount.toString(),
              optimalTokenAmount: optimalTokenAmount.toString(),
              hasEnoughTokens: currentTokenAmount >= optimalTokenAmount,
              reserves: {
                token: reserveToken.toString(),
                usdc: reserveUsdc.toString(),
                isToken0: pool.token0.toLowerCase() === bestToken.address.toLowerCase()
              }
            });

            // Check if we have enough tokens
            if (currentTokenAmount >= optimalTokenAmount) {
              // If we have enough tokens, add liquidity
              // Match the token order in the pool
              const isTokenToken0 = pool.token0.toLowerCase() === bestToken.address.toLowerCase();

              // Calculate minimum amounts (90% of desired amounts for 10% slippage)
              const minTokenAmount = (optimalTokenAmount * BigInt(90)) / BigInt(100);
              const minUsdcAmount = (usdcForLiquidity * BigInt(90)) / BigInt(100);

              return {
                type: 'addLiquidity',
                tokenA: isTokenToken0 ? bestToken.address : this.usdcAddress,
                tokenB: isTokenToken0 ? this.usdcAddress : bestToken.address,
                amountA: isTokenToken0 ? optimalTokenAmount.toString() : usdcForLiquidity.toString(),
                amountB: isTokenToken0 ? usdcForLiquidity.toString() : optimalTokenAmount.toString(),
                minAmountA: isTokenToken0 ? minTokenAmount.toString() : minUsdcAmount.toString(),
                minAmountB: isTokenToken0 ? minUsdcAmount.toString() : minTokenAmount.toString(),
                reason: `Adding liquidity to ${bestToken.symbol}/USDC pool with optimal ratio (${isTokenToken0 ? 'token is token0' : 'USDC is token0'})`
              };
            } else {
              // Calculate how many more tokens we need
              const additionalTokensNeeded = optimalTokenAmount - currentTokenAmount;
              console.log('Need more tokens:', {
                currentTokens: currentTokenAmount.toString(),
                neededTokens: optimalTokenAmount.toString(),
                additionalTokensNeeded: additionalTokensNeeded.toString(),
                pool: {
                  token0: pool.token0,
                  token1: pool.token1,
                  reserve0: pool.reserve0,
                  reserve1: pool.reserve1,
                  isTokenToken0: pool.token0.toLowerCase() === bestToken.address.toLowerCase()
                }
              });

              // We need to swap first to get more tokens
              return {
                type: 'swap',
                tokenA: this.usdcAddress,
                tokenB: bestToken.address,
                amountA: usdcForSwap.toString(),
                amountB: '0',
                reason: `Swapping USDC for ${bestToken.symbol} to prepare for liquidity provision (need ${additionalTokensNeeded.toString()} more tokens)`
              };
            }
          } else {
            // If we already have LP tokens, just swap
            return {
              type: 'swap',
              tokenA: this.usdcAddress,
              tokenB: bestToken.address,
              amountA: totalUsdcToUse.toString(),
              amountB: '0',
              reason: `Swapping USDC for ${bestToken.symbol} based on strategy ${strategy}`
            };
          }
        } else {
          // If pool doesn't exist, swap first
          return {
            type: 'swap',
            tokenA: this.usdcAddress,
            tokenB: bestToken.address,
            amountA: totalUsdcToUse.toString(),
            amountB: '0',
            reason: `Swapping USDC for ${bestToken.symbol} to prepare for new liquidity pool`
          };
        }
      }
    }

    // For other strategies, continue with normal swap logic
    if (usdcBalance > 0) {
      // Use 95% of USDC balance for swaps too
      // Convert USDC amount to wei (6 decimals)
      const swapAmount = BigInt(Math.floor(usdcBalance * 0.95 * 1e6)).toString();
      return {
        type: 'swap',
        tokenA: this.usdcAddress,
        tokenB: bestToken.address,
        amountA: swapAmount,
        amountB: '0',
        reason: `Swapping USDC for ${bestToken.symbol} based on strategy ${strategy}`
      };
    }

    return {
      type: 'none',
      reason: 'No suitable action found'
    };
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
        return this.generateTradeDecision(pools, agentInfo, bestToken);
      }

      return {
        type: 'none',
        reason: 'No suitable action found'
      };
    } catch (error) {
      console.error('Error in getTradeAction:', error);
      return {
        type: 'none',
        reason: `Failed to execute trading strategy: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}