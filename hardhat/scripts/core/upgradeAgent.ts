import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Upgrading agent with account:", deployer.address);

    // Read current deployments
    const deploymentsPath = path.join(__dirname, "../../deployments.json");
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

    if (!deployments.agent) {
        throw new Error("Agent contract address not found in deployments.json");
    }

    // Get current contract instance to read values
    const OldSpinorAgent = await ethers.getContractFactory("SpinorAgent");
    const oldAgent = OldSpinorAgent.attach(deployments.agent);

    // Read current values
    const currentStrategy = await oldAgent.tradeStrategy();
    const currentRisk = await oldAgent.riskLevel();
    const currentDuration = await oldAgent.duration();
    const isActive = await oldAgent.isActive();

    console.log("\nCurrent Values:");
    console.log("---------------");
    console.log("Strategy:", currentStrategy.toString());
    console.log("Risk Level:", currentRisk.toString());
    console.log("Duration:", currentDuration.toString());
    console.log("Is Active:", isActive);

    // If active, pause first
    if (isActive) {
        console.log("\nPausing current agent...");
        const pauseTx = await oldAgent.pause();
        await pauseTx.wait();
        console.log("Agent paused");
    }

    // Deploy new contract
    console.log("\nDeploying new agent...");
    const SpinorAgent = await ethers.getContractFactory("SpinorAgent");
    const newAgent = await SpinorAgent.deploy(
        deployments.router,
        deployments.factory,
        deployments.usdc,
        currentStrategy,
        currentRisk
    );
    await newAgent.deployed();
    console.log("New agent deployed to:", newAgent.address);

    // Set duration
    if (currentDuration > 0) {
        console.log("\nSetting duration...");
        const durationTx = await newAgent.setDuration(currentDuration);
        await durationTx.wait();
        console.log("Duration set");
    }

    // Update deployments.json
    deployments.agent = newAgent.address;
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log("\nUpdated deployments.json");

    // Transfer any USDC balance
    const usdc = await ethers.getContractAt("IERC20", deployments.usdc);
    const balance = await usdc.balanceOf(oldAgent.address);
    if (balance > 0) {
        console.log("\nTransferring USDC balance...");
        const withdrawTx = await oldAgent.withdraw(deployments.usdc, balance);
        await withdrawTx.wait();
        
        const depositTx = await newAgent.deposit(deployments.usdc, balance);
        await depositTx.wait();
        console.log(`Transferred ${ethers.utils.formatUnits(balance, 6)} USDC to new agent`);
    }

    console.log("\nUpgrade complete!");
    console.log("New agent address:", newAgent.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 