const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔄 重新初始化 MockFund...');
  
  try {
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("👤 部署者地址:", deployer.address);
    
    // 加载部署信息
    const deploymentFile = path.join(__dirname, "../deployments/sepolia.json");
    if (!fs.existsSync(deploymentFile)) {
      throw new Error("部署文件不存在，请先部署合约");
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const contracts = deploymentInfo.contracts;
    
    console.log("📋 加载合约地址:");
    Object.entries(contracts).forEach(([name, address]) => {
      console.log(`   ${name}: ${address}`);
    });
    
    // 获取合约实例
    const MockFund = await ethers.getContractFactory("MockFund");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    
    const mockFund = MockFund.attach(contracts.MockFund);
    const mockUSDC = MockUSDC.attach(contracts.MockUSDC);
    
    // 检查基金是否已经初始化
    console.log("\n🔍 检查基金状态...");
    const isInitialized = await mockFund.isInitialized();
    console.log("基金是否已初始化:", isInitialized);
    
    if (isInitialized) {
      console.log("⚠️ 基金已经初始化，需要先重置...");
      
      // 获取基金统计信息
      try {
        const fundStats = await mockFund.getFundStats();
        console.log("当前基金统计:");
        console.log("  总供应量:", ethers.formatEther(fundStats[0]));
        console.log("  初始供应量:", ethers.formatEther(fundStats[1]));
        console.log("  是否已初始化:", fundStats[2]);
      } catch (error) {
        console.log("无法获取基金统计信息");
      }
      
      console.log("❌ 基金已初始化，无法重新初始化。如果需要重置，请部署新的基金合约。");
      return;
    }
    
    // 检查支持的代币
    console.log("\n🔍 检查支持的代币...");
    const supportedTokens = await mockFund.getSupportedTokens();
    console.log("支持的代币数量:", supportedTokens.length);
    
    if (supportedTokens.length === 0) {
      console.log("⚠️ 没有配置支持的代币，正在添加...");
      
      // 获取代币工厂合约
      const MockTokensFactory = await ethers.getContractFactory("MockTokensFactory");
      const mockTokensFactory = MockTokensFactory.attach(contracts.MockTokensFactory);
      
      // 获取代币地址
      const wbtcAddress = await mockTokensFactory.wbtc();
      const wethAddress = await mockTokensFactory.weth();
      const linkAddress = await mockTokensFactory.link();
      const daiAddress = await mockTokensFactory.dai();
      
      console.log("代币地址:");
      console.log("  WBTC:", wbtcAddress);
      console.log("  WETH:", wethAddress);
      console.log("  LINK:", linkAddress);
      console.log("  DAI:", daiAddress);
      
      // 添加支持的代币
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
    }
    
    // 设置 USDC 代币地址
    console.log("\n🔧 设置 USDC 代币地址...");
    const usdcAddress = contracts.MockUSDC;
    await mockFund.setUSDCToken(usdcAddress);
    console.log("✅ USDC 代币地址设置成功:", usdcAddress);
    
    // 为 UniswapIntegration 预存代币
    console.log("\n💰 为 UniswapIntegration 预存代币...");
    
    const uniswapIntegrationAddress = contracts.UniswapIntegration;
    
    // 获取代币合约实例
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const MockLINK = await ethers.getContractFactory("MockLINK");
    const MockDAI = await ethers.getContractFactory("MockDAI");
    
    const mockTokensFactory = MockTokensFactory.attach(contracts.MockTokensFactory);
    const wbtcAddress = await mockTokensFactory.wbtc();
    const wethAddress = await mockTokensFactory.weth();
    const linkAddress = await mockTokensFactory.link();
    const daiAddress = await mockTokensFactory.dai();
    
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
    
    console.log("✅ UniswapIntegration 预存完成");
    
    // 初始化基金
    console.log("\n🚀 初始化基金...");
    
    // 给部署者铸造 100万 USDC
    const initialAmount = ethers.parseUnits("1000000", 6); // 100万 USDC
    await mockUSDC.mint(deployer.address, initialAmount);
    console.log("✅ 铸造 100万 USDC 给部署者");
    
    // 授权基金合约使用 USDC
    await mockUSDC.approve(contracts.MockFund, initialAmount);
    console.log("✅ 授权 USDC 给基金合约");
    
    // 初始化基金
    const initTx = await mockFund.initializeFund(initialAmount);
    await initTx.wait();
    console.log("✅ 基金初始化完成，铸造 100万 MFC");
    
    // 验证初始化结果
    console.log("\n🔍 验证初始化结果...");
    const fundStats = await mockFund.getFundStats();
    console.log("基金总供应量:", ethers.formatEther(fundStats[0]));
    console.log("初始供应量:", ethers.formatEther(fundStats[1]));
    console.log("是否已初始化:", fundStats[2]);
    
    const shareTokenAddress = await mockFund.shareToken();
    console.log("份额代币地址:", shareTokenAddress);
    
    // 检查部署者的MFC余额
    const FundShareToken = await ethers.getContractFactory("FundShareToken");
    const shareToken = FundShareToken.attach(shareTokenAddress);
    const deployerBalance = await shareToken.balanceOf(deployer.address);
    console.log("部署者MFC余额:", ethers.formatEther(deployerBalance));
    
    console.log("\n🎉 基金重新初始化成功！");
    
  } catch (error) {
    console.error("❌ 重新初始化失败:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 