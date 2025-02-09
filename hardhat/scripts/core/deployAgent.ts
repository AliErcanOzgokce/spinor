import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying SpinorAgent with the account:", deployer.address);

    // Load existing deployment info
    const deploymentInfo = JSON.parse(
        fs.readFileSync("deployment.json", "utf-8")
    );

    // Deploy SpinorAgent
    const SpinorAgent = await ethers.getContractFactory("SpinorAgent");
    const agent = await SpinorAgent.deploy();
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
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 