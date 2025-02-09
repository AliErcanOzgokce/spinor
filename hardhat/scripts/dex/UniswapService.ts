import { Contract, ethers, BigNumber } from "ethers";
import { UniswapConfig, TokenPair } from "../libraries/types";
import { CONSTANTS } from "../libraries/constants";
import { ethers as hardhatEthers } from "hardhat";

export class UniswapService {
    protected factory: Contract;
    protected router: Contract;
    protected signer: UniswapConfig["signer"];

    constructor({ factoryAddress, routerAddress, signer }: UniswapConfig) {
        this.signer = signer;
        this.factory = new ethers.Contract(
            factoryAddress,
            [
                "function getPair(address tokenA, address tokenB) external view returns (address pair)",
                "function createPair(address tokenA, address tokenB) external returns (address pair)",
                "function allPairs(uint) external view returns (address pair)",
                "function allPairsLength() external view returns (uint)",
            ],
            signer
        );
        this.router = new ethers.Contract(
            routerAddress,
            CONSTANTS.ROUTER_ABI,
            signer
        );
    }

    /**
     * Get pair address for two tokens
     */
    async getPair(tokenA: string, tokenB: string): Promise<string> {
        return await this.factory.getPair(tokenA, tokenB);
    }

    /**
     * Create a new pair for two tokens
     */
    async createPair(tokenA: string, tokenB: string): Promise<string> {
        const tx = await this.factory.createPair(tokenA, tokenB);
        await tx.wait();
        return await this.getPair(tokenA, tokenB);
    }

    /**
     * Helper function to approve tokens
     */
    protected async approveToken(
        token: Contract,
        spender: string,
        amount: BigNumber
    ): Promise<void> {
        const allowance = await token.allowance(this.signer.address, spender);
        if (allowance.lt(amount)) {
            const tx = await token.approve(spender, CONSTANTS.MAX_UINT256);
            await tx.wait();
        }
    }

    /**
     * Helper function to get reserves
     */
    protected async getReserves(
        tokenA: string,
        tokenB: string
    ): Promise<[BigNumber, BigNumber]> {
        const pair = await this.getPair(tokenA, tokenB);
        const pairContract = new ethers.Contract(
            pair,
            CONSTANTS.PAIR_ABI,
            this.signer
        );
        const [reserve0, reserve1] = await pairContract.getReserves();
        return tokenA < tokenB ? [reserve0, reserve1] : [reserve1, reserve0];
    }

    /**
     * Helper function to calculate output amount
     */
    protected async getAmountOut(
        amountIn: BigNumber,
        reserveIn: BigNumber,
        reserveOut: BigNumber
    ): Promise<BigNumber> {
        const amountInWithFee = amountIn.mul(997);
        const numerator = amountInWithFee.mul(reserveOut);
        const denominator = reserveIn.mul(1000).add(amountInWithFee);
        return numerator.div(denominator);
    }

    /**
     * Helper function to calculate deadline
     */
    protected getDeadline(): number {
        return Math.floor(Date.now() / 1000) + 60 * CONSTANTS.DEADLINE_MINUTES;
    }

    /**
     * Helper function to calculate minimum amount based on slippage
     */
    protected calculateMinAmount(amount: BigNumber, slippageTolerance: number): BigNumber {
        return amount.mul(1000 - Math.floor(slippageTolerance * 10)).div(1000);
    }
} 