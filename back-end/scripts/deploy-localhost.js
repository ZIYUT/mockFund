const { ethers } = require("hardhat");

async function main() {
  console.log("开始在本地网络部署合约...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", (await deployer.provider.getBalance(deployer.address)).toString());

  // 1. 部署 MockUSDC
  console.log("\n部署 MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy(deployer.address);
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("MockUSDC 部署地址:", mockUSDCAddress);

  // 2. 部署 MockTokensFactory
  console.log("\n部署 MockTokensFactory...");
  const MockTokensFactory = await ethers.getContractFactory("MockTokensFactory");
  const mockTokensFactory = await MockTokensFactory.deploy();
  await mockTokensFactory.waitForDeployment();
  const mockTokensFactoryAddress = await mockTokensFactory.getAddress();
  console.log("MockTokensFactory 部署地址:", mockTokensFactoryAddress);

  // 3. 部署所有模拟代币
  console.log("\n部署模拟代币...");
  const tokens = [
    { name: "Wrapped Bitcoin", symbol: "WBTC", decimals: 8 },
    { name: "Wrapped Ethereum", symbol: "WETH", decimals: 18 },
    { name: "Chainlink Token", symbol: "LINK", decimals: 18 },
    { name: "Dai Stablecoin", symbol: "DAI", decimals: 18 }
  ];

  const tokenAddresses = {};
  for (const token of tokens) {
    console.log(`部署 ${token.symbol}...`);
    await mockTokensFactory.createToken(token.name, token.symbol, token.decimals);
    const tokenAddress = await mockTokensFactory.getTokenAddress(token.symbol);
    tokenAddresses[token.symbol] = tokenAddress;
    console.log(`${token.symbol} 部署地址:`, tokenAddress);
  }

  // 4. 部署 ChainlinkPriceOracle (本地测试版本)
  console.log("\n部署 ChainlinkPriceOracle...");
  const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
  const chainlinkPriceOracle = await ChainlinkPriceOracle.deploy();
  await chainlinkPriceOracle.waitForDeployment();
  const chainlinkPriceOracleAddress = await chainlinkPriceOracle.getAddress();
  console.log("ChainlinkPriceOracle 部署地址:", chainlinkPriceOracleAddress);

  // 5. 部署 UniswapIntegration
  console.log("\n部署 UniswapIntegration...");
  const UniswapIntegration = await ethers.getContractFactory("UniswapIntegration");
  const uniswapIntegration = await UniswapIntegration.deploy(
    chainlinkPriceOracleAddress,
    mockTokensFactoryAddress
  );
  await uniswapIntegration.waitForDeployment();
  const uniswapIntegrationAddress = await uniswapIntegration.getAddress();
  console.log("UniswapIntegration 部署地址:", uniswapIntegrationAddress);

  // 6. 部署 MockFund
  console.log("\n部署 MockFund...");
  const MockFund = await ethers.getContractFactory("MockFund");
  const mockFund = await MockFund.deploy(
    chainlinkPriceOracleAddress,
    uniswapIntegrationAddress
  );
  await mockFund.waitForDeployment();
  const mockFundAddress = await mockFund.getAddress();
  console.log("MockFund 部署地址:", mockFundAddress);

  console.log("\n=== 部署完成 ===");
  console.log("所有合约已成功部署到本地网络!");
  
  // 保存部署信息
  const deploymentInfo = {
    network: "localhost",
    mockUSDC: mockUSDCAddress,
    mockTokensFactory: mockTokensFactoryAddress,
    tokens: tokenAddresses,
    chainlinkPriceOracle: chainlinkPriceOracleAddress,
    uniswapIntegration: uniswapIntegrationAddress,
    mockFund: mockFundAddress,
    deployer: deployer.address
  };
  
  console.log("\n=== 部署信息 ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });