import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Swap Test", function () {
  let factory: Contract;
  let router: Contract;
  let usdc: Contract;
  let lst1: Contract;
  let lst2: Contract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

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

    // Mint tokens
    const usdcAmount = ethers.utils.parseUnits("1000000", 6);
    const lstAmount = ethers.utils.parseEther("1000000");

    await usdc.mint(owner.address, usdcAmount);
    await lst1.mint(owner.address, lstAmount);
    await lst2.mint(owner.address, lstAmount);

    // Approve router
    await usdc.approve(router.address, usdcAmount);
    await lst1.approve(router.address, lstAmount);
    await lst2.approve(router.address, lstAmount);

    // Create pools and add liquidity
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const tokenAmount = ethers.utils.parseEther("100000");
    const usdcInitial = ethers.utils.parseUnits("100000", 6);

    await router.addLiquidity(
      lst1.address,
      usdc.address,
      tokenAmount,
      usdcInitial,
      0,
      0,
      owner.address,
      deadline
    );

    await router.addLiquidity(
      lst2.address,
      usdc.address,
      tokenAmount,
      usdcInitial,
      0,
      0,
      owner.address,
      deadline
    );
  });

  it("Should create pools successfully", async function () {
    const pair1 = await factory.getPair(lst1.address, usdc.address);
    const pair2 = await factory.getPair(lst2.address, usdc.address);

    expect(pair1).to.not.equal(ethers.constants.AddressZero);
    expect(pair2).to.not.equal(ethers.constants.AddressZero);
  });

  it("Should swap LST1 for USDC", async function () {
    const swapAmount = ethers.utils.parseEther("1000");
    const path = [lst1.address, usdc.address];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const usdcBalanceBefore = await usdc.balanceOf(owner.address);
    
    await router.swapExactTokensForTokens(
      swapAmount,
      0, // Accept any amount of USDC
      path,
      owner.address,
      deadline
    );

    const usdcBalanceAfter = await usdc.balanceOf(owner.address);
    expect(usdcBalanceAfter).to.be.gt(usdcBalanceBefore);
  });

  it("Should swap USDC for LST2", async function () {
    const swapAmount = ethers.utils.parseUnits("1000", 6);
    const path = [usdc.address, lst2.address];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const lst2BalanceBefore = await lst2.balanceOf(owner.address);
    
    await router.swapExactTokensForTokens(
      swapAmount,
      0, // Accept any amount of LST2
      path,
      owner.address,
      deadline
    );

    const lst2BalanceAfter = await lst2.balanceOf(owner.address);
 