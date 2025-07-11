const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 初始化基金...");
  
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

    // 检查基金是否已初始化
    const isInitialized = await mockFund.isInitialized();
    console.log("基金是否已初始化:", isInitialized);
    
    if (isInitialized) {
      console.log("✅ 基金已经初始化，无需重复初始化");
      return;
    }

    console.log("\n💰 准备初始化基金...");
    
    // 使用合约要求的初始金额：100万 USDC
    const initialAmount = ethers.parseUnits("1000000", 6); // 100万 USDC
    
    // 检查部署者的USDC余额
    const deployerUSDCBalance = await mockUSDC.balanceOf(deployer.address);
    console.log("部署者当前USDC余额:", ethers.formatUnits(deployerUSDCBalance, 6));
    
    if (deployerUSDCBalance < initialAmount) {
      const mintAmount = initialAmount - deployerUSDCBalance;
      console.log("铸造", ethers.formatUnits(mintAmount, 6), "USDC 给部署者...");
      
      const mintTx = await mockUSDC.mint(deployer.address, mintAmount);
      await mintTx.wait();
      console.log("✅ USDC 铸造完成");
    }
    
    // 检查当前授权额度
    const currentAllowance = await mockUSDC.allowance(deployer.address, mockFundAddress);
    console.log("当前授权额度:", ethers.formatUnits(currentAllowance, 6));
    
    if (currentAllowance < initialAmount) {
      console.log("授权", ethers.formatUnits(initialAmount, 6), "USDC 给基金合约...");
      
      const approveTx = await mockUSDC.approve(mockFundAddress, initialAmount);
      await approveTx.wait();
      console.log("✅ USDC 授权完成");
    }
    
    // 调用初始化函数，使用较低的gas limit
    console.log("调用基金初始化函数...");
    
    const initTx = await mockFund.initializeFund(initialAmount, {
      gasLimit: 500000 // 设置较低的gas limit
    });
    
    console.log("等待交易确认...");
    const receipt = await initTx.wait();
    console.log("✅ 基金初始化完成! 交易哈希:", receipt.hash);
    
    // 验证初始化结果
    console.log("\n📊 验证初始化结果...");
    
    const isNowInitialized = await mockFund.isInitialized();
    console.log("基金是否已初始化:", isNowInitialized);
    
    if (isNowInitialized) {
      const fundStats = await mockFund.getFundStats();
      console.log("基金总供应量:", ethers.formatEther(fundStats[0]));
      console.log("初始供应量:", ethers.formatEther(fundStats[1]));
      
      const nav = await mockFund.calculateNAV();
      const mfcValue = await mockFund.calculateMFCValue();
      console.log("基金净值(NAV):", ethers.formatUnits(nav, 6), "USDC");
      console.log("单个MFC价值:", ethers.formatUnits(mfcValue, 6), "USDC");
      
      // 测试getFundNAV函数
      try {
        const fundNAV = await mockFund.getFundNAV();
        console.log("\n✅ getFundNAV 函数测试成功:");
        console.log("基金NAV信息 - 净值:", ethers.formatUnits(fundNAV[0], 6), "USDC");
        console.log("基金NAV信息 - 单个MFC价值:", ethers.formatUnits(fundNAV[1], 6), "USDC");
        console.log("基金NAV信息 - MFC总供应量:", ethers.formatEther(fundNAV[2]));
      } catch (error) {
        console.log("❌ getFundNAV 函数测试失败:", error.message);
      }
    }

    console.log("\n🎉 基金初始化完成!");

  } catch (error) {
    console.error("❌ 初始化失败:", error.message);
    console.error("错误详情:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });