import { Contract, ethers, BigNumber } from "ethers";
import { UniswapService } from "./UniswapService";
import { LiquidityResult, RemoveLiquidityResult, TokenPair } from "../libraries/types";
import { CONSTANTS } from "../libraries/constants";

export class LiquidityService extends UniswapService {
    /**
     * Add liquidity to a pool
     */
    async addLiquidity(
        { tokenA, tokenB }: TokenPair,
        amountADesired: BigNumber,
        amountBDesired: BigNumber,
        slippageTolerance: number = CONSTANTS.DEFAULT_SLIPPAGE_TOLERANCE
    ): Promise<LiquidityResult> {
        // Calculate minimum amounts based on slippage tolerance
        const amountAMin = this.calculateMinAmount(amountADesired, slippageTolerance);
        const amountBMin = this.calculateMinAmount(amountBDesired, slippageTolerance);

        // Approve router to spend tokens
        await this.approveToken(tokenA, this.router.address, amountADesired);
        await this.approveToken(tokenB, this.router.address, amountBDesired);

        // Add liquidity
        const tx = await this.router.addLiquidity(
            tokenA.address,
            tokenB.address,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            this.signer.address,
            this.getDeadline(),
            { gasLimit: CONSTANTS.DEFAULT_GAS_LIMIT }
        );
        const receipt = await tx.wait();

        // Get pair contract
        const pairAddress = await this.getPair(tokenA.address, tokenB.address);
        const pair = new ethers.Contract(pairAddress, CONSTANTS.PAIR_ABI, this.signer);

        // Get LP token balance change
        const liquidityEvent = receipt.events?.find((e: any) => e.event === "Mint");
        const liquidity = liquidityEvent ? liquidityEvent.args?.liquidity : await pair.balanceOf(this.signer.address);

        return {
            amountA: amountADesired,
            amountB: amountBDesired,
            liquidity
        };
    }

    /**
     * Remove liquidity from a pool
     */
    async removeLiquidity(
        { tokenA, tokenB }: TokenPair,
        liquidity: BigNumber,
        slippageTolerance: number = CONSTANTS.DEFAULT_SLIPPAGE_TOLERANCE
    ): Promise<RemoveLiquidityResult> {
        const pairAddress = await this.getPair(tokenA.address, tokenB.address);
        const pair = new ethers.Contract(pairAddress, CONSTANTS.PAIR_ABI, this.signer);

        // Get current reserves to calculate minimum amounts
        const [reserve0, reserve1] = await this.getReserves(tokenA.address, tokenB.address);
        const totalSupply = await pair.totalSupply();
        
        const amountAMin = reserve0.mul(liquidity).div(totalSupply)
            .mul(1000 - Math.floor(slippageTolerance * 10)).div(1000);
        const amountBMin = reserve1.mul(liquidity).div(totalSupply)
            .mul(1000 - Math.floor(slippageTolerance * 10)).div(1000);

        // Approve router to spend LP tokens
        await pair.approve(this.router.address, liquidity);

        const tx = await this.router.removeLiquidity(
            tokenA.address,
            tokenB.address,
            liquidity,
            amountAMin,
            amountBMin,
            this.signer.address,
            this.getDeadline(),
            { gasLimit: CONSTANTS.DEFAULT_GAS_LIMIT }
        );
        const receipt = await tx.wait();

        // Parse the events to get the actual amounts
        const burnEvent = receipt.events?.find((e: any) => e.event === "Burn");
        return {
            amountA: burnEvent?.args?.amount0 || BigNumber.from(0),
            amountB: burnEvent?.args?.amount1 || BigNumber.from(0)
        };
    }
} 