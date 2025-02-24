import { Contract, JsonRpcProvider } from 'ethers';
import type { IUniswapV2Pair } from '../types';

export class UniswapService {
    private provider: JsonRpcProvider;

    constructor(rpcUrl: string) {
        this.provider = new JsonRpcProvider(rpcUrl, {
            chainId: 112,
            name: 'ABC Testnet'
        });
    }

    async getPoolReserves(pairAddress: string): Promise<{ reserve0: bigint; reserve1: bigint }> {
        try {
            const pairContract = new Contract(
                pairAddress,
                [
                    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
                ],
                this.provider
            );

            const [reserve0, reserve1] = await pairContract.getReserves();
            return { reserve0, reserve1 };
        } catch (error) {
            console.error(`Error getting reserves for pair ${pairAddress}:`, error);
            throw error;
        }
    }

    async getTokenAddresses(pairAddress: string): Promise<{ token0: string; token1: string }> {
        try {
            const pairContract = new Contract(
                pairAddress,
                [
                    'function token0() external view returns (address)',
                    'function token1() external view returns (address)'
                ],
                this.provider
            );

            const [token0, token1] = await Promise.all([
                pairContract.token0(),
                pairContract.token1()
            ]);

            return { token0, token1 };
        } catch (error) {
            console.error(`Error getting token addresses for pair ${pairAddress}:`, error);
            throw error;
        }
    }
} 
 
 