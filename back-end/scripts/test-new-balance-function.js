const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 测试新的基金代币余额查询功能...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // Sepolia网络合约地址
  const mockFundAddress = "0x92053436b6D0758EcFb765C86a71b2dC4228DEa0";

  try {
    // 获取合约实例
    const mockFund = await ethers.getContractAt("MockFund", mockFundAddress);

    console.log("\n=== 测试 getFundTokenBalances 函数 ===");
    
    // 检查基金是否已初始化
    const isInitialized = await mockFund.isInitialized();
    console.log("基金是否已初始化:", isInitialized);
    
    if (!isInitialized) {
      console.log("❌ 基金未初始化，无法查询余额");
      return;
    }

    // 测试新的getFundTokenBalances函数
    try {
      const result = await mockFund.getFundTokenBalances();
      const tokens = result[0];
      const balances = result[1];
      const decimals = result[2];
      
      console.log("\n=== 基金持有的代币余额 ===");
      for (let i = 0; i < tokens.length; i++) {
        const tokenAddress = tokens[i];
        const balance = balances[i];
        const decimal = decimals[i];
        
        console.log(`代币地址: ${tokenAddress}`);
        console.log(`余额: ${ethers.formatUnits(balance, decimal)}`);
        console.log(`小数位数: ${decimal}`);
        console.log("---");
      }
      
      console.log("✅ getFundTokenBalances 函数测试成功！");
      
    } catch (error) {
      console.log("❌ getFundTokenBalances 函数调用失败:", error.message);
    }

    // 同时测试现有的getMFCComposition函数
    console.log("\n=== 测试 getMFCComposition 函数 ===");
    try {
      const mfcComposition = await mockFund.getMFCComposition();
      const tokens = mfcComposition[0];
      const ratios = mfcComposition[1];
      const usdcAmount = mfcComposition[2];
      
      console.log("每份MFC包含的USDC:", ethers.formatUnits(usdcAmount, 6));
      
      for (let i = 0; i < tokens.length; i++) {
        const tokenAddress = tokens[i];
        const ratio = ratios[i];
        
        console.log(`代币地址: ${tokenAddress}`);
        console.log(`每份MFC包含数量: ${ethers.formatUnits(ratio, 18)}`);
        console.log("---");
      }
      
      console.log("✅ getMFCComposition 函数测试成功！");
      
    } catch (error) {
      console.log("❌ getMFCComposition 函数调用失败:", error.message);
    }

    // 测试基金净值信息
    console.log("\n=== 基金净值信息 ===");
    try {
      const fundNAV = await mockFund.getFundNAV();
      const nav = fundNAV[0];
      const mfcValue = fundNAV[1];
      const totalSupply = fundNAV[2];
      
      console.log("基金净值(NAV):", ethers.formatUnits(nav, 6), "USDC");
      console.log("单个MFC价值:", ethers.formatUnits(mfcValue, 6), "USDC");
      console.log("MFC总供应量:", ethers.formatUnits(totalSupply, 18));
      
      console.log("✅ getFundNAV 函数测试成功！");
      
    } catch (error) {
      console.log("❌ getFundNAV 函数调用失败:", error.message);
    }

  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });