const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 调试新部署合约的初始化问题...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 新部署的合约地址
  const mockUSDCAddress = "0x3664cB1F94442d995f9Ae62062CB26f5A77F58CB";
  const mockFundAddress = "0x92053436b6D0758EcFb765C86a71b2dC4228DEa0";
  const chainlinkPriceOracleAddress = "0x5FCD8EbE1B61e7037002cDc33dBCAA91c7AeD5c0";
  const uniswapIntegrationAddress = "0x427f38fCA385A1C57e6b4995474457939CD03aAF";
  const wethAddress = "0xA07EA61f3401eD18d333D47C3bC860070df39205";
  const wbtcAddress = "0x29371fc64Fe735Df95940D83aD5E9a8053804709";
  const linkAddress = "0xE9235b4915D8248526895994d93F6d4c06B0dABb";
  const daiAddress = "0x4c094e79fca22E0ec335015d65E9B1DcED8EE7Cf";

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

    // 更新部署记录
    console.log("\n💾 更新部署记录...");
    const addresses = {
      network: "sepolia",
      deployer: deployer.address,
      contracts: {
        MockUSDC: mockUSDCAddress,
        MockFund: mockFundAddress,
        FundShareToken: await mockFund.shareToken(),
        ChainlinkPriceOracle: chainlinkPriceOracleAddress,
        UniswapIntegration: uniswapIntegrationAddress,
        MockTokensFactory: "0xF789421d1ed0D65c65aa076CB119bfBc028f554D",
        tokens: {
          WETH: wethAddress,
          WBTC: wbtcAddress,
          LINK: linkAddress,
          DAI: daiAddress
        }
      },
      deploymentTime: new Date().toISOString(),
      description: "修正精度问题后的完整部署"
    };

    const fs = require('fs');
    const path = require('path');
    const deploymentFile = path.join(__dirname, '..', 'deployments', 'sepolia.json');
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log("✅ 部署信息已更新到:", deploymentFile);

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