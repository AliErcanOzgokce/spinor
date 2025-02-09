import { ethers } from "hardhat";
import { Contract } from "ethers";
import * as fs from "fs";

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
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Factory
  const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await UniswapV2Factory.deploy();
  await factory.deployed();
  console.log("UniswapV2Factory deployed to:", factory.address);

  // Deploy Router
  const UniswapV2Router = await ethers.getContractFactory("UniswapV2Router");
  const router = await UniswapV2Router.deploy(factory.address);
  await router.deployed();
  console.log("UniswapV2Router deployed to:", router.address);

  // Deploy USDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.deployed();
  console.log("MockUSDC deployed to:", usdc.address);

  // Deploy LST and LRT tokens
  const tokens: Contract[] = [];
  const tokenContracts: { [key: string]: string } = {};
  const tokenNames = ["LST1", "LST2", "LST3", "LST4", "LRT1", "LRT2", "LRT3", "LRT4"];

  for (const name of tokenNames) {
    const Token = await ethers.getContractFactory(name);
    const token = await Token.deploy();
    await token.deployed();
    tokens.push(token);
    tokenContracts[name] = token.address;
    console.log(`${name} deployed to:`, token.address);
  }

  // Save deployment addresses
  const deploymentInfo: DeploymentInfo = {
    factory: factory.address,
    router: router.address,
    usdc: usdc.address,
    tokens: tokenContracts
  };

  console.log("\nDeployment Info:", deploymentInfo);

  // Save to file
  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 