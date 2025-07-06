const { ethers } = require("hardhat");

async function main() {
  console.log("🪙 开始为测试账户分配代币...");

  // 获取合约实例
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = MockUSDC.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

  // 测试账户地址 (这是 Hardhat 默认账户之一)
  const testAccount = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  
  // 分配 1000 USDC (6位小数)
  const amount = ethers.parseUnits("1000", 6);
  
  try {
    console.log(`📤 正在为账户 ${testAccount} 分配 1000 USDC...`);
    const tx = await mockUSDC.mint(testAccount, amount);
    await tx.wait();
    
    // 检查余额
    const balance = await mockUSDC.balanceOf(testAccount);
    const formattedBalance = ethers.formatUnits(balance, 6);
    
    console.log(`✅ 成功！账户 ${testAccount} 现在有 ${formattedBalance} USDC`);
    console.log(`🔗 交易哈希: ${tx.hash}`);
    
  } catch (error) {
    console.error("❌ 分配代币失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });