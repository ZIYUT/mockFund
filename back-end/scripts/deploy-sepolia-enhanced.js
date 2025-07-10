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

    // 4. 部署 PriceOracle
    console.log("\n4️⃣ 部署 PriceOracle...");
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy(deployer.address);
    await priceOracle.waitForDeployment();
    const priceOracleAddress = await priceOracle.getAddress();
    deployedContracts.PriceOracle = priceOracleAddress;
    console.log("✅ PriceOracle 部署成功:", priceOracleAddress);

    // 5. 部署 MockUniswapIntegration
    console.log("\n5️⃣ 部署 MockUniswapIntegration...");
    const MockUniswapIntegration = await ethers.getContractFactory("MockUniswapIntegration");
    const mockUniswapIntegration = await MockUniswapIntegration.deploy(
      deployer.address,
      priceOracleAddress
    );
    await mockUniswapIntegration.waitForDeployment();
    const mockUniswapIntegrationAddress = await mockUniswapIntegration.getAddress();
    deployedContracts.MockUniswapIntegration = mockUniswapIntegrationAddress;
    console.log("✅ MockUniswapIntegration 部署成功:", mockUniswapIntegrationAddress);

    // 6. 部署 MockFund
    console.log("\n6️⃣ 部署 MockFund...");
    const MockFund = await ethers.getContractFactory("MockFund");
    const mockFund = await MockFund.deploy(
      "Mock Fund Shares",  // Share token name
      "MFC",              // Share token symbol (改为MFC)
      deployer.address,    // Initial owner
      100,                 // Management fee rate 1%
      priceOracleAddress,  // Price oracle address
      mockUniswapIntegrationAddress // MockUniswap integration address
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
    await mockWETH.mint(mockUniswapIntegrationAddress, largeAmount);
    await mockWBTC.mint(mockUniswapIntegrationAddress, ethers.parseUnits("10000", 8)); // 10K WBTC
    await mockLINK.mint(mockUniswapIntegrationAddress, largeAmount);
    await mockDAI.mint(mockUniswapIntegrationAddress, largeAmount);
    
    // 为USDC铸造代币给Uniswap集成
    const usdcAmount = ethers.parseUnits("1000000", 6); // 1M USDC
    await mockUSDC.mint(mockUniswapIntegrationAddress, usdcAmount);
    
    // 设置模拟价格（基于当前市场价格）
    // WETH: ~$3000, WBTC: ~$45000, LINK: ~$15, DAI: ~$1
    await mockUniswapIntegration.setExchangeRate(usdcAddress, wethAddress, 3000000000); // $3000
    await mockUniswapIntegration.setExchangeRate(usdcAddress, wbtcAddress, 45000000000); // $45000
    await mockUniswapIntegration.setExchangeRate(usdcAddress, linkAddress, 15000000); // $15
    await mockUniswapIntegration.setExchangeRate(usdcAddress, daiAddress, 1000000); // $1
    
    console.log("✅ MockUniswapIntegration 预存和配置完成");

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