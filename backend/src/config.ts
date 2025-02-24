import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    rpcUrl: process.env.RPC_URL || 'https://rpc.abc.t.raas.gelato.cloud',
    deploymentPath: path.join(__dirname, '../../hardhat/deployments.json'),
    swapBot: {
        interval: 60000, // 1 minute in milliseconds
        minSwapAmount: '0.1',
        maxSwapAmount: '10',
        enabled: process.env.SWAP_BOT_ENABLED === 'true'
    }
}; 