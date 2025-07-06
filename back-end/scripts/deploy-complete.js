const { ethers } = require("hardhat");

/**
 * 完整的Mock Fund部署脚本
 * 部署所有核心合约并配置基金
 */
async function main() {
  console.log("开始部署Mock Fund合约...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // 1. 部署Mock代币
  console.log("\n=== 部署Mock代币 ===");
  
  // 部署MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy(deployer.address);
  await mockUSDC.waitForDeployment();
  console.log("MockUSDC 部署到:", await mockUSDC.getAddress());

  // 部署TokenFactory
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const tokenFactory = await TokenFactory.deploy(deployer.address);
  await tokenFactory.waitForDeployment();
  console.log("TokenFactory 部署到:", await tokenFactory.getAddress());

  // 部署各个Mock代币
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const mockWETH = await MockWETH.deploy(deployer.address);
  await mockWETH.waitForDeployment();
  console.log("MockWETH 部署到:", await mockWETH.getAddress());

  const MockWBTC = await ethers.getContractFactory("MockWBTC");
  const mockWBTC = await MockWBTC.deploy(deployer.address);
  await mockWBTC.waitForDeployment();
  console.log("MockWBTC 部署到:", await mockWBTC.getAddress());

  const MockLINK = await ethers.getContractFactory("MockLINK");
  const mockLINK = await MockLINK.deploy(deployer.address);
  await mockLINK.waitForDeployment();
  console.log("MockLINK 部署到:", await mockLINK.getAddress());

  const MockUNI = await ethers.getContractFactory("MockUNI");
  const mockUNI = await MockUNI.deploy(deployer.address);
  await mockUNI.waitForDeployment();
  console.log("MockUNI 部署到:", await mockUNI.getAddress());

  const MockDAI = await ethers.getContractFactory("MockDAI");
  const mockDAI = await MockDAI.deploy(deployer.address);
  await mockDAI.waitForDeployment();
  console.log("MockDAI 部署到:", await mockDAI.getAddress());

  // 获取代币地址
  const mockWETHAddress = await mockWETH.getAddress();
  const mockWBTCAddress = await mockWBTC.getAddress();
  const mockLINKAddress = await mockLINK.getAddress();
  const mockUNIAddress = await mockUNI.getAddress();
  const mockDAIAddress = await mockDAI.getAddress();

  console.log("Mock WETH:", mockWETHAddress);
  console.log("Mock WBTC:", mockWBTCAddress);
  console.log("Mock LINK:", mockLINKAddress);
  console.log("Mock UNI:", mockUNIAddress);
  console.log("Mock DAI:", mockDAIAddress);

  // 2. 部署价格预言机
  console.log("\n=== 部署价格预言机 ===");
  
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy(deployer.address);
  await priceOracle.waitForDeployment();
  console.log("PriceOracle 部署到:", await priceOracle.getAddress());

  // 3. 部署Uniswap集成合约
  console.log("\n=== 部署Uniswap集成 ===");
  
  const MockUniswapIntegration = await ethers.getContractFactory("MockUniswapIntegration");
  const uniswapIntegration = await MockUniswapIntegration.deploy(deployer.address);
  await uniswapIntegration.waitForDeployment();
  console.log("MockUniswapIntegration 部署到:", await uniswapIntegration.getAddress());

  // 4. 部署Mock Fund
  console.log("\n=== 部署Mock Fund ===");
  
  const MockFund = await ethers.getContractFactory("MockFund");
  const mockFund = await MockFund.deploy(
    "Mock Fund Share Token",
    "MFS",
    deployer.address,
    200, // 2% 管理费
    await priceOracle.getAddress(),
    await uniswapIntegration.getAddress()
  );
  await mockFund.waitForDeployment();
  console.log("MockFund 部署到:", await mockFund.getAddress());

  // 获取FundShareToken地址
  const shareTokenAddress = await mockFund.shareToken();
  console.log("FundShareToken 部署到:", shareTokenAddress);

  // 5. 配置合约
  console.log("\n=== 配置合约 ===");
  
  // 设置USDC代币地址
  await mockFund.setUSDCToken(await mockUSDC.getAddress());
  console.log("✓ 设置USDC代币地址");

  // 添加支持的代币和目标分配
  const tokens = [
    { address: mockWETHAddress, allocation: 2000, name: "WETH" }, // 20%
    { address: mockWBTCAddress, allocation: 2000, name: "WBTC" }, // 20%
    { address: mockLINKAddress, allocation: 1000, name: "LINK" }, // 10%
  ];

  for (const token of tokens) {
    await mockFund.addSupportedToken(token.address, token.allocation);
    console.log(`✓ 添加支持的代币: ${token.name} (${token.allocation / 100}%)`);
  }

  // 6. 为测试准备代币
  console.log("\n=== 准备测试代币 ===");
  
  // 为部署者铸造测试代币
  const testAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
  await mockUSDC.mint(deployer.address, testAmount);
  console.log("✓ 为部署者铸造 10,000 USDC");

  // 为MockUniswapIntegration铸造代币用于交换
  const largeAmount = ethers.parseUnits("1000000", 18); // 1M tokens
  
  // 为WETH铸造代币
  await mockWETH.mint(await uniswapIntegration.getAddress(), largeAmount);
  console.log(`✓ 为MockUniswapIntegration铸造 WETH`);
  
  // 为WBTC铸造代币 (8位小数)
  const wbtcAmount = ethers.parseUnits("10000", 8); // 10K WBTC
  await mockWBTC.mint(await uniswapIntegration.getAddress(), wbtcAmount);
  console.log(`✓ 为MockUniswapIntegration铸造 WBTC`);
  
  // 为LINK铸造代币
  await mockLINK.mint(await uniswapIntegration.getAddress(), largeAmount);
  console.log(`✓ 为MockUniswapIntegration铸造 LINK`);

  // 7. 输出部署信息
  console.log("\n=== 部署完成 ===");
  console.log("合约地址:");
  console.log("{");
  console.log(`  MOCK_FUND: "${await mockFund.getAddress()}",`);
  console.log(`  FUND_SHARE_TOKEN: "${shareTokenAddress}",`);
  console.log(`  PRICE_ORACLE: "${await priceOracle.getAddress()}",`);
  console.log(`  UNISWAP_INTEGRATION: "${await uniswapIntegration.getAddress()}",`);
  console.log(`  MOCK_USDC: "${await mockUSDC.getAddress()}",`);
  console.log(`  MOCK_WETH: "${mockWETHAddress}",`);
  console.log(`  MOCK_WBTC: "${mockWBTCAddress}",`);
  console.log(`  MOCK_LINK: "${mockLINKAddress}",`);
  console.log(`  MOCK_UNI: "${mockUNIAddress}",`);
  console.log(`  MOCK_DAI: "${mockDAIAddress}",`);
  console.log(`  TOKEN_FACTORY: "${await tokenFactory.getAddress()}"`);;
  console.log("}");

  // 8. 验证部署
  console.log("\n=== 验证部署 ===");
  
  const fundStats = await mockFund.getFundStats();
  console.log("基金统计:");
  console.log(`  总资产: ${ethers.formatUnits(fundStats[0], 6)} USDC`);
  console.log(`  总份额: ${ethers.formatUnits(fundStats[1], 18)} MFS`);
  console.log(`  当前NAV: ${ethers.formatUnits(fundStats[2], 6)} USDC`);

  const supportedTokens = await mockFund.getSupportedTokens();
  console.log(`  支持的代币数量: ${supportedTokens.length}`);

  console.log("\n✅ Mock Fund 部署和配置完成!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });