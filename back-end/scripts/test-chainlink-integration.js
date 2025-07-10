const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 测试 Chainlink 集成和基金功能...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  // 使用部署者账户作为投资者进行测试
  const investor = deployer;
  console.log("投资者地址:", investor.address);

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
    const UniswapIntegration = await ethers.getContractFactory("UniswapIntegration");
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const MockLINK = await ethers.getContractFactory("MockLINK");
    const MockDAI = await ethers.getContractFactory("MockDAI");

    const mockUSDC = MockUSDC.attach(mockUSDCAddress);
    const mockFund = MockFund.attach(mockFundAddress);
    const chainlinkPriceOracle = ChainlinkPriceOracle.attach(chainlinkPriceOracleAddress);
    const uniswapIntegration = UniswapIntegration.attach(uniswapIntegrationAddress);
    const mockWETH = MockWETH.attach(wethAddress);
    const mockWBTC = MockWBTC.attach(wbtcAddress);
    const mockLINK = MockLINK.attach(linkAddress);
    const mockDAI = MockDAI.attach(daiAddress);

    console.log("\n📊 测试 1: 检查基金状态");
    const fundStats = await mockFund.getFundStats();
    console.log("基金状态:", {
      totalSupply: ethers.formatEther(fundStats[0]),
      initialSupply: ethers.formatEther(fundStats[1]),
      isInitialized: fundStats[2]
    });

    console.log("\n📊 测试 2: 获取 Chainlink 实时价格");
    const tokens = [
      { address: wethAddress, symbol: "ETH", decimals: 18 },
      { address: wbtcAddress, symbol: "BTC", decimals: 8 },
      { address: linkAddress, symbol: "LINK", decimals: 18 },
      { address: daiAddress, symbol: "DAI", decimals: 18 },
      { address: mockUSDCAddress, symbol: "USDC", decimals: 6 }
    ];

    for (const token of tokens) {
      try {
        const [price, timestamp] = await chainlinkPriceOracle.getLatestPrice(token.address);
        const formattedPrice = ethers.formatUnits(price, 8); // Chainlink 价格通常是 8 位小数
        console.log(`${token.symbol}: $${formattedPrice} (时间戳: ${timestamp})`);
      } catch (error) {
        console.log(`${token.symbol}: 价格获取失败 - ${error.message}`);
      }
    }

    console.log("\n📊 测试 3: 计算基金净值");
    try {
      const nav = await mockFund.calculateNAV();
      console.log("基金净值 (USDC):", ethers.formatUnits(nav, 6));
    } catch (error) {
      console.log("净值计算失败:", error.message);
    }

    console.log("\n📊 测试 4: 为投资者铸造测试 USDC");
    const testAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
    await mockUSDC.mint(investor.address, testAmount);
    const investorBalance = await mockUSDC.balanceOf(investor.address);
    console.log("投资者 USDC 余额:", ethers.formatUnits(investorBalance, 6));

    console.log("\n📊 测试 5: 投资预览");
    const investmentAmount = ethers.parseUnits("1000", 6); // 1,000 USDC
    try {
      const preview = await mockFund.getInvestmentPreview(investmentAmount);
      console.log("投资 1,000 USDC 将获得:", ethers.formatEther(preview), "MFC");
    } catch (error) {
      console.log("投资预览失败:", error.message);
    }

    console.log("\n📊 测试 6: 执行投资");
    // 连接投资者账户
    const mockUSDCWithInvestor = mockUSDC.connect(investor);
    const mockFundWithInvestor = mockFund.connect(investor);

    // 授权
    await mockUSDCWithInvestor.approve(mockFundAddress, investmentAmount);
    console.log("USDC 授权完成");

    // 投资
    const tx = await mockFundWithInvestor.invest(investmentAmount);
    await tx.wait();
    console.log("✅ 投资成功！");

    // 检查投资结果
    const fundShareToken = await mockFund.getFundShareToken();
    const FundShareToken = await ethers.getContractFactory("FundShareToken");
    const shareToken = FundShareToken.attach(fundShareToken);
    
    const investorShares = await shareToken.balanceOf(investor.address);
    console.log("投资者获得的 MFC 份额:", ethers.formatEther(investorShares));

    console.log("\n📊 测试 7: 赎回预览");
    try {
      const redemptionPreview = await mockFund.getRedemptionPreview(investorShares);
      console.log("赎回所有份额将获得:", ethers.formatUnits(redemptionPreview, 6), "USDC");
    } catch (error) {
      console.log("赎回预览失败:", error.message);
    }

    console.log("\n📊 测试 8: 检查投资组合分配");
    const portfolio = await mockFund.getPortfolioAllocation();
    console.log("投资组合分配:");
    for (let i = 0; i < portfolio.tokens.length; i++) {
      const token = portfolio.tokens[i];
      const allocation = portfolio.allocations[i];
      console.log(`  ${token}: ${allocation}%`);
    }

    console.log("\n📊 测试 9: 检查 UniswapIntegration 汇率");
    try {
      const usdcAmount = ethers.parseUnits("1000", 6);
      const wethAmount = await uniswapIntegration.getAmountOut(mockUSDCAddress, wethAddress, usdcAmount);
      console.log("1,000 USDC 可兑换 WETH:", ethers.formatEther(wethAmount));
    } catch (error) {
      console.log("汇率查询失败:", error.message);
    }

    console.log("\n✅ 所有测试完成！");

  } catch (error) {
    console.error("❌ 测试过程中出错:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 