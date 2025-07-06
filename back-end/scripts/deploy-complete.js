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
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  console.log("MockUSDC 部署到:", await mockUSDC.getAddress());

  // 部署其他Mock代币
  const MockTokens = await ethers.getContractFactory("MockTokens");
  const mockTokens = await MockTokens.deploy();
  await mockTokens.waitForDeployment();
  console.log("MockTokens 部署到:", await mockTokens.getAddress());

  // 获取代币地址
  const mockWETH = await mockTokens.WETH();
  const mockWBTC = await mockTokens.WBTC();
  const mockLINK = await mockTokens.LINK();
  const mockUNI = await mockTokens.UNI();
  const mockDAI = await mockTokens.DAI();

  console.log("Mock WETH:", mockWETH);
  console.log("Mock WBTC:", mockWBTC);
  console.log("Mock LINK:", mockLINK);
  console.log("Mock UNI:", mockUNI);
  console.log("Mock DAI:", mockDAI);

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
    { address: mockWETH, allocation: 2000, name: "WETH" }, // 20%
    { address: mockWBTC, allocation: 2000, name: "WBTC" }, // 20%
    { address: mockLINK, allocation: 1000, name: "LINK" }, // 10%
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
  for (const token of tokens) {
    await mockTokens.mint(token.address, await uniswapIntegration.getAddress(), largeAmount);
    console.log(`✓ 为MockUniswapIntegration铸造 ${token.name}`);
  }

  // 7. 输出部署信息
  console.log("\n=== 部署完成 ===");
  console.log("合约地址:");
  console.log("{");
  console.log(`  MOCK_FUND: "${await mockFund.getAddress()}",`);
  console.log(`  FUND_SHARE_TOKEN: "${shareTokenAddress}",`);
  console.log(`  PRICE_ORACLE: "${await priceOracle.getAddress()}",`);
  console.log(`  UNISWAP_INTEGRATION: "${await uniswapIntegration.getAddress()}",`);
  console.log(`  MOCK_USDC: "${await mockUSDC.getAddress()}",`);
  console.log(`  MOCK_WETH: "${mockWETH}",`);
  console.log(`  MOCK_WBTC: "${mockWBTC}",`);
  console.log(`  MOCK_LINK: "${mockLINK}",`);
  console.log(`  MOCK_UNI: "${mockUNI}",`);
  console.log(`  MOCK_DAI: "${mockDAI}",`);
  console.log(`  TOKEN_FACTORY: "${await mockTokens.getAddress()}"`);
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