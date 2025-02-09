import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying SpinorAgent with the account:", deployer.address);

    // Load existing deployment info
    const deploymentInfo = JSON.parse(
        fs.readFileSync("deployment.json", "utf-8")
    );

    console.log("Using addresses:", {
        router: deploymentInfo.router,
        factory: deploymentInfo.factory,
        usdc: deploymentInfo.usdc
    });

    // Deploy SpinorAgent
    const SpinorAgent = await ethers.getContractFactory("SpinorAgent");
    const agent = await SpinorAgent.deploy(
        deploymentInfo.router,
        deploymentInfo.factory,
        deploymentInfo.usdc
    );
    await agent.deployed();
    console.log("SpinorAgent deployed to:", agent.address);

    // Update deployment info
    deploymentInfo.agent = agent.address;
    
    // Save updated deployment info
    fs.writeFileSync(
        "deployment.json",
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("Deployment info updated!");

    // Initialize the agent
    console.log("\nInitializing SpinorAgent...");
    
    // Pause the agent initially for safety
    await agent.pause();
    console.log("Agent paused for safety");

    console.log("\nDeployment completed successfully!");
    console.log("You can now:");
    console.log("1. Use the agent address:", agent.address);
    console.log("2. Unpause the agent when ready using the owner account");
    console.log("3. Start trading by selecting tokens and adding liquidity");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 