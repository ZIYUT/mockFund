const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockFund 智能合约测试", function () {
  let mockFund, mockUSDC, priceOracle, uniswapIntegration, shareToken;
  let mockWETH, mockWBTC, mockLINK, mockDAI;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // 部署Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy(owner.address);
    await mockUSDC.waitForDeployment();

    // 部署Mock代币
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
    uniswapIntegration = await MockUniswapIntegration.deploy(owner.address, await priceOracle.getAddress());
    await uniswapIntegration.waitForDeployment();

    // 部署Mock Fund
    const MockFund = await ethers.getContractFactory("MockFund");
    mockFund = await MockFund.deploy(
      "Mock Fund Share Token",
      "MFS",
      owner.address,
      100, // 1% 管理费
      await priceOracle.getAddress(),
      await uniswapIntegration.getAddress()
    );
    await mockFund.waitForDeployment();

    // 获取份额代币合约
    const shareTokenAddress = await mockFund.shareToken();
    const FundShareToken = await ethers.getContractFactory("FundShareToken");
    shareToken = FundShareToken.attach(shareTokenAddress);

    // 配置价格预言机（使用Sepolia Chainlink地址）
    await priceOracle.setPriceFeedBySymbol(await mockWETH.getAddress(), "ETH");
    await priceOracle.setPriceFeedBySymbol(await mockWBTC.getAddress(), "BTC");
    await priceOracle.setPriceFeedBySymbol(await mockLINK.getAddress(), "LINK");
    await priceOracle.setPriceFeedBySymbol(await mockUSDC.getAddress(), "USDC");

    // 配置基金
    await mockFund.setUSDCToken(await mockUSDC.getAddress());
    
    // 添加支持的代币（必须添加4个代币才能初始化）
    await mockFund.addSupportedToken(await mockWETH.getAddress(), 1250); // 12.5%
    await mockFund.addSupportedToken(await mockWBTC.getAddress(), 1250); // 12.5%
    await mockFund.addSupportedToken(await mockLINK.getAddress(), 1250); // 12.5%
    
    // 部署DAI代币用于测试
    const MockDAI = await ethers.getContractFactory("MockDAI");
    mockDAI = await MockDAI.deploy(owner.address);
    await mockDAI.waitForDeployment();
    await mockFund.addSupportedToken(await mockDAI.getAddress(), 1250); // 12.5%
    
    // 为MockUniswapIntegration预存代币用于交换
    const largeAmount = ethers.parseUnits("1000000", 18); // 1M tokens
    await mockWETH.mint(await uniswapIntegration.getAddress(), largeAmount);
    await mockWBTC.mint(await uniswapIntegration.getAddress(), ethers.parseUnits("10000", 8)); // 10K WBTC
    await mockLINK.mint(await uniswapIntegration.getAddress(), largeAmount);
    await mockDAI.mint(await uniswapIntegration.getAddress(), largeAmount);
    
    // 为USDC铸造代币给Uniswap集成
    const usdcAmount = ethers.parseUnits("1000000", 6); // 1M USDC
    await mockUSDC.mint(await uniswapIntegration.getAddress(), usdcAmount);
    
    // 设置简单的交换比率（1:1）
    await uniswapIntegration.setExchangeRate(await mockUSDC.getAddress(), await mockWETH.getAddress(), 10000); // 1:1
    await uniswapIntegration.setExchangeRate(await mockUSDC.getAddress(), await mockWBTC.getAddress(), 10000); // 1:1
    await uniswapIntegration.setExchangeRate(await mockUSDC.getAddress(), await mockLINK.getAddress(), 10000); // 1:1
    await uniswapIntegration.setExchangeRate(await mockUSDC.getAddress(), await mockDAI.getAddress(), 10000); // 1:1
    
    // 为部署者铸造100万USDC用于初始化
    const initialAmount = ethers.parseUnits("1000000", 6); // 100万 USDC
    await mockUSDC.mint(owner.address, initialAmount);
    
    // 批准USDC给基金
    await mockUSDC.approve(await mockFund.getAddress(), initialAmount);
    
    // 初始化基金
    await mockFund.initializeFund(initialAmount);

    // 为测试准备USDC代币 - 增加余额以支持大额投资
    const testAmount = ethers.parseUnits("2000000", 6); // 增加到200万USDC
    await mockUSDC.mint(user1.address, testAmount);
    await mockUSDC.mint(user2.address, testAmount);
  });

  describe("合约部署测试", function () {
    it("应该正确设置初始参数", async function () {
      expect(await shareToken.name()).to.equal("Mock Fund Share Token");
      expect(await shareToken.symbol()).to.equal("MFS");
      expect(await mockFund.owner()).to.equal(owner.address);
      expect(await mockFund.managementFeeRate()).to.equal(100);
    });

    it("应该正确设置支持的代币", async function () {
      const supportedTokens = await mockFund.getSupportedTokens();
      expect(supportedTokens.length).to.equal(4);
      expect(supportedTokens[0]).to.equal(await mockWETH.getAddress());
      expect(supportedTokens[1]).to.equal(await mockWBTC.getAddress());
      expect(supportedTokens[2]).to.equal(await mockLINK.getAddress());
      expect(supportedTokens[3]).to.equal(await mockDAI.getAddress());
    });

    it("应该正确设置USDC代币地址", async function () {
      const usdcAddress = await mockFund.usdcToken();
      expect(usdcAddress).to.equal(await mockUSDC.getAddress());
    });
  });

  describe("投资功能测试", function () {
    it("应该允许用户投资", async function () {
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
      const expectedTotal = ethers.parseUnits("1000000", 18) + investAmount; // totalSupply = INITIAL + new
      expect(fundStats[0]).to.equal(expectedTotal);
      expect(fundStats[1]).to.equal(ethers.parseUnits("1000000", 18)); // INITIAL_MFC_SUPPLY
    });

    it("应该拒绝低于最小投资额的投资", async function () {
      const smallAmount = ethers.parseUnits("5", 6); // 5 USDC (低于10最小值)
      
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
  });

  describe("赎回功能测试", function () {
    beforeEach(async function () {
      // 先进行投资
      const investAmount = ethers.parseUnits("1000", 6);
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investAmount);
      await mockFund.connect(user1).invest(investAmount);
    });

    it("应该允许用户赎回（跳过价格预言机依赖）", async function () {
      // 由于赎回功能依赖价格预言机，在本地测试中跳过
      // 这个功能将在Sepolia测试网上验证
      this.skip();
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
    it("应该允许所有者添加支持的代币", async function () {
      // 部署新的代币用于测试
      const MockUSDT = await ethers.getContractFactory("MockUSDC");
      const mockUSDTContract = await MockUSDT.deploy(owner.address);
      await mockUSDTContract.waitForDeployment();
      const newTokenAddress = await mockUSDTContract.getAddress();
      
      await expect(mockFund.addSupportedToken(newTokenAddress, 500))
        .to.emit(mockFund, "TokenAdded")
        .withArgs(newTokenAddress, 500);
      
      const supportedTokens = await mockFund.getSupportedTokens();
      expect(supportedTokens.length).to.equal(5);
    });

    it("应该拒绝非所有者添加代币", async function () {
      const MockUSDT = await ethers.getContractFactory("MockUSDC");
      const mockUSDTContract = await MockUSDT.deploy(owner.address);
      await mockUSDTContract.waitForDeployment();
      const newTokenAddress = await mockUSDTContract.getAddress();
      
      await expect(mockFund.connect(user1).addSupportedToken(newTokenAddress, 500))
        .to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
    });

    it("应该允许所有者收取管理费", async function () {
      // 先进行投资
      const investAmount = ethers.parseUnits("1000000", 6); // 增加投资金额到100万USDC
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investAmount);
      await mockFund.connect(user1).invest(investAmount);
      
      // 让发行者转移一些MFC给用户，增加流通量
      const ownerBalance = await shareToken.balanceOf(owner.address);
      const transferAmount = ethers.parseUnits("500000", 18); // 转移50万MFC
      if (ownerBalance >= transferAmount) {
        await shareToken.connect(owner).transfer(user1.address, transferAmount);
      }
      
      // 为基金合约补充USDC余额，确保管理费收取有足够余额
      const additionalUSDC = ethers.parseUnits("1000000", 6); // 100万USDC
      await mockUSDC.mint(await mockFund.getAddress(), additionalUSDC);
      
      // 模拟时间过去（1分钟，触发管理费收取）
      await ethers.provider.send("evm_increaseTime", [60]); // 增加1分钟
      await ethers.provider.send("evm_mine");
      
      // 打印流通MFC数量和预期管理费金额
      const circulatingSupply = await mockFund.getCirculatingSupply();
      const managementFeeRate = await mockFund.managementFeeRate();
      const feeAmount = (circulatingSupply * managementFeeRate) / 10000n;
      console.log("流通MFC数量:", ethers.formatUnits(circulatingSupply, 18));
      console.log("预期管理费金额:", ethers.formatUnits(feeAmount, 18));
      
      // 收取管理费（只检查事件是否触发，不检查具体参数）
      await expect(mockFund.collectManagementFee())
        .to.emit(mockFund, "ManagementFeeCollected");
    });
  });



  describe("投资组合信息测试", function () {
    beforeEach(async function () {
      // 进行投资
      const investAmount = ethers.parseUnits("1000", 6);
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investAmount);
      await mockFund.connect(user1).invest(investAmount);
    });

    it("应该返回正确的投资组合信息", async function () {
      const mfcComposition = await mockFund.getMFCComposition();
      expect(mfcComposition.tokens.length).to.equal(4); // 4个支持的代币
    });

    it("应该返回正确的基金统计信息", async function () {
      const fundStats = await mockFund.getFundStats();
      expect(fundStats[0]).to.be.gt(0); // totalSupply > 0
      expect(fundStats[1]).to.equal(ethers.parseUnits("1000000", 18)); // INITIAL_MFC_SUPPLY
      expect(fundStats[2]).to.equal(true); // isInitialized = true
      
      // 检查支持的代币数量
      const supportedTokens = await mockFund.getSupportedTokens();
      expect(supportedTokens.length).to.equal(4);
    });
  });

  describe("错误处理测试", function () {
    it("应该拒绝零地址的代币添加", async function () {
      await expect(mockFund.addSupportedToken(ethers.ZeroAddress, 500))
        .to.be.revertedWith("Invalid token address");
    });

    it("应该拒绝过高的分配比例", async function () {
      const MockUSDT = await ethers.getContractFactory("MockUSDC");
      const mockUSDTContract = await MockUSDT.deploy(owner.address);
      await mockUSDTContract.waitForDeployment();
      const newTokenAddress = await mockUSDTContract.getAddress();
      
      await expect(mockFund.addSupportedToken(newTokenAddress, 10001)) // 超过100%
        .to.be.revertedWith("Invalid allocation");
    });
  });
});