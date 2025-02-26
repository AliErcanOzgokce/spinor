import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Funding agent with account:", deployer.address);

    // Read deployments
    const deploymentsPath = path.join(__dirname, "../../deployments.json");
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

    // Get contract instances
    const ERC20 = await ethers.getContractFactory("LST1"); // Using LST1 contract
    const usdc = ERC20.attach(deployments.usdc);
    const SpinorAgent = await ethers.getContractFactory("SpinorAgent");
    const agent = SpinorAgent.attach(deployments.agent);

    // First check if agent is paused
    const isPaused = await agent.paused();
    if (!isPaused) {
        console.log("\nPausing agent for deposit...");
        const pauseTx = await agent.pause();
        await pauseTx.wait();
        console.log("Agent paused");
    }

    // Amount to mint and deposit (10,000 USDC)
    const amount = ethers.utils.parseUnits("10000", 6); // USDC has 6 decimals

    // 1. Mint USDC to deployer
    console.log("\nMinting USDC...");
    const mintTx = await usdc.mint(deployer.address, amount);
    await mintTx.wait();
    console.log(`Minted ${ethers.utils.formatUnits(amount, 6)} USDC to ${deployer.address}`);

    // Check balance
    const balance = await usdc.balanceOf(deployer.address);
    console.log(`Current USDC balance: ${ethers.utils.formatUnits(balance, 6)}`);

    // 2. Approve SpinorAgent to spend USDC
    console.log("\nApproving SpinorAgent...");
    const approveTx = await usdc.approve(agent.address, amount);
    await approveTx.wait();
    console.log("Approved SpinorAgent to spend USDC");

    // 3. Deposit USDC to SpinorAgent
    console.log("\nDepositing USDC to SpinorAgent...");
    const depositTx = await agent.deposit(usdc.address, amount);
    await depositTx.wait();
    console.log(`Deposited ${ethers.utils.formatUnits(amount, 6)} USDC to SpinorAgent`);

    // 4. Verify agent's balance
    const agentBalance = await usdc.balanceOf(agent.address);
    console.log(`\nSpinorAgent USDC balance: ${ethers.utils.formatUnits(agentBalance, 6)}`);

    // 5. Set duration and start agent
    console.log("\nSetting duration and starting agent...");
    const duration = 24 * 60 * 60; // 24 hours in seconds
    const setDurationTx = await agent.setDuration(duration);
    await setDurationTx.wait();
    console.log("Duration set to 24 hours");

    // Always start the agent at the end
    console.log("\nStarting agent...");
    const startTx = await agent.start();
    await startTx.wait();
    console.log("Agent started successfully");

    // 6. Verify agent is active
    const isActive = await agent.isActive();
    console.log(`\nAgent active status: ${isActive}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 