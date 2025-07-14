const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 继续permit功能合约部署（从第8步开始）...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  
  // 使用已经部署的合约地址
  const deployedContracts = {
    MockUSDC: "0x4fCffF7a71255d78EB67182C81235b468CDF0f7A",
    ChainlinkPriceOracle: "0x8b15C6ab5c13BE9Bdaec7A29B50FE80E68241534",
    UniswapIntegration: "0x6ccfC30BD671d5Ad5dcb7b4acc05F603f1d6EB76",
    MockFund: "0x8CFea8e742A017e2616e3a2D6704FCc102f8D63A",
    FundShareToken: "0xb5cCbdbb50e57B420Cf966cbbf273899866F5A63"
  };

  // 使用已经部署的代币地址
  const deployedTokens = {
    WETH: "0xB6431F9274C3d915d4D3aca47Bb1B79cFcFf544b",
    WBTC: "0xD45596794d85224898596cDEfbA5BfFFcD26E6c7",
    LINK: "0xD6a2f2EdC679f928172b1D8B8bE594c429b2Cc80",
    DAI: "0xa9f2cc90751F4f9e1381a21BF786C2A887B74AeC"
  };

  const deploymentData = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    permitVersion: true,
    contracts: deployedContracts,
    tokens: {
      USDC: deployedContracts.MockUSDC,
      ...deployedTokens
    },
    chainlinkFeeds: {
      "ETH": "0x694AA1769357215DE4FAC081bf1f309aDC325306",
      "BTC": "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
      "LINK": "0xc59E3633BAAC79493d908e63626716e204A45EdF",
      "USDC": "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"
    },
    configuration: {
      managementFeeRate: 100,
      supportedTokens: [
        { token: deployedTokens.WETH, allocation: 1250 },
        { token: deployedTokens.WBTC, allocation: 1250 },
        { token: deployedTokens.LINK, allocation: 1250 },
        { token: deployedTokens.DAI, allocation: 1250 }
      ]
    }
  };

  try {
    // 连接到已部署的合约
    console.log("📝 连接到已部署的合约...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
    const UniswapIntegration = await ethers.getContractFactory("contracts/UniswapIntegration.sol:UniswapIntegration");
    const MockFund = await ethers.getContractFactory("contracts/MockFund.sol:MockFund");
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const MockLINK = await ethers.getContractFactory("MockLINK");
    const MockDAI = await ethers.getContractFactory("MockDAI");

    const mockUSDC = MockUSDC.attach(deployedContracts.MockUSDC);
    const priceOracle = ChainlinkPriceOracle.attach(deployedContracts.ChainlinkPriceOracle);
    const uniswapIntegration = UniswapIntegration.attach(deployedContracts.UniswapIntegration);
    const mockFund = MockFund.attach(deployedContracts.MockFund);
    const mockWETH = MockWETH.attach(deployedTokens.WETH);
    const mockWBTC = MockWBTC.attach(deployedTokens.WBTC);
    const mockLINK = MockLINK.attach(deployedTokens.LINK);
    const mockDAI = MockDAI.attach(deployedTokens.DAI);

    console.log("✅ 已连接到已部署的合约");

    // 8. 设置UniswapIntegration
    console.log("📝 8. 设置UniswapIntegration...");
    await uniswapIntegration.setFixedRate(deployedTokens.WETH, ethers.parseUnits("3000", 6)); // $3000
    await uniswapIntegration.setFixedRate(deployedTokens.WBTC, ethers.parseUnits("118000", 6)); // $118,000
    await uniswapIntegration.setFixedRate(deployedTokens.LINK, ethers.parseUnits("15", 6)); // $15
    await uniswapIntegration.setFixedRate(deployedTokens.DAI, ethers.parseUnits("1", 6)); // $1
    console.log("✅ UniswapIntegration固定汇率已设置");

    // 显示设置的固定汇率
    const wethRate = await uniswapIntegration.getFixedRate(deployedTokens.WETH);
    const wbtcRate = await uniswapIntegration.getFixedRate(deployedTokens.WBTC);
    const linkRate = await uniswapIntegration.getFixedRate(deployedTokens.LINK);
    const daiRate = await uniswapIntegration.getFixedRate(deployedTokens.DAI);

    console.log("FixedRate for", deployedTokens.WETH + ":", wethRate.toString());
    console.log("FixedRate for", deployedTokens.WBTC + ":", wbtcRate.toString());
    console.log("FixedRate for", deployedTokens.LINK + ":", linkRate.toString());
    console.log("FixedRate for", deployedTokens.DAI + ":", daiRate.toString());

    // 9. 添加流动性
    console.log("📝 9. 添加流动性...");
    const liquidityAmount = ethers.parseUnits("1000000", 6); // 1M USDC worth of each token
    
    // 为UniswapIntegration添加代币余额
    await mockWETH.mint(deployedContracts.UniswapIntegration, ethers.parseEther("333")); // 333 WETH = ~1M USDC
    await mockWBTC.mint(deployedContracts.UniswapIntegration, ethers.parseUnits("8.5", 8)); // 8.5 WBTC = ~1M USDC
    await mockLINK.mint(deployedContracts.UniswapIntegration, ethers.parseEther("66667")); // 66667 LINK = ~1M USDC
    await mockDAI.mint(deployedContracts.UniswapIntegration, ethers.parseEther("1000000")); // 1M DAI = ~1M USDC
    await mockUSDC.mint(deployedContracts.UniswapIntegration, ethers.parseUnits("1000000", 6)); // 1M USDC

    console.log("✅ 流动性已添加");

    // 10. 初始化基金
    console.log("📝 10. 初始化基金...");
    await mockFund.initializeFund(ethers.parseUnits("1000000", 6)); // 1M USDC
    console.log("✅ 基金已初始化");

    // 11. 保存部署信息
    console.log("📝 11. 保存部署信息...");
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const permitDeploymentsDir = path.join(deploymentsDir, "permit-version");
    
    // 创建permit-version目录
    if (!fs.existsSync(permitDeploymentsDir)) {
      fs.mkdirSync(permitDeploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(permitDeploymentsDir, "sepolia-deployment.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log("✅ 部署信息已保存到:", deploymentFile);

    // 12. 显示部署总结
    console.log("\n🎉 部署完成！支持permit功能的合约已成功部署到Sepolia测试网");
    console.log("\n📋 部署总结:");
    console.log("MockUSDC (支持permit):", deployedContracts.MockUSDC);
    console.log("ChainlinkPriceOracle:", deployedContracts.ChainlinkPriceOracle);
    console.log("UniswapIntegration:", deployedContracts.UniswapIntegration);
    console.log("MockFund:", deployedContracts.MockFund);
    console.log("FundShareToken:", deployedContracts.FundShareToken);
    console.log("\n代币地址:");
    console.log("WETH:", deployedTokens.WETH);
    console.log("WBTC:", deployedTokens.WBTC);
    console.log("LINK:", deployedTokens.LINK);
    console.log("DAI:", deployedTokens.DAI);
    console.log("\n部署信息已保存到: deployments/permit-version/sepolia-deployment.json");

  } catch (error) {
    console.error("❌ 部署失败:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 