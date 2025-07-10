const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 测试 Sepolia 部署...");
  
  // 读取部署信息
  const deploymentFile = path.join(__dirname, "../deployments/sepolia-deployment.json");
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ 部署信息文件不存在，请先运行部署脚本");
    process.exit(1);
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contracts = deploymentData.contracts;
  
  console.log("📋 部署信息:");
  console.log("网络:", deploymentData.network);
  console.log("部署者:", deploymentData.deployer);
  console.log("时间:", deploymentData.timestamp);
  
  const [deployer] = await ethers.getSigners();
  console.log("当前账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
  
  try {
    // 获取合约实例
    const MockFund = await ethers.getContractFactory("MockFund");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    
    const mockFund = MockFund.attach(contracts.MockFund);
    const mockUSDC = MockUSDC.attach(contracts.MockUSDC);
    
    console.log("\n=== 合约状态检查 ===");
    
    // 检查基金状态
    const fundStats = await mockFund.getFundStats();
    console.log("✅ 基金总供应量:", ethers.formatEther(fundStats[0]));
    console.log("✅ 初始供应量:", ethers.formatEther(fundStats[1]));
    console.log("✅ 是否已初始化:", fundStats[2]);
    
    // 检查支持的代币
    const supportedTokens = await mockFund.getSupportedTokens();
    console.log("✅ 支持的代币数量:", supportedTokens.length);
    
    // 检查USDC地址
    const usdcAddress = await mockFund.getUSDCAddress();
    console.log("✅ USDC地址:", usdcAddress);
    console.log("✅ USDC地址匹配:", usdcAddress.toLowerCase() === contracts.MockUSDC.toLowerCase());
    
    // 检查管理费
    const managementFeeRate = await mockFund.managementFeeRate();
    console.log("✅ 管理费率:", managementFeeRate, "(基点)");
    
    // 检查最小投资金额
    const minimumInvestment = await mockFund.minimumInvestment();
    console.log("✅ 最小投资金额:", ethers.formatUnits(minimumInvestment, 6), "USDC");
    
    // 检查部署者MFC余额
    const deployerMFCBalance = await mockFund.shareToken().balanceOf(deployer.address);
    console.log("✅ 部署者MFC余额:", ethers.formatEther(deployerMFCBalance));
    
    // 检查部署者USDC余额
    const deployerUSDCBalance = await mockUSDC.balanceOf(deployer.address);
    console.log("✅ 部署者USDC余额:", ethers.formatUnits(deployerUSDCBalance, 6));
    
    console.log("\n=== 功能测试 ===");
    
    // 测试获取测试代币
    console.log("🔄 测试获取测试代币...");
    const beforeBalance = await mockUSDC.balanceOf(deployer.address);
    const faucetTx = await mockUSDC.faucet(ethers.parseUnits("1000", 6));
    await faucetTx.wait();
    const afterBalance = await mockUSDC.balanceOf(deployer.address);
    console.log("✅ 获取测试代币成功");
    console.log("   之前余额:", ethers.formatUnits(beforeBalance, 6), "USDC");
    console.log("   之后余额:", ethers.formatUnits(afterBalance, 6), "USDC");
    
    // 测试投资预览
    console.log("\n🔄 测试投资预览...");
    const investmentAmount = ethers.parseUnits("100", 6); // 100 USDC
    const previewMFC = await mockFund.getInvestmentPreview(investmentAmount);
    console.log("✅ 投资预览成功");
    console.log("   投资金额:", ethers.formatUnits(investmentAmount, 6), "USDC");
    console.log("   预期MFC:", ethers.formatEther(previewMFC));
    
    // 测试赎回预览
    console.log("\n🔄 测试赎回预览...");
    const redemptionAmount = ethers.parseEther("100"); // 100 MFC
    const previewUSDC = await mockFund.getRedemptionPreview(redemptionAmount);
    console.log("✅ 赎回预览成功");
    console.log("   赎回MFC:", ethers.formatEther(redemptionAmount));
    console.log("   预期USDC:", ethers.formatUnits(previewUSDC, 6));
    
    console.log("\n🎉 所有测试通过！部署验证成功。");
    
  } catch (error) {
    console.error("❌ 测试失败:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 