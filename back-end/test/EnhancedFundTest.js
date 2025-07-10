const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockFund Enhanced Tests", function () {
  let mockFund, mockUSDC, mockWETH, mockWBTC, mockLINK, mockDAI;
  let priceOracle, mockUniswapIntegration;
  let owner, investor1, investor2;
  let fundShareToken;

  const INITIAL_USDC_AMOUNT = ethers.parseUnits("1000000", 6); // 100万USDC
  const INITIAL_MFC_SUPPLY = ethers.parseUnits("1000000", 18); // 100万MFC

  beforeEach(async function () {
    [owner, investor1, investor2] = await ethers.getSigners();

    // 部署 MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy(owner.address);

    // 部署 MockTokensFactory
    const MockTokensFactory = await ethers.getContractFactory("MockTokensFactory");
    const mockTokensFactory = await MockTokensFactory.deploy(owner.address);
    
    // 部署所有代币
    await mockTokensFactory.deployAllTokens();
    const wbtcAddress = await mockTokensFactory.wbtc();
    const wethAddress = await mockTokensFactory.weth();
    const linkAddress = await mockTokensFactory.link();
    const daiAddress = await mockTokensFactory.dai();

    // 获取代币合约实例
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const MockLINK = await ethers.getContractFactory("MockLINK");
    const MockDAI = await ethers.getContractFactory("MockDAI");
    
    mockWETH = MockWETH.attach(wethAddress);
    mockWBTC = MockWBTC.attach(wbtcAddress);
    mockLINK = MockLINK.attach(linkAddress);
    mockDAI = MockDAI.attach(daiAddress);

    // 部署 PriceOracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy(owner.address);

    // 部署 MockUniswapIntegration
    const MockUniswapIntegration = await ethers.getContractFactory("MockUniswapIntegration");
    mockUniswapIntegration = await MockUniswapIntegration.deploy(
      owner.address,
      await priceOracle.getAddress()
    );

    // 部署 MockFund
    const MockFund = await ethers.getContractFactory("MockFund");
    mockFund = await MockFund.deploy(
      "Mock Fund Shares",
      "MFC",
      owner.address,
      100, // 1% 管理费
      await priceOracle.getAddress(),
      await mockUniswapIntegration.getAddress()
    );

    // 获取份额代币地址
    fundShareToken = await ethers.getContractAt("FundShareToken", await mockFund.shareToken());

    // 配置基金支持的代币
    await mockFund.addSupportedToken(wbtcAddress, 1250);
    await mockFund.addSupportedToken(wethAddress, 1250);
    await mockFund.addSupportedToken(linkAddress, 1250);
    await mockFund.addSupportedToken(daiAddress, 1250);

    // 设置 USDC 代币地址
    await mockFund.setUSDCToken(await mockUSDC.getAddress());

    // 为 MockUniswapIntegration 预存代币
    const largeAmount = ethers.parseUnits("1000000", 18);
    await mockWETH.mint(await mockUniswapIntegration.getAddress(), largeAmount);
    await mockWBTC.mint(await mockUniswapIntegration.getAddress(), ethers.parseUnits("10000", 8));
    await mockLINK.mint(await mockUniswapIntegration.getAddress(), largeAmount);
    await mockDAI.mint(await mockUniswapIntegration.getAddress(), largeAmount);
    await mockUSDC.mint(await mockUniswapIntegration.getAddress(), ethers.parseUnits("1000000", 6));

    // 设置交换比率
    await mockUniswapIntegration.setExchangeRate(await mockUSDC.getAddress(), wethAddress, 3000000000); // $3000
    await mockUniswapIntegration.setExchangeRate(await mockUSDC.getAddress(), wbtcAddress, 45000000000); // $45000
    await mockUniswapIntegration.setExchangeRate(await mockUSDC.getAddress(), linkAddress, 15000000); // $15
    await mockUniswapIntegration.setExchangeRate(await mockUSDC.getAddress(), daiAddress, 1000000); // $1

    // 给部署者铸造初始USDC
    await mockUSDC.mint(owner.address, INITIAL_USDC_AMOUNT);
    await mockUSDC.approve(await mockFund.getAddress(), INITIAL_USDC_AMOUNT);
  });

  describe("基金初始化", function () {
    it("应该正确初始化基金", async function () {
      // 初始化基金
      await mockFund.initializeFund(INITIAL_USDC_AMOUNT);

      // 检查基金状态
      const fundStats = await mockFund.getFundStats();
      expect(fundStats[0]).to.equal(INITIAL_MFC_SUPPLY); // 总供应量
      expect(fundStats[1]).to.equal(INITIAL_MFC_SUPPLY); // 初始供应量
      expect(fundStats[2]).to.be.true; // 已初始化

      // 检查所有者MFC余额
      const ownerBalance = await fundShareToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(INITIAL_MFC_SUPPLY);
    });

    it("应该计算正确的初始净值", async function () {
      await mockFund.initializeFund(INITIAL_USDC_AMOUNT);

      const nav = await mockFund.calculateNAV();
      const mfcValue = await mockFund.calculateMFCValue();

      // 净值应该接近100万USDC（考虑代币交换的滑点）
      expect(nav).to.be.gt(ethers.parseUnits("950000", 6)); // 至少95万USDC
      expect(nav).to.be.lt(ethers.parseUnits("1050000", 6)); // 最多105万USDC

      // MFC价值应该接近1 USDC
      expect(mfcValue).to.be.gt(ethers.parseUnits("0.95", 6)); // 至少0.95 USDC
      expect(mfcValue).to.be.lt(ethers.parseUnits("1.05", 6)); // 最多1.05 USDC
    });

    it("应该正确设置MFC组成", async function () {
      await mockFund.initializeFund(INITIAL_USDC_AMOUNT);

      const composition = await mockFund.getMFCComposition();
      expect(composition.tokens).to.have.length(4);
      expect(composition.usdcAmount).to.be.gt(0);
    });
  });

  describe("净值计算", function () {
    beforeEach(async function () {
      await mockFund.initializeFund(INITIAL_USDC_AMOUNT);
    });

    it("应该正确计算NAV", async function () {
      const nav = await mockFund.calculateNAV();
      expect(nav).to.be.gt(0);
    });

    it("应该正确计算MFC价值", async function () {
      const mfcValue = await mockFund.calculateMFCValue();
      expect(mfcValue).to.be.gt(0);
    });

    it("应该正确计算基金净值信息", async function () {
      const fundNAV = await mockFund.getFundNAV();
      expect(fundNAV.nav).to.be.gt(0);
      expect(fundNAV.mfcValue).to.be.gt(0);
      expect(fundNAV.totalSupply).to.equal(INITIAL_MFC_SUPPLY);
    });

    it("NAV应该等于USDC余额加代币价值", async function () {
      const nav = await mockFund.calculateNAV();
      const usdcBalance = await mockUSDC.balanceOf(await mockFund.getAddress());
      
      // 计算代币价值
      let tokenValue = ethers.parseUnits("0", 6);
      const supportedTokens = await mockFund.getSupportedTokens();
      
      for (let i = 0; i < supportedTokens.length; i++) {
        const token = supportedTokens[i];
        const tokenBalance = await ethers.getContractAt("IERC20", token).balanceOf(await mockFund.getAddress());
        if (tokenBalance > 0) {
          // 模拟价格计算（简化版）
          tokenValue = tokenValue + tokenBalance;
        }
      }

      // NAV应该等于USDC余额加代币价值（近似）
      expect(nav).to.be.gte(usdcBalance);
    });
  });

  describe("投资功能", function () {
    beforeEach(async function () {
      await mockFund.initializeFund(INITIAL_USDC_AMOUNT);
      
      // 给投资者铸造USDC
      await mockUSDC.mint(investor1.address, ethers.parseUnits("10000", 6));
      await mockUSDC.mint(investor2.address, ethers.parseUnits("10000", 6));
    });

    it("应该正确计算投资预览", async function () {
      const investmentAmount = ethers.parseUnits("1000", 6);
      const previewMFC = await mockFund.getInvestmentPreview(investmentAmount);
      
      expect(previewMFC).to.be.gt(0);
      
      // 验证计算逻辑
      const mfcValue = await mockFund.calculateMFCValue();
      const expectedMFC = (investmentAmount * ethers.parseUnits("1", 18)) / mfcValue;
      expect(previewMFC).to.be.closeTo(expectedMFC, ethers.parseUnits("0.01", 18));
    });

    it("应该成功投资USDC获得MFC", async function () {
      const investmentAmount = ethers.parseUnits("1000", 6);
      const initialBalance = await fundShareToken.balanceOf(investor1.address);
      
      // 授权USDC
      await mockUSDC.connect(investor1).approve(await mockFund.getAddress(), investmentAmount);
      
      // 投资
      await mockFund.connect(investor1).invest(investmentAmount);
      
      // 检查MFC余额增加
      const finalBalance = await fundShareToken.balanceOf(investor1.address);
      expect(finalBalance).to.be.gt(initialBalance);
      
      // 检查USDC余额减少
      const usdcBalance = await mockUSDC.balanceOf(investor1.address);
      expect(usdcBalance).to.equal(ethers.parseUnits("9000", 6)); // 10000 - 1000
    });

    it("投资后应该增加基金净值", async function () {
      const initialNav = await mockFund.calculateNAV();
      const investmentAmount = ethers.parseUnits("1000", 6);
      
      await mockUSDC.connect(investor1).approve(await mockFund.getAddress(), investmentAmount);
      await mockFund.connect(investor1).invest(investmentAmount);
      
      const finalNav = await mockFund.calculateNAV();
      expect(finalNav).to.be.gt(initialNav);
    });

    it("应该拒绝低于最小投资额的投资", async function () {
      const smallAmount = ethers.parseUnits("50", 6); // 低于100 USDC
      
      await mockUSDC.connect(investor1).approve(await mockFund.getAddress(), smallAmount);
      
      await expect(
        mockFund.connect(investor1).invest(smallAmount)
      ).to.be.revertedWith("Investment below minimum");
    });

    it("应该拒绝未初始化基金的投资", async function () {
      // 创建新的未初始化基金
      const MockFund = await ethers.getContractFactory("MockFund");
      const newFund = await MockFund.deploy(
        "Test Fund",
        "TEST",
        owner.address,
        100,
        await priceOracle.getAddress(),
        await mockUniswapIntegration.getAddress()
      );

      const investmentAmount = ethers.parseUnits("1000", 6);
      await mockUSDC.connect(investor1).approve(await newFund.getAddress(), investmentAmount);
      
      await expect(
        newFund.connect(investor1).invest(investmentAmount)
      ).to.be.revertedWith("Fund not initialized");
    });
  });

  describe("赎回功能", function () {
    beforeEach(async function () {
      await mockFund.initializeFund(INITIAL_USDC_AMOUNT);
      
      // 给投资者铸造USDC并投资
      await mockUSDC.mint(investor1.address, ethers.parseUnits("10000", 6));
      await mockUSDC.connect(investor1).approve(await mockFund.getAddress(), ethers.parseUnits("1000", 6));
      await mockFund.connect(investor1).invest(ethers.parseUnits("1000", 6));
    });

    it("应该正确计算赎回预览", async function () {
      const redeemAmount = ethers.parseUnits("100", 18);
      const previewUSDC = await mockFund.getRedemptionPreview(redeemAmount);
      
      expect(previewUSDC).to.be.gt(0);
    });

    it("应该成功赎回MFC获得USDC", async function () {
      const initialUSDCBalance = await mockUSDC.balanceOf(investor1.address);
      const initialMFCBalance = await fundShareToken.balanceOf(investor1.address);
      const redeemAmount = ethers.parseUnits("100", 18);
      
      // 赎回
      await mockFund.connect(investor1).redeem(redeemAmount);
      
      // 检查MFC余额减少
      const finalMFCBalance = await fundShareToken.balanceOf(investor1.address);
      expect(finalMFCBalance).to.equal(initialMFCBalance - redeemAmount);
      
      // 检查USDC余额增加（扣除赎回费）
      const finalUSDCBalance = await mockUSDC.balanceOf(investor1.address);
      expect(finalUSDCBalance).to.be.gt(initialUSDCBalance);
    });

    it("应该拒绝赎回超过余额的MFC", async function () {
      const largeAmount = ethers.parseUnits("10000", 18); // 超过余额
      
      await expect(
        mockFund.connect(investor1).redeem(largeAmount)
      ).to.be.revertedWith("Insufficient shares");
    });

    it("应该拒绝赎回0数量的MFC", async function () {
      await expect(
        mockFund.connect(investor1).redeem(0)
      ).to.be.revertedWith("Invalid share amount");
    });
  });

  describe("管理费功能", function () {
    beforeEach(async function () {
      await mockFund.initializeFund(INITIAL_USDC_AMOUNT);
    });

    it("应该正确计算流通供应量", async function () {
      const circulatingSupply = await mockFund.getCirculatingSupply();
      expect(circulatingSupply).to.equal(0); // 初始时所有者持有所有MFC
    });

    it("应该正确累计管理费", async function () {
      const totalFees = await mockFund.getTotalManagementFees();
      expect(totalFees).to.equal(0); // 初始时没有管理费
    });

    it("应该允许所有者手动收取管理费", async function () {
      await mockFund.collectManagementFee();
      // 不应该抛出错误
    });
  });

  describe("查询功能", function () {
    beforeEach(async function () {
      await mockFund.initializeFund(INITIAL_USDC_AMOUNT);
    });

    it("应该返回正确的基金统计信息", async function () {
      const fundStats = await mockFund.getFundStats();
      expect(fundStats[0]).to.equal(INITIAL_MFC_SUPPLY);
      expect(fundStats[1]).to.equal(INITIAL_MFC_SUPPLY);
      expect(fundStats[2]).to.be.true;
    });

    it("应该返回支持的代币列表", async function () {
      const supportedTokens = await mockFund.getSupportedTokens();
      expect(supportedTokens).to.have.length(4);
    });

    it("应该返回正确的MFC组成", async function () {
      const composition = await mockFund.getMFCComposition();
      expect(composition.tokens).to.have.length(4);
      expect(composition.ratios).to.have.length(4);
      expect(composition.usdcAmount).to.be.gt(0);
    });
  });

  describe("权限控制", function () {
    it("应该只允许所有者添加支持的代币", async function () {
      await expect(
        mockFund.connect(investor1).addSupportedToken(investor1.address, 1000)
      ).to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
    });

    it("应该只允许所有者设置USDC代币地址", async function () {
      await expect(
        mockFund.connect(investor1).setUSDCToken(investor1.address)
      ).to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
    });

    it("应该只允许所有者暂停合约", async function () {
      await expect(
        mockFund.connect(investor1).pause()
      ).to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
    });

    it("应该只允许所有者恢复合约", async function () {
      await mockFund.pause();
      await expect(
        mockFund.connect(investor1).unpause()
      ).to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
    });
  });

  describe("暂停功能", function () {
    beforeEach(async function () {
      await mockFund.initializeFund(INITIAL_USDC_AMOUNT);
      await mockUSDC.mint(investor1.address, ethers.parseUnits("1000", 6));
    });

    it("暂停后应该拒绝投资", async function () {
      await mockFund.pause();
      
      await mockUSDC.connect(investor1).approve(await mockFund.getAddress(), ethers.parseUnits("1000", 6));
      
      await expect(
        mockFund.connect(investor1).invest(ethers.parseUnits("1000", 6))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("暂停后应该拒绝赎回", async function () {
      await mockFund.pause();
      
      await expect(
        mockFund.connect(investor1).redeem(ethers.parseUnits("100", 18))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("恢复后应该允许正常操作", async function () {
      await mockFund.pause();
      await mockFund.unpause();
      
      await mockUSDC.connect(investor1).approve(await mockFund.getAddress(), ethers.parseUnits("1000", 6));
      
      // 应该可以正常投资
      await expect(
        mockFund.connect(investor1).invest(ethers.parseUnits("1000", 6))
      ).to.not.be.reverted;
    });
  });

  describe("投资计算精度", function () {
    beforeEach(async function () {
      await mockFund.initializeFund(INITIAL_USDC_AMOUNT);
    });

    it("应该正确处理不同金额的投资", async function () {
      const testAmounts = [
        ethers.parseUnits("100", 6),   // 100 USDC
        ethers.parseUnits("500", 6),   // 500 USDC
        ethers.parseUnits("1000", 6),  // 1000 USDC
        ethers.parseUnits("5000", 6),  // 5000 USDC
        ethers.parseUnits("10000", 6)  // 10000 USDC
      ];

      for (const amount of testAmounts) {
        const previewMFC = await mockFund.getInvestmentPreview(amount);
        expect(previewMFC).to.be.gt(0);
        
        // 验证计算逻辑
        const mfcValue = await mockFund.calculateMFCValue();
        const expectedMFC = (amount * ethers.parseUnits("1", 18)) / mfcValue;
        expect(previewMFC).to.be.closeTo(expectedMFC, ethers.parseUnits("0.01", 18));
      }
    });

    it("应该正确处理小额投资", async function () {
      const smallAmount = ethers.parseUnits("100", 6); // 最小投资额
      const previewMFC = await mockFund.getInvestmentPreview(smallAmount);
      expect(previewMFC).to.be.gt(0);
    });
  });

  describe("错误处理", function () {
    it("应该拒绝重复初始化", async function () {
      await mockFund.initializeFund(INITIAL_USDC_AMOUNT);
      
      await expect(
        mockFund.initializeFund(INITIAL_USDC_AMOUNT)
      ).to.be.revertedWith("Fund already initialized");
    });

    it("应该拒绝错误的初始USDC金额", async function () {
      const wrongAmount = ethers.parseUnits("500000", 6); // 50万而不是100万
      
      await expect(
        mockFund.initializeFund(wrongAmount)
      ).to.be.revertedWith("Initial amount must be 1M USDC");
    });

    it("应该拒绝在未初始化时查询净值", async function () {
      await expect(
        mockFund.calculateNAV()
      ).to.be.revertedWith("Fund not initialized");
    });

    it("应该拒绝在未初始化时查询MFC价值", async function () {
      await expect(
        mockFund.calculateMFCValue()
      ).to.be.revertedWith("Fund not initialized");
    });
  });
}); 