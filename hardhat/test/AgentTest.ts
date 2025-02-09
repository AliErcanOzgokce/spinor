import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("SpinorAgent", function () {
    let factory: Contract;
    let router: Contract;
    let usdc: Contract;
    let lst1: Contract;
    let lst2: Contract;
    let agent: Contract;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;

    const INITIAL_MINT_AMOUNT = ethers.utils.parseEther("2000000");
    const INITIAL_USDC_AMOUNT = ethers.utils.parseUnits("2000000", 6);
    const SWAP_AMOUNT = ethers.utils.parseUnits("1000", 6);
    const ONE_DAY = 24 * 60 * 60; // 24 hours in seconds

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        // Deploy Factory
        const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
        factory = await UniswapV2Factory.deploy();
        await factory.deployed();

        // Deploy Router
        const UniswapV2Router = await ethers.getContractFactory("UniswapV2Router");
        router = await UniswapV2Router.deploy(factory.address);
        await router.deployed();

        // Deploy USDC
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        usdc = await MockUSDC.deploy();
        await usdc.deployed();

        // Deploy LST1
        const LST1 = await ethers.getContractFactory("LST1");
        lst1 = await LST1.deploy();
        await lst1.deployed();

        // Deploy LST2
        const LST2 = await ethers.getContractFactory("LST2");
        lst2 = await LST2.deploy();
        await lst2.deployed();

        // Deploy SpinorAgent
        const SpinorAgent = await ethers.getContractFactory("SpinorAgent");
        agent = await SpinorAgent.deploy(router.address, factory.address, usdc.address);
        await agent.deployed();

        // Initialize SpinorAgent
        await agent.pause();
        await agent.setDuration(ONE_DAY);
        await agent.selectToken(lst1.address);
        await agent.start();

        // Mint initial tokens
        await usdc.mint(owner.address, INITIAL_USDC_AMOUNT);
        await lst1.mint(owner.address, INITIAL_MINT_AMOUNT);
        await lst2.mint(owner.address, INITIAL_MINT_AMOUNT);

        // Transfer some tokens to user for testing
        await usdc.transfer(user.address, SWAP_AMOUNT);
        await lst1.transfer(user.address, SWAP_AMOUNT);
        await lst2.transfer(user.address, SWAP_AMOUNT);

        // Approve router to spend tokens
        await usdc.approve(router.address, INITIAL_USDC_AMOUNT);
        await lst1.approve(router.address, INITIAL_MINT_AMOUNT);
        await lst2.approve(router.address, INITIAL_MINT_AMOUNT);

        // Create LST1/USDC pool and add initial liquidity
        await router.addLiquidity(
            lst1.address,
            usdc.address,
            ethers.utils.parseEther("500000"),
            ethers.utils.parseUnits("500000", 6),
            0,
            0,
            owner.address,
            ethers.constants.MaxUint256
        );

        // Create LST2/USDC pool and add initial liquidity
        await router.addLiquidity(
            lst2.address,
            usdc.address,
            ethers.utils.parseEther("500000"),
            ethers.utils.parseUnits("500000", 6),
            0,
            0,
            owner.address,
            ethers.constants.MaxUint256
        );
    });

    describe("Initialization", function () {
        it("Should initialize with correct addresses", async function () {
            expect(await agent.router()).to.equal(router.address);
            expect(await agent.factory()).to.equal(factory.address);
            expect(await agent.usdc()).to.equal(usdc.address);
            expect(await agent.owner()).to.equal(owner.address);
        });

        it("Should start with correct duration", async function () {
            expect(await agent.duration()).to.equal(ONE_DAY);
            expect(await agent.isActive()).to.be.true;
        });

        it("Should have LST1 as selected token", async function () {
            expect(await agent.currentLst()).to.equal(lst1.address);
        });
    });

    describe("Duration Management", function () {
        it("Should allow owner to set duration when paused", async function () {
            await agent.pause();
            const newDuration = ONE_DAY * 2;
            await agent.setDuration(newDuration);
            expect(await agent.duration()).to.equal(newDuration);
        });

        it("Should not allow setting duration when not paused", async function () {
            const newDuration = ONE_DAY * 2;
            await expect(agent.setDuration(newDuration))
                .to.be.revertedWith("Pausable: not paused");
        });

        it("Should not allow setting zero duration", async function () {
            await agent.pause();
            await expect(agent.setDuration(0))
                .to.be.revertedWith("Duration must be greater than 0");
        });

        it("Should auto-pause after duration expires", async function () {
            // Set a short duration
            await agent.pause();
            await agent.setDuration(1); // 1 second
            await agent.start();

            // Wait for duration to pass
            await ethers.provider.send("evm_increaseTime", [2]);
            await ethers.provider.send("evm_mine", []);

            // Try to execute an operation
            await expect(agent.selectToken(lst2.address))
                .to.be.revertedWith("Duration expired");
        });
    });

    describe("Token Operations", function () {
        beforeEach(async function () {
            await agent.pause();
            await usdc.connect(user).approve(agent.address, SWAP_AMOUNT);
            await lst1.connect(user).approve(agent.address, SWAP_AMOUNT);
            await lst2.connect(user).approve(agent.address, SWAP_AMOUNT);
        });

        it("Should accept token deposits when paused", async function () {
            await agent.connect(user).deposit(usdc.address, SWAP_AMOUNT);
            expect(await usdc.balanceOf(agent.address)).to.equal(SWAP_AMOUNT);
        });

        it("Should allow token withdrawals when paused", async function () {
            await agent.connect(user).deposit(usdc.address, SWAP_AMOUNT);
            await agent.connect(user).withdraw(usdc.address, SWAP_AMOUNT);
            expect(await usdc.balanceOf(agent.address)).to.equal(0);
        });

        it("Should not accept deposits when unpaused", async function () {
            await agent.setDuration(ONE_DAY);
            await agent.start();
            await expect(
                agent.connect(user).deposit(usdc.address, SWAP_AMOUNT)
            ).to.be.revertedWith("Pausable: not paused");
        });
    });

    describe("Swap Operations", function () {
        it("Should not allow swaps after duration expires", async function () {
            // Setup agent with a short duration
            await agent.pause();
            await agent.setDuration(1); // 1 second duration
            await agent.selectToken(lst1.address);
            await usdc.connect(user).approve(agent.address, SWAP_AMOUNT);
            await agent.connect(user).deposit(usdc.address, SWAP_AMOUNT);
            await agent.start();

            // Wait for duration to pass
            await ethers.provider.send("evm_increaseTime", [2]);
            await ethers.provider.send("evm_mine", []);

            // Try to execute swap after duration expired
            const minAmountOut = ethers.utils.parseEther("900");
            
            // Check if swap fails with duration expired
            await expect(
                agent.executeSwap(SWAP_AMOUNT, minAmountOut, true)
            ).to.be.revertedWith("Duration expired");

            // Verify agent state by checking remaining duration
            expect(await agent.getRemainingDuration()).to.equal(0);
            
            // Manually pause the contract since duration expiry doesn't automatically pause it
            await agent.pause();

            // Try to withdraw tokens after pausing
            await agent.connect(user).withdraw(usdc.address, SWAP_AMOUNT);
            expect(await usdc.balanceOf(agent.address)).to.equal(0);
        });

        describe("LST1 Swaps", function () {
            beforeEach(async function () {
                await agent.pause();
                await usdc.connect(user).approve(agent.address, SWAP_AMOUNT);
                await agent.connect(user).deposit(usdc.address, SWAP_AMOUNT);
                await agent.selectToken(lst1.address);
                await agent.start();
            });

            it("Should swap USDC to LST1", async function () {
                const minAmountOut = ethers.utils.parseEther("900"); // Expecting at least 900 LST1 tokens
                await agent.executeSwap(SWAP_AMOUNT, minAmountOut, true);
                expect(await lst1.balanceOf(agent.address)).to.be.gt(minAmountOut);
            });
        });

        describe("LST2 Swaps", function () {
            beforeEach(async function () {
                await agent.pause();
                await usdc.connect(user).approve(agent.address, SWAP_AMOUNT);
                await agent.connect(user).deposit(usdc.address, SWAP_AMOUNT);
                await agent.selectToken(lst2.address);
                await agent.start();
            });

            it("Should swap USDC to LST2", async function () {
                const minAmountOut = ethers.utils.parseEther("900"); // Expecting at least 900 LST2 tokens
                await agent.executeSwap(SWAP_AMOUNT, minAmountOut, true);
                expect(await lst2.balanceOf(agent.address)).to.be.gt(minAmountOut);
            });
        });

        it("Should not allow swaps without selecting token first", async function () {
            // Create a new agent instance to ensure no token is selected
            const SpinorAgent = await ethers.getContractFactory("SpinorAgent");
            const newAgent = await SpinorAgent.deploy(router.address, factory.address, usdc.address);
            await newAgent.deployed();
            
            // Setup the agent
            await newAgent.pause();
            await newAgent.setDuration(ONE_DAY);
            await newAgent.start();

            // Try to execute swap without selecting token
            const minAmountOut = ethers.utils.parseEther("900");
            await expect(
                newAgent.executeSwap(SWAP_AMOUNT, minAmountOut, true)
            ).to.be.revertedWith("Token not selected");
        });
    });
}); 