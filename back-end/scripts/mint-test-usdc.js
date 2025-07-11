const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🪙 为用户铸造测试 USDC...');
  
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
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = MockUSDC.attach(contracts.MockUSDC);
    
    // 获取用户地址（从命令行参数或使用默认地址）
    const userAddress = process.argv[2];
    if (!userAddress) {
      console.error("❌ 请提供用户地址作为参数");
      console.error("使用方法: node scripts/mint-test-usdc.js <用户地址> [数量]");
      process.exit(1);
    }
    
    // 验证地址格式
    if (!ethers.isAddress(userAddress)) {
      console.error("❌ 无效的地址格式");
      process.exit(1);
    }
    
    // 获取铸造数量（默认1000 USDC）
    const amount = process.argv[3] || "1000";
    const amountInWei = ethers.parseUnits(amount, 6); // USDC有6位小数
    
    console.log(`🎯 目标地址: ${userAddress}`);
    console.log(`💰 铸造数量: ${amount} USDC`);
    
    // 检查当前余额
    const currentBalance = await mockUSDC.balanceOf(userAddress);
    console.log(`📊 当前余额: ${ethers.formatUnits(currentBalance, 6)} USDC`);
    
    // 铸造USDC
    console.log("\n🚀 开始铸造...");
    const tx = await mockUSDC.mint(userAddress, amountInWei);
    await tx.wait();
    
    console.log("✅ 铸造成功！");
    console.log(`📝 交易哈希: ${tx.hash}`);
    
    // 检查新余额
    const newBalance = await mockUSDC.balanceOf(userAddress);
    console.log(`📊 新余额: ${ethers.formatUnits(newBalance, 6)} USDC`);
    
    console.log("\n🎉 用户现在可以使用这些USDC进行投资了！");
    
  } catch (error) {
    console.error("❌ 铸造失败:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 