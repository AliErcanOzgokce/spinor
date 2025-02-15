import { BigNumber, Contract } from 'ethers';
import { TradingConfig, ITradingService, TradeParams, LiquidityParams, RemoveLiquidityParams, TradeResult, LiquidityResult } from '../../types';
import { AGENT_ABI, ROUTER_ABI, FACTORY_ABI, ERC20_ABI } from './abi';

/**
 * Base trading service that implements core trading functionality
 */
export abstract class BaseTradingService implements ITradingService {
    protected agent: Contract;
    protected router: Contract;
    protected factory: Contract;
    protected usdc: Contract;
    protected signer: TradingConfig['signer'];
    protected readonly MAX_UINT256 = BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

    protected constructor(config: TradingConfig) {
        this.signer = config.signer;
    }

    /**
     * Initialize contracts
     */
    protected async initializeContracts(config: TradingConfig): Promise<void> {
        try {
            this.agent = new Contract(config.agentAddress, AGENT_ABI, config.signer);
            this.router = new Contract(config.routerAddress, ROUTER_ABI, config.signer);
            this.factory = new Contract(config.factoryAddress, FACTORY_ABI, config.signer);
            this.usdc = new Contract(config.usdcAddress, ERC20_ABI, config.signer);

            // Validate contracts
            await Promise.all([
                this.agent.deployed(),
                this.router.deployed(),
                this.factory.deployed(),
                this.usdc.deployed()
            ]);
        } catch (error) {
            throw new Error(`Failed to initialize contracts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check and approve token allowance
     */
    protected async checkAndApproveToken(token: Contract, spender: string, amount: BigNumber): Promise<void> {
        const allowance = await token.allowance(await this.signer.getAddress(), spender);
        if (allowance.lt(amount)) {
            const tx = await token.approve(spender, this.MAX_UINT256);
            await tx.wait();
        }
    }

    /**
     * Execute a swap through the agent
     */
    public async executeSwap(params: TradeParams): Promise<TradeResult> {
        try {
            // Check allowance if swapping tokens to USDC
            if (!params.isUsdcIn) {
                const token = new Contract(params.tokenAddress, ERC20_ABI, this.signer);
                await this.checkAndApproveToken(token, this.agent.address, params.amount);
            }

            const tx = await this.agent.executeSwap(
                params.amount,
                params.minAmountOut,
                params.isUsdcIn
            );
            const receipt = await tx.wait();

            const swapEvent = receipt.events?.find(
                (e: { event: string }) => e.event === 'SwapExecuted'
            );

            if (!swapEvent) {
                throw new Error('Swap event not found in transaction logs');
            }

            return {
                success: true,
                amountIn: swapEvent.args.amountIn,
                amountOut: swapEvent.args.amountOut
            };
        } catch (error) {
            return {
                success: false,
                amountIn: BigNumber.from(0),
                amountOut: BigNumber.from(0),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Add liquidity through the agent
     */
    public async addLiquidity(params: LiquidityParams): Promise<LiquidityResult> {
        try {
            // Check allowances
            const token = new Contract(params.tokenAddress, ERC20_ABI, this.signer);
            await Promise.all([
                this.checkAndApproveToken(token, this.agent.address, params.tokenAmount),
                this.checkAndApproveToken(this.usdc, this.agent.address, params.usdcAmount)
            ]);

            const tx = await this.agent.addLiquidity(
                params.tokenAmount,
                params.usdcAmount,
                params.minTokenAmount,
                params.minUsdcAmount
            );
            const receipt = await tx.wait();

            const liquidityEvent = receipt.events?.find(
                (e: { event: string }) => e.event === 'LiquidityAdded'
            );

            if (!liquidityEvent) {
                throw new Error('Liquidity event not found in transaction logs');
            }

            return {
                success: true,
                tokenAmount: liquidityEvent.args.tokenAmount,
                usdcAmount: liquidityEvent.args.usdcAmount,
                lpTokens: liquidityEvent.args.liquidity
            };
        } catch (error) {
            return {
                success: false,
                tokenAmount: BigNumber.from(0),
                usdcAmount: BigNumber.from(0),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Remove liquidity through the agent
     */
    public async removeLiquidity(params: RemoveLiquidityParams): Promise<LiquidityResult> {
        try {
            const tx = await this.agent.removeLiquidity(
                params.lpTokens,
                params.minTokenAmount,
                params.minUsdcAmount
            );
            const receipt = await tx.wait();

            // Get liquidity event from logs
            const liquidityEvent = receipt.events?.find(
                (e: { event: string }) => e.event === 'LiquidityRemoved'
            );

            if (!liquidityEvent) {
                throw new Error('Liquidity event not found in transaction logs');
            }

            return {
                success: true,
                tokenAmount: liquidityEvent.args.tokenAmount,
                usdcAmount: liquidityEvent.args.usdcAmount
            };
        } catch (error) {
            return {
                success: false,
                tokenAmount: BigNumber.from(0),
                usdcAmount: BigNumber.from(0),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get expected output amount for a swap
     */
    public async getExpectedOutputAmount(
        tokenIn: string,
        tokenOut: string,
        amountIn: BigNumber
    ): Promise<BigNumber> {
        const path = [tokenIn, tokenOut];
        const amounts = await this.router.getAmountsOut(amountIn, path);
        return amounts[1];
    }

    /**
     * Get LP token balance for a token pair
     */
    public async getLPTokenBalance(tokenAddress: string): Promise<BigNumber> {
        const pairAddress = await this.factory.getPair(tokenAddress, await this.agent.usdc());
        const pairContract = new Contract(
            pairAddress,
            ['function balanceOf(address account) external view returns (uint256)'],
            this.signer
        );
        return await pairContract.balanceOf(this.agent.address);
    }

    /**
     * Get token balance for the agent
     */
    public async getTokenBalance(tokenAddress: string): Promise<BigNumber> {
        const tokenContract = new Contract(
            tokenAddress,
            ['function balanceOf(address account) external view returns (uint256)'],
            this.signer
        );
        return await tokenContract.balanceOf(this.agent.address);
    }
} 