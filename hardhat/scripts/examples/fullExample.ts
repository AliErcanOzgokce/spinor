import { ethers } from "hardhat";
import { LiquidityService } from "../dex/LiquidityService";
import { SwapService } from "../dex/SwapService";
import * as fs from "fs";

async function main() {
    const [signer] = await ethers.getSigners();
    
    // Load deployment info
    const deploymentInfo = JSON.parse(
        fs.readFileSync("deployment.json", "utf-8")
    );

    // Initialize services
    const config = {
        factoryAddress: deploymentInfo.factory,
        routerAddress: deploymentInfo.router,
        signer
    };

    const liquidityService = await LiquidityService.initialize(config);
    const swapService = await SwapService.initialize(config);

    // Get contract instances
    const factory = await ethers.getContractAt("UniswapV2Factory", deploymentInfo.factory, signer);
    const usdc = await ethers.getContractAt("MockUSDC", deploymentInfo.usdc);
    const lst1 = await ethers.getContractAt("LST1", deploymentInfo.tokens.LST1);

    // Check if pair exists and get reserves
    console.log("\nChecking Liquidity Pool Status");
    let pairAddress = await factory.getPair(lst1.address, usdc.address);
    console.log("Initial pair address:", pairAddress);
    
    if (pairAddress === ethers.constants.AddressZero) {
        console.log("\nCreating new liquidity pool...");
        await factory.createPair(lst1.address, usdc.address);
        pairAddress = await factory.getPair(lst1.address, usdc.address);
        console.log("New pair created at:", pairAddress);
    } else {
        console.log("Pair already exists");
    }

    // Mint tokens
    console.log("\nMinting Tokens");
    const mintAmount = ethers.utils.parseEther("100000");
    const usdcMintAmount = ethers.utils.parseUnits("100000", 6);
    
    await lst1.mint(signer.address, mintAmount);
    await usdc.mint(signer.address, usdcMintAmount);
    
    console.log("Minted LST1:", ethers.utils.formatEther(mintAmount));
    console.log("Minted USDC:", ethers.utils.formatUnits(usdcMintAmount, 6));

    // Example 1: Add Liquidity
    console.log("\nAdding Liquidity Example:");
    const addLiquidityAmount = ethers.utils.parseEther("50000");
    const usdcAmount = ethers.utils.parseUnits("50000", 6);

    const liquidityResult = await liquidityService.addLiquidity(
        { tokenA: lst1.address, tokenB: usdc.address },
        addLiquidityAmount,
        usdcAmount
    );

    console.log("Liquidity Added:", {
        lst1Amount: ethers.utils.formatEther(liquidityResult.amountA),
        usdcAmount: ethers.utils.formatUnits(liquidityResult.amountB, 6),
        lpTokens: ethers.utils.formatEther(liquidityResult.liquidity)
    });

    // Example 2: Calculate Swap
    console.log("\nCalculating Expected Swap Amount:");
    const swapAmount = ethers.utils.parseEther("100");
    const expectedAmount = await swapService.getExpectedOutputAmount(
        { tokenA: lst1.address, tokenB: usdc.address },
        swapAmount
    );

    console.log("Expected Swap Result:", {
        amountIn: ethers.utils.formatEther(swapAmount),
        expectedOut: ethers.utils.formatUnits(expectedAmount, 6)
    });

    // Example 3: Execute Swap
    console.log("\nExecuting Swap:");
    const swapResult = await swapService.swap(
        { tokenA: lst1.address, tokenB: usdc.address },
        swapAmount
    );

    console.log("Actual Swap Result:", {
        amountIn: ethers.utils.formatEther(swapAmount),
        amountOut: ethers.utils.formatUnits(swapResult, 6)
    });

    // Get pair contract for LP token operations
    const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
    const lpBalance = await pair.balanceOf(signer.address);

    // Example 4: Remove Liquidity
    console.log("\nRemoving Liquidity Example:");
    const lpTokenAmount = lpBalance.div(10); // Remove 10% of LP tokens
    console.log("Removing LP tokens:", ethers.utils.formatEther(lpTokenAmount));

    const removeLiquidityResult = await liquidityService.removeLiquidity(
        { tokenA: lst1.address, tokenB: usdc.address },
        lpTokenAmount
    );

    console.log("Liquidity Removed:", {
        lst1Returned: ethers.utils.formatEther(removeLiquidityResult.amountA),
        usdcReturned: ethers.utils.formatUnits(removeLiquidityResult.amountB, 6)
    });

    // Final balances
    console.log("\nFinal Balances");
    console.log("LST1:", ethers.utils.formatEther(await lst1.balanceOf(signer.address)));
    console.log("USDC:", ethers.utils.formatUnits(await usdc.balanceOf(signer.address), 6));
    console.log("LP Tokens:", ethers.utils.formatEther(await pair.balanceOf(signer.address)));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });