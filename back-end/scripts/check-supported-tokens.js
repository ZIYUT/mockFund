const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查基金支持的代币...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 使用已部署的合约地址
  const mockFundAddress = "0xF4006D8318385CB28A4dd511FC3D20D24a7Cf264";
  
  try {
    // 获取合约实例
    const mockFund = await ethers.getContractAt("MockFund", mockFundAddress);

    console.log("\n📊 基金合约信息...");
    
    // 检查基金是否已初始化
    const isInitialized = await mockFund.isInitialized();
    console.log("基金是否已初始化:", isInitialized);
    
    // 获取支持的代币
    try {
      const supportedTokens = await mockFund.getSupportedTokens();
      console.log("支持的代币数量:", supportedTokens.length);
      console.log("支持的代币地址:", supportedTokens);
      
      if (supportedTokens.length !== 4) {
        console.log("❌ 错误：基金需要恰好4个支持的代币，当前有", supportedTokens.length, "个");
      } else {
        console.log("✅ 支持的代币数量正确（4个）");
      }
    } catch (error) {
      console.log("❌ 获取支持代币失败:", error.message);
    }
    
    // 检查USDC地址
    try {
      const usdcAddress = await mockFund.getUSDCAddress();
      console.log("USDC代币地址:", usdcAddress);
    } catch (error) {
      console.log("❌ 获取USDC地址失败:", error.message);
    }
    
    // 检查合约常量
    try {
      const initialUSDCAmount = await mockFund.INITIAL_USDC_AMOUNT();
      const initialMFCSupply = await mockFund.INITIAL_MFC_SUPPLY();
      console.log("要求的初始USDC金额:", ethers.formatUnits(initialUSDCAmount, 6), "USDC");
      console.log("初始MFC供应量:", ethers.formatEther(initialMFCSupply), "MFC");
    } catch (error) {
      console.log("❌ 获取合约常量失败:", error.message);
    }
    
    // 检查部署者的USDC余额
    const mockUSDCAddress = "0xBad2c36Ba9171CF6A4c77CEeCa78e429FA0945C3";
    try {
      const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
      const deployerUSDCBalance = await mockUSDC.balanceOf(deployer.address);
      console.log("部署者USDC余额:", ethers.formatUnits(deployerUSDCBalance, 6), "USDC");
      
      const requiredAmount = ethers.parseUnits("1000000", 6);
      if (deployerUSDCBalance < requiredAmount) {
        console.log("❌ 部署者USDC余额不足，需要", ethers.formatUnits(requiredAmount, 6), "USDC");
      } else {
        console.log("✅ 部署者USDC余额充足");
      }
    } catch (error) {
      console.log("❌ 检查USDC余额失败:", error.message);
    }
    
    // 检查合约所有者
    try {
      const owner = await mockFund.owner();
      console.log("合约所有者:", owner);
      console.log("部署者是否为所有者:", owner.toLowerCase() === deployer.address.toLowerCase());
    } catch (error) {
      console.log("❌ 检查合约所有者失败:", error.message);
    }

    console.log("\n✅ 检查完成!");

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