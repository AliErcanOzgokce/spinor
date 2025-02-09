import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Swap Test", function () {
  let factory: Contract;
  let router: Contract;
  let usdc: Contract;
  let tokens: { [key: string]: Contract } = {};
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  const TOKEN_NAMES = ["LST1", "LST2", "LST3", "LST4", "LRT1", "LRT2", "LRT3", "LRT4"];

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy Factory
    const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
    factory = await UniswapV2Factory.deploy();
    await factory.deployed();

    // Deploy Router
    const UniswapV2Router = await ethers.getContractFactory("UniswapV2Router");
    router = await UniswapV2Router.deploy(factory.address);
    await router.deployed();

    // Deploy USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.deployed();

    // Deploy all tokens
    for (const name of TOKEN_NAMES) {
      const Token = await ethers.getContractFactory(name);
      tokens[name] = await Token.deploy();
      await tokens[name].deployed();
    }

    // Mint tokens
    const usdcAmount = ethers.utils.parseUnits("1000000", 6);
    const tokenAmount = ethers.utils.parseEther("1000000");

    await usdc.mint(owner.address, usdcAmount);
    for (const token of Object.values(tokens)) {
      await token.mint(owner.address, tokenAmount);
    }

    // Approve router
    await usdc.approve(router.address, usdcAmount);
    for (const token of Object.values(tokens)) {
      await token.approve(router.address, tokenAmount);
    }

    // Create pools and add liquidity
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const initialTokenAmount = ethers.utils.parseEther("100000");
    const initialUsdcAmount = ethers.utils.parseUnits("100000", 6);

    for (const [name, token] of Object.entries(tokens)) {
      console.log(`\nCreating pool for ${name}/USDC...`);
      
      // Create pair
      await factory.createPair(token.address, usdc.address);
      const pair = await factory.getPair(token.address, usdc.address);
      console.log(`Pair address: ${pair}`);

      // Get pair contract
      const pairContract = await ethers.getContractAt("UniswapV2Pair", pair);
      const token0 = await pairContract.token0();
      const token1 = await pairContract.token1();

      // Approve pair contract
      await usdc.approve(router.address, ethers.constants.MaxUint256);
      await token.approve(router.address, ethers.constants.MaxUint256);

      // Add liquidity
      console.log(`Adding liquidity...`);
      console.log(`Initial amounts:`, {
        token: ethers.utils.formatEther(initialTokenAmount),
        usdc: ethers.utils.formatUnits(initialUsdcAmount, 6),
        token0,
        token1
      });

      await router.addLiquidity(
        token.address,
        usdc.address,
        initialTokenAmount,
        initialUsdcAmount,
        0,
        0,
        owner.address,
        deadline,
        { gasLimit: 5000000 }
      );

      // Verify reserves
      const [reserve0, reserve1] = await pairContract.getReserves();
      console.log(`Reserves after liquidity:`, {
        reserve0: ethers.utils.formatUnits(reserve0, token0 === token.address ? 18 : 6),
        reserve1: ethers.utils.formatUnits(reserve1, token0 === token.address ? 6 : 18),
        token0,
        token1,
        token: token.address,
        usdc: usdc.address
      });

      // Verify reserves are correct
      expect(reserve0).to.be.gt(0, "reserve0 should be greater than 0");
      expect(reserve1).to.be.gt(0, "reserve1 should be greater than 0");

      // Verify LP tokens were minted
      const lpBalance = await pairContract.balanceOf(owner.address);
      expect(lpBalance).to.be.gt(0, "LP balance should be greater than 0");
      console.log(`LP tokens minted: ${ethers.utils.formatEther(lpBalance)}`);
    }
  });

  it("Should create pools successfully", async function () {
    for (const [name, token] of Object.entries(tokens)) {
      console.log(`\nChecking ${name}/USDC pool...`);
      
      const pair = await factory.getPair(token.address, usdc.address);
      expect(pair).to.not.equal(ethers.constants.AddressZero);

      const pairContract = await ethers.getContractAt("UniswapV2Pair", pair);
      const [reserve0, reserve1] = await pairContract.getReserves();
      const token0 = await pairContract.token0();
      
      console.log(`Pool reserves:`, {
        reserve0: ethers.utils.formatUnits(reserve0, token0 === token.address ? 18 : 6),
        reserve1: ethers.utils.formatUnits(reserve1, token0 === token.address ? 6 : 18),
        token0,
        token: token.address,
        usdc: usdc.address
      });

      expect(reserve0).to.be.gt(0);
      expect(reserve1).to.be.gt(0);
    }
  });

  async function testSwap(tokenContract: Contract, path: string[], swapAmount: any, decimals: number) {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    // Get pair info
    const pair = await factory.getPair(path[0], path[1]);
    const pairContract = await ethers.getContractAt("UniswapV2Pair", pair);
    const [reserve0, reserve1] = await pairContract.getReserves();
    const token0 = await pairContract.token0();

    console.log(`Swap Info:`, {
      pair,
      token0,
      reserve0: ethers.utils.formatUnits(reserve0, token0 === path[0] ? decimals : (decimals === 18 ? 6 : 18)),
      reserve1: ethers.utils.formatUnits(reserve1, token0 === path[0] ? (decimals === 18 ? 6 : 18) : decimals),
      path,
      swapAmount: ethers.utils.formatUnits(swapAmount, decimals)
    });

    // Calculate reserves based on token0/token1 order, not path order
    const [reserveIn, reserveOut] = path[0] === token0
      ? [reserve0, reserve1]
      : [reserve1, reserve0];

    // Calculate minimum amount out
    const amountInWithFee = swapAmount.mul(997);
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.mul(1000).add(amountInWithFee);
    const amountOutMin = numerator.div(denominator).mul(95).div(100); // 5% slippage tolerance

    // Approve router and pair
    console.log(`Approving router and pair for ${ethers.utils.formatUnits(swapAmount, decimals)} tokens...`);
    await tokenContract.approve(router.address, ethers.constants.MaxUint256);
    await tokenContract.approve(pair, ethers.constants.MaxUint256);

    // Transfer tokens to the pair
    console.log(`Transferring tokens to pair...`);
    await tokenContract.transfer(pair, swapAmount);

    // Execute swap
    console.log(`Executing swap with:`, {
      amountIn: ethers.utils.formatUnits(swapAmount, decimals),
      amountOutMin: ethers.utils.formatUnits(amountOutMin, path[1] === usdc.address ? 6 : 18),
      path: path.join(' -> ')
    });

    await router.swapExactTokensForTokens(
      swapAmount,
      amountOutMin,
      path,
      owner.address,
      deadline,
      { gasLimit: 5000000 }
    );

    // Return swap details for verification
    return {
      amountIn: ethers.utils.formatUnits(swapAmount, decimals),
      amountOutMin: ethers.utils.formatUnits(amountOutMin, path[1] === usdc.address ? 6 : 18)
    };
  }

  for (const tokenName of TOKEN_NAMES) {
    describe(`${tokenName} Swaps`, function () {
      it(`Should swap ${tokenName} for USDC`, async function () {
        const token = tokens[tokenName];
        const swapAmount = ethers.utils.parseEther("100");
        const path = [token.address, usdc.address];

        const balanceBefore = await usdc.balanceOf(owner.address);
        const tokenBalanceBefore = await token.balanceOf(owner.address);

        const swapDetails = await testSwap(token, path, swapAmount, 18);
        console.log(`${tokenName} -> USDC Swap Details:`, swapDetails);

        const balanceAfter = await usdc.balanceOf(owner.address);
        const tokenBalanceAfter = await token.balanceOf(owner.address);

        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(tokenBalanceAfter).to.be.lt(tokenBalanceBefore);
      });

      it(`Should swap USDC for ${tokenName}`, async function () {
        const token = tokens[tokenName];
        const swapAmount = ethers.utils.parseUnits("100", 6);
        const path = [usdc.address, token.address];

        const balanceBefore = await token.balanceOf(owner.address);
        const usdcBalanceBefore = await usdc.balanceOf(owner.address);

        const swapDetails = await testSwap(usdc, path, swapAmount, 6);
        console.log(`USDC -> ${tokenName} Swap Details:`, swapDetails);

        const balanceAfter = await token.balanceOf(owner.address);
        const usdcBalanceAfter = await usdc.balanceOf(owner.address);

        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(usdcBalanceAfter).to.be.lt(usdcBalanceBefore);
      });
    });
  }
}); 