const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockFund 基础功能测试", function () {
  let mockFund, mockUSDC, mockWETH, mockWBTC, mockLINK, priceOracle, uniswapIntegration, shareToken;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // 部署Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy(owner.address);
    await mockUSDC.waitForDeployment();

    // 部署其他测试代币
    const MockWETH = await ethers.getContractFactory("MockWETH");
    mockWETH = await MockWETH.deploy(owner.address);
    await mockWETH.waitForDeployment();

    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    mockWBTC = await MockWBTC.deploy(owner.address);
    await mockWBTC.waitForDeployment();

    const MockLINK = await ethers.getContractFactory("MockLINK");
    mockLINK = await MockLINK.deploy(owner.address);
    await mockLINK.waitForDeployment();

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

    // 部署并配置价格预言机
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    
    // 为每个代币部署价格预言机
    const wethPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("2000", 8), 8, "WETH/USD"); // $2000
    await wethPriceFeed.waitForDeployment();
    
    const wbtcPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("45000", 8), 8, "WBTC/USD"); // $45000
    await wbtcPriceFeed.waitForDeployment();
    
    const linkPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("15", 8), 8, "LINK/USD"); // $15
    await linkPriceFeed.waitForDeployment();
    
    // 在价格预言机中设置价格源
    await priceOracle.setPriceFeed(await mockWETH.getAddress(), await wethPriceFeed.getAddress());
    await priceOracle.setPriceFeed(await mockWBTC.getAddress(), await wbtcPriceFeed.getAddress());
    await priceOracle.setPriceFeed(await mockLINK.getAddress(), await linkPriceFeed.getAddress());

    // 配置基金
    await mockFund.setUSDCToken(await mockUSDC.getAddress());
    
    // 添加支持的代币
    await mockFund.addSupportedToken(await mockWETH.getAddress(), 2000); // 20%
    await mockFund.addSupportedToken(await mockWBTC.getAddress(), 2000); // 20%
    await mockFund.addSupportedToken(await mockLINK.getAddress(), 1000); // 10%

    // 为测试准备USDC代币
    const testAmount = ethers.parseUnits("10000", 6);
    await mockUSDC.mint(user1.address, testAmount);
    await mockUSDC.mint(user2.address, testAmount);

    // 为MockUniswapIntegration铸造代币用于交换
    const largeAmount = ethers.parseUnits("1000000", 18); // 1M tokens
    
    // 为WETH铸造代币
    await mockWETH.mint(await uniswapIntegration.getAddress(), largeAmount);
    
    // 为WBTC铸造代币 (8位小数)
    const wbtcAmount = ethers.parseUnits("10000", 8); // 10K WBTC
    await mockWBTC.mint(await uniswapIntegration.getAddress(), wbtcAmount);
    
    // 为LINK铸造代币
    await mockLINK.mint(await uniswapIntegration.getAddress(), largeAmount);
    
    // 为USDC铸造代币给Uniswap集成
    const usdcAmount = ethers.parseUnits("1000000", 6); // 1M USDC
    await mockUSDC.mint(await uniswapIntegration.getAddress(), usdcAmount);
  });

  describe("合约部署测试", function () {
    it("应该正确设置初始参数", async function () {
      expect(await shareToken.name()).to.equal("Mock Fund Share Token");
      expect(await shareToken.symbol()).to.equal("MFS");
      expect(await mockFund.owner()).to.equal(owner.address);
      expect(await mockFund.managementFeeRate()).to.equal(200);
    });

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
  });

  describe("代币管理测试", function () {
    it("应该允许所有者添加支持的代币", async function () {
      // 部署一个测试代币
      const MockWETH = await ethers.getContractFactory("MockWETH");
      const mockWETHContract = await MockWETH.deploy(owner.address);
      await mockWETHContract.waitForDeployment();
      const tokenAddress = await mockWETHContract.getAddress();
      
      await expect(mockFund.addSupportedToken(tokenAddress, 1000)) // 10%
        .to.emit(mockFund, "TokenAdded")
        .withArgs(tokenAddress, 1000);
      
      const supportedTokens = await mockFund.getSupportedTokens();
      expect(supportedTokens.length).to.equal(4); // 3个已有代币 + 1个新添加的代币
      expect(supportedTokens[3]).to.equal(tokenAddress); // 新添加的代币在最后
    });

    it("应该拒绝非所有者添加代币", async function () {
      const MockWETH = await ethers.getContractFactory("MockWETH");
      const mockWETHContract = await MockWETH.deploy(owner.address);
      await mockWETHContract.waitForDeployment();
      const tokenAddress = await mockWETHContract.getAddress();
      
      await expect(mockFund.connect(user1).addSupportedToken(tokenAddress, 1000))
        .to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
    });

    it("应该拒绝零地址的代币添加", async function () {
      await expect(mockFund.addSupportedToken(ethers.ZeroAddress, 500))
        .to.be.revertedWith("Invalid token address");
    });

    it("应该拒绝过高的分配比例", async function () {
      const MockWETH = await ethers.getContractFactory("MockWETH");
      const mockWETHContract = await MockWETH.deploy(owner.address);
      await mockWETHContract.waitForDeployment();
      const tokenAddress = await mockWETHContract.getAddress();
      
      await expect(mockFund.addSupportedToken(tokenAddress, 10001)) // 超过100%
        .to.be.revertedWith("Invalid allocation");
    });
  });

  describe("投资功能测试（无代币分配）", function () {
    it("应该允许用户投资（仅USDC）", async function () {
      const investAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      
      // 批准USDC支出
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investAmount);
      
      // 投资前的余额
      const initialUSDCBalance = await mockUSDC.balanceOf(user1.address);
      
      // 投资
      await expect(mockFund.connect(user1).invest(investAmount))
        .to.emit(mockFund, "Investment")
        .withArgs(user1.address, investAmount, investAmount); // 首次投资1:1比例
      
      // 检查份额余额
      const shareBalance = await shareToken.balanceOf(user1.address);
      expect(shareBalance).to.equal(investAmount);
      
      // 检查USDC余额减少
      const finalUSDCBalance = await mockUSDC.balanceOf(user1.address);
      expect(finalUSDCBalance).to.equal(initialUSDCBalance - investAmount);
      
      // 检查基金统计
      const fundStats = await mockFund.getFundStats();
      expect(fundStats[0]).to.equal(investAmount); // totalAssets
      expect(fundStats[1]).to.equal(investAmount); // totalShares
    });

    it("应该拒绝低于最小投资额的投资", async function () {
      const smallAmount = ethers.parseUnits("50", 6); // 50 USDC (低于100最小值)
      
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), smallAmount);
      
      await expect(mockFund.connect(user1).invest(smallAmount))
        .to.be.revertedWith("Investment below minimum");
    });

    it("应该拒绝未批准的投资", async function () {
      const investAmount = ethers.parseUnits("1000", 6);
      
      // 不进行批准，直接投资
      await expect(mockFund.connect(user1).invest(investAmount))
        .to.be.reverted;
    });

    it("应该拒绝零金额投资", async function () {
      await expect(mockFund.connect(user1).invest(0))
        .to.be.revertedWith("Investment below minimum");
    });
  });

  describe("赎回功能测试", function () {
    beforeEach(async function () {
      // 先进行投资
      const investAmount = ethers.parseUnits("1000", 6);
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investAmount);
      await mockFund.connect(user1).invest(investAmount);
    });

    it("应该允许用户赎回", async function () {
      const shareBalance = await shareToken.balanceOf(user1.address);
      const redeemAmount = shareBalance / 2n; // 赎回一半
      
      const initialUSDCBalance = await mockUSDC.balanceOf(user1.address);
      
      await expect(mockFund.connect(user1).redeem(redeemAmount))
        .to.emit(mockFund, "Redemption");
      
      // 检查份额减少
      const newShareBalance = await shareToken.balanceOf(user1.address);
      expect(newShareBalance).to.equal(shareBalance - redeemAmount);
      
      // 检查USDC增加（扣除赎回费后）
      const newUSDCBalance = await mockUSDC.balanceOf(user1.address);
      expect(newUSDCBalance).to.be.gt(initialUSDCBalance);
    });

    it("应该拒绝超过余额的赎回", async function () {
      const shareBalance = await shareToken.balanceOf(user1.address);
      const excessiveAmount = shareBalance + ethers.parseUnits("100", 18);
      
      await expect(mockFund.connect(user1).redeem(excessiveAmount))
        .to.be.revertedWith("Insufficient shares");
    });

    it("应该拒绝零金额赎回", async function () {
      await expect(mockFund.connect(user1).redeem(0))
        .to.be.revertedWith("Invalid share amount");
    });
  });

  describe("管理功能测试", function () {
    it("应该允许所有者收取管理费", async function () {
      // 先进行投资
      const investAmount = ethers.parseUnits("1000", 6);
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investAmount);
      await mockFund.connect(user1).invest(investAmount);
      
      // 收取管理费
      await expect(mockFund.collectManagementFee())
        .to.emit(mockFund, "ManagementFeeCollected");
    });

    it("应该拒绝非所有者收取管理费", async function () {
      await expect(mockFund.connect(user1).collectManagementFee())
        .to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
    });
  });

  describe("NAV计算测试", function () {
    it("应该正确计算初始NAV", async function () {
      const initialNAV = await mockFund.getCurrentNAV();
      expect(initialNAV).to.equal(ethers.parseUnits("1", 6)); // 1 USDC
    });

    it("投资后NAV应该保持稳定", async function () {
      const investAmount = ethers.parseUnits("1000", 6);
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investAmount);
      await mockFund.connect(user1).invest(investAmount);
      
      const nav = await mockFund.getCurrentNAV();
      expect(nav).to.equal(ethers.parseUnits("1", 6)); // 应该仍然是1 USDC
    });
  });

  describe("基金统计测试", function () {
    it("应该返回正确的初始基金统计信息", async function () {
      const fundStats = await mockFund.getFundStats();
      expect(fundStats[0]).to.equal(0); // totalAssets = 0
      expect(fundStats[1]).to.equal(0); // totalSupply = 0
      expect(fundStats[2]).to.equal(ethers.parseUnits("1", 6)); // currentNAV = 1 USDC
    });

    it("投资后应该返回正确的基金统计信息", async function () {
      const investAmount = ethers.parseUnits("1000", 6);
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investAmount);
      await mockFund.connect(user1).invest(investAmount);
      
      const fundStats = await mockFund.getFundStats();
      expect(fundStats[0]).to.equal(investAmount); // totalAssets
      expect(fundStats[1]).to.equal(investAmount); // totalSupply
      expect(fundStats[2]).to.equal(ethers.parseUnits("1", 6)); // currentNAV = 1 USDC
    });
  });

  describe("多用户投资测试", function () {
    it("应该支持多个用户投资", async function () {
      const investAmount1 = ethers.parseUnits("1000", 6);
      const investAmount2 = ethers.parseUnits("500", 6);
      
      // 用户1投资
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investAmount1);
      await mockFund.connect(user1).invest(investAmount1);
      
      // 用户2投资
      await mockUSDC.connect(user2).approve(await mockFund.getAddress(), investAmount2);
      await mockFund.connect(user2).invest(investAmount2);
      
      // 检查份额余额
      const shareBalance1 = await shareToken.balanceOf(user1.address);
      const shareBalance2 = await shareToken.balanceOf(user2.address);
      
      expect(shareBalance1).to.equal(investAmount1);
      expect(shareBalance2).to.equal(investAmount2);
      
      // 检查总统计
      const fundStats = await mockFund.getFundStats();
      expect(fundStats[0]).to.equal(investAmount1 + investAmount2); // totalAssets
      expect(fundStats[1]).to.equal(investAmount1 + investAmount2); // totalShares
    });
  });
});