import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    deploymentPath: path.join(__dirname, '../../hardhat/deployments.json')
}; 