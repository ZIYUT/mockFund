const { ethers } = require("hardhat");

// 投资组合配置
const PORTFOLIO_CONFIG = {
  // 50% USDC (不需要置换，作为基础资产)
  // 10% WBTC
  WBTC: 1000, // 10% = 1000 basis points
  // 10% WETH  
  WETH: 1000, // 10% = 1000 basis points
  // 10% LINK
  LINK: 1000, // 10% = 1000 basis points
  // 10% DAI
  DAI: 1000,  // 10% = 1000 basis points
  // 10% UNI
  UNI: 1000   // 10% = 1000 basis points
};

async function main() {
  console.log("开始配置投资组合...");
  
  // 获取合约实例
  const MockFund = await ethers.getContractFactory("MockFund");
  const mockFund = MockFund.attach(process.env.MOCK_FUND_ADDRESS || "YOUR_MOCK_FUND_ADDRESS");
  
  // 获取代币合约地址 (需要先部署)
  const tokenAddresses = {
    WBTC: process.env.WBTC_ADDRESS || "YOUR_WBTC_ADDRESS",
    WETH: process.env.WETH_ADDRESS || "YOUR_WETH_ADDRESS", 
    LINK: process.env.LINK_ADDRESS || "YOUR_LINK_ADDRESS",
    DAI: process.env.DAI_ADDRESS || "YOUR_DAI_ADDRESS",
    UNI: process.env.UNI_ADDRESS || "YOUR_UNI_ADDRESS"
  };
  
  console.log("代币地址配置:");
  console.log(tokenAddresses);
  
  try {
    // 添加支持的代币并设置目标分配
    for (const [symbol, allocation] of Object.entries(PORTFOLIO_CONFIG)) {
      const tokenAddress = tokenAddresses[symbol];
      
      if (!tokenAddress || tokenAddress.includes("YOUR_")) {
        console.log(`⚠️  跳过 ${symbol}: 地址未配置`);
        continue;
      }
      
      console.log(`添加代币 ${symbol} (${tokenAddress}) 分配比例: ${allocation/100}%`);
      
      // 检查代币是否已经支持
      const isSupported = await mockFund.isSupportedToken(tokenAddress);
      
      if (!isSupported) {
        // 添加新的支持代币
        const tx = await mockFund.addSupportedToken(tokenAddress, allocation);
        await tx.wait();
        console.log(`✅ 成功添加 ${symbol}`);
      } else {
        // 更新现有代币的分配
        const tx = await mockFund.updateTargetAllocation(tokenAddress, allocation);
        await tx.wait();
        console.log(`✅ 成功更新 ${symbol} 分配比例`);
      }
    }
    
    // 验证配置
    console.log("\n📊 当前投资组合配置:");
    const supportedTokens = await mockFund.getSupportedTokens();
    
    let totalAllocation = 0;
    for (const tokenAddress of supportedTokens) {
      const allocation = await mockFund.targetAllocations(tokenAddress);
      totalAllocation += parseInt(allocation.toString());
      
      // 查找代币符号
      const symbol = Object.keys(tokenAddresses).find(key => 
        tokenAddresses[key].toLowerCase() === tokenAddress.toLowerCase()
      ) || "未知";
      
      console.log(`${symbol}: ${allocation/100}% (${tokenAddress})`);
    }
    
    console.log(`\n总分配比例: ${totalAllocation/100}%`);
    console.log(`USDC 基础资产: ${(10000-totalAllocation)/100}%`);
    
    if (totalAllocation === 5000) {
      console.log("\n🎉 投资组合配置完成!");
      console.log("📈 配置详情:");
      console.log("   • 50% USDC (基础资产，不进行置换)");
      console.log("   • 10% WBTC (比特币敞口)");
      console.log("   • 10% WETH (以太坊敞口)");
      console.log("   • 10% LINK (预言机代币)");
      console.log("   • 10% DAI (去中心化稳定币)");
      console.log("   • 10% UNI (DEX治理代币)");
    } else {
      console.log(`\n⚠️  警告: 总分配比例为 ${totalAllocation/100}%，预期为 50%`);
    }
    
  } catch (error) {
    console.error("配置失败:", error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main, PORTFOLIO_CONFIG };