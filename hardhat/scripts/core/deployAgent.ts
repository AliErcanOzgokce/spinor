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
    
    // Pause the contract first
    console.log("Pausing the agent...");
    await agent.pause();
    console.log("Agent paused");

    // Set initial duration (24 hours)
    console.log("Setting duration...");
    const ONE_DAY = 24 * 60 * 60; // 24 hours in seconds
    await agent.setDuration(ONE_DAY);
    console.log("Duration set to 24 hours");

    // Verify the configuration
    const duration = await agent.duration();
    const isPaused = await agent.paused();
    console.log("\nVerifying configuration:");
    console.log("- Duration:", duration.toString(), "seconds");
    console.log("- Paused:", isPaused);

    console.log("\nDeployment completed successfully!");
    console.log("You can now:");
    console.log("1. Use the agent address:", agent.address);
    console.log("2. Configure the agent (select tokens, etc.)");
    console.log("3. Start the agent using the start() function");
    console.log("4. The agent will automatically pause after 24 hours");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 