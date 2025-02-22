import { config } from 'dotenv';
import { PoolService } from './services/PoolService.js';
import { AgentService } from './services/AgentService.js';
import { AIAnalysisService } from './services/AIAnalysisService.js';
import type { PoolInfo } from './models/Pool';

// Load environment variables
config();

class AITrader {
    private poolService: PoolService;
    private agentService: AgentService;
    private aiService: AIAnalysisService;
    private isRunning: boolean = false;

    constructor() {
        this.poolService = new PoolService();
        this.agentService = new AgentService();
        this.aiService = new AIAnalysisService();
    }

    private formatPoolInfo(pool: PoolInfo | null): string {
        if (!pool) return 'No suitable pool found';
        
        return `
${pool.token0Symbol}/${pool.token1Symbol}:
- Pair Address: ${pool.pairAddress}
- APY: ${pool.apy !== null ? `${pool.apy}%` : 'N/A'}
- Slashing History: ${pool.slashingHistory !== null ? pool.slashingHistory : 'N/A'}
- Reserves: ${pool.reserve0}/${pool.reserve1}
        `.trim();
    }

    async analyze(): Promise<void> {
        try {
            // Fetch latest data
            const [pools, agentConfig] = await Promise.all([
                this.poolService.getPoolData(),
                this.agentService.getAgentConfig()
            ]);

            if (!agentConfig) {
                console.log('No agent configuration available');
                return;
            }

            const riskLevel = agentConfig.configuration.riskLevel;
            
            // Find best LST and LRT based on current risk level
            const bestLST = this.poolService.findBestLST(pools, riskLevel);
            const bestLRT = this.poolService.findBestLRT(pools, riskLevel);

            // Get AI analysis
            const [lstAnalysis, lrtAnalysis, marketSentiment] = await Promise.all([
                bestLST ? this.aiService.analyzePool(bestLST, riskLevel) : Promise.resolve('No LST pool available'),
                bestLRT ? this.aiService.analyzePool(bestLRT, riskLevel) : Promise.resolve('No LRT pool available'),
                this.aiService.getMarketSentiment(pools)
            ]);

            console.clear();
            console.log('='.repeat(50));
            console.log('AI Trader Analysis');
            console.log('='.repeat(50));
            
            console.log('\nRisk Level:', riskLevel);
            console.log('\nMarket Sentiment:');
            console.log(marketSentiment);
            
            console.log('\nBest LST Pool:');
            console.log(this.formatPoolInfo(bestLST));
            console.log('\nAI Analysis (LST):');
            console.log(lstAnalysis);
            
            console.log('\nBest LRT Pool:');
            console.log(this.formatPoolInfo(bestLRT));
            console.log('\nAI Analysis (LRT):');
            console.log(lrtAnalysis);
            
            console.log('\nUSDC Balance:', agentConfig.balances.usdc.formatted);
            console.log('\nLast Update:', new Date().toLocaleTimeString());
            console.log('='.repeat(50));

        } catch (error) {
            console.error('Error during analysis:', error);
        }
    }

    async start(): Promise<void> {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('AI Trader started...');

        while (this.isRunning) {
            await this.analyze();
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        }
    }

    stop(): void {
        this.isRunning = false;
        console.log('AI Trader stopped.');
    }
}

// Start the trader
const trader = new AITrader();
trader.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
    trader.stop();
    process.exit(0);
}); 