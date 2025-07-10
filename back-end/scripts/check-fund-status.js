const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔍 检查 MockFund 状态...');
  
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
    
    // 获取合约实例
    const MockFund = await ethers.getContractFactory("MockFund");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const FundShareToken = await ethers.getContractFactory("FundShareToken");
    
    const mockFund = MockFund.attach(contracts.MockFund);
    const mockUSDC = MockUSDC.attach(contracts.MockUSDC);
    const shareToken = FundShareToken.attach(contracts.FundShareToken);
    
    console.log("\n=== 基金基本信息 ===");
    console.log("基金地址:", contracts.MockFund);
    console.log("份额代币地址:", contracts.FundShareToken);
    console.log("USDC地址:", contracts.MockUSDC);
    
    // 检查基金状态
    const isInitialized = await mockFund.isInitialized();
    console.log("是否已初始化:", isInitialized);
    
    if (isInitialized) {
      console.log("\n=== 基金统计信息 ===");
      try {
        const fundStats = await mockFund.getFundStats();
        console.log("总供应量:", ethers.formatEther(fundStats[0]));
        console.log("初始供应量:", ethers.formatEther(fundStats[1]));
        console.log("是否已初始化:", fundStats[2]);
      } catch (error) {
        console.log("无法获取基金统计信息:", error.message);
      }
      
      // 检查净值
      try {
        const nav = await mockFund.calculateNAV();
        console.log("基金净值 (USDC):", ethers.formatUnits(nav, 6));
        
        const mfcValue = await mockFund.calculateMFCValue();
        console.log("单个MFC价值 (USDC):", ethers.formatUnits(mfcValue, 6));
      } catch (error) {
        console.log("无法计算净值:", error.message);
      }
      
      // 检查支持的代币
      console.log("\n=== 支持的代币 ===");
      const supportedTokens = await mockFund.getSupportedTokens();
      console.log("支持的代币数量:", supportedTokens.length);
      
      for (let i = 0; i < supportedTokens.length; i++) {
        const tokenAddress = supportedTokens[i];
        console.log(`代币 ${i + 1}: ${tokenAddress}`);
        
        // 检查代币余额
        try {
          const MockToken = await ethers.getContractFactory("MockWETH"); // 使用任意代币工厂
          const token = MockToken.attach(tokenAddress);
          const balance = await token.balanceOf(contracts.MockFund);
          console.log(`  余额: ${ethers.formatEther(balance)}`);
        } catch (error) {
          console.log(`  无法获取余额: ${error.message}`);
        }
      }
      
      // 检查USDC余额
      console.log("\n=== USDC 余额 ===");
      const usdcBalance = await mockUSDC.balanceOf(contracts.MockFund);
      console.log("基金USDC余额:", ethers.formatUnits(usdcBalance, 6));
      
      // 检查部署者余额
      console.log("\n=== 部署者余额 ===");
      const deployerUSDCBalance = await mockUSDC.balanceOf(deployer.address);
      console.log("部署者USDC余额:", ethers.formatUnits(deployerUSDCBalance, 6));
      
      const deployerMFCBalance = await shareToken.balanceOf(deployer.address);
      console.log("部署者MFC余额:", ethers.formatEther(deployerMFCBalance));
      
      // 检查基金参数
      console.log("\n=== 基金参数 ===");
      const minimumInvestment = await mockFund.minimumInvestment();
      const minimumRedemption = await mockFund.minimumRedemption();
      const managementFeeRate = await mockFund.managementFeeRate();
      const lastFeeCollection = await mockFund.lastFeeCollection();
      const totalManagementFeesCollected = await mockFund.totalManagementFeesCollected();
      
      console.log("最小投资额 (USDC):", ethers.formatUnits(minimumInvestment, 6));
      console.log("最小赎回额 (USDC):", ethers.formatUnits(minimumRedemption, 6));
      console.log("管理费率 (基点):", managementFeeRate.toString());
      console.log("管理费率 (%):", (Number(managementFeeRate) / 100).toString() + "%");
      console.log("上次收费时间:", new Date(Number(lastFeeCollection) * 1000).toLocaleString());
      console.log("累计管理费 (USDC):", ethers.formatUnits(totalManagementFeesCollected, 6));
      
      // 检查MFC代币信息
      console.log("\n=== MFC 代币信息 ===");
      const totalSupply = await shareToken.totalSupply();
      const name = await shareToken.name();
      const symbol = await shareToken.symbol();
      const decimals = await shareToken.decimals();
      
      console.log("代币名称:", name);
      console.log("代币符号:", symbol);
      console.log("小数位数:", decimals);
      console.log("总供应量:", ethers.formatEther(totalSupply));
      
    } else {
      console.log("\n⚠️ 基金尚未初始化");
      
      // 检查是否配置了支持的代币
      const supportedTokens = await mockFund.getSupportedTokens();
      console.log("已配置的代币数量:", supportedTokens.length);
      
      if (supportedTokens.length > 0) {
        console.log("已配置的代币:");
        for (let i = 0; i < supportedTokens.length; i++) {
          console.log(`  ${i + 1}: ${supportedTokens[i]}`);
        }
      }
    }
    
    console.log("\n✅ 基金状态检查完成");
    
  } catch (error) {
    console.error("❌ 检查失败:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 