const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockTokens", function () {
  let mockTokens, mockUSDC;
  let owner, user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // 部署MockTokens
    const MockTokens = await ethers.getContractFactory("MockTokens");
    mockTokens = await MockTokens.deploy();
    await mockTokens.waitForDeployment();

    // 部署MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
  });

  describe("MockTokens部署", function () {
    it("应该正确部署所有代币", async function () {
      const wethAddress = await mockTokens.WETH();
      const wbtcAddress = await mockTokens.WBTC();
      const linkAddress = await mockTokens.LINK();
      const uniAddress = await mockTokens.UNI();

      expect(wethAddress).to.be.properAddress;
      expect(wbtcAddress).to.be.properAddress;
      expect(linkAddress).to.be.properAddress;
      expect(uniAddress).to.be.properAddress;
    });

    it("应该能铸造代币", async function () {
      const wethAddress = await mockTokens.WETH();
      const mintAmount = ethers.parseUnits("100", 18);

      await mockTokens.mint(wethAddress, user1.address, mintAmount);

      // 获取WETH合约实例
      const WETH = await ethers.getContractAt("MockWETH", wethAddress);
      const balance = await WETH.balanceOf(user1.address);
      
      expect(balance).to.equal(mintAmount);
    });

    it("应该返回正确的代币信息", async function () {
      const wethAddress = await mockTokens.WETH();
      const WETH = await ethers.getContractAt("MockWETH", wethAddress);
      
      expect(await WETH.name()).to.equal("Wrapped Ether");
      expect(await WETH.symbol()).to.equal("WETH");
      expect(await WETH.decimals()).to.equal(18);
    });
  });

  describe("MockUSDC", function () {
    it("应该正确部署USDC", async function () {
      expect(await mockUSDC.name()).to.equal("USD Coin");
      expect(await mockUSDC.symbol()).to.equal("USDC");
      expect(await mockUSDC.decimals()).to.equal(6);
    });

    it("应该能铸造USDC", async function () {
      const mintAmount = ethers.parseUnits("1000", 6);
      
      await mockUSDC.mint(user1.address, mintAmount);
      
      const balance = await mockUSDC.balanceOf(user1.address);
      expect(balance).to.equal(mintAmount);
    });

    it("应该能转移USDC", async function () {
      const mintAmount = ethers.parseUnits("1000", 6);
      const transferAmount = ethers.parseUnits("500", 6);
      
      await mockUSDC.mint(owner.address, mintAmount);
      await mockUSDC.transfer(user1.address, transferAmount);
      
      expect(await mockUSDC.balanceOf(user1.address)).to.equal(transferAmount);
      expect(await mockUSDC.balanceOf(owner.address)).to.equal(mintAmount - transferAmount);
    });
  });
});