import { Contract, BigNumber } from "ethers";
import { UniswapService } from "./UniswapService";
import { TokenPair } from "../libraries/types";
import { CONSTANTS } from "../libraries/constants";
import { ethers } from "ethers";

export class SwapService extends UniswapService {
    /**
     * Swap tokens
     */
    async swap(
        { tokenA: tokenIn, tokenB: tokenOut }: TokenPair,
        amountIn: BigNumber,
        slippageTolerance: number = CONSTANTS.DEFAULT_SLIPPAGE_TOLERANCE
    ): Promise<BigNumber> {
        // Approve router to spend input tokens
        await this.approveToken(tokenIn, this.router.address, amountIn);

        // Calculate minimum output amount based on reserves
        const [reserveIn, reserveOut] = await this.getReserves(tokenIn.address, tokenOut.address);
        const amountOutMin = await this.getAmountOut(amountIn, reserveIn, reserveOut);
        const adjustedAmountOutMin = this.calculateMinAmount(amountOutMin, slippageTolerance);

        const path = [tokenIn.address, tokenOut.address];
        const tx = await this.router.swapExactTokensForTokens(
            amountIn,
            adjustedAmountOutMin,
            path,
            this.signer.address,
            this.getDeadline(),
            { gasLimit: CONSTANTS.DEFAULT_GAS_LIMIT }
        );
        const receipt = await tx.wait();

        // Get pair contract
        const pairAddress = await this.getPair(tokenIn.address, tokenOut.address);
        const pair = new ethers.Contract(pairAddress, CONSTANTS.PAIR_ABI, this.signer);
        const token0 = await pair.token0();

        // Return the actual amount received
        const swapEvent = receipt.events?.find((e: any) => e.event === "Swap");
        if (swapEvent) {
            return tokenOut.address === token0 ? swapEvent.args?.amount0Out : swapEvent.args?.amount1Out;
        }

        // If no event found, check token balance change
        const balanceBefore = await tokenOut.balanceOf(this.signer.address);
        const balanceAfter = await tokenOut.balanceOf(this.signer.address);
        return balanceAfter.sub(balanceBefore);
    }

    /**
     * Get expected output amount for a swap
     */
    async getExpectedOutputAmount(
        { tokenA: tokenIn, tokenB: tokenOut }: TokenPair,
        amountIn: BigNumber
    ): Promise<BigNumber> {
        const [reserveIn, reserveOut] = await this.getReserves(tokenIn.address, tokenOut.address);
        return await this.getAmountOut(amountIn, reserveIn, reserveOut);
    }
} 