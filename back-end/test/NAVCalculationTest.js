const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NAV Calculation and Investment Mechanism Tests", function () {
  let mockFund, mockUSDC, mockWETH, mockWBTC, mockLINK, mockDAI;
  let priceOracle, mockUniswapIntegration;
  let owner, investor1, investor2, investor3;
  let fundShareToken;

  const INITIAL_USDC_AMOUNT = ethers.parseUnits("1000000", 6); // 100万USDC
  const INITIAL_MFC_SUPPLY = ethers.parseUnits("1000000", 18); // 100万MFC

  beforeEach(async function () {
    [owner, investor1, investor2, investor3] = await ethers.getSigners();

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

    // 初始化基金
    await mockFund.initializeFund(INITIAL_USDC_AMOUNT);
  });

  describe("净值计算机制", function () {
    it("应该正确计算初始NAV", async function () {
      const nav = await mockFund.calculateNAV();
      console.log("初始NAV:", ethers.formatUnits(nav, 6), "USDC");
      
      // NAV应该在合理范围内
      expect(nav).to.be.gt(ethers.parseUnits("950000", 6)); // 至少95万USDC
      expect(nav).to.be.lt(ethers.parseUnits("1050000", 6)); // 最多105万USDC
    });

    it("应该正确计算初始MFC价值", async function () {
      const mfcValue = await mockFund.calculateMFCValue();
      console.log("初始MFC价值:", ethers.formatUnits(mfcValue, 6), "USDC");
      
      // MFC价值应该在合理范围内
      expect(mfcValue).to.be.gt(ethers.parseUnits("0.95", 6)); // 至少0.95 USDC
      expect(mfcValue).to.be.lt(ethers.parseUnits("1.05", 6)); // 最多1.05 USDC
    });

    it("NAV应该等于总供应量乘以MFC价值", async function () {
      const nav = await mockFund.calculateNAV();
      const mfcValue = await mockFund.calculateMFCValue();
      const totalSupply = await fundShareToken.totalSupply();
      
      const calculatedNav = mfcValue * totalSupply / ethers.parseUnits("1", 18);
      console.log("计算NAV:", ethers.formatUnits(calculatedNav, 6), "USDC");
      console.log("实际NAV:", ethers.formatUnits(nav, 6), "USDC");
      
      // 应该非常接近（允许小的精度误差）
      expect(nav).to.be.closeTo(calculatedNav, ethers.parseUnits("1000", 6)); // 允许1000 USDC误差
    });

    it("应该正确计算基金净值信息", async function () {
      const fundNAV = await mockFund.getFundNAV();
      
      expect(fundNAV.nav).to.be.gt(0);
      expect(fundNAV.mfcValue).to.be.gt(0);
      expect(fundNAV.totalSupply).to.equal(INITIAL_MFC_SUPPLY);
      
      console.log("基金净值信息:");
      console.log("  NAV:", ethers.formatUnits(fundNAV.nav, 6), "USDC");
      console.log("  MFC价值:", ethers.formatUnits(fundNAV.mfcValue, 6), "USDC");
      console.log("  总供应量:", ethers.formatEther(fundNAV.totalSupply), "MFC");
    });
  });

  describe("投资计算机制", function () {
    beforeEach(async function () {
      // 给投资者铸造USDC
      await mockUSDC.mint(investor1.address, ethers.parseUnits("10000", 6));
      await mockUSDC.mint(investor2.address, ethers.parseUnits("10000", 6));
      await mockUSDC.mint(investor3.address, ethers.parseUnits("10000", 6));
    });

    it("应该正确计算投资预览", async function () {
      const testAmounts = [
        ethers.parseUnits("100", 6),   // 100 USDC
        ethers.parseUnits("500", 6),   // 500 USDC
        ethers.parseUnits("1000", 6),  // 1000 USDC
        ethers.parseUnits("5000", 6),  // 5000 USDC
        ethers.parseUnits("10000", 6)  // 10000 USDC
      ];

      console.log("\n投资预览测试:");
      
      for (const amount of testAmounts) {
        const previewMFC = await mockFund.getInvestmentPreview(amount);
        const mfcValue = await mockFund.calculateMFCValue();
        const expectedMFC = (amount * ethers.parseUnits("1", 18)) / mfcValue;
        
        console.log(`  投资 ${ethers.formatUnits(amount, 6)} USDC → 获得 ${ethers.formatEther(previewMFC)} MFC`);
        console.log(`  预期: ${ethers.formatEther(expectedMFC)} MFC`);
        
        expect(previewMFC).to.be.gt(0);
        expect(previewMFC).to.be.closeTo(expectedMFC, ethers.parseUnits("0.01", 18));
      }
    });

    it("应该验证投资计算逻辑", async function () {
      const investmentAmount = ethers.parseUnits("1000", 6);
      const mfcValue = await mockFund.calculateMFCValue();
      
      // 理论计算
      const theoreticalMFC = (investmentAmount * ethers.parseUnits("1", 18)) / mfcValue;
      
      // 合约计算
      const contractMFC = await mockFund.getInvestmentPreview(investmentAmount);
      
      console.log("投资计算验证:");
      console.log("  投资金额:", ethers.formatUnits(investmentAmount, 6), "USDC");
      console.log("  MFC价值:", ethers.formatUnits(mfcValue, 6), "USDC");
      console.log("  理论MFC:", ethers.formatEther(theoreticalMFC), "MFC");
      console.log("  合约MFC:", ethers.formatEther(contractMFC), "MFC");
      
      expect(contractMFC).to.be.closeTo(theoreticalMFC, ethers.parseUnits("0.01", 18));
    });

    it("应该正确处理实际投资", async function () {
      const investmentAmount = ethers.parseUnits("1000", 6);
      const initialNav = await mockFund.calculateNAV();
      const initialMfcValue = await mockFund.calculateMFCValue();
      const previewMFC = await mockFund.getInvestmentPreview(investmentAmount);
      
      console.log("实际投资测试:");
      console.log("  投资前NAV:", ethers.formatUnits(initialNav, 6), "USDC");
      console.log("  投资前MFC价值:", ethers.formatUnits(initialMfcValue, 6), "USDC");
      console.log("  预期获得MFC:", ethers.formatEther(previewMFC), "MFC");
      
      // 执行投资
      await mockUSDC.connect(investor1).approve(await mockFund.getAddress(), investmentAmount);
      await mockFund.connect(investor1).invest(investmentAmount);
      
      // 检查结果
      const finalNav = await mockFund.calculateNAV();
      const finalMfcValue = await mockFund.calculateMFCValue();
      const actualMFC = await fundShareToken.balanceOf(investor1.address);
      
      console.log("  投资后NAV:", ethers.formatUnits(finalNav, 6), "USDC");
      console.log("  投资后MFC价值:", ethers.formatUnits(finalMfcValue, 6), "USDC");
      console.log("  实际获得MFC:", ethers.formatEther(actualMFC), "MFC");
      
      // 验证
      expect(finalNav).to.be.gt(initialNav);
      expect(actualMFC).to.be.closeTo(previewMFC, ethers.parseUnits("0.01", 18));
    });

    it("应该验证投资后净值增加", async function () {
      const investmentAmount = ethers.parseUnits("1000", 6);
      const initialNav = await mockFund.calculateNAV();
      
      await mockUSDC.connect(investor1).approve(await mockFund.getAddress(), investmentAmount);
      await mockFund.connect(investor1).invest(investmentAmount);
      
      const finalNav = await mockFund.calculateNAV();
      
      console.log("净值增加验证:");
      console.log("  投资前NAV:", ethers.formatUnits(initialNav, 6), "USDC");
      console.log("  投资后NAV:", ethers.formatUnits(finalNav, 6), "USDC");
      console.log("  NAV增加:", ethers.formatUnits(finalNav - initialNav, 6), "USDC");
      
      expect(finalNav).to.be.gt(initialNav);
    });
  });

  describe("多投资者场景", function () {
    beforeEach(async function () {
      // 给投资者铸造USDC
      await mockUSDC.mint(investor1.address, ethers.parseUnits("10000", 6));
      await mockUSDC.mint(investor2.address, ethers.parseUnits("10000", 6));
      await mockUSDC.mint(investor3.address, ethers.parseUnits("10000", 6));
    });

    it("应该正确处理多个投资者投资", async function () {
      const investmentAmount = ethers.parseUnits("1000", 6);
      
      console.log("多投资者投资测试:");
      
      // 投资者1投资
      await mockUSDC.connect(investor1).approve(await mockFund.getAddress(), investmentAmount);
      await mockFund.connect(investor1).invest(investmentAmount);
      
      const nav1 = await mockFund.calculateNAV();
      const mfcValue1 = await mockFund.calculateMFCValue();
      const mfc1 = await fundShareToken.balanceOf(investor1.address);
      
      console.log("  投资者1投资后:");
      console.log("    NAV:", ethers.formatUnits(nav1, 6), "USDC");
      console.log("    MFC价值:", ethers.formatUnits(mfcValue1, 6), "USDC");
      console.log("    获得MFC:", ethers.formatEther(mfc1), "MFC");
      
      // 投资者2投资
      await mockUSDC.connect(investor2).approve(await mockFund.getAddress(), investmentAmount);
      await mockFund.connect(investor2).invest(investmentAmount);
      
      const nav2 = await mockFund.calculateNAV();
      const mfcValue2 = await mockFund.calculateMFCValue();
      const mfc2 = await fundShareToken.balanceOf(investor2.address);
      
      console.log("  投资者2投资后:");
      console.log("    NAV:", ethers.formatUnits(nav2, 6), "USDC");
      console.log("    MFC价值:", ethers.formatUnits(mfcValue2, 6), "USDC");
      console.log("    获得MFC:", ethers.formatEther(mfc2), "MFC");
      
      // 投资者3投资
      await mockUSDC.connect(investor3).approve(await mockFund.getAddress(), investmentAmount);
      await mockFund.connect(investor3).invest(investmentAmount);
      
      const nav3 = await mockFund.calculateNAV();
      const mfcValue3 = await mockFund.calculateMFCValue();
      const mfc3 = await fundShareToken.balanceOf(investor3.address);
      
      console.log("  投资者3投资后:");
      console.log("    NAV:", ethers.formatUnits(nav3, 6), "USDC");
      console.log("    MFC价值:", ethers.formatUnits(mfcValue3, 6), "USDC");
      console.log("    获得MFC:", ethers.formatEther(mfc3), "MFC");
      
      // 验证
      expect(nav3).to.be.gt(nav2);
      expect(nav2).to.be.gt(nav1);
      expect(mfc1).to.be.gt(0);
      expect(mfc2).to.be.gt(0);
      expect(mfc3).to.be.gt(0);
    });

    it("应该验证不同时间投资的MFC价值变化", async function () {
      const investmentAmount = ethers.parseUnits("1000", 6);
      
      // 投资者1投资时的MFC价值
      const mfcValue1 = await mockFund.calculateMFCValue();
      await mockUSDC.connect(investor1).approve(await mockFund.getAddress(), investmentAmount);
      await mockFund.connect(investor1).invest(investmentAmount);
      
      // 投资者2投资时的MFC价值
      const mfcValue2 = await mockFund.calculateMFCValue();
      await mockUSDC.connect(investor2).approve(await mockFund.getAddress(), investmentAmount);
      await mockFund.connect(investor2).invest(investmentAmount);
      
      console.log("MFC价值变化:");
      console.log("  投资者1投资时MFC价值:", ethers.formatUnits(mfcValue1, 6), "USDC");
      console.log("  投资者2投资时MFC价值:", ethers.formatUnits(mfcValue2, 6), "USDC");
      
      // MFC价值应该略有变化（因为投资增加了净值）
      expect(mfcValue2).to.be.closeTo(mfcValue1, ethers.parseUnits("0.001", 6));
    });
  });

  describe("赎回机制测试", function () {
    beforeEach(async function () {
      // 给投资者铸造USDC并投资
      await mockUSDC.mint(investor1.address, ethers.parseUnits("10000", 6));
      await mockUSDC.connect(investor1).approve(await mockFund.getAddress(), ethers.parseUnits("1000", 6));
      await mockFund.connect(investor1).invest(ethers.parseUnits("1000", 6));
    });

    it("应该正确计算赎回预览", async function () {
      const redeemAmount = ethers.parseUnits("100", 18);
      const previewUSDC = await mockFund.getRedemptionPreview(redeemAmount);
      
      console.log("赎回预览测试:");
      console.log("  赎回MFC:", ethers.formatEther(redeemAmount), "MFC");
      console.log("  预期获得USDC:", ethers.formatUnits(previewUSDC, 6), "USDC");
      
      expect(previewUSDC).to.be.gt(0);
    });

    it("应该正确处理实际赎回", async function () {
      const initialMFCBalance = await fundShareToken.balanceOf(investor1.address);
      const initialUSDCBalance = await mockUSDC.balanceOf(investor1.address);
      const redeemAmount = ethers.parseUnits("100", 18);
      const previewUSDC = await mockFund.getRedemptionPreview(redeemAmount);
      
      console.log("实际赎回测试:");
      console.log("  赎回前MFC余额:", ethers.formatEther(initialMFCBalance), "MFC");
      console.log("  赎回前USDC余额:", ethers.formatUnits(initialUSDCBalance, 6), "USDC");
      console.log("  赎回MFC:", ethers.formatEther(redeemAmount), "MFC");
      console.log("  预期获得USDC:", ethers.formatUnits(previewUSDC, 6), "USDC");
      
      // 执行赎回
      await mockFund.connect(investor1).redeem(redeemAmount);
      
      // 检查结果
      const finalMFCBalance = await fundShareToken.balanceOf(investor1.address);
      const finalUSDCBalance = await mockUSDC.balanceOf(investor1.address);
      
      console.log("  赎回后MFC余额:", ethers.formatEther(finalMFCBalance), "MFC");
      console.log("  赎回后USDC余额:", ethers.formatUnits(finalUSDCBalance, 6), "USDC");
      console.log("  实际获得USDC:", ethers.formatUnits(finalUSDCBalance - initialUSDCBalance, 6), "USDC");
      
      // 验证
      expect(finalMFCBalance).to.equal(initialMFCBalance - redeemAmount);
      expect(finalUSDCBalance).to.be.gt(initialUSDCBalance);
    });
  });

  describe("边界条件测试", function () {
    it("应该正确处理最小投资额", async function () {
      const minInvestment = ethers.parseUnits("100", 6); // 最小投资额
      await mockUSDC.mint(investor1.address, minInvestment);
      
      const previewMFC = await mockFund.getInvestmentPreview(minInvestment);
      console.log("最小投资测试:");
      console.log("  投资金额:", ethers.formatUnits(minInvestment, 6), "USDC");
      console.log("  获得MFC:", ethers.formatEther(previewMFC), "MFC");
      
      expect(previewMFC).to.be.gt(0);
    });

    it("应该拒绝低于最小投资额的投资", async function () {
      const smallAmount = ethers.parseUnits("50", 6); // 低于100 USDC
      await mockUSDC.mint(investor1.address, smallAmount);
      
      await mockUSDC.connect(investor1).approve(await mockFund.getAddress(), smallAmount);
      
      await expect(
        mockFund.connect(investor1).invest(smallAmount)
      ).to.be.revertedWith("Investment below minimum");
    });

    it("应该正确处理大额投资", async function () {
      const largeAmount = ethers.parseUnits("50000", 6); // 5万USDC
      await mockUSDC.mint(investor1.address, largeAmount);
      
      const previewMFC = await mockFund.getInvestmentPreview(largeAmount);
      console.log("大额投资测试:");
      console.log("  投资金额:", ethers.formatUnits(largeAmount, 6), "USDC");
      console.log("  获得MFC:", ethers.formatEther(previewMFC), "MFC");
      
      expect(previewMFC).to.be.gt(0);
    });
  });

  describe("精度测试", function () {
    it("应该保持计算精度", async function () {
      const testAmounts = [
        ethers.parseUnits("100.123", 6),   // 带小数
        ethers.parseUnits("1000.456", 6),  // 带小数
        ethers.parseUnits("10000.789", 6)  // 带小数
      ];

      console.log("精度测试:");
      
      for (const amount of testAmounts) {
        const previewMFC = await mockFund.getInvestmentPreview(amount);
        const mfcValue = await mockFund.calculateMFCValue();
        const expectedMFC = (amount * ethers.parseUnits("1", 18)) / mfcValue;
        
        console.log(`  投资 ${ethers.formatUnits(amount, 6)} USDC`);
        console.log(`    预期MFC: ${ethers.formatEther(expectedMFC)} MFC`);
        console.log(`    实际MFC: ${ethers.formatEther(previewMFC)} MFC`);
        
        expect(previewMFC).to.be.closeTo(expectedMFC, ethers.parseUnits("0.001", 18));
      }
    });
  });
}); 