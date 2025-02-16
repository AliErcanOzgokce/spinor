import { SwapService } from './services/SwapService';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

if (!ADMIN_PRIVATE_KEY) {
    console.error('ADMIN_PRIVATE_KEY is required in .env file');
    process.exit(1);
}

const swapService = new SwapService(ADMIN_PRIVATE_KEY);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Received SIGINT. Gracefully shutting down...');
    swapService.stop();
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Gracefully shutting down...');
    swapService.stop();
});

// Start the service
swapService.start().catch(error => {
    console.error('Error starting swap service:', error);
    process.exit(1);
}); 
 
 