import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { CONSTANTS } from "../libraries/constants";

/**
 * This script deploys a second trading environment for arbitrage opportunities
 * It creates a new factory and router, and sets up pools with different price ratios
 * for the same tokens, creating arbitrage opportunities
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying arbitrage environment with account:", deployer.address);
  
  // Read current deployments
  const deploymentsPath = path.join(__dirname, "../../deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  
  // Create new deployments2.json
  const deployments2Path = path.join(__dirname, "../../deployments2.json");
  const deployments2: any = {
    factory: "",
    router: "",
    pairs: {}
  };
  
  // Deploy Factory
  console.log("Deploying second UniswapV2Factory...");
  const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await UniswapV2Factory.deploy();
  await factory.deployed();
  console.log("Second UniswapV2Factory deployed to:", factory.address);
  deployments2.factory = factory.address;
  
  // Deploy Router
  console.log("Deploying second UniswapV2Router...");
  const UniswapV2Router = await ethers.getContractFactory("UniswapV2Router");
  const router = await UniswapV2Router.deploy(factory.address);
  await router.deployed();
  console.log("Second UniswapV2Router deployed to:", router.address);
  deployments2.router = router.address;
  
  // Get USDC instance
  const usdc = await ethers.getContractAt("MockUSDC", deployments.usdc);
  
  // Initialize token contracts
  const tokenSymbols = ["LST1", "LST2", "LST3", "LST4", "LRT1", "LRT2", "LRT3", "LRT4"];
  const tokenContracts: { [key: string]: any } = {};
  
  for (const symbol of tokenSymbols) {
    // Use different token address format in deployments.json based on the actual file structure
    const tokenAddress = deployments.tokens[symbol];
    tokenContracts[symbol] = await ethers.getContractAt(symbol, tokenAddress);
  }
  
  // Mint tokens to deployer for liquidity provision
  console.log("\nMinting tokens to deployer for liquidity provision...");
  // Mint a large amount of USDC
  const usdcMintAmount = ethers.utils.parseUnits("1000000", 6); // 1 million USDC
  const tokenMintAmount = ethers.utils.parseEther("1000000"); // 1 million tokens
  
  // Mint USDC
  const usdcMintTx = await usdc.mint(deployer.address, usdcMintAmount);
  await usdcMintTx.wait();
  console.log(`Minted ${ethers.utils.formatUnits(usdcMintAmount, 6)} USDC to deployer`);
  
  // Mint LST and LRT tokens
  for (const symbol of tokenSymbols) {
    const mintTx = await tokenContracts[symbol].mint(deployer.address, tokenMintAmount);
    await mintTx.wait();
    console.log(`Minted ${ethers.utils.formatEther(tokenMintAmount)} ${symbol} to deployer`);
  }
  
  // Approve router for all tokens
  console.log("\nApproving second router for all tokens...");
  const MAX_AMOUNT = ethers.constants.MaxUint256;
  
  const usdcApproveTx = await usdc.approve(router.address, MAX_AMOUNT);
  await usdcApproveTx.wait();
  console.log("Approved USDC for second router");
  
  for (const symbol of tokenSymbols) {
    const approveTx = await tokenContracts[symbol].approve(router.address, MAX_AMOUNT);
    await approveTx.wait();
    console.log(`Approved ${symbol} for second router`);
  }
  
  // Create pools with different price ratios to create arbitrage opportunities
  console.log("\nCreating pools with different price ratios for arbitrage...");
  const deadline = Math.floor(Date.now() / 1000) + CONSTANTS.DEADLINE_MINUTES * 60;
  
  for (const symbol of tokenSymbols) {
    console.log(`\nCreating pool for ${symbol}/USDC with different ratio...`);
    const token = tokenContracts[symbol];
    
    // For second factory, use different ratios to create arbitrage opportunities
    // Use 5-15% price differences for significant arbitrage opportunities
    const priceDiffPercent = 5 + Math.floor(Math.random() * 10); // 5-15% difference
    const isPriceHigher = Math.random() > 0.5; // Randomly decide if price is higher or lower
    
    // Original pool has 1:1 ratio in token value (100,000 tokens : 100,000 USDC)
    let tokenAmount = ethers.utils.parseEther("100000");
    let usdcAmount = ethers.utils.parseUnits("100000", 6);
    
    if (isPriceHigher) {
      // Make token more expensive in this pool (less tokens for same USDC)
      tokenAmount = tokenAmount.mul(100 - priceDiffPercent).div(100);
      console.log(`${symbol} price is ${priceDiffPercent}% higher in second pool`);
    } else {
      // Make token cheaper in this pool (more tokens for same USDC)
      tokenAmount = tokenAmount.mul(100 + priceDiffPercent).div(100);
      console.log(`${symbol} price is ${priceDiffPercent}% lower in second pool`);
    }
    
    // Create pair
    const createPairTx = await factory.createPair(token.address, usdc.address);
    await createPairTx.wait();
    console.log(`Created pair for ${symbol}/USDC`);
    
    // Add liquidity
    const addLiquidityTx = await router.addLiquidity(
      token.address,
      usdc.address,
      tokenAmount,
      usdcAmount,
      0, // slippage is unavoidable
      0, // slippage is unavoidable
      deployer.address,
      deadline,
      { gasLimit: CONSTANTS.DEFAULT_GAS_LIMIT }
    );
    await addLiquidityTx.wait(); // Wait for transaction to be mined
    console.log(`Added liquidity for ${symbol}/USDC with different ratio`);
    
    // Get pair address and store reserves
    const pairAddress = await factory.getPair(token.address, usdc.address);
    console.log(`Pair address for ${symbol}/USDC: ${pairAddress}`);
    
    if (pairAddress === "0x0000000000000000000000000000000000000000") {
      console.error(`Error: Pair not created for ${symbol}/USDC`);
      continue; // Skip this pair and continue with others
    }
    
    const pair = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
    
    try {
      const reserves = await pair.getReserves();
      
      // Store in deployments2.json
      deployments2.pairs[symbol] = {
        address: pairAddress,
        token: token.address,
        usdc: usdc.address,
        reserve0: reserves[0].toString(),
        reserve1: reserves[1].toString(),
        token0: await pair.token0(),
        token1: await pair.token1()
      };
    } catch (error) {
      console.error(`Error getting reserves for ${symbol}/USDC pair: ${error.message}`);
      
      // Store basic info without reserves
      deployments2.pairs[symbol] = {
        address: pairAddress,
        token: token.address,
        usdc: usdc.address
      };
    }
  }
  
  // Save deployments2.json
  fs.writeFileSync(deployments2Path, JSON.stringify(deployments2, null, 2));
  console.log("\nArbitrage environment setup complete!");
  console.log("Deployment info saved to deployments2.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 