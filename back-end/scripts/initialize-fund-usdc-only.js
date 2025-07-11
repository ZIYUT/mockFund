const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 初始化基金（仅USDC模式）...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  console.log("部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 使用已部署的合约地址
  const mockFundAddress = "0xF4006D8318385CB28A4dd511FC3D20D24a7Cf264";
  const mockUSDCAddress = "0xBad2c36Ba9171CF6A4c77CEeCa78e429FA0945C3";
  const uniswapIntegrationAddress = "0x17c3fF4583fA49714bB231b58E18Fb1769874708";
  
  try {
    // 获取合约实例
    const mockFund = await ethers.getContractAt("MockFund", mockFundAddress);
    const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
    const uniswapIntegration = await ethers.getContractAt("UniswapIntegration", uniswapIntegrationAddress);

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
    
    // 为UniswapIntegration预存大量代币，确保有足够流动性
    console.log("\n🏦 为UniswapIntegration预存代币以确保流动性...");
    
    const supportedTokens = await mockFund.getSupportedTokens();
    console.log("支持的代币:", supportedTokens);
    
    // 为每个代币预存大量流动性
    const largeAmount = ethers.parseUnits("1000000", 18); // 100万代币
    const largeBTCAmount = ethers.parseUnits("10000", 8); // 1万 WBTC
    const largeUSDCAmount = ethers.parseUnits("10000000", 6); // 1000万 USDC
    
    for (let i = 0; i < supportedTokens.length; i++) {
      const tokenAddress = supportedTokens[i];
      try {
        // 获取代币合约
        const tokenContract = await ethers.getContractAt("MockWETH", tokenAddress);
        
        // 检查当前余额
        const currentBalance = await tokenContract.balanceOf(uniswapIntegrationAddress);
        console.log(`代币 ${i+1} (${tokenAddress}) 当前余额:`, ethers.formatUnits(currentBalance, 18));
        
        // 如果余额不足，则铸造更多
        if (currentBalance < largeAmount) {
          let mintAmount;
          if (tokenAddress === "0xeFD15b2eb00151c87F2a2859F7aE7a477B652248") { // WBTC
            mintAmount = largeBTCAmount;
          } else {
            mintAmount = largeAmount;
          }
          
          await tokenContract.mint(uniswapIntegrationAddress, mintAmount);
          console.log(`✅ 为UniswapIntegration铸造代币 ${i+1}`);
        }
      } catch (error) {
        console.log(`⚠️ 代币 ${i+1} 铸造失败:`, error.message);
      }
    }
    
    // 为UniswapIntegration铸造更多USDC
    try {
      const uniswapUSDCBalance = await mockUSDC.balanceOf(uniswapIntegrationAddress);
      console.log("UniswapIntegration USDC余额:", ethers.formatUnits(uniswapUSDCBalance, 6));
      
      if (uniswapUSDCBalance < largeUSDCAmount) {
        await mockUSDC.mint(uniswapIntegrationAddress, largeUSDCAmount);
        console.log("✅ 为UniswapIntegration铸造USDC");
      }
    } catch (error) {
      console.log("⚠️ UniswapIntegration USDC铸造失败:", error.message);
    }
    
    // 检查当前授权额度
    const currentAllowance = await mockUSDC.allowance(deployer.address, mockFundAddress);
    console.log("\n💳 当前授权额度:", ethers.formatUnits(currentAllowance, 6));
    
    if (currentAllowance < initialAmount) {
      console.log("授权", ethers.formatUnits(initialAmount, 6), "USDC 给基金合约...");
      
      const approveTx = await mockUSDC.approve(mockFundAddress, initialAmount);
      await approveTx.wait();
      console.log("✅ USDC 授权完成");
    }
    
    // 调用初始化函数，使用更高的gas limit
    console.log("\n🚀 调用基金初始化函数...");
    
    const initTx = await mockFund.initializeFund(initialAmount, {
      gasLimit: 2000000 // 设置更高的gas limit
    });
    
    console.log("⏳ 等待交易确认...");
    const receipt = await initTx.wait();
    console.log("✅ 基金初始化完成! 交易哈希:", receipt.hash);
    console.log("Gas使用量:", receipt.gasUsed.toString());
    
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