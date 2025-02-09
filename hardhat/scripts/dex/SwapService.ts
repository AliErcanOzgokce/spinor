import { Contract, BigNumber } from "ethers";
import { UniswapService } from "./UniswapService";
import { TokenPair } from "../libraries/types";
import { CONSTANTS } from "../libraries/constants";
import { ethers } from "ethers";
import { UniswapConfig } from "../libraries/types";
import { ethers as hardhatEthers } from "hardhat";

export class SwapService extends UniswapService {
    private constructor(factory: Contract, router: Contract, signer: UniswapConfig["signer"]) {
        super(factory, router, signer);
    }

    public static async initialize(config: UniswapConfig): Promise<SwapService> {
        const factory = await hardhatEthers.getContractAt("UniswapV2Factory", config.factoryAddress, config.signer);
        const router = await hardhatEthers.getContractAt("UniswapV2Router", config.routerAddress, config.signer);
        return new SwapService(factory, router, config.signer);
    }

    /**
     * Get expected output amount for a swap
     */
    async getExpectedOutputAmount(
        { tokenA, tokenB }: TokenPair,
        amountIn: BigNumber
    ): Promise<BigNumber> {
        const [reserveIn, reserveOut] = await this.getReserves(tokenA, tokenB);
        return this.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    /**
     * Execute a swap
     */
    async swap(
        { tokenA, tokenB }: TokenPair,
        amountIn: BigNumber,
        slippageTolerance: number = CONSTANTS.DEFAULT_SLIPPAGE_TOLERANCE
    ): Promise<BigNumber> {
        // Get expected output amount
        const expectedOut = await this.getExpectedOutputAmount({ tokenA, tokenB }, amountIn);
        const minAmountOut = this.calculateMinAmount(expectedOut, slippageTolerance);

        // Get token contract and approve
        const tokenAContract = await hardhatEthers.getContractAt("IERC20", tokenA, this.signer);
        await this.approveToken(tokenAContract, this.router.address, amountIn);

        // Execute swap
        const tx = await this.router.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            [tokenA, tokenB],
            this.signer.address,
            this.getDeadline()
        );
        const receipt = await tx.wait();

        // Get actual output amount from event logs
        const event = receipt.events?.find((e: { event: string }) => e.event === "Swap");
        return event?.args?.amountOut || minAmountOut;
    }
} 