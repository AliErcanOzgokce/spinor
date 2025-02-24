import { SwapService } from './services/SwapService';
import { config } from './config';

class SwapBot {
  private swapService: SwapService;
  private isRunning: boolean = false;
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
    if (!ADMIN_PRIVATE_KEY) {
      throw new Error('ADMIN_PRIVATE_KEY is required in .env file');
    }
    this.swapService = new SwapService(ADMIN_PRIVATE_KEY);
  }

  async start() {
    if (this.isRunning) {
      console.log('SwapBot is already running');
      return;
    }

    this.isRunning = true;
    console.log('SwapBot started');

    // Run initial swap
    await this.performSwaps();

    // Set interval for subsequent swaps
    this.interval = setInterval(async () => {
      await this.performSwaps();
    }, 60000); // 1 minute interval
  }

  private async performSwaps() {
    try {
      await this.swapService.start();
    } catch (error) {
      console.error('Error performing swaps:', error);
    }
  }

  stop() {
    if (!this.isRunning) {
      console.log('SwapBot is not running');
      return;
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
    this.swapService.stop();
    console.log('SwapBot stopped');
  }
}

// Create and start the bot
const bot = new SwapBot();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT. Gracefully shutting down SwapBot...');
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Gracefully shutting down SwapBot...');
  bot.stop();
  process.exit(0);
});

// Start the bot
bot.start().catch(error => {
  console.error('Error starting SwapBot:', error);
  process.exit(1);
}); 
 
 