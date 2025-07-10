const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 调试 MFC 价值计算问题...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 合约地址
  const mockUSDCAddress = "0x5aA5F9d612280f553310966a461A200DCaeF1ce5";
  const mockFundAddress = "0xB13eb6DAc1d4306402142b416Eda581871538621";
  const chainlinkPriceOracleAddress = "0x16018E1a3d92eDD9C939C4885B2C690f33d0a3bF";
  const uniswapIntegrationAddress = "0x449E05b43a522DbF421D54a6cB23Fe91c0147E62";
  const wethAddress = "0xf6dccE145e44463d1Bc82974383015aF3A115aD5";
  const wbtcAddress = "0x6A3d9b277C807f35eF12DD94c13f903fA31864Cd";
  const linkAddress = "0xb74720FFFd322F11092deBf197df7CEa3b6824bD";
  const daiAddress = "0x77E0Aa7b8e9Fa0e7a908f3b7cFaF86286E713C6D";

  try {
    // 获取合约实例
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const MockFund = await ethers.getContractFactory("MockFund");
    const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");

    const mockUSDC = MockUSDC.attach(mockUSDCAddress);
    const mockFund = MockFund.attach(mockFundAddress);
    const chainlinkPriceOracle = ChainlinkPriceOracle.attach(chainlinkPriceOracleAddress);

    console.log("\n📊 检查基金状态...");
    const fundStats = await mockFund.getFundStats();
    console.log("基金状态:", {
      totalSupply: ethers.formatEther(fundStats[0]),
      initialSupply: ethers.formatEther(fundStats[1]),
      isInitialized: fundStats[2]
    });

    console.log("\n📊 检查 MFC 代币信息...");
    const fundShareToken = await mockFund.getFundShareToken();
    const FundShareToken = await ethers.getContractFactory("FundShareToken");
    const shareToken = FundShareToken.attach(fundShareToken);
    
    const totalSupply = await shareToken.totalSupply();
    const deployerBalance = await shareToken.balanceOf(deployer.address);
    console.log("MFC 总供应量:", ethers.formatEther(totalSupply));
    console.log("部署者 MFC 余额:", ethers.formatEther(deployerBalance));

    console.log("\n📊 检查基金净值...");
    const nav = await mockFund.calculateNAV();
    console.log("基金净值 (USDC):", ethers.formatUnits(nav, 6));

    console.log("\n📊 检查单个 MFC 价值...");
    const mfcValue = await mockFund.calculateMFCValue();
    console.log("单个 MFC 价值 (USDC):", ethers.formatUnits(mfcValue, 6));

    // 手动计算 MFC 价值
    console.log("\n📊 手动计算 MFC 价值...");
    const manualMfcValue = nav / totalSupply;
    console.log("手动计算的 MFC 价值 (原始):", manualMfcValue.toString());
    console.log("手动计算的 MFC 价值 (USDC):", ethers.formatUnits(manualMfcValue, 6));

    // 检查投资预览
    console.log("\n📊 测试投资预览...");
    const testAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    
    try {
      const preview = await mockFund.getInvestmentPreview(testAmount);
      console.log("投资预览 (MFC):", ethers.formatEther(preview));
      
      // 手动计算预览
      const manualPreview = (testAmount * ethers.parseUnits("1", 18)) / mfcValue;
      console.log("手动计算预览 (MFC):", ethers.formatEther(manualPreview));
      
    } catch (error) {
      console.log("投资预览失败:", error.message);
      
      // 尝试手动计算
      if (mfcValue > 0) {
        const manualPreview = (testAmount * ethers.parseUnits("1", 18)) / mfcValue;
        console.log("手动计算预览 (MFC):", ethers.formatEther(manualPreview));
      }
    }

    // 检查代币余额
    console.log("\n📊 检查基金代币余额...");
    const usdcBalance = await mockUSDC.balanceOf(mockFundAddress);
    console.log("基金 USDC 余额:", ethers.formatUnits(usdcBalance, 6));

    const MockWETH = await ethers.getContractFactory("MockWETH");
    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const MockLINK = await ethers.getContractFactory("MockLINK");
    const MockDAI = await ethers.getContractFactory("MockDAI");

    const mockWETH = MockWETH.attach(wethAddress);
    const mockWBTC = MockWBTC.attach(wbtcAddress);
    const mockLINK = MockLINK.attach(linkAddress);
    const mockDAI = MockDAI.attach(daiAddress);

    const wethBalance = await mockWETH.balanceOf(mockFundAddress);
    const wbtcBalance = await mockWBTC.balanceOf(mockFundAddress);
    const linkBalance = await mockLINK.balanceOf(mockFundAddress);
    const daiBalance = await mockDAI.balanceOf(mockFundAddress);

    console.log("基金代币余额:");
    console.log("  WETH:", ethers.formatEther(wethBalance));
    console.log("  WBTC:", ethers.formatUnits(wbtcBalance, 8));
    console.log("  LINK:", ethers.formatEther(linkBalance));
    console.log("  DAI:", ethers.formatEther(daiBalance));

    // 检查 MFC 代币比例
    console.log("\n📊 检查 MFC 代币比例...");
    const mfcUSDCAmount = await mockFund.mfcUSDCAmount();
    console.log("每个 MFC 包含的 USDC:", ethers.formatUnits(mfcUSDCAmount, 6));

    const supportedTokens = await mockFund.getSupportedTokens();
    for (let i = 0; i < supportedTokens.length; i++) {
      const token = supportedTokens[i];
      const ratio = await mockFund.mfcTokenRatio(token);
      console.log(`每个 MFC 包含的代币 ${token}:`, ratio.toString());
    }

    // 尝试修复投资计算
    console.log("\n📊 尝试修复投资计算...");
    
    // 如果 MFC 价值为 0，说明净值计算有问题
    if (mfcValue === 0n) {
      console.log("❌ MFC 价值为 0，净值计算有问题");
      
      // 检查是否是因为代币价格获取失败
      console.log("\n🔍 检查代币价格...");
      const tokens = [wethAddress, wbtcAddress, linkAddress, daiAddress];
      const symbols = ["WETH", "WBTC", "LINK", "DAI"];
      
      for (let i = 0; i < tokens.length; i++) {
        try {
          const [price, timestamp] = await chainlinkPriceOracle.getLatestPrice(tokens[i]);
          console.log(`${symbols[i]} 价格:`, price.toString(), "时间戳:", timestamp.toString());
        } catch (error) {
          console.log(`${symbols[i]} 价格获取失败:`, error.message);
        }
      }
    } else {
      console.log("✅ MFC 价值正常，可以尝试投资");
      
      // 尝试小额投资
      const smallAmount = ethers.parseUnits("100", 6); // 100 USDC
      try {
        const preview = await mockFund.getInvestmentPreview(smallAmount);
        console.log("小额投资预览 (100 USDC):", ethers.formatEther(preview), "MFC");
      } catch (error) {
        console.log("小额投资预览失败:", error.message);
      }
    }

  } catch (error) {
    console.error("❌ 调试过程中出错:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 