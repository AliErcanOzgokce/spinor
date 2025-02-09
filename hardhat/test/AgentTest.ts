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
    const DEADLINE = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now

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

        // Mint initial tokens
        await usdc.mint(owner.address, INITIAL_USDC_AMOUNT);
        await lst1.mint(owner.address, INITIAL_MINT_AMOUNT);
        await lst2.mint(owner.address, INITIAL_MINT_AMOUNT);

        // Transfer some tokens to user for testing first
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
            DEADLINE
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
            DEADLINE
        );
    });

    describe("Initialization", function () {
        it("Should initialize with correct addresses", async function () {
            expect(await agent.router()).to.equal(router.address);
            expect(await agent.factory()).to.equal(factory.address);
            expect(await agent.usdc()).to.equal(usdc.address);
            expect(await agent.owner()).to.equal(owner.address);
        });

        it("Should start with no selected token", async function () {
            expect(await agent.currentLst()).to.equal(ethers.constants.AddressZero);
        });
    });

    describe("Token Selection", function () {
        it("Should allow owner to select LST1", async function () {
            await agent.selectToken(lst1.address);
            expect(await agent.currentLst()).to.equal(lst1.address);
        });

        it("Should allow owner to select LST2", async function () {
            await agent.selectToken(lst2.address);
            expect(await agent.currentLst()).to.equal(lst2.address);
        });

        it("Should allow owner to change selected token", async function () {
            await agent.selectToken(lst1.address);
            expect(await agent.currentLst()).to.equal(lst1.address);

            await agent.selectToken(lst2.address);
            expect(await agent.currentLst()).to.equal(lst2.address);
        });

        it("Should not allow non-owner to select token", async function () {
            await expect(
                agent.connect(user).selectToken(lst1.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should not allow selecting USDC as token", async function () {
            await expect(
                agent.selectToken(usdc.address)
            ).to.be.revertedWith("Cannot select USDC as token");
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
            await agent.unpause();
            await expect(
                agent.connect(user).deposit(usdc.address, SWAP_AMOUNT)
            ).to.be.revertedWith("Pausable: not paused");
        });
    });

    describe("Swap Operations", function () {
        describe("LST1 Swaps", function () {
            beforeEach(async function () {
                await agent.pause();
                await usdc.connect(user).approve(agent.address, SWAP_AMOUNT);
                await agent.connect(user).deposit(usdc.address, SWAP_AMOUNT);
                await agent.selectToken(lst1.address);
                await agent.unpause();
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
                await agent.unpause();
            });

            it("Should swap USDC to LST2", async function () {
                const minAmountOut = ethers.utils.parseEther("900"); // Expecting at least 900 LST2 tokens
                await agent.executeSwap(SWAP_AMOUNT, minAmountOut, true);
                expect(await lst2.balanceOf(agent.address)).to.be.gt(minAmountOut);
            });
        });

        it("Should not allow swaps without selecting token first", async function () {
            await agent.pause();
            await usdc.connect(user).approve(agent.address, SWAP_AMOUNT);
            await agent.connect(user).deposit(usdc.address, SWAP_AMOUNT);
            await agent.unpause();

            const minAmountOut = ethers.utils.parseEther("900");
            await expect(
                agent.executeSwap(SWAP_AMOUNT, minAmountOut, true)
            ).to.be.revertedWith("Token not selected");
        });
    });
}); 