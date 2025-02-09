import { Contract, BigNumber } from "ethers";
import { UniswapService } from "./UniswapService";
import { TokenPair } from "../libraries/types";
import { CONSTANTS } from "../libraries/constants";
import { ethers as hardhatEthers } from "hardhat";
import { UniswapConfig } from "../libraries/types";

export class LiquidityService extends UniswapService {
    private constructor(factory: Contract, router: Contract, signer: UniswapConfig["signer"]) {
        super(factory, router, signer);
    }

    public static async initialize(config: UniswapConfig): Promise<LiquidityService> {
        const factory = await hardhatEthers.getContractAt("UniswapV2Factory", config.factoryAddress, config.signer);
        const router = await hardhatEthers.getContractAt("UniswapV2Router", config.routerAddress, config.signer);
        return new LiquidityService(factory, router, config.signer);
    }

    /**
     * Add liquidity to a pool
     */
    async addLiquidity(
        { tokenA, tokenB }: TokenPair,
        amountADesired: BigNumber,
        amountBDesired: BigNumber,
        slippageTolerance: number = CONSTANTS.DEFAULT_SLIPPAGE_TOLERANCE
    ) {
        // Get token contracts
        const tokenAContract = await hardhatEthers.getContractAt("IERC20", tokenA, this.signer);
        const tokenBContract = await hardhatEthers.getContractAt("IERC20", tokenB, this.signer);

        // Approve tokens if needed
        await this.approveToken(tokenAContract, this.router.address, amountADesired);
        await this.approveToken(tokenBContract, this.router.address, amountBDesired);

        // Calculate minimum amounts based on slippage tolerance
        const amountAMin = this.calculateMinAmount(amountADesired, slippageTolerance);
        const amountBMin = this.calculateMinAmount(amountBDesired, slippageTolerance);

        // Add liquidity
        const tx = await this.router.addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            this.signer.address,
            this.getDeadline()
        );
        const receipt = await tx.wait();

        // Get amounts from event logs
        const event = receipt.events?.find((e: { event: string }) => e.event === "Mint");
        return {
            amountA: event?.args?.amount0 || amountADesired,
            amountB: event?.args?.amount1 || amountBDesired,
            liquidity: event?.args?.liquidity || BigNumber.from(0)
        };
    }

    /**
     * Remove liquidity from a pool
     */
    async removeLiquidity(
        { tokenA, tokenB }: TokenPair,
        liquidity: BigNumber,
        slippageTolerance: number = CONSTANTS.DEFAULT_SLIPPAGE_TOLERANCE
    ) {
        // Get pair contract
        const pairAddress = await this.getPair(tokenA, tokenB);
        const pair = await hardhatEthers.getContractAt("UniswapV2Pair", pairAddress, this.signer);

        // Approve LP tokens
        await this.approveToken(pair, this.router.address, liquidity);

        // Get current reserves and total supply to calculate minimum amounts
        const [reserveA, reserveB] = await this.getReserves(tokenA, tokenB);
        const totalSupply = await pair.totalSupply();
        
        const amountAMin = this.calculateMinAmount(
            liquidity.mul(reserveA).div(totalSupply),
            slippageTolerance
        );
        const amountBMin = this.calculateMinAmount(
            liquidity.mul(reserveB).div(totalSupply),
            slippageTolerance
        );

        // Remove liquidity
        const tx = await this.router.removeLiquidity(
            tokenA,
            tokenB,
            liquidity,
            amountAMin,
            amountBMin,
            this.signer.address,
            this.getDeadline()
        );
        const receipt = await tx.wait();

        // Get amounts from event logs
        const event = receipt.events?.find((e: { event: string }) => e.event === "LiquidityRemoved");
        return {
            amountA: event?.args?.amountA || amountAMin,
            amountB: event?.args?.amountB || amountBMin
        };
    }
} 