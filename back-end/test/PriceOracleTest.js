const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceOracle 测试", function () {
  let priceOracle, mockUSDC, mockWETH, mockWBTC, mockLINK, mockDAI;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    // 部署Mock代币
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy(owner.address);
    await mockUSDC.waitForDeployment();

    const MockWETH = await ethers.getContractFactory("MockWETH");
    mockWETH = await MockWETH.deploy(owner.address);
    await mockWETH.waitForDeployment();

    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    mockWBTC = await MockWBTC.deploy(owner.address);
    await mockWBTC.waitForDeployment();

    const MockLINK = await ethers.getContractFactory("MockLINK");
    mockLINK = await MockLINK.deploy(owner.address);
    await mockLINK.waitForDeployment();

    const MockDAI = await ethers.getContractFactory("MockDAI");
    mockDAI = await MockDAI.deploy(owner.address);
    await mockDAI.waitForDeployment();

    // 部署价格预言机
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy(owner.address);
    await priceOracle.waitForDeployment();

    // 配置价格预言机
    await priceOracle.setPriceFeedBySymbol(await mockWETH.getAddress(), "ETH");
    await priceOracle.setPriceFeedBySymbol(await mockWBTC.getAddress(), "BTC");
    await priceOracle.setPriceFeedBySymbol(await mockLINK.getAddress(), "LINK");
    await priceOracle.setPriceFeedBySymbol(await mockUSDC.getAddress(), "USDC");
    await priceOracle.setPriceFeedBySymbol(await mockDAI.getAddress(), "DAI");
  });

  it("应该正确设置价格预言机", async function () {
    // 测试基本设置功能
    expect(await priceOracle.owner()).to.equal(owner.address);
    
    // 检查是否设置了价格预言机
    const isSet = await priceOracle.isPriceFeedSet(await mockWETH.getAddress());
    expect(isSet).to.be.true;
  });

  it("应该能够获取Sepolia价格预言机地址", async function () {
    const ethAddress = await priceOracle.getSepoliaPriceFeedAddress("ETH");
    expect(ethAddress).to.not.equal(ethers.ZeroAddress);
    
    const btcAddress = await priceOracle.getSepoliaPriceFeedAddress("BTC");
    expect(btcAddress).to.not.equal(ethers.ZeroAddress);
  });

  it("应该拒绝无效的代币符号", async function () {
    const invalidAddress = await priceOracle.getSepoliaPriceFeedAddress("INVALID");
    expect(invalidAddress).to.equal(ethers.ZeroAddress);
  });

  it("应该拒绝非所有者设置价格预言机", async function () {
    const [owner, user1] = await ethers.getSigners();
    
    await expect(
      priceOracle.connect(user1).setPriceFeedBySymbol(await mockWETH.getAddress(), "ETH")
    ).to.be.revertedWithCustomError(priceOracle, "OwnableUnauthorizedAccount");
  });

  it("应该拒绝零地址代币", async function () {
    await expect(
      priceOracle.setPriceFeedBySymbol(ethers.ZeroAddress, "ETH")
    ).to.be.revertedWith("Invalid token address");
  });

  // 跳过需要真实Chainlink连接的测试
  it.skip("应该能够获取ETH价格", async function () {
    const result = await priceOracle.getLatestPrice(await mockWETH.getAddress());
    const price = result[0];
    const timestamp = result[1];
    console.log("ETH价格:", price.toString());
    console.log("时间戳:", timestamp.toString());
    expect(price).to.be.gt(0);
  });

  it.skip("应该能够获取BTC价格", async function () {
    const result = await priceOracle.getLatestPrice(await mockWBTC.getAddress());
    const price = result[0];
    const timestamp = result[1];
    console.log("BTC价格:", price.toString());
    console.log("时间戳:", timestamp.toString());
    expect(price).to.be.gt(0);
  });

  it.skip("应该能够获取LINK价格", async function () {
    const result = await priceOracle.getLatestPrice(await mockLINK.getAddress());
    const price = result[0];
    const timestamp = result[1];
    console.log("LINK价格:", price.toString());
    console.log("时间戳:", timestamp.toString());
    expect(price).to.be.gt(0);
  });

  it.skip("应该能够获取USDC价格", async function () {
    const result = await priceOracle.getLatestPrice(await mockUSDC.getAddress());
    const price = result[0];
    const timestamp = result[1];
    console.log("USDC价格:", price.toString());
    console.log("时间戳:", timestamp.toString());
    expect(price).to.be.gt(0);
  });

  it.skip("应该能够获取DAI价格", async function () {
    const result = await priceOracle.getLatestPrice(await mockDAI.getAddress());
    const price = result[0];
    const timestamp = result[1];
    console.log("DAI价格:", price.toString());
    console.log("时间戳:", timestamp.toString());
    expect(price).to.be.gt(0);
  });

  it.skip("应该能够计算代币价值", async function () {
    const tokenAmount = ethers.parseUnits("1", 18); // 1 ETH
    const usdcValue = await priceOracle.calculateTokenValue(await mockWETH.getAddress(), tokenAmount);
    console.log("1 ETH的USDC价值:", usdcValue.toString());
    expect(usdcValue).to.be.gt(0);
  });
}); 