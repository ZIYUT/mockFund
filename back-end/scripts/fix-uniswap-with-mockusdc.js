const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 使用MockUSDC作为owner修复UniswapIntegration...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  
  // 已部署的合约地址
  const deployedContracts = {
    MockUSDC: "0x4fCffF7a71255d78EB67182C81235b468CDF0f7A",
    UniswapIntegration: "0x6ccfC30BD671d5Ad5dcb7b4acc05F603f1d6EB76"
  };

  const deployedTokens = {
    WETH: "0xB6431F9274C3d915d4D3aca47Bb1B79cFcFf544b",
    WBTC: "0xD45596794d85224898596cDEfbA5BfFFcD26E6c7",
    LINK: "0xD6a2f2EdC679f928172b1D8B8bE594c429b2Cc80",
    DAI: "0xa9f2cc90751F4f9e1381a21BF786C2A887B74AeC"
  };

  try {
    // 连接到合约
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const UniswapIntegration = await ethers.getContractFactory("contracts/UniswapIntegration.sol:UniswapIntegration");
    
    const mockUSDC = MockUSDC.attach(deployedContracts.MockUSDC);
    const uniswapIntegration = UniswapIntegration.attach(deployedContracts.UniswapIntegration);
    
    console.log("✅ 已连接到合约");
    
    // 检查owner
    const owner = await uniswapIntegration.owner();
    console.log("UniswapIntegration owner:", owner);
    console.log("MockUSDC地址:", deployedContracts.MockUSDC);
    console.log("Owner匹配:", owner.toLowerCase() === deployedContracts.MockUSDC.toLowerCase());
    
    // 由于owner是MockUSDC，我们需要通过MockUSDC来调用UniswapIntegration的函数
    // 但是MockUSDC合约没有这些函数，所以我们需要重新部署UniswapIntegration
    
    console.log("\n📝 重新部署UniswapIntegration...");
    
    // 获取priceOracle地址
    const priceOracleAddress = await uniswapIntegration.priceOracle();
    console.log("PriceOracle地址:", priceOracleAddress);
    
    // 重新部署UniswapIntegration，使用正确的owner
    const newUniswapIntegration = await UniswapIntegration.deploy(deployer.address, priceOracleAddress);
    await newUniswapIntegration.waitForDeployment();
    const newUniswapAddress = await newUniswapIntegration.getAddress();
    
    console.log("✅ 新的UniswapIntegration已部署:", newUniswapAddress);
    
    // 设置固定汇率
    console.log("\n📝 设置固定汇率...");
    await newUniswapIntegration.setFixedRate(deployedTokens.WETH, ethers.parseUnits("3000", 6)); // $3000
    await newUniswapIntegration.setFixedRate(deployedTokens.WBTC, ethers.parseUnits("118000", 6)); // $118,000
    await newUniswapIntegration.setFixedRate(deployedTokens.LINK, ethers.parseUnits("15", 6)); // $15
    await newUniswapIntegration.setFixedRate(deployedTokens.DAI, ethers.parseUnits("1", 6)); // $1
    
    console.log("✅ 固定汇率已设置");
    
    // 启用固定汇率模式
    await newUniswapIntegration.setFixedRateMode(true);
    console.log("✅ 固定汇率模式已启用");
    
    // 验证设置
    console.log("\n📝 验证设置...");
    const wethRate = await newUniswapIntegration.getFixedRate(deployedTokens.WETH);
    const wbtcRate = await newUniswapIntegration.getFixedRate(deployedTokens.WBTC);
    const linkRate = await newUniswapIntegration.getFixedRate(deployedTokens.LINK);
    const daiRate = await newUniswapIntegration.getFixedRate(deployedTokens.DAI);
    const useFixedRates = await newUniswapIntegration.useFixedRates();
    
    console.log("WETH固定汇率:", wethRate.toString());
    console.log("WBTC固定汇率:", wbtcRate.toString());
    console.log("LINK固定汇率:", linkRate.toString());
    console.log("DAI固定汇率:", daiRate.toString());
    console.log("使用固定汇率模式:", useFixedRates);
    
    // 更新MockFund中的UniswapIntegration地址
    console.log("\n📝 更新MockFund中的UniswapIntegration地址...");
    const MockFund = await ethers.getContractFactory("contracts/MockFund.sol:MockFund");
    const mockFund = MockFund.attach("0x8CFea8e742A017e2616e3a2D6704FCc102f8D63A");
    
    await mockFund.setUniswapIntegration(newUniswapAddress);
    console.log("✅ MockFund中的UniswapIntegration地址已更新");
    
    // 保存新的地址
    console.log("\n📝 保存新的部署信息...");
    const fs = require("fs");
    const path = require("path");
    
    const deploymentData = {
      network: "sepolia",
      chainId: 11155111,
      deployer: deployer.address,
      deploymentTime: new Date().toISOString(),
      permitVersion: true,
      contracts: {
        MockUSDC: deployedContracts.MockUSDC,
        ChainlinkPriceOracle: "0x8b15C6ab5c13BE9Bdaec7A29B50FE80E68241534",
        UniswapIntegration: newUniswapAddress, // 新的地址
        MockFund: "0x8CFea8e742A017e2616e3a2D6704FCc102f8D63A",
        FundShareToken: "0xb5cCbdbb50e57B420Cf966cbbf273899866F5A63"
      },
      tokens: {
        USDC: deployedContracts.MockUSDC,
        ...deployedTokens
      }
    };
    
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const permitDeploymentsDir = path.join(deploymentsDir, "permit-version");
    
    if (!fs.existsSync(permitDeploymentsDir)) {
      fs.mkdirSync(permitDeploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(permitDeploymentsDir, "sepolia-deployment-fixed.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log("✅ 新的部署信息已保存到:", deploymentFile);
    
    console.log("\n🎉 修复完成！");
    console.log("新的UniswapIntegration地址:", newUniswapAddress);
    console.log("旧的UniswapIntegration地址:", deployedContracts.UniswapIntegration);
    
  } catch (error) {
    console.error("❌ 修复失败:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 