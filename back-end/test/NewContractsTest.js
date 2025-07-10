const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("新合约版本测试", function () {
  let deployer, user1, user2;
  let mockUSDC, mockWETH, mockWBTC, mockLINK, mockDAI;
  let chainlinkPriceOracle, uniswapIntegration, mockFund, fundShareToken;
  let mockTokensFactory;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // 部署 MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy(deployer.address);

    // 部署 MockTokensFactory
    const MockTokensFactory = await ethers.getContractFactory("MockTokensFactory");
    mockTokensFactory = await MockTokensFactory.deploy(deployer.address);
    await mockTokensFactory.deployAllTokens();

    // 获取代币地址
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

    // 部署 ChainlinkPriceOracle
    const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
    chainlinkPriceOracle = await ChainlinkPriceOracle.deploy(deployer.address);

    // 部署 UniswapIntegration
    const UniswapIntegration = await ethers.getContractFactory("UniswapIntegration");
    uniswapIntegration = await UniswapIntegration.deploy(
      deployer.address,
      await chainlinkPriceOracle.getAddress()
    );

    // 部署 MockFund
    const MockFund = await ethers.getContractFactory("MockFund");
    mockFund = await MockFund.deploy(
      "Mock Fund Shares",
      "MFC",
      deployer.address,
      100, // 1% 管理费
      await chainlinkPriceOracle.getAddress(),
      await uniswapIntegration.getAddress()
    );

    // 获取份额代币
    const shareTokenAddress = await mockFund.shareToken();
    const FundShareToken = await ethers.getContractFactory("FundShareToken");
    fundShareToken = FundShareToken.attach(shareTokenAddress);
  });

  describe("ChainlinkPriceOracle 测试", function () {
    it("应该正确设置价格预言机", async function () {
      const tokenAddress = await mockWETH.getAddress();
      const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Sepolia ETH/USD
      
      await chainlinkPriceOracle.setPriceFeed(tokenAddress, priceFeedAddress, "ETH");
      
      const priceFeed = await chainlinkPriceOracle.priceFeeds(tokenAddress);
      expect(priceFeed).to.equal(priceFeedAddress);
    });

    it("应该批量设置价格预言机", async function () {
      const tokens = [
        await mockWETH.getAddress(),
        await mockWBTC.getAddress(),
        await mockLINK.getAddress()
      ];
      
      const priceFeeds = [
        "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD
        "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", // BTC/USD
        "0xc59E3633BAAC79493d908e63626716e204A45EdF"  // LINK/USD
      ];
      
      const symbols = ["ETH", "BTC", "LINK"];
      
      await chainlinkPriceOracle.batchSetPriceFeeds(tokens, priceFeeds, symbols);
      
      for (let i = 0; i < tokens.length; i++) {
        const priceFeed = await chainlinkPriceOracle.priceFeeds(tokens[i]);
        expect(priceFeed).to.equal(priceFeeds[i]);
      }
    });
  });

  describe("UniswapIntegration 测试", function () {
    beforeEach(async function () {
      // 设置价格预言机
      const tokens = [
        await mockWETH.getAddress(),
        await mockWBTC.getAddress(),
        await mockLINK.getAddress(),
        await mockDAI.getAddress(),
        await mockUSDC.getAddress()
      ];
      
      const priceFeeds = [
        "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD
        "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", // BTC/USD
        "0xc59E3633BAAC79493d908e63626716e204A45EdF", // LINK/USD
        "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19", // DAI/USD
        "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"  // USDC/USD
      ];
      
      const symbols = ["ETH", "BTC", "LINK", "DAI", "USDC"];
      
      await chainlinkPriceOracle.batchSetPriceFeeds(tokens, priceFeeds, symbols);
    });

    it("应该计算真实交换比率", async function () {
      const tokenIn = await mockWETH.getAddress();
      const tokenOut = await mockUSDC.getAddress();
      
      const rate = await uniswapIntegration.calculateRealExchangeRate(tokenIn, tokenOut);
      expect(rate).to.be.gt(0);
    });

    it("应该更新缓存的交换比率", async function () {
      const tokenIn = await mockWETH.getAddress();
      const tokenOut = await mockUSDC.getAddress();
      
      await uniswapIntegration.updateCachedRate(tokenIn, tokenOut);
      
      const [cachedRate, timestamp, isStale] = await uniswapIntegration.getCacheInfo(tokenIn, tokenOut);
      expect(cachedRate).to.be.gt(0);
      expect(isStale).to.be.false;
    });

    it("应该设置滑点容忍度", async function () {
      const newTolerance = 200; // 2%
      await uniswapIntegration.setSlippageTolerance(newTolerance);
      
      const tolerance = await uniswapIntegration.slippageTolerance();
      expect(tolerance).to.equal(newTolerance);
    });

    it("应该获取交换报价", async function () {
      const tokenIn = await mockWETH.getAddress();
      const tokenOut = await mockUSDC.getAddress();
      const amountIn = ethers.parseUnits("1", 18); // 1 WETH
      
      const quote = await uniswapIntegration.getQuote(tokenIn, tokenOut, amountIn, 3000);
      expect(quote).to.be.gt(0);
    });
  });

  describe("MockFund 集成测试", function () {
    beforeEach(async function () {
      // 设置价格预言机
      const tokens = [
        await mockWETH.getAddress(),
        await mockWBTC.getAddress(),
        await mockLINK.getAddress(),
        await mockDAI.getAddress(),
        await mockUSDC.getAddress()
      ];
      
      const priceFeeds = [
        "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD
        "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", // BTC/USD
        "0xc59E3633BAAC79493d908e63626716e204A45EdF", // LINK/USD
        "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19", // DAI/USD
        "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"  // USDC/USD
      ];
      
      const symbols = ["ETH", "BTC", "LINK", "DAI", "USDC"];
      
      await chainlinkPriceOracle.batchSetPriceFeeds(tokens, priceFeeds, symbols);

      // 添加支持的代币
      const supportedTokens = [
        await mockWETH.getAddress(),
        await mockWBTC.getAddress(),
        await mockLINK.getAddress(),
        await mockDAI.getAddress()
      ];

      for (const token of supportedTokens) {
        await mockFund.addSupportedToken(token, 1250); // 12.5%
      }

      // 设置 USDC 代币地址
      await mockFund.setUSDCToken(await mockUSDC.getAddress());

      // 为 UniswapIntegration 预存代币
      const largeAmount = ethers.parseUnits("1000000", 18);
      await mockWETH.mint(await uniswapIntegration.getAddress(), largeAmount);
      await mockWBTC.mint(await uniswapIntegration.getAddress(), ethers.parseUnits("10000", 8));
      await mockLINK.mint(await uniswapIntegration.getAddress(), largeAmount);
      await mockDAI.mint(await uniswapIntegration.getAddress(), largeAmount);
      await mockUSDC.mint(await uniswapIntegration.getAddress(), ethers.parseUnits("1000000", 6));
    });

    it("应该正确初始化基金", async function () {
      const initialAmount = ethers.parseUnits("1000000", 6); // 100万 USDC
      
      // 给部署者铸造 USDC
      await mockUSDC.mint(deployer.address, initialAmount);
      await mockUSDC.approve(await mockFund.getAddress(), initialAmount);
      
      // 初始化基金
      await mockFund.initializeFund(initialAmount);
      
      const fundStats = await mockFund.getFundStats();
      expect(fundStats[2]).to.be.true; // isInitialized
      expect(fundStats[0]).to.equal(ethers.parseUnits("1000000", 18)); // totalSupply
    });

    it("应该计算正确的净值", async function () {
      const initialAmount = ethers.parseUnits("1000000", 6);
      
      await mockUSDC.mint(deployer.address, initialAmount);
      await mockUSDC.approve(await mockFund.getAddress(), initialAmount);
      await mockFund.initializeFund(initialAmount);
      
      const nav = await mockFund.calculateNAV();
      expect(nav).to.be.gt(0);
      
      const mfcValue = await mockFund.calculateMFCValue();
      expect(mfcValue).to.be.gt(0);
    });

    it("应该允许投资", async function () {
      const initialAmount = ethers.parseUnits("1000000", 6);
      
      await mockUSDC.mint(deployer.address, initialAmount);
      await mockUSDC.approve(await mockFund.getAddress(), initialAmount);
      await mockFund.initializeFund(initialAmount);
      
      // 给用户铸造 USDC
      const investmentAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      await mockUSDC.mint(user1.address, investmentAmount);
      await mockUSDC.connect(user1).approve(await mockFund.getAddress(), investmentAmount);
      
      // 投资
      await mockFund.connect(user1).invest(investmentAmount);
      
      const userBalance = await fundShareToken.balanceOf(user1.address);
      expect(userBalance).to.be.gt(0);
    });
  });

  describe("价格缓存测试", function () {
    it("应该正确缓存价格", async function () {
      const tokenIn = await mockWETH.getAddress();
      const tokenOut = await mockUSDC.getAddress();
      
      // 设置价格预言机
      await chainlinkPriceOracle.setPriceFeed(tokenIn, "0x694AA1769357215DE4FAC081bf1f309aDC325306", "ETH");
      await chainlinkPriceOracle.setPriceFeed(tokenOut, "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E", "USDC");
      
      // 更新缓存
      await uniswapIntegration.updateCachedRate(tokenIn, tokenOut);
      
      // 检查缓存
      const [cachedRate, timestamp, isStale] = await uniswapIntegration.getCacheInfo(tokenIn, tokenOut);
      expect(cachedRate).to.be.gt(0);
      expect(isStale).to.be.false;
      
      // 清除缓存
      await uniswapIntegration.clearCache(tokenIn, tokenOut);
      
      const [newCachedRate, newTimestamp, newIsStale] = await uniswapIntegration.getCacheInfo(tokenIn, tokenOut);
      expect(newCachedRate).to.equal(0);
    });
  });

  describe("滑点保护测试", function () {
    it("应该应用滑点保护", async function () {
      const tokenIn = await mockWETH.getAddress();
      const tokenOut = await mockUSDC.getAddress();
      
      // 设置价格预言机
      await chainlinkPriceOracle.setPriceFeed(tokenIn, "0x694AA1769357215DE4FAC081bf1f309aDC325306", "ETH");
      await chainlinkPriceOracle.setPriceFeed(tokenOut, "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E", "USDC");
      
      // 设置滑点容忍度为 1%
      await uniswapIntegration.setSlippageTolerance(100);
      
      const tolerance = await uniswapIntegration.slippageTolerance();
      expect(tolerance).to.equal(100);
    });
  });
}); 