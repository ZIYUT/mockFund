const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 调试基金初始化问题...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 合约地址（从部署输出中获取）
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

    const mockUSDC = MockUSDC.attach(mockUSDCAddress);
    const mockFund = MockFund.attach(mockFundAddress);
    const chainlinkPriceOracle = ChainlinkPriceOracle.attach(chainlinkPriceOracleAddress);
    const uniswapIntegration = UniswapIntegration.attach(uniswapIntegrationAddress);

    console.log("\n📊 检查合约状态...");

    // 检查 MockFund 状态
    const fundStats = await mockFund.getFundStats();
    console.log("基金状态:", {
      totalSupply: ethers.formatEther(fundStats[0]),
      initialSupply: ethers.formatEther(fundStats[1]),
      isInitialized: fundStats[2]
    });

    // 检查支持的代币
    const supportedTokens = await mockFund.getSupportedTokens();
    console.log("支持的代币数量:", supportedTokens.length);

    // 检查 USDC 地址
    const usdcToken = await mockFund.getUSDCAddress();
    console.log("USDC 代币地址:", usdcToken);

    // 检查价格预言机配置
    console.log("\n🔍 检查价格预言机配置...");
    
    const tokens = [wethAddress, wbtcAddress, linkAddress, daiAddress, mockUSDCAddress];
    const symbols = ["ETH", "BTC", "LINK", "DAI", "USDC"];
    
    for (let i = 0; i < tokens.length; i++) {
      try {
        const priceFeed = await chainlinkPriceOracle.priceFeeds(tokens[i]);
        console.log(`${symbols[i]} 价格预言机:`, priceFeed);
        
        if (priceFeed !== "0x0000000000000000000000000000000000000000") {
          const [price, timestamp] = await chainlinkPriceOracle.getLatestPrice(tokens[i]);
          console.log(`${symbols[i]} 价格:`, price.toString(), "时间戳:", timestamp.toString());
        }
      } catch (error) {
        console.log(`${symbols[i]} 价格获取失败:`, error.message);
      }
    }

    // 检查 UniswapIntegration 配置
    console.log("\n🔍 检查 UniswapIntegration 配置...");
    const priceOracleInUniswap = await uniswapIntegration.priceOracle();
    console.log("UniswapIntegration 中的价格预言机:", priceOracleInUniswap);

    // 检查代币余额
    console.log("\n💰 检查代币余额...");
    const usdcBalance = await mockUSDC.balanceOf(deployer.address);
    console.log("部署者 USDC 余额:", ethers.formatUnits(usdcBalance, 6));

    const fundUSDCBalance = await mockUSDC.balanceOf(mockFundAddress);
    console.log("基金合约 USDC 余额:", ethers.formatUnits(fundUSDCBalance, 6));

    // 检查授权
    const allowance = await mockUSDC.allowance(deployer.address, mockFundAddress);
    console.log("USDC 授权额度:", ethers.formatUnits(allowance, 6));

    // 尝试获取投资预览
    console.log("\n🔍 尝试获取投资预览...");
    try {
      const testAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      const preview = await mockFund.getInvestmentPreview(testAmount);
      console.log("投资 1000 USDC 预览:", ethers.formatEther(preview), "MFC");
    } catch (error) {
      console.log("投资预览失败:", error.message);
    }

    // 检查 UniswapIntegration 中的代币余额
    console.log("\n🔍 检查 UniswapIntegration 代币余额...");
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const MockLINK = await ethers.getContractFactory("MockLINK");
    const MockDAI = await ethers.getContractFactory("MockDAI");

    const mockWETH = MockWETH.attach(wethAddress);
    const mockWBTC = MockWBTC.attach(wbtcAddress);
    const mockLINK = MockLINK.attach(linkAddress);
    const mockDAI = MockDAI.attach(daiAddress);

    const wethBalance = await mockWETH.balanceOf(uniswapIntegrationAddress);
    const wbtcBalance = await mockWBTC.balanceOf(uniswapIntegrationAddress);
    const linkBalance = await mockLINK.balanceOf(uniswapIntegrationAddress);
    const daiBalance = await mockDAI.balanceOf(uniswapIntegrationAddress);
    const usdcBalanceInUniswap = await mockUSDC.balanceOf(uniswapIntegrationAddress);

    console.log("UniswapIntegration 代币余额:");
    console.log("  WETH:", ethers.formatEther(wethBalance));
    console.log("  WBTC:", ethers.formatUnits(wbtcBalance, 8));
    console.log("  LINK:", ethers.formatEther(linkBalance));
    console.log("  DAI:", ethers.formatEther(daiBalance));
    console.log("  USDC:", ethers.formatUnits(usdcBalanceInUniswap, 6));

    // 尝试手动初始化基金
    console.log("\n🚀 尝试手动初始化基金...");
    
    const initialAmount = ethers.parseUnits("1000000", 6); // 100万 USDC
    
    // 确保有足够的 USDC
    if (usdcBalance < initialAmount) {
      console.log("铸造更多 USDC...");
      await mockUSDC.mint(deployer.address, initialAmount);
    }
    
    // 确保有足够的授权
    if (allowance < initialAmount) {
      console.log("增加 USDC 授权...");
      await mockUSDC.approve(mockFundAddress, initialAmount);
    }
    
    // 尝试初始化
    console.log("调用 initializeFund...");
    const tx = await mockFund.initializeFund(initialAmount);
    await tx.wait();
    console.log("✅ 基金初始化成功！");

  } catch (error) {
    console.error("❌ 调试过程中出错:", error);
    
    // 尝试获取更详细的错误信息
    if (error.data) {
      console.log("错误数据:", error.data);
    }
    if (error.reason) {
      console.log("错误原因:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 