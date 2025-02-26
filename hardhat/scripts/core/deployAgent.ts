import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Read current deployments
    const deploymentsPath = path.join(__dirname, "../../deployments.json");
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

    // Deploy SpinorAgent
    const SpinorAgent = await ethers.getContractFactory("SpinorAgent");
    const agent = await SpinorAgent.deploy(
        deployments.router,
        deployments.factory,
        deployments.usdc,
        1, // Initial trade strategy
        2  // Initial risk level
    );
    await agent.deployed();
    console.log("SpinorAgent deployed to:", agent.address);

    // Deploy SpinorHistory
    const SpinorHistory = await ethers.getContractFactory("SpinorHistory");
    const history = await SpinorHistory.deploy();
    await history.deployed();
    console.log("SpinorHistory deployed to:", history.address);

    // Mint USDC to SpinorAgent
    const usdcAmount = ethers.utils.parseUnits("10000", 6); // 10,000 USDC
    const ERC20 = await ethers.getContractFactory("LST1"); // Using LST contract as it's an ERC20
    const usdc = ERC20.attach(deployments.usdc);
    
    console.log("Minting USDC to SpinorAgent...");
    const mintTx = await usdc.mint(agent.address, usdcAmount);
    await mintTx.wait();
    console.log("Minted 10,000 USDC to SpinorAgent");

    // Verify USDC balance
    const balance = await usdc.balanceOf(agent.address);
    console.log("SpinorAgent USDC balance:", ethers.utils.formatUnits(balance, 6));

    // Update deployments.json
    deployments.agent = agent.address;
    deployments.history = history.address;
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log("Updated deployments.json");

    console.log("\nDeployment Summary:");
    console.log("-------------------");
    console.log("SpinorAgent:", agent.address);
    console.log("SpinorHistory:", history.address);
    console.log("USDC Balance:", ethers.utils.formatUnits(balance, 6));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 