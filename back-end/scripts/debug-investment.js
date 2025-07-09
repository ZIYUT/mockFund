const { ethers } = require("hardhat");

/**
 * 调试投资问题的脚本
 */
async function main() {
  console.log("开始调试投资问题...");
  
  const [deployer] = await ethers.getSigners();
  console.log("测试账户:", deployer.address);
  
  // 合约地址
  const MOCK_FUND_ADDRESS = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  const MOCK_USDC_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  // 获取合约实例
  const MockFund = await ethers.getContractFactory("MockFund");
  const mockFund = MockFund.attach(MOCK_FUND_ADDRESS);
  
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = MockUSDC.attach(MOCK_USDC_ADDRESS);
  
  console.log("\n=== 检查基金状态 ===");
  
  // 检查基金是否暂停
  const isPaused = await mockFund.paused();
  console.log("基金是否暂停:", isPaused);
  
  // 检查USDC代币地址
  const usdcAddress = await mockFund.getUSDCAddress();
  console.log("基金中的USDC地址:", usdcAddress);
  console.log("实际USDC地址:", MOCK_USDC_ADDRESS);
  console.log("USDC地址匹配:", usdcAddress.toLowerCase() === MOCK_USDC_ADDRESS.toLowerCase());
  
  // 检查最小投资金额
  const minimumInvestment = await mockFund.minimumInvestment();
  console.log("最小投资金额:", ethers.formatUnits(minimumInvestment, 6), "USDC");
  
  console.log("\n=== 检查用户USDC状态 ===");
  
  // 检查用户USDC余额
  const userBalance = await mockUSDC.balanceOf(deployer.address);
  console.log("用户USDC余额:", ethers.formatUnits(userBalance, 6), "USDC");
  
  // 检查用户对基金的授权额度
  const allowance = await mockUSDC.allowance(deployer.address, MOCK_FUND_ADDRESS);
  console.log("用户对基金的授权额度:", ethers.formatUnits(allowance, 6), "USDC");
  
  console.log("\n=== 检查基金配置 ===");
  
  // 检查支持的代币
  const supportedTokens = await mockFund.getSupportedTokens();
  console.log("支持的代币数量:", supportedTokens.length);
  
  // 检查基金统计
  const fundStats = await mockFund.getFundStats();
  console.log("基金总资产:", ethers.formatUnits(fundStats[0], 6), "USDC");
  console.log("基金总份额:", ethers.formatUnits(fundStats[1], 18), "MFS");
  console.log("当前NAV:", ethers.formatUnits(fundStats[2], 6), "USDC");
  
  console.log("\n=== 尝试小额投资测试 ===");
  
  const testAmount = ethers.parseUnits("10", 6); // 10 USDC
  
  try {
    // 先检查是否需要授权
    if (allowance < testAmount) {
      console.log("需要先授权USDC支出...");
      const approveTx = await mockUSDC.approve(MOCK_FUND_ADDRESS, testAmount);
      await approveTx.wait();
      console.log("✓ 授权成功");
    }
    
    // 尝试投资
    console.log("尝试投资 10 USDC...");
    const investTx = await mockFund.invest(testAmount);
    const receipt = await investTx.wait();
    console.log("✓ 投资成功! 交易哈希:", receipt.hash);
    
    // 检查投资后的状态
    const newBalance = await mockUSDC.balanceOf(deployer.address);
    console.log("投资后USDC余额:", ethers.formatUnits(newBalance, 6), "USDC");
    
    const newFundStats = await mockFund.getFundStats();
    console.log("投资后基金总资产:", ethers.formatUnits(newFundStats[0], 6), "USDC");
    
  } catch (error) {
    console.error("❌ 投资失败:", error.message);
    
    // 尝试解析错误原因
    if (error.message.includes("InsufficientBalance")) {
      console.log("错误原因: USDC余额不足");
    } else if (error.message.includes("InsufficientAllowance")) {
      console.log("错误原因: USDC授权额度不足");
    } else if (error.message.includes("Pausable: paused")) {
      console.log("错误原因: 基金已暂停");
    } else if (error.message.includes("BelowMinimumInvestment")) {
      console.log("错误原因: 投资金额低于最小投资额度");
    } else {
      console.log("未知错误，完整错误信息:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });