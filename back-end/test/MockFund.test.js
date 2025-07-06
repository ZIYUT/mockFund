const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockFund", function () {
  let mockFund, mockUSDC, mockTokens, priceOracle, uniswapIntegration, shareToken;
  let owner, user1, user2;
  let mockWETH, mockWBTC, mockLINK;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // 部署Mock代币
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    const MockTokens = await ethers.getContractFactory("MockTokens");
    mockTokens = await MockTokens.deploy();
    await mockTokens.waitForDeployment();

    // 获取代币地址
    mockWETH = await mockTokens.WETH();
    mockWBTC = await mockTokens.WBTC();
    mockLINK = await mockTokens.LINK();

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
    
    // 添加支持的代币
    await mockFund.addSupportedToken(mockWETH, 2000); // 20%
    await mockFund.addSupportedToken(mockWBTC, 2000); // 20%
    await mockFund.addSupportedToken(mockLINK, 1000); // 10%

    // 为测试准备代币
    const testAmount = ethers.parseUnits("10000", 6);
    await mockUSDC.mint(user1.address, testAmount);
    await mockUSDC.mint(user2.address, testAmount);

    // 为MockUniswapIntegration准备代币
    const largeAmount = ethers.parseUnits("1000000", 18);
    await mockTokens.mint(mockWETH, await uniswapIntegration.getAddress(), largeAmount);
    await mockTokens.mint(mockWBTC, await uniswapIntegration.getAddress(), largeAmount);
    await mockTokens.mint(mockLINK, await uniswapIntegration.getAddress(), largeAmount);
  });

  describe("部署", function () {
    it("应该正确设置初始参数", async function () {
      expect(await shareToken.name()).to.equal("Mock Fund Share Token");
      expect(await shareToken.symbol()).to.equal("MFS");
      expect(await mockFund.owner()).to.equal(owner.address);
      expect(await mockFund.managementFeeRate()).to.equal(200);
    });

    it("应该正确设置支持的代币", async function () {
      const supportedTokens = await mockFund.getSupportedTokens();
      expect(supportedTokens.length).to.equal(3);
      expect(supportedTokens[0]).to.equal(mockWETH);
      expect(supportedTokens[1]).to.equal(mockWBTC);
      expect(supportedTokens[2]).to.equal(mockLINK);
    });
  });

  describe("投资功能", function () {
    it("应该允许用户投资", async function () {
      const investAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      
      // 批准USDC支出
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investAmount);
      
      // 投资
      await expect(mockFund.connect(user1).invest(investAmount))
        .to.emit(mockFund, "Investment")
        .withArgs(user1.address, investAmount, investAmount); // 首次投资1:1比例
      
      // 检查份额余额
      const shareBalance = await shareToken.balanceOf(user1.address);
      expect(shareBalance).to.equal(investAmount);
      
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
  });

  describe("赎回功能", function () {
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
  });

  describe("管理功能", function () {
    it("应该允许所有者添加支持的代币", async function () {
      const newTokenAddress = await mockTokens.UNI();
      
      await expect(mockFund.addSupportedToken(newTokenAddress, 500))
        .to.emit(mockFund, "TokenAdded")
        .withArgs(newTokenAddress, 500);
      
      const supportedTokens = await mockFund.getSupportedTokens();
      expect(supportedTokens.length).to.equal(4);
    });

    it("应该拒绝非所有者添加代币", async function () {
      const newTokenAddress = await mockTokens.UNI();
      
      await expect(mockFund.connect(user1).addSupportedToken(newTokenAddress, 500))
        .to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
    });

    it("应该允许所有者收取管理费", async function () {
      // 先进行投资
      const investAmount = ethers.parseUnits("1000", 6);
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investAmount);
      await mockFund.connect(user1).invest(investAmount);
      
      // 收取管理费
      await expect(mockFund.collectManagementFee())
        .to.emit(mockFund, "ManagementFeeCollected");
    });
  });

  describe("NAV计算", function () {
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

  describe("投资组合信息", function () {
    beforeEach(async function () {
      // 进行投资以获得投资组合数据
      const investAmount = ethers.parseUnits("1000", 6);
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investAmount);
      await mockFund.connect(user1).invest(investAmount);
    });

    it("应该返回代币持有量", async function () {
      const [tokens, holdings] = await mockFund.getTokenHoldings();
      expect(tokens.length).to.equal(3);
      expect(holdings.length).to.equal(3);
      
      // 检查是否有代币持有量
      let hasHoldings = false;
      for (let i = 0; i < holdings.length; i++) {
        if (holdings[i] > 0) {
          hasHoldings = true;
          break;
        }
      }
      expect(hasHoldings).to.be.true;
    });

    it("应该返回投资组合详细信息", async function () {
      const [tokens, holdings, values, allocations, totalValue] = await mockFund.getPortfolioBreakdown();
      
      expect(tokens.length).to.equal(3);
      expect(holdings.length).to.equal(3);
      expect(values.length).to.equal(3);
      expect(allocations.length).to.equal(3);
      expect(totalValue).to.be.gt(0);
    });
  });
});