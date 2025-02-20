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
    
    let pair = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
    
    if (pairAddress === ethers.constants.AddressZero) {
        console.log("\nCreating new liquidity pool...");
        await factory.createPair(lst1.address, usdc.address);
        pairAddress = await factory.getPair(lst1.address, usdc.address);
        pair = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
        console.log("New pair created at:", pairAddress);
    } else {
        console.log("Pair already exists");
        const [reserve0, reserve1] = await pair.getReserves();
        const token0 = await pair.token0();
        const reserves = token0 === lst1.address ? 
            { lst1: reserve0, usdc: reserve1 } : 
            { lst1: reserve1, usdc: reserve0 };
        
        console.log("Current Reserves:", {
            lst1: ethers.utils.formatEther(reserves.lst1),
            usdc: ethers.utils.formatUnits(reserves.usdc, 6)
        });
    }

    // Mint tokens
    console.log("\nMinting Tokens");
    const mintAmount = ethers.utils.parseEther("1000000");
    const usdcMintAmount = ethers.utils.parseUnits("1000000", 6);
    
    await lst1.mint(signer.address, mintAmount);
    await usdc.mint(signer.address, usdcMintAmount);
    
    console.log("Minted LST1:", ethers.utils.formatEther(mintAmount));
    console.log("Minted USDC:", ethers.utils.formatUnits(usdcMintAmount, 6));

    // Example 1: Add Liquidity
    console.log("\nAdding Liquidity Example:");
    
    // First, check current balances
    const lstBalance = await lst1.balanceOf(signer.address);
    const usdcBalance = await usdc.balanceOf(signer.address);
    
    console.log("Current balances:", {
        lst1: ethers.utils.formatEther(lstBalance),
        usdc: ethers.utils.formatUnits(usdcBalance, 6)
    });

    // Get current reserves and calculate proportional amounts
    const [reserve0, reserve1] = await pair.getReserves();
    const token0 = await pair.token0();

    // Determine which reserve is USDC and which is the token
    const [tokenReserve, usdcReserve] = token0.toLowerCase() === lst1.address.toLowerCase() 
        ? [reserve0, reserve1] 
        : [reserve1, reserve0];

    console.log("Current reserves:", {
        lst1: ethers.utils.formatEther(tokenReserve),
        usdc: ethers.utils.formatUnits(usdcReserve, 6)
    });

    // Calculate optimal amounts based on current reserves using ethers.BigNumber arithmetic
    // For optimal liquidity provision, we want: dx/x = dy/y where x and y are the reserves
    // Use a larger base amount (100000 tokens) for liquidity addition
    const tokenAmountToAdd = ethers.utils.parseEther("100000"); // Base amount we want to add

    // Increase token A by 10% to ensure sufficient amount
    const tokenAmount = tokenAmountToAdd.mul(1100).div(1000);
    // Compute the optimal USDC amount based on the adjusted token amount
    const usdcAmount = tokenAmount.mul(usdcReserve).div(tokenReserve);

    console.log("Adding liquidity with:", {
        lst1Amount: ethers.utils.formatEther(tokenAmount),
        usdcAmount: ethers.utils.formatUnits(usdcAmount, 6),
        ratio: Number(ethers.utils.formatUnits(usdcAmount, 6)) / Number(ethers.utils.formatEther(tokenAmount))
    });

    // Verify we have enough balance
    if (tokenAmount.gt(lstBalance) || usdcAmount.gt(usdcBalance)) {
        console.error("Insufficient balance for liquidity addition");
        console.log("Required:", {
            lst1: ethers.utils.formatEther(tokenAmount),
            usdc: ethers.utils.formatUnits(usdcAmount, 6)
        });
        console.log("Available:", {
            lst1: ethers.utils.formatEther(lstBalance),
            usdc: ethers.utils.formatUnits(usdcBalance, 6)
        });
        process.exit(1);
    }

    // Approve tokens first
    console.log("Approving tokens...");
    await lst1.approve(config.routerAddress, tokenAmount);
    await usdc.approve(config.routerAddress, usdcAmount);
    console.log("Tokens approved");

    try {
        console.log("Adding liquidity...");
        const liquidityResult = await liquidityService.addLiquidity(
            { tokenA: lst1.address, tokenB: usdc.address },
            tokenAmount,
            usdcAmount,
            0.98 // 98% slippage tolerance, allowing a further lowering of minimum amounts
        );

        console.log("Liquidity Added Successfully:", {
            lst1Amount: ethers.utils.formatEther(liquidityResult.amountA),
            usdcAmount: ethers.utils.formatUnits(liquidityResult.amountB, 6),
            lpTokens: ethers.utils.formatEther(liquidityResult.liquidity)
        });
    } catch (error: any) {
        console.error("Failed to add liquidity:", error.message);
        process.exit(1);
    }

    // Example 2: Calculate Swap
    console.log("\nCalculating Expected Swap Amount:");
    const swapAmount = ethers.utils.parseEther("1000");
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
    await lst1.approve(config.routerAddress, swapAmount);
    
    try {
        const swapResult = await swapService.swap(
            { tokenA: lst1.address, tokenB: usdc.address },
            swapAmount,
            0.1 // 0.1% slippage tolerance
        );

        console.log("Actual Swap Result:", {
            amountIn: ethers.utils.formatEther(swapAmount),
            amountOut: ethers.utils.formatUnits(swapResult, 6)
        });
    } catch (error: any) {
        console.error("Failed to execute swap:", error.message);
        process.exit(1);
    }

    // Get pair contract for LP token operations
    if (!pair) {
        pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
    }
    const lpBalance = await pair.balanceOf(signer.address);

    // Example 4: Remove Liquidity
    console.log("\nRemoving Liquidity Example:");
    const lpTokenAmount = lpBalance.div(2); // Remove 50% of LP tokens
    console.log("LP Balance:", ethers.utils.formatEther(lpBalance));
    console.log("Removing LP tokens:", ethers.utils.formatEther(lpTokenAmount));

    // Approve LP tokens first
    await pair.approve(config.routerAddress, lpTokenAmount);

    // try {
    //     const removeLiquidityResult = await liquidityService.removeLiquidity(
    //         { tokenA: lst1.address, tokenB: usdc.address },
    //         lpTokenAmount,
    //         0.1 // 0.1% slippage tolerance
    //     );

    //     console.log("Liquidity Removed:", {
    //         lst1Returned: ethers.utils.formatEther(removeLiquidityResult.amountA),
    //         usdcReturned: ethers.utils.formatUnits(removeLiquidityResult.amountB, 6)
    //     });
    // } catch (error: any) {
    //     console.error("Failed to remove liquidity:", error.message);
    // }

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