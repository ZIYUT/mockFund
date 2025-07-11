const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 开始部署到 Sepolia 测试网 (增强版)...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  console.log("部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 检查环境变量
  if (!process.env.PRIVATE_KEY) {
    throw new Error("请在 .env 文件中设置 PRIVATE_KEY");
  }
  if (!process.env.SEPOLIA_RPC_URL) {
    throw new Error("请在 .env 文件中设置 SEPOLIA_RPC_URL");
  }

  const deployedContracts = {};

  try {
    // 1. 部署 MockUSDC
    console.log("\n1️⃣ 部署 MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy(deployer.address);
    await mockUSDC.waitForDeployment();
    const usdcAddress = await mockUSDC.getAddress();
    deployedContracts.MockUSDC = usdcAddress;
    console.log("✅ MockUSDC 部署成功:", usdcAddress);

    // 2. 部署 MockTokensFactory
    console.log("\n2️⃣ 部署 MockTokensFactory...");
    const MockTokensFactory = await ethers.getContractFactory("MockTokensFactory");
    const mockTokensFactory = await MockTokensFactory.deploy(deployer.address);
    await mockTokensFactory.waitForDeployment();
    const factoryAddress = await mockTokensFactory.getAddress();
    deployedContracts.MockTokensFactory = factoryAddress;
    console.log("✅ MockTokensFactory 部署成功:", factoryAddress);

    // 3. 部署所有代币
    console.log("\n3️⃣ 部署所有代币...");
    const deployTokensTx = await mockTokensFactory.deployAllTokens();
    await deployTokensTx.wait();
    
    const wbtcAddress = await mockTokensFactory.wbtc();
    const wethAddress = await mockTokensFactory.weth();
    const linkAddress = await mockTokensFactory.link();
    const daiAddress = await mockTokensFactory.dai();
    
    deployedContracts.MockWBTC = wbtcAddress;
    deployedContracts.MockWETH = wethAddress;
    deployedContracts.MockLINK = linkAddress;
    deployedContracts.MockDAI = daiAddress;
    
    console.log("✅ 所有代币部署成功:");
    console.log("   WBTC:", wbtcAddress);
    console.log("   WETH:", wethAddress);
    console.log("   LINK:", linkAddress);
    console.log("   DAI:", daiAddress);

    // 4. 部署 ChainlinkPriceOracle
    console.log("\n4️⃣ 部署 ChainlinkPriceOracle...");
    const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
    const chainlinkPriceOracle = await ChainlinkPriceOracle.deploy(deployer.address);
    await chainlinkPriceOracle.waitForDeployment();
    const chainlinkPriceOracleAddress = await chainlinkPriceOracle.getAddress();
    deployedContracts.ChainlinkPriceOracle = chainlinkPriceOracleAddress;
    console.log("✅ ChainlinkPriceOracle 部署成功:", chainlinkPriceOracleAddress);

    // 5. 部署 UniswapIntegration
    console.log("\n5️⃣ 部署 UniswapIntegration...");
    const UniswapIntegration = await ethers.getContractFactory("UniswapIntegration");
    const uniswapIntegration = await UniswapIntegration.deploy(
      deployer.address,
      chainlinkPriceOracleAddress
    );
    await uniswapIntegration.waitForDeployment();
    const uniswapIntegrationAddress = await uniswapIntegration.getAddress();
    deployedContracts.UniswapIntegration = uniswapIntegrationAddress;
    console.log("✅ UniswapIntegration 部署成功:", uniswapIntegrationAddress);

    // 6. 部署 MockFund
    console.log("\n6️⃣ 部署 MockFund...");
    const MockFund = await ethers.getContractFactory("MockFund");
    const mockFund = await MockFund.deploy(
      "Mock Fund Shares",  // Share token name
      "MFC",              // Share token symbol (改为MFC)
      deployer.address,    // Initial owner
      100,                 // Management fee rate 1%
      chainlinkPriceOracleAddress,  // ChainlinkPriceOracle address
      uniswapIntegrationAddress // UniswapIntegration address
    );
    await mockFund.waitForDeployment();
    const mockFundAddress = await mockFund.getAddress();
    deployedContracts.MockFund = mockFundAddress;
    console.log("✅ MockFund 部署成功:", mockFundAddress);

    // 获取份额代币地址
    const shareTokenAddress = await mockFund.shareToken();
    deployedContracts.FundShareToken = shareTokenAddress;
    console.log("✅ FundShareToken 地址:", shareTokenAddress);

    // 7. 配置基金支持的代币
    console.log("\n7️⃣ 配置基金投资组合...");
    
    // 添加支持的代币（各占12.5%，总共50%）
    const tokens = [
      { address: wbtcAddress, allocation: 1250, name: "WBTC" },
      { address: wethAddress, allocation: 1250, name: "WETH" },
      { address: linkAddress, allocation: 1250, name: "LINK" },
      { address: daiAddress, allocation: 1250, name: "DAI" }
    ];
    
    for (const token of tokens) {
      const tx = await mockFund.addSupportedToken(token.address, token.allocation);
      await tx.wait();
      console.log(`✅ 添加 ${token.name}: ${token.allocation/100}% 分配`);
    }

    // 8. 设置 USDC 代币地址
    console.log("\n8️⃣ 设置 USDC 代币地址...");
    const setUSDCTx = await mockFund.setUSDCToken(usdcAddress);
    await setUSDCTx.wait();
    console.log("✅ USDC 代币地址设置成功:", usdcAddress);

    // 9. 为 MockUniswapIntegration 预存代币并设置价格
    console.log("\n9️⃣ 为 MockUniswapIntegration 预存代币...");
    
    // 获取代币合约实例
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const MockLINK = await ethers.getContractFactory("MockLINK");
    const MockDAI = await ethers.getContractFactory("MockDAI");
    
    const mockWETH = MockWETH.attach(wethAddress);
    const mockWBTC = MockWBTC.attach(wbtcAddress);
    const mockLINK = MockLINK.attach(linkAddress);
    const mockDAI = MockDAI.attach(daiAddress);

    // 预存大量代币用于交换
    const largeAmount = ethers.parseUnits("1000000", 18); // 1M tokens
    await mockWETH.mint(uniswapIntegrationAddress, largeAmount);
    await mockWBTC.mint(uniswapIntegrationAddress, ethers.parseUnits("10000", 8)); // 10K WBTC
    await mockLINK.mint(uniswapIntegrationAddress, largeAmount);
    await mockDAI.mint(uniswapIntegrationAddress, largeAmount);
    
    // 为USDC铸造代币给Uniswap集成
    const usdcAmount = ethers.parseUnits("1000000", 6); // 1M USDC
    await mockUSDC.mint(uniswapIntegrationAddress, usdcAmount);
    
    // 配置ChainlinkPriceOracle的价格预言机
    console.log("\n🔗 配置Chainlink价格预言机...");
    
    // Sepolia测试网Chainlink价格预言机地址
    const sepoliaFeeds = {
      ETH: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD
      BTC: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", // BTC/USD
      LINK: "0xc59E3633BAAC79493d908e63626716e204A45EdF", // LINK/USD
      USDC: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E", // USDC/USD
      DAI: "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19"  // DAI/USD
    };
    
    // 为各个代币设置价格预言机
    await chainlinkPriceOracle.setPriceFeed(wethAddress, sepoliaFeeds.ETH, "WETH");
    await chainlinkPriceOracle.setPriceFeed(wbtcAddress, sepoliaFeeds.BTC, "WBTC");
    await chainlinkPriceOracle.setPriceFeed(linkAddress, sepoliaFeeds.LINK, "LINK");
    await chainlinkPriceOracle.setPriceFeed(daiAddress, sepoliaFeeds.DAI, "DAI");
    await chainlinkPriceOracle.setPriceFeed(usdcAddress, sepoliaFeeds.USDC, "USDC");
    
    console.log("✅ Chainlink价格预言机配置完成");
    console.log("✅ UniswapIntegration 预存完成，将使用Chainlink获取真实价格");

    // 10. 初始化基金（按照当时币价）
    console.log("\n🔟 初始化基金...");
    
    // 给部署者铸造 100万 USDC
    const initialAmount = ethers.parseUnits("1000000", 6); // 100万 USDC
    await mockUSDC.mint(deployer.address, initialAmount);
    console.log("✅ 铸造 100万 USDC 给部署者");
    
    // 授权基金合约使用 USDC
    await mockUSDC.approve(mockFundAddress, initialAmount);
    console.log("✅ 授权 USDC 给基金合约");
    
    // 调用初始化函数（会按照当时币价购买代币）
    const initTx = await mockFund.initializeFund(initialAmount);
    await initTx.wait();
    console.log("✅ 基金初始化完成");

    // 11. 验证初始化结果
    console.log("\n📊 验证初始化结果...");
    
    const fundStats = await mockFund.getFundStats();
    console.log("基金总供应量:", ethers.formatEther(fundStats[0]));
    console.log("初始供应量:", ethers.formatEther(fundStats[1]));
    console.log("是否已初始化:", fundStats[2]);
    
    const nav = await mockFund.calculateNAV();
    const mfcValue = await mockFund.calculateMFCValue();
    console.log("基金净值 (NAV):", ethers.formatUnits(nav, 6), "USDC");
    console.log("单个MFC价值:", ethers.formatUnits(mfcValue, 6), "USDC");
    
    // 测试投资预览
    const testInvestment = ethers.parseUnits("1000", 6); // 1000 USDC
    const previewMFC = await mockFund.getInvestmentPreview(testInvestment);
    console.log("投资 1000 USDC 可获得:", ethers.formatEther(previewMFC), "MFC");

    // 12. 保存部署信息
    console.log("\n📝 保存部署信息...");
    
    const deploymentInfo = {
      network: "sepolia",
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployedContracts,
      fundInfo: {
        initialNAV: ethers.formatUnits(nav, 6),
        initialMFCValue: ethers.formatUnits(mfcValue, 6),
        totalSupply: ethers.formatEther(fundStats[0]),
        isInitialized: fundStats[2]
      },
      note: "增强版部署，按照当时币价初始化基金"
    };

    // 保存到 deployments 目录
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, "sepolia-enhanced-deployment.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("✅ 部署信息已保存到:", deploymentFile);

    // 13. 输出部署结果
    console.log("\n🎉 部署完成！");
    console.log("=== 合约地址 ===");
    Object.entries(deployedContracts).forEach(([name, address]) => {
      console.log(`${name}: ${address}`);
    });

    console.log("\n=== 基金信息 ===");
    console.log("基金净值 (NAV):", ethers.formatUnits(nav, 6), "USDC");
    console.log("单个MFC价值:", ethers.formatUnits(mfcValue, 6), "USDC");
    console.log("总MFC供应量:", ethers.formatEther(fundStats[0]));

    console.log("\n=== 投资示例 ===");
    console.log("投资 1000 USDC 可获得:", ethers.formatEther(previewMFC), "MFC");
    console.log("投资 10000 USDC 可获得:", ethers.formatEther(await mockFund.getInvestmentPreview(ethers.parseUnits("10000", 6))), "MFC");

    console.log("\n=== 下一步 ===");
    console.log("1. 运行 'npx hardhat verify --network sepolia <合约地址>' 验证合约");
    console.log("2. 更新前端配置文件中的合约地址");
    console.log("3. 测试基金投资和赎回功能");

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