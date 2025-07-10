const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 测试投资计算功能...");
  
  const [deployer] = await ethers.getSigners();
  console.log("测试账户:", deployer.address);

  try {
    // 从部署文件读取合约地址
    const fs = require("fs");
    const path = require("path");
    
    const deploymentFile = path.join(__dirname, "../deployments/sepolia-enhanced-deployment.json");
    if (!fs.existsSync(deploymentFile)) {
      throw new Error("部署文件不存在，请先运行部署脚本");
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const contracts = deploymentInfo.contracts;
    
    console.log("📖 读取部署信息...");
    console.log("基金地址:", contracts.MockFund);
    console.log("USDC地址:", contracts.MockUSDC);

    // 获取合约实例
    const MockFund = await ethers.getContractFactory("MockFund");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    
    const mockFund = MockFund.attach(contracts.MockFund);
    const mockUSDC = MockUSDC.attach(contracts.MockUSDC);

    // 检查基金状态
    console.log("\n📊 检查基金状态...");
    const fundStats = await mockFund.getFundStats();
    console.log("基金总供应量:", ethers.formatEther(fundStats[0]));
    console.log("初始供应量:", ethers.formatEther(fundStats[1]));
    console.log("是否已初始化:", fundStats[2]);

    if (!fundStats[2]) {
      throw new Error("基金未初始化，请先运行部署脚本");
    }

    // 获取基金净值信息
    const nav = await mockFund.calculateNAV();
    const mfcValue = await mockFund.calculateMFCValue();
    console.log("基金净值 (NAV):", ethers.formatUnits(nav, 6), "USDC");
    console.log("单个MFC价值:", ethers.formatUnits(mfcValue, 6), "USDC");

    // 测试不同投资金额
    console.log("\n💰 测试投资计算...");
    
    const testAmounts = [
      ethers.parseUnits("100", 6),   // 100 USDC
      ethers.parseUnits("500", 6),   // 500 USDC
      ethers.parseUnits("1000", 6),  // 1000 USDC
      ethers.parseUnits("5000", 6),  // 5000 USDC
      ethers.parseUnits("10000", 6), // 10000 USDC
      ethers.parseUnits("50000", 6), // 50000 USDC
      ethers.parseUnits("100000", 6) // 100000 USDC
    ];

    for (const amount of testAmounts) {
      const mfcAmount = await mockFund.getInvestmentPreview(amount);
      const usdcFormatted = ethers.formatUnits(amount, 6);
      const mfcFormatted = ethers.formatEther(mfcAmount);
      
      console.log(`投资 ${usdcFormatted} USDC → 获得 ${mfcFormatted} MFC`);
      
      // 验证计算逻辑
      const expectedMFC = (amount * ethers.parseUnits("1", 18)) / mfcValue;
      const expectedMFCFormatted = ethers.formatEther(expectedMFC);
      console.log(`  预期: ${expectedMFCFormatted} MFC (验证: ${mfcFormatted === expectedMFCFormatted ? "✅" : "❌"})`);
    }

    // 测试赎回计算
    console.log("\n🔄 测试赎回计算...");
    
    const testMFCAmounts = [
      ethers.parseUnits("100", 18),   // 100 MFC
      ethers.parseUnits("500", 18),   // 500 MFC
      ethers.parseUnits("1000", 18),  // 1000 MFC
      ethers.parseUnits("5000", 18),  // 5000 MFC
      ethers.parseUnits("10000", 18)  // 10000 MFC
    ];

    for (const mfcAmount of testMFCAmounts) {
      const usdcAmount = await mockFund.getRedemptionPreview(mfcAmount);
      const mfcFormatted = ethers.formatEther(mfcAmount);
      const usdcFormatted = ethers.formatUnits(usdcAmount, 6);
      
      console.log(`赎回 ${mfcFormatted} MFC → 获得 ${usdcFormatted} USDC`);
    }

    // 测试实际投资（如果账户有足够USDC）
    console.log("\n🎯 测试实际投资...");
    
    const userUSDCBalance = await mockUSDC.balanceOf(deployer.address);
    console.log("用户USDC余额:", ethers.formatUnits(userUSDCBalance, 6), "USDC");
    
    if (userUSDCBalance >= ethers.parseUnits("1000", 6)) {
      const testInvestment = ethers.parseUnits("1000", 6);
      const previewMFC = await mockFund.getInvestmentPreview(testInvestment);
      
      console.log(`准备投资 ${ethers.formatUnits(testInvestment, 6)} USDC...`);
      
      // 授权USDC
      await mockUSDC.approve(contracts.MockFund, testInvestment);
      console.log("✅ USDC授权完成");
      
      // 执行投资
      const investTx = await mockFund.invest(testInvestment);
      await investTx.wait();
      console.log("✅ 投资交易完成");
      
      // 检查结果
      const userMFCBalance = await mockFund.shareToken().then(token => token.balanceOf(deployer.address));
      console.log("用户MFC余额:", ethers.formatEther(userMFCBalance), "MFC");
      console.log("预期MFC数量:", ethers.formatEther(previewMFC), "MFC");
      console.log("实际获得:", ethers.formatEther(userMFCBalance), "MFC");
      
      // 验证投资后的净值
      const newNav = await mockFund.calculateNAV();
      const newMfcValue = await mockFund.calculateMFCValue();
      console.log("投资后基金净值:", ethers.formatUnits(newNav, 6), "USDC");
      console.log("投资后MFC价值:", ethers.formatUnits(newMfcValue, 6), "USDC");
      
    } else {
      console.log("⚠️  用户USDC余额不足，跳过实际投资测试");
      console.log("💡 提示：可以运行 mint-test-tokens.js 来获取测试代币");
    }

    console.log("\n✅ 投资计算测试完成！");

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