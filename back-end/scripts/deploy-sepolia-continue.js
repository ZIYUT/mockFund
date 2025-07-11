const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 继续部署到 Sepolia 测试网 (从第9步开始)...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  console.log("部署者余额:", (await deployer.provider.getBalance(deployer.address)).toString());

  // 使用已部署的合约地址
  const deployedContracts = {
    MockUSDC: "0x62320274bc84147Fd245a587B32F3f56af823eAe",
    MockTokensFactory: "0x18C1412DEbC63a0Cdd4b9AECDF34891DA17f873F",
    WBTC: "0x17489477A0475DE25ce7E7d398b18A986458E04c",
    WETH: "0x21AC6C404AEA60dc657d7BC341ff8a72Cc0755B9",
    LINK: "0x07c18DA7bc11203ac8Af1cAC657bed46eE7Fa5CA",
    DAI: "0xB4FDAdae3d713b3dd754e3Bb5F62Ef5E89fb6b74",
    ChainlinkPriceOracle: "0x07203f1fB0F8314ffFc43b5b574815D1d0501e9E",
    UniswapIntegration: "0x08f6628a0aCC60Fb0B1FE3B3136d042140831F8a",
    MockFund: "0x872318dd7b3100b3909DA08aA68FC3801F460437",
    FundShareToken: "0xe6Fab3366416C8deF81e4aD6Ac02a577678Ca73d"
  };

  console.log("✅ 使用已部署的合约地址");

  try {
    // 获取合约实例
    const mockUSDC = await ethers.getContractAt("MockUSDC", deployedContracts.MockUSDC);
    const mockFund = await ethers.getContractAt("MockFund", deployedContracts.MockFund);
    const chainlinkPriceOracle = await ethers.getContractAt("ChainlinkPriceOracle", deployedContracts.ChainlinkPriceOracle);
    const uniswapIntegration = await ethers.getContractAt("UniswapIntegration", deployedContracts.UniswapIntegration);

    // 9. 为 UniswapIntegration 预存代币（减少数量）
    console.log("\n9️⃣ 为 UniswapIntegration 预存代币...");
    
    // 获取代币合约实例
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const MockLINK = await ethers.getContractFactory("MockLINK");
    const MockDAI = await ethers.getContractFactory("MockDAI");
    
    const mockWETH = MockWETH.attach(deployedContracts.WETH);
    const mockWBTC = MockWBTC.attach(deployedContracts.WBTC);
    const mockLINK = MockLINK.attach(deployedContracts.LINK);
    const mockDAI = MockDAI.attach(deployedContracts.DAI);

    // 预存较少的代币用于交换（避免"Amount too large"错误）
    const mediumAmount = ethers.parseUnits("10000", 18); // 10K tokens
    await mockWETH.mint(deployedContracts.UniswapIntegration, mediumAmount);
    console.log("✅ WETH mint 完成");
    
    await mockWBTC.mint(deployedContracts.UniswapIntegration, ethers.parseUnits("100", 8)); // 100 WBTC
    console.log("✅ WBTC mint 完成");
    
    await mockLINK.mint(deployedContracts.UniswapIntegration, mediumAmount);
    console.log("✅ LINK mint 完成");
    
    await mockDAI.mint(deployedContracts.UniswapIntegration, mediumAmount);
    console.log("✅ DAI mint 完成");
    
    // 为USDC铸造代币给Uniswap集成
    const usdcAmount = ethers.parseUnits("10000", 6); // 10K USDC
    await mockUSDC.mint(deployedContracts.UniswapIntegration, usdcAmount);
    console.log("✅ USDC mint 完成");
    
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
    await chainlinkPriceOracle.setPriceFeed(deployedContracts.WETH, sepoliaFeeds.ETH, "WETH");
    console.log("✅ WETH 价格预言机设置完成");
    
    await chainlinkPriceOracle.setPriceFeed(deployedContracts.WBTC, sepoliaFeeds.BTC, "WBTC");
    console.log("✅ WBTC 价格预言机设置完成");
    
    await chainlinkPriceOracle.setPriceFeed(deployedContracts.LINK, sepoliaFeeds.LINK, "LINK");
    console.log("✅ LINK 价格预言机设置完成");
    
    await chainlinkPriceOracle.setPriceFeed(deployedContracts.DAI, sepoliaFeeds.DAI, "DAI");
    console.log("✅ DAI 价格预言机设置完成");
    
    await chainlinkPriceOracle.setPriceFeed(deployedContracts.MockUSDC, sepoliaFeeds.USDC, "USDC");
    console.log("✅ USDC 价格预言机设置完成");
    
    console.log("✅ Chainlink价格预言机配置完成");
    console.log("✅ UniswapIntegration 预存完成，将使用Chainlink获取真实价格");

    // 10. 初始化基金（按照当时币价）
    console.log("\n🔟 初始化基金...");
    
    // 给部署者铸造 100万 USDC（initializeFund要求的固定金额）
    // 由于mint函数限制每次最多10万USDC，需要分10次铸造
    const initialAmount = ethers.parseUnits("1000000", 6); // 100万 USDC
    const maxMintAmount = ethers.parseUnits("100000", 6); // 10万 USDC per mint
    
    console.log("开始分批铸造 100万 USDC...");
    for (let i = 0; i < 10; i++) {
      await mockUSDC.mint(deployer.address, maxMintAmount);
      console.log(`✅ 第${i+1}次铸造 10万 USDC 完成`);
    }
    console.log("✅ 总共铸造 100万 USDC 给部署者完成");
    
    // 授权基金合约使用 USDC
    await mockUSDC.approve(deployedContracts.MockFund, initialAmount);
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
      note: "继续部署完成，使用较少的代币数量避免gas问题"
    };

    // 保存到 deployments 目录
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, "sepolia-continue-deployment.json");
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