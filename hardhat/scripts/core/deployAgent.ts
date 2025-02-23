import { ethers } from "hardhat";
import * as fs from "fs";
import { SpinorAgent } from "../../typechain-types";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying SpinorAgent with the account:", deployer.address);

    // Load existing deployment info
    const deploymentInfo = JSON.parse(
        fs.readFileSync("deployments.json", "utf-8")
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
        deploymentInfo.usdc,
        4,
        5
    );
    await agent.deployed();
    console.log("SpinorAgent deployed to:", agent.address);

    // Pause the contract first if needed
    const isPaused = await agent.paused();
    if (!isPaused) {
        console.log("Pausing the contract...");
        const pauseTx = await agent.pause();
        await pauseTx.wait();
        console.log("Contract paused successfully");
    }


    // Unpause the contract if needed
    console.log("Unpausing the contract...");
    const unpauseTx = await agent.unpause();
    await unpauseTx.wait();
    console.log("Contract unpaused successfully");

    // Update deployment info
    deploymentInfo.agent = agent.address;
    
    // Save updated deployment info
    fs.writeFileSync(
        "deployments.json",
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("Deployment info updated!");

    // Initialize the agent
    console.log("\nInitializing SpinorAgent...");
    
    // Verify the configuration
    const duration = await agent.duration();
    console.log("\nVerifying configuration:");
    console.log("- Duration:", duration.toString(), "seconds");

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