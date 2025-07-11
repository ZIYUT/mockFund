const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 继续完成 Sepolia 部署...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  console.log("部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 使用已部署的合约地址
  const deployedContracts = {
    MockUSDC: "0xBad2c36Ba9171CF6A4c77CEeCa78e429FA0945C3",
    MockTokensFactory: "0x8A2Cc3fAae8bb6A345D28f4ee31F38ed617436f1",
    MockWBTC: "0xeFD15b2eb00151c87F2a2859F7aE7a477B652248",
    MockWETH: "0xC6e076875A4B0f3adf42Ff5a673F0D0e0FF55CB9",
    MockLINK: "0xB7115B4336Ba6a3C4eA8fFF393c6dFdDE8072C5b",
    MockDAI: "0xcB643610984Bc8514e68F05CC4a54EEB7d0D5E7a",
    ChainlinkPriceOracle: "0xA173Ec0A23bC24E1FfB43b9198212d58aBF09cf5",
    UniswapIntegration: "0x17c3fF4583fA49714bB231b58E18Fb1769874708",
    MockFund: "0xF4006D8318385CB28A4dd511FC3D20D24a7Cf264",
    FundShareToken: "0x51c311063b914FBB94d6fb620ABe7Af01ff561AA"
  };

  try {
    // 获取合约实例
    const mockFund = await ethers.getContractAt("MockFund", deployedContracts.MockFund);
    const mockUSDC = await ethers.getContractAt("MockUSDC", deployedContracts.MockUSDC);
    const uniswapIntegration = await ethers.getContractAt("UniswapIntegration", deployedContracts.UniswapIntegration);
    const chainlinkPriceOracle = await ethers.getContractAt("ChainlinkPriceOracle", deployedContracts.ChainlinkPriceOracle);

    console.log("\n✅ 使用已部署的合约地址");

    // 9. 为 MockUniswapIntegration 预存代币（使用较小的数量）
    console.log("\n9️⃣ 为 MockUniswapIntegration 预存代币...");
    
    // 获取代币合约实例
    const mockWETH = await ethers.getContractAt("MockWETH", deployedContracts.MockWETH);
    const mockWBTC = await ethers.getContractAt("MockWBTC", deployedContracts.MockWBTC);
    const mockLINK = await ethers.getContractAt("MockLINK", deployedContracts.MockLINK);
    const mockDAI = await ethers.getContractAt("MockDAI", deployedContracts.MockDAI);

    // 预存较小数量的代币用于交换
    const mediumAmount = ethers.parseUnits("10000", 18); // 1万代币
    const smallBTCAmount = ethers.parseUnits("100", 8); // 100 WBTC
    const usdcAmount = ethers.parseUnits("100000", 6); // 10万 USDC
    
    try {
      await mockWETH.mint(deployedContracts.UniswapIntegration, mediumAmount);
      console.log("✅ 为UniswapIntegration铸造WETH");
    } catch (error) {
      console.log("⚠️ WETH铸造失败，可能已存在:", error.message);
    }
    
    try {
      await mockWBTC.mint(deployedContracts.UniswapIntegration, smallBTCAmount);
      console.log("✅ 为UniswapIntegration铸造WBTC");
    } catch (error) {
      console.log("⚠️ WBTC铸造失败，可能已存在:", error.message);
    }
    
    try {
      await mockLINK.mint(deployedContracts.UniswapIntegration, mediumAmount);
      console.log("✅ 为UniswapIntegration铸造LINK");
    } catch (error) {
      console.log("⚠️ LINK铸造失败，可能已存在:", error.message);
    }
    
    try {
      await mockDAI.mint(deployedContracts.UniswapIntegration, mediumAmount);
      console.log("✅ 为UniswapIntegration铸造DAI");
    } catch (error) {
      console.log("⚠️ DAI铸造失败，可能已存在:", error.message);
    }
    
    try {
      await mockUSDC.mint(deployedContracts.UniswapIntegration, usdcAmount);
      console.log("✅ 为UniswapIntegration铸造USDC");
    } catch (error) {
      console.log("⚠️ USDC铸造失败，可能已存在:", error.message);
    }
    
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
    try {
      await chainlinkPriceOracle.setPriceFeed(deployedContracts.MockWETH, sepoliaFeeds.ETH, "WETH");
      console.log("✅ 设置WETH价格预言机");
    } catch (error) {
      console.log("⚠️ WETH价格预言机设置失败:", error.message);
    }
    
    try {
      await chainlinkPriceOracle.setPriceFeed(deployedContracts.MockWBTC, sepoliaFeeds.BTC, "WBTC");
      console.log("✅ 设置WBTC价格预言机");
    } catch (error) {
      console.log("⚠️ WBTC价格预言机设置失败:", error.message);
    }
    
    try {
      await chainlinkPriceOracle.setPriceFeed(deployedContracts.MockLINK, sepoliaFeeds.LINK, "LINK");
      console.log("✅ 设置LINK价格预言机");
    } catch (error) {
      console.log("⚠️ LINK价格预言机设置失败:", error.message);
    }
    
    try {
      await chainlinkPriceOracle.setPriceFeed(deployedContracts.MockDAI, sepoliaFeeds.DAI, "DAI");
      console.log("✅ 设置DAI价格预言机");
    } catch (error) {
      console.log("⚠️ DAI价格预言机设置失败:", error.message);
    }
    
    try {
      await chainlinkPriceOracle.setPriceFeed(deployedContracts.MockUSDC, sepoliaFeeds.USDC, "USDC");
      console.log("✅ 设置USDC价格预言机");
    } catch (error) {
      console.log("⚠️ USDC价格预言机设置失败:", error.message);
    }
    
    console.log("✅ Chainlink价格预言机配置完成");

    // 10. 初始化基金
    console.log("\n🔟 初始化基金...");
    
    // 检查基金是否已初始化
    const isInitialized = await mockFund.isInitialized();
    if (isInitialized) {
      console.log("✅ 基金已经初始化");
    } else {
      // 给部署者铸造 100万 USDC
      const initialAmount = ethers.parseUnits("1000000", 6); // 100万 USDC
      
      // 检查部署者的USDC余额
      const deployerUSDCBalance = await mockUSDC.balanceOf(deployer.address);
      console.log("部署者当前USDC余额:", ethers.formatUnits(deployerUSDCBalance, 6));
      
      if (deployerUSDCBalance < initialAmount) {
        const mintAmount = initialAmount - deployerUSDCBalance;
        await mockUSDC.mint(deployer.address, mintAmount);
        console.log("✅ 铸造", ethers.formatUnits(mintAmount, 6), "USDC 给部署者");
      }
      
      // 授权基金合约使用 USDC
      await mockUSDC.approve(deployedContracts.MockFund, initialAmount);
      console.log("✅ 授权 USDC 给基金合约");
      
      // 调用初始化函数
      const initTx = await mockFund.initializeFund(initialAmount);
      await initTx.wait();
      console.log("✅ 基金初始化完成");
    }

    // 保存部署地址
    const deploymentsPath = path.join(__dirname, "..", "deployments", "sepolia.json");
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployedContracts, null, 2));
    console.log("\n📄 部署地址已保存到:", deploymentsPath);

    // 11. 验证初始化结果
    console.log("\n📊 验证初始化结果...");
    
    const fundStats = await mockFund.getFundStats();
    console.log("基金总供应量:", ethers.formatEther(fundStats[0]));
    console.log("初始供应量:", ethers.formatEther(fundStats[1]));
    console.log("是否已初始化:", fundStats[2]);
    
    const nav = await mockFund.calculateNAV();
    const mfcValue = await mockFund.calculateMFCValue();
    console.log("基金净值(NAV):", ethers.formatUnits(nav, 6), "USDC");
    console.log("单个MFC价值:", ethers.formatUnits(mfcValue, 6), "USDC");
    
    // 测试新的getFundTokenBalances函数
    console.log("\n🧪 测试新的 getFundTokenBalances 函数...");
    try {
      const result = await mockFund.getFundTokenBalances();
      console.log("✅ getFundTokenBalances 函数调用成功!");
      console.log("代币数量:", result[0].length);
      
      const tokens = result[0];
      const balances = result[1];
      const decimals = result[2];
      
      for (let i = 0; i < tokens.length; i++) {
        console.log(`代币 ${i + 1}: ${tokens[i]}`);
        console.log(`余额: ${ethers.formatUnits(balances[i], decimals[i])}`);
        console.log("---");
      }
    } catch (error) {
      console.log("❌ getFundTokenBalances 函数调用失败:", error.message);
    }

    console.log("\n🎉 Sepolia 部署完成!");
    console.log("MockFund 地址:", deployedContracts.MockFund);
    console.log("FundShareToken 地址:", deployedContracts.FundShareToken);

  } catch (error) {
    console.error("❌ 部署失败:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });