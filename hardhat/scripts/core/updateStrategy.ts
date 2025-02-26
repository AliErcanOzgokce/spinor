import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import fs from "fs";
import path from "path";

task("update-strategy", "Updates the agent's trading strategy and risk level")
    .addParam("strategy", "Trading strategy (1-5)")
    .addParam("risk", "Risk level (1-4)")
    .setAction(async (taskArgs, hre) => {
        const strategy = parseInt(taskArgs.strategy);
        const risk = parseInt(taskArgs.risk);

        // Validate inputs
        if (strategy < 1 || strategy > 5) {
            throw new Error('Strategy must be between 1 and 5');
        }
        if (risk < 1 || risk > 4) {
            throw new Error('Risk level must be between 1 and 4');
        }

        const [deployer] = await hre.ethers.getSigners();
        console.log("Updating strategy with account:", deployer.address);

        // Read deployments
        const deploymentsPath = path.join(__dirname, "../../deployments.json");
        const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

        if (!deployments.agent) {
            throw new Error("Agent contract address not found in deployments.json");
        }

        // Get contract instance
        const SpinorAgent = await hre.ethers.getContractFactory("SpinorAgent");
        const agent = SpinorAgent.attach(deployments.agent);

        console.log("\nCurrent Status:");
        console.log("-------------");
        const currentStrategy = await agent.tradeStrategy();
        const currentRisk = await agent.riskLevel();
        const isActive = await agent.isActive();
        console.log("Current Strategy:", currentStrategy.toString());
        console.log("Current Risk Level:", currentRisk.toString());
        console.log("Is Active:", isActive);

        console.log("\nUpdating Configuration:");
        console.log("----------------------");
        
        // If contract is active, pause it first
        if (isActive) {
            console.log("Pausing agent...");
            const pauseTx = await agent.pause();
            await pauseTx.wait();
            console.log("Agent paused");
        }

        // Update strategy
        if (currentStrategy.toString() !== strategy.toString()) {
            console.log(`Updating strategy from ${currentStrategy} to ${strategy}...`);
            const strategyTx = await agent.setTradeStrategy(strategy);
            await strategyTx.wait();
            console.log("Strategy updated");
        }

        // Update risk level
        if (currentRisk.toString() !== risk.toString()) {
            console.log(`Updating risk level from ${currentRisk} to ${risk}...`);
            const riskTx = await agent.setRiskLevel(risk);
            await riskTx.wait();
            console.log("Risk level updated");
        }

        // Start the agent again
        console.log("Starting agent...");
        const startTx = await agent.start();
        await startTx.wait();
        console.log("Agent started");

        // Verify new settings
        console.log("\nNew Status:");
        console.log("-----------");
        const newStrategy = await agent.tradeStrategy();
        const newRisk = await agent.riskLevel();
        const newIsActive = await agent.isActive();
        console.log("New Strategy:", newStrategy.toString());
        console.log("New Risk Level:", newRisk.toString());
        console.log("Is Active:", newIsActive);
    }); 