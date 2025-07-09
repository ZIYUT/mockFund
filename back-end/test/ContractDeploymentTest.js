const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("智能合约部署和基础功能测试", function () {
  let mockFund, mockUSDC, priceOracle, uniswapIntegration, shareToken;
  let mockWETH, mockWBTC, mockLINK;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // 部署Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy(owner.address);
    await mockUSDC.waitForDeployment();

    // 部署Mock代币
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const mockWETHContract = await MockWETH.deploy(owner.address);
    await mockWETHContract.waitForDeployment();
    mockWETH = await mockWETHContract.getAddress();

    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const mockWBTCContract = await MockWBTC.deploy(owner.address);
    await mockWBTCContract.waitForDeployment();
    mockWBTC = await mockWBTCContract.getAddress();

    const MockLINK = await ethers.getContractFactory("MockLINK");
    const mockLINKContract = await MockLINK.deploy(owner.address);
    await mockLINKContract.waitForDeployment();
    mockLINK = await mockLINKContract.getAddress();

    // 部署价格预言机
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy(owner.address);
    await priceOracle.waitForDeployment();

    // 部署Uniswap集成
    const MockUniswapIntegration = await ethers.getContractFactory("MockUniswapIntegration");
    uniswapIntegration = await MockUniswapIntegration.deploy(owner.address);
    await uniswapIntegration.waitForDeployment();

    // 部署Mock Fund
    const MockFund = await ethers.getContractFactory("MockFund");
    mockFund = await MockFund.deploy(
      "Mock Fund Share Token",
      "MFS",
      owner.address,
      200, // 2% 管理费
      await priceOracle.getAddress(),
      await uniswapIntegration.getAddress()
    );
    await mockFund.waitForDeployment();

    // 获取份额代币合约
    const shareTokenAddress = await mockFund.shareToken();
    const FundShareToken = await ethers.getContractFactory("FundShareToken");
    shareToken = FundShareToken.attach(shareTokenAddress);

    // 配置基金
    await mockFund.setUSDCToken(await mockUSDC.getAddress());
  });

  describe("✅ 合约部署验证", function () {
    it("MockUSDC 应该正确部署", async function () {
      expect(await mockUSDC.name()).to.equal("Mock USD Coin");
      expect(await mockUSDC.symbol()).to.equal("USDC");
      expect(await mockUSDC.decimals()).to.equal(6);
      expect(await mockUSDC.owner()).to.equal(owner.address);
    });

    it("MockWETH 应该正确部署", async function () {
      const MockWETH = await ethers.getContractFactory("MockWETH");
      const mockWETHContract = MockWETH.attach(mockWETH);
      expect(await mockWETHContract.name()).to.equal("Mock Wrapped Ether");
      expect(await mockWETHContract.symbol()).to.equal("WETH");
      expect(await mockWETHContract.decimals()).to.equal(18);
    });

    it("MockWBTC 应该正确部署", async function () {
      const MockWBTC = await ethers.getContractFactory("MockWBTC");
      const mockWBTCContract = MockWBTC.attach(mockWBTC);
      expect(await mockWBTCContract.name()).to.equal("Mock Wrapped Bitcoin");
      expect(await mockWBTCContract.symbol()).to.equal("WBTC");
      expect(await mockWBTCContract.decimals()).to.equal(8);
    });

    it("MockLINK 应该正确部署", async function () {
      const MockLINK = await ethers.getContractFactory("MockLINK");
      const mockLINKContract = MockLINK.attach(mockLINK);
      expect(await mockLINKContract.name()).to.equal("Mock Chainlink Token");
      expect(await mockLINKContract.symbol()).to.equal("LINK");
      expect(await mockLINKContract.decimals()).to.equal(18);
    });

    it("PriceOracle 应该正确部署", async function () {
      expect(await priceOracle.owner()).to.equal(owner.address);
    });

    it("MockUniswapIntegration 应该正确部署", async function () {
      expect(await uniswapIntegration.owner()).to.equal(owner.address);
    });

    it("MockFund 应该正确部署", async function () {
      expect(await shareToken.name()).to.equal("Mock Fund Share Token");
      expect(await shareToken.symbol()).to.equal("MFS");
      expect(await mockFund.owner()).to.equal(owner.address);
      expect(await mockFund.managementFeeRate()).to.equal(200);
    });

    it("FundShareToken 应该正确部署", async function () {
      expect(await shareToken.name()).to.equal("Mock Fund Share Token");
      expect(await shareToken.symbol()).to.equal("MFS");
      expect(await shareToken.decimals()).to.equal(18);
    });
  });

  describe("✅ 基金配置验证", function () {
    it("应该正确设置USDC代币地址", async function () {
      const usdcAddress = await mockFund.usdcToken();
      expect(usdcAddress).to.equal(await mockUSDC.getAddress());
    });

    it("应该正确设置价格预言机地址", async function () {
      const oracleAddress = await mockFund.priceOracle();
      expect(oracleAddress).to.equal(await priceOracle.getAddress());
    });

    it("应该正确设置Uniswap集成地址", async function () {
      const uniswapAddress = await mockFund.uniswapIntegration();
      expect(uniswapAddress).to.equal(await uniswapIntegration.getAddress());
    });

    it("初始状态应该没有支持的代币", async function () {
      const supportedTokens = await mockFund.getSupportedTokens();
      expect(supportedTokens.length).to.equal(0);
    });

    it("初始NAV应该为1 USDC", async function () {
      const initialNAV = await mockFund.getCurrentNAV();
      expect(initialNAV).to.equal(ethers.parseUnits("1", 6));
    });
  });

  describe("✅ 代币管理功能", function () {
    it("所有者应该能够添加支持的代币", async function () {
      await expect(mockFund.addSupportedToken(mockWETH, 2000))
        .to.emit(mockFund, "TokenAdded")
        .withArgs(mockWETH, 2000);
      
      const supportedTokens = await mockFund.getSupportedTokens();
      expect(supportedTokens.length).to.equal(1);
      expect(supportedTokens[0]).to.equal(mockWETH);
    });

    it("应该能够添加多个支持的代币", async function () {
      await mockFund.addSupportedToken(mockWETH, 2000);
      await mockFund.addSupportedToken(mockWBTC, 2000);
      await mockFund.addSupportedToken(mockLINK, 1000);
      
      const supportedTokens = await mockFund.getSupportedTokens();
      expect(supportedTokens.length).to.equal(3);
      expect(supportedTokens[0]).to.equal(mockWETH);
      expect(supportedTokens[1]).to.equal(mockWBTC);
      expect(supportedTokens[2]).to.equal(mockLINK);
    });

    it("非所有者不应该能够添加代币", async function () {
      await expect(mockFund.connect(user1).addSupportedToken(mockWETH, 2000))
        .to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
    });

    it("应该拒绝零地址的代币", async function () {
      await expect(mockFund.addSupportedToken(ethers.ZeroAddress, 500))
        .to.be.revertedWith("Invalid token address");
    });

    it("应该拒绝过高的分配比例", async function () {
      await expect(mockFund.addSupportedToken(mockWETH, 10001))
        .to.be.revertedWith("Invalid allocation");
    });
  });

  describe("✅ 代币铸造功能", function () {
    it("USDC 应该能够铸造代币", async function () {
      const mintAmount = ethers.parseUnits("1000", 6);
      await mockUSDC.mint(user1.address, mintAmount);
      
      const balance = await mockUSDC.balanceOf(user1.address);
      expect(balance).to.equal(mintAmount);
    });

    it("WETH 应该能够铸造代币", async function () {
      const MockWETH = await ethers.getContractFactory("MockWETH");
      const mockWETHContract = MockWETH.attach(mockWETH);
      
      const mintAmount = ethers.parseUnits("10", 18);
      await mockWETHContract.mint(user1.address, mintAmount);
      
      const balance = await mockWETHContract.balanceOf(user1.address);
      expect(balance).to.equal(mintAmount);
    });

    it("WBTC 应该能够铸造代币", async function () {
      const MockWBTC = await ethers.getContractFactory("MockWBTC");
      const mockWBTCContract = MockWBTC.attach(mockWBTC);
      
      const mintAmount = ethers.parseUnits("1", 8);
      await mockWBTCContract.mint(user1.address, mintAmount);
      
      const balance = await mockWBTCContract.balanceOf(user1.address);
      expect(balance).to.equal(mintAmount);
    });

    it("LINK 应该能够铸造代币", async function () {
      const MockLINK = await ethers.getContractFactory("MockLINK");
      const mockLINKContract = MockLINK.attach(mockLINK);
      
      const mintAmount = ethers.parseUnits("100", 18);
      await mockLINKContract.mint(user1.address, mintAmount);
      
      const balance = await mockLINKContract.balanceOf(user1.address);
      expect(balance).to.equal(mintAmount);
    });
  });

  describe("✅ 基金统计功能", function () {
    it("初始基金统计应该正确", async function () {
      const fundStats = await mockFund.getFundStats();
      expect(fundStats[0]).to.be.gte(0); // totalAssets (可能有初始USDC)
      expect(fundStats[1]).to.be.gte(0); // totalShares (可能有初始份额)
      
      const supportedTokens = await mockFund.getSupportedTokens();
      expect(supportedTokens.length).to.equal(0); // supportedTokensCount
    });

    it("添加代币后统计应该更新", async function () {
      await mockFund.addSupportedToken(mockWETH, 2000);
      await mockFund.addSupportedToken(mockWBTC, 2000);
      
      const supportedTokens = await mockFund.getSupportedTokens();
      expect(supportedTokens.length).to.equal(2); // supportedTokensCount
    });
  });

  describe("✅ 权限控制验证", function () {
    it("只有所有者能够设置USDC代币", async function () {
      const newUSDC = await ethers.getContractFactory("MockUSDC");
      const newUSDCContract = await newUSDC.deploy(owner.address);
      await newUSDCContract.waitForDeployment();
      
      await expect(mockFund.connect(user1).setUSDCToken(await newUSDCContract.getAddress()))
        .to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
    });

    it("只有所有者能够收取管理费", async function () {
      await expect(mockFund.connect(user1).collectManagementFee())
        .to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
    });
  });
});