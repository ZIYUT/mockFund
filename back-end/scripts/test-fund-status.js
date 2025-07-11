const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查基金状态...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  console.log("部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 使用已部署的合约地址
  const mockFundAddress = "0xF4006D8318385CB28A4dd511FC3D20D24a7Cf264";
  const mockUSDCAddress = "0xBad2c36Ba9171CF6A4c77CEeCa78e429FA0945C3";
  
  try {
    // 获取合约实例
    const mockFund = await ethers.getContractAt("MockFund", mockFundAddress);
    const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);

    console.log("\n📊 基金状态检查...");
    
    // 检查基金是否已初始化
    const isInitialized = await mockFund.isInitialized();
    console.log("基金是否已初始化:", isInitialized);
    
    if (isInitialized) {
      // 获取基金统计信息
      const fundStats = await mockFund.getFundStats();
      console.log("基金总供应量:", ethers.formatEther(fundStats[0]));
      console.log("初始供应量:", ethers.formatEther(fundStats[1]));
      
      // 获取基金净值
      const nav = await mockFund.calculateNAV();
      const mfcValue = await mockFund.calculateMFCValue();
      console.log("基金净值(NAV):", ethers.formatUnits(nav, 6), "USDC");
      console.log("单个MFC价值:", ethers.formatUnits(mfcValue, 6), "USDC");
      
      // 获取基金USDC余额
      const fundUSDCBalance = await mockUSDC.balanceOf(mockFundAddress);
      console.log("基金USDC余额:", ethers.formatUnits(fundUSDCBalance, 6));
    }
    
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
        console.log(`小数位数: ${decimals[i]}`);
        console.log("---");
      }
    } catch (error) {
      console.log("❌ getFundTokenBalances 函数调用失败:", error.message);
      console.log("错误详情:", error);
    }
    
    // 测试其他现有函数
    console.log("\n🔍 测试其他基金函数...");
    
    try {
      const supportedTokens = await mockFund.getSupportedTokens();
      console.log("支持的代币数量:", supportedTokens.length);
      console.log("支持的代币地址:", supportedTokens);
    } catch (error) {
      console.log("❌ getSupportedTokens 失败:", error.message);
    }
    
    try {
      const mfcComposition = await mockFund.getMFCComposition();
      console.log("MFC组成 - 代币地址:", mfcComposition[0]);
      console.log("MFC组成 - 每份MFC包含数量:", mfcComposition[1].map(amount => ethers.formatUnits(amount, 18)));
    } catch (error) {
      console.log("❌ getMFCComposition 失败:", error.message);
    }
    
    try {
      const fundNAV = await mockFund.getFundNAV();
      console.log("基金NAV信息 - 净值:", ethers.formatUnits(fundNAV[0], 6), "USDC");
      console.log("基金NAV信息 - 单个MFC价值:", ethers.formatUnits(fundNAV[1], 6), "USDC");
      console.log("基金NAV信息 - MFC总供应量:", ethers.formatEther(fundNAV[2]));
    } catch (error) {
      console.log("❌ getFundNAV 失败:", error.message);
    }

    console.log("\n✅ 基金状态检查完成!");

  } catch (error) {
    console.error("❌ 检查失败:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });