import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export interface LiquidityResult {
    amountA: BigNumber;
    amountB: BigNumber;
    liquidity: BigNumber;
}

export interface RemoveLiquidityResult {
    amountA: BigNumber;
    amountB: BigNumber;
}

export interface UniswapConfig {
    factoryAddress: string;
    routerAddress: string;
    signer: SignerWithAddress;
}

export interface TokenPair {
    tokenA: Contract;
    tokenB: Contract;
} 