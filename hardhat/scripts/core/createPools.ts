import { ethers } from "hardhat";
import { Contract } from "ethers";
import * as fs from "fs";
import { CONSTANTS } from "../libraries/constants";

interface DeploymentInfo {
  factory: string;
  router: string;
  usdc: string;
  tokens: {
    [key: string]: string;
  };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Creating pools with the account:", deployer.address);

  // Load deployment info
  const deploymentInfo: DeploymentInfo = JSON.parse(
    fs.readFileSync("deployments.json", "utf-8")
  );

  // Get contract instances
  const factory = new ethers.Contract(deploymentInfo.factory, CONSTANTS.FACTORY_ABI, deployer);
  const router = new ethers.Contract(deploymentInfo.router, CONSTANTS.ROUTER_ABI, deployer);
  const usdc = await ethers.getContractAt("MockUSDC", deploymentInfo.usdc);

  // Get token instances
  const tokens: { [key: string]: Contract } = {};
  for (const [name, address] of Object.entries(deploymentInfo.tokens)) {
    tokens[name] = await ethers.getContractAt(name, address);
  }

  // Mint initial supply
  console.log("Minting initial supply...");
  const initialSupply = ethers.utils.parseUnits("1000000", 6); // USDC has 6 decimals
  await usdc.mint(deployer.address, initialSupply);
  console.log("Minted USDC:", ethers.utils.formatUnits(initialSupply, 6));

  const lstInitialSupply = ethers.utils.parseEther("1000000"); // 18 decimals for LST/LRT tokens
  for (const [name, token] of Object.entries(tokens)) {
    await token.mint(deployer.address, lstInitialSupply);
    console.log(`Minted ${name}:`, ethers.utils.formatEther(lstInitialSupply));
  }

  // Approve router
  console.log("\nApproving router...");
  await usdc.approve(router.address, initialSupply);
  console.log("Approved USDC");

  for (const [name, token] of Object.entries(tokens)) {
    await token.approve(router.address, lstInitialSupply);
    console.log(`Approved ${name}`);
  }

  // Create pools and add initial liquidity
  console.log("\nCreating pools and adding liquidity...");
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
  const tokenAmount = ethers.utils.parseEther("100000");
  const usdcAmount = ethers.utils.parseUnits("100000", 6);

  for (const [name, token] of Object.entries(tokens)) {
    console.log(`\nCreating pool for ${name}/USDC...`);
    
    // Create the pair
    console.log("Creating new pair...");
    await factory.createPair(token.address, usdc.address);
    console.log("Pair created");

    // Then add liquidity
    console.log("Adding initial liquidity...");
    await router.addLiquidity(
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
    console.log(`Added liquidity for ${name}/USDC`);
  }

  console.log("\nAll pools created successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 