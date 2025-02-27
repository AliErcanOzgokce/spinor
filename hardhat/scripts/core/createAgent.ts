import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import fs from "fs";
import path from "path";

interface Agents {
    [key: string]: {
        address: string;
        tradeStrategy: number;
        riskLevel: number;
        createdAt: string;
    };
}

task("create-agent", "Creates a new SpinorAgent")
    .addParam("name", "Name of the agent")
    .addParam("strategy", "Trading strategy (1-5)")
    .addParam("risk", "Risk level (1-4)")
    .setAction(async (taskArgs, hre) => {
        try {
            const { name, strategy, risk } = taskArgs;
            const tradeStrategy = parseInt(strategy);
            const riskLevel = parseInt(risk);

            // Validate inputs
            if (tradeStrategy < 1 || tradeStrategy > 5) {
                throw new Error('Strategy must be between 1 and 5');
            }
            if (riskLevel < 1 || riskLevel > 4) {
                throw new Error('Risk level must be between 1 and 4');
            }

            const [deployer] = await hre.ethers.getSigners();
            console.log("Deploying agent with account:", deployer.address);

            // Read deployments
            const deploymentsPath = path.join(__dirname, "../../deployments.json");
            const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

            // Read agents.json
            const agentsPath = path.join(__dirname, "../../agents.json");
            let agents: Agents = {};
            if (fs.existsSync(agentsPath)) {
                agents = JSON.parse(fs.readFileSync(agentsPath, "utf8"));
            }

            // Check if agent name already exists
            if (agents[name]) {
                throw new Error(`Agent with name ${name} already exists`);
            }

            // Estimate gas for deployment
            const SpinorAgent = await hre.ethers.getContractFactory("SpinorAgent");
            const deploymentGas = await SpinorAgent.signer.estimateGas(
                SpinorAgent.getDeployTransaction(
                    deployments.router,
                    deployments.factory,
                    deployments.usdc,
                    tradeStrategy,
                    riskLevel
                )
            );
            console.log("Estimated gas:", deploymentGas.toString());

            console.log("Waiting for deployment...");
            const agent = await SpinorAgent.deploy(
                deployments.router,
                deployments.factory,
                deployments.usdc,
                tradeStrategy,
                riskLevel,
                { gasLimit: Math.ceil(Number(deploymentGas) * 1.2) }
            );
            await agent.deployed();
            console.log("Agent deployed to:", agent.address);

            // Update agents.json
            agents[name] = {
                address: agent.address,
                tradeStrategy,
                riskLevel,
                createdAt: new Date().toISOString()
            };
            fs.writeFileSync(agentsPath, JSON.stringify(agents, null, 2));
            console.log("Updated agents.json");

            // Return the agent info
            return {
                success: true,
                data: {
                    name,
                    address: agent.address,
                    tradeStrategy,
                    riskLevel
                }
            };
        } catch (error: any) {
            console.error("Deployment failed:", error);
            throw error;
        }
    }); 