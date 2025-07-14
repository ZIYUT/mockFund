const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 开始部署支持permit功能的合约到Sepolia测试网...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  
  // 检查部署者余额
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("部署者余额:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    throw new Error("部署者余额不足，请确保有足够的ETH支付gas费用");
  }

  const deploymentData = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    permitVersion: true,
    contracts: {},
    tokens: {},
    chainlinkFeeds: {
      "ETH": "0x694AA1769357215DE4FAC081bf1f309aDC325306",
      "BTC": "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
      "LINK": "0xc59E3633BAAC79493d908e63626716e204A45EdF",
      "USDC": "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"
    },
    configuration: {
      managementFeeRate: 100,
      supportedTokens: [
        { token: "", allocation: 1250 },
        { token: "", allocation: 1250 },
        { token: "", allocation: 1250 },
        { token: "", allocation: 1250 }
      ]
    }
  };

  try {
    // 1. 部署支持permit的MockUSDC
    console.log("📝 1. 部署支持permit的MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy(deployer.address);
    await mockUSDC.waitForDeployment();
    const mockUSDCAddress = await mockUSDC.getAddress();
    console.log("✅ MockUSDC已部署:", mockUSDCAddress);
    deploymentData.contracts.MockUSDC = mockUSDCAddress;
    deploymentData.tokens.USDC = mockUSDCAddress;

    // 2. 部署ChainlinkPriceOracle
    console.log("📝 2. 部署ChainlinkPriceOracle...");
    const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
    const priceOracle = await ChainlinkPriceOracle.deploy(deployer.address);
    await priceOracle.waitForDeployment();
    const priceOracleAddress = await priceOracle.getAddress();
    console.log("✅ ChainlinkPriceOracle已部署:", priceOracleAddress);
    deploymentData.contracts.ChainlinkPriceOracle = priceOracleAddress;

    // 3. 部署UniswapIntegration
    console.log("📝 3. 部署UniswapIntegration...");
    const UniswapIntegration = await ethers.getContractFactory("contracts/UniswapIntegration.sol:UniswapIntegration");
    const uniswapIntegration = await UniswapIntegration.deploy(mockUSDCAddress, priceOracleAddress);
    await uniswapIntegration.waitForDeployment();
    const uniswapIntegrationAddress = await uniswapIntegration.getAddress();
    console.log("✅ UniswapIntegration已部署:", uniswapIntegrationAddress);
    deploymentData.contracts.UniswapIntegration = uniswapIntegrationAddress;

    // 4. 部署MockFund (修正构造参数)
    console.log("📝 4. 部署MockFund...");
    const MockFund = await ethers.getContractFactory("contracts/MockFund.sol:MockFund");
    const mockFund = await MockFund.deploy(
      "MockFund Coin", // _shareTokenName
      "MFC", // _shareTokenSymbol
      deployer.address, // _initialOwner
      deploymentData.configuration.managementFeeRate, // _managementFeeRate
      priceOracleAddress, // _priceOracle
      uniswapIntegrationAddress // _uniswapIntegration
    );
    await mockFund.waitForDeployment();
    const mockFundAddress = await mockFund.getAddress();
    console.log("✅ MockFund已部署:", mockFundAddress);
    deploymentData.contracts.MockFund = mockFundAddress;

    // 5. 获取FundShareToken地址 (由MockFund构造函数创建)
    console.log("📝 5. 获取FundShareToken地址...");
    const fundShareTokenAddress = await mockFund.shareToken();
    console.log("✅ FundShareToken地址:", fundShareTokenAddress);
    deploymentData.contracts.FundShareToken = fundShareTokenAddress;

    // 6. 设置USDC token
    console.log("📝 6. 设置USDC token...");
    await mockUSDC.setToken("USDC");
    console.log("✅ USDC token已设置");

    // 7. 部署MockTokens
    console.log("📝 7. 部署MockTokens...");
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const MockLINK = await ethers.getContractFactory("MockLINK");
    const MockDAI = await ethers.getContractFactory("MockDAI");

    const mockWETH = await MockWETH.deploy();
    const mockWBTC = await MockWBTC.deploy();
    const mockLINK = await MockLINK.deploy();
    const mockDAI = await MockDAI.deploy();

    await mockWETH.waitForDeployment();
    await mockWBTC.waitForDeployment();
    await mockLINK.waitForDeployment();
    await mockDAI.waitForDeployment();

    const mockWETHAddress = await mockWETH.getAddress();
    const mockWBTCAddress = await mockWBTC.getAddress();
    const mockLINKAddress = await mockLINK.getAddress();
    const mockDAIAddress = await mockDAI.getAddress();

    console.log("✅ MockTokens已部署:");
    console.log("  - MockWETH:", mockWETHAddress);
    console.log("  - MockWBTC:", mockWBTCAddress);
    console.log("  - MockLINK:", mockLINKAddress);
    console.log("  - MockDAI:", mockDAIAddress);

    deploymentData.tokens.WETH = mockWETHAddress;
    deploymentData.tokens.WBTC = mockWBTCAddress;
    deploymentData.tokens.LINK = mockLINKAddress;
    deploymentData.tokens.DAI = mockDAIAddress;

    // 8. 添加支持的代币到MockFund
    console.log("📝 8. 添加支持的代币...");
    await mockFund.addSupportedToken(mockWETHAddress, 1250);
    await mockFund.addSupportedToken(mockWBTCAddress, 1250);
    await mockFund.addSupportedToken(mockLINKAddress, 1250);
    await mockFund.addSupportedToken(mockDAIAddress, 1250);
    console.log("✅ 支持的代币已添加");

    // 更新配置中的代币地址
    deploymentData.configuration.supportedTokens[0].token = mockWETHAddress;
    deploymentData.configuration.supportedTokens[1].token = mockWBTCAddress;
    deploymentData.configuration.supportedTokens[2].token = mockLINKAddress;
    deploymentData.configuration.supportedTokens[3].token = mockDAIAddress;

    // 9. 设置UniswapIntegration
    console.log("📝 9. 设置UniswapIntegration...");
    await uniswapIntegration.setFixedRate(mockWETHAddress, ethers.parseUnits("3000", 6)); // $3000
    await uniswapIntegration.setFixedRate(mockWBTCAddress, ethers.parseUnits("118000", 6)); // $118,000
    await uniswapIntegration.setFixedRate(mockLINKAddress, ethers.parseUnits("15", 6)); // $15
    await uniswapIntegration.setFixedRate(mockDAIAddress, ethers.parseUnits("1", 6)); // $1
    console.log("✅ UniswapIntegration固定汇率已设置");

    // 显示设置的固定汇率
    const wethRate = await uniswapIntegration.getFixedRate(mockWETHAddress);
    const wbtcRate = await uniswapIntegration.getFixedRate(mockWBTCAddress);
    const linkRate = await uniswapIntegration.getFixedRate(mockLINKAddress);
    const daiRate = await uniswapIntegration.getFixedRate(mockDAIAddress);

    console.log("FixedRate for", mockWETHAddress + ":", wethRate.toString());
    console.log("FixedRate for", mockWBTCAddress + ":", wbtcRate.toString());
    console.log("FixedRate for", mockLINKAddress + ":", linkRate.toString());
    console.log("FixedRate for", mockDAIAddress + ":", daiRate.toString());

    // 10. 添加流动性
    console.log("📝 10. 添加流动性...");
    const liquidityAmount = ethers.parseUnits("1000000", 6); // 1M USDC worth of each token
    
    // 为UniswapIntegration添加代币余额
    await mockWETH.mint(uniswapIntegrationAddress, ethers.parseEther("333")); // 333 WETH = ~1M USDC
    await mockWBTC.mint(uniswapIntegrationAddress, ethers.parseUnits("8.5", 8)); // 8.5 WBTC = ~1M USDC
    await mockLINK.mint(uniswapIntegrationAddress, ethers.parseEther("66667")); // 66667 LINK = ~1M USDC
    await mockDAI.mint(uniswapIntegrationAddress, ethers.parseEther("1000000")); // 1M DAI = ~1M USDC
    await mockUSDC.mint(uniswapIntegrationAddress, ethers.parseUnits("1000000", 6)); // 1M USDC

    console.log("✅ 流动性已添加");

    // 11. 初始化基金
    console.log("📝 11. 初始化基金...");
    await mockFund.initializeFund(ethers.parseUnits("1000000", 6)); // 1M USDC
    console.log("✅ 基金已初始化");

    // 12. 保存部署信息
    console.log("📝 12. 保存部署信息...");
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const permitDeploymentsDir = path.join(deploymentsDir, "permit-version");
    
    // 创建permit-version目录
    if (!fs.existsSync(permitDeploymentsDir)) {
      fs.mkdirSync(permitDeploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(permitDeploymentsDir, "sepolia-deployment.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log("✅ 部署信息已保存到:", deploymentFile);

    // 13. 显示部署总结
    console.log("\n🎉 部署完成！支持permit功能的合约已成功部署到Sepolia测试网");
    console.log("\n📋 部署总结:");
    console.log("MockUSDC (支持permit):", mockUSDCAddress);
    console.log("ChainlinkPriceOracle:", priceOracleAddress);
    console.log("UniswapIntegration:", uniswapIntegrationAddress);
    console.log("MockFund:", mockFundAddress);
    console.log("FundShareToken:", fundShareTokenAddress);
    console.log("\n代币地址:");
    console.log("WETH:", mockWETHAddress);
    console.log("WBTC:", mockWBTCAddress);
    console.log("LINK:", mockLINKAddress);
    console.log("DAI:", mockDAIAddress);
    console.log("\n部署信息已保存到: deployments/permit-version/sepolia-deployment.json");

  } catch (error) {
    console.error("❌ 部署失败:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 