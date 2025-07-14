const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 详细检查UniswapIntegration合约...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  
  // 已部署的合约地址
  const uniswapIntegrationAddress = "0x6ccfC30BD671d5Ad5dcb7b4acc05F603f1d6EB76";
  
  try {
    // 连接到UniswapIntegration合约
    const UniswapIntegration = await ethers.getContractFactory("contracts/UniswapIntegration.sol:UniswapIntegration");
    const uniswapIntegration = UniswapIntegration.attach(uniswapIntegrationAddress);
    
    // 检查合约的owner
    const owner = await uniswapIntegration.owner();
    console.log("UniswapIntegration owner:", owner);
    console.log("部署者地址:", deployer.address);
    console.log("Owner匹配:", owner.toLowerCase() === deployer.address.toLowerCase());
    
    // 检查priceOracle地址
    const priceOracle = await uniswapIntegration.priceOracle();
    console.log("PriceOracle地址:", priceOracle);
    
    // 检查固定汇率模式
    const useFixedRates = await uniswapIntegration.useFixedRates();
    console.log("使用固定汇率模式:", useFixedRates);
    
    // 检查slippageTolerance
    const slippageTolerance = await uniswapIntegration.slippageTolerance();
    console.log("滑点容忍度:", slippageTolerance.toString());
    
    // 检查一些代币的固定汇率
    const deployedTokens = {
      WETH: "0xB6431F9274C3d915d4D3aca47Bb1B79cFcFf544b",
      WBTC: "0xD45596794d85224898596cDEfbA5BfFFcD26E6c7",
      LINK: "0xD6a2f2EdC679f928172b1D8B8bE594c429b2Cc80",
      DAI: "0xa9f2cc90751F4f9e1381a21BF786C2A887B74AeC"
    };
    
    console.log("\n当前固定汇率:");
    for (const [name, address] of Object.entries(deployedTokens)) {
      try {
        const rate = await uniswapIntegration.fixedRates(address);
        console.log(`${name}: ${rate.toString()}`);
      } catch (error) {
        console.log(`${name}: 获取失败 - ${error.message}`);
      }
    }
    
    // 检查authorizedCallers
    console.log("\n授权调用者:");
    const deployerAuthorized = await uniswapIntegration.authorizedCallers(deployer.address);
    console.log("部署者授权:", deployerAuthorized);
    
    // 尝试调用initializeFixedRates函数
    console.log("\n尝试调用initializeFixedRates...");
    try {
      const tx = await uniswapIntegration.initializeFixedRates(
        deployedTokens.WETH,
        deployedTokens.WBTC,
        deployedTokens.LINK,
        deployedTokens.DAI
      );
      await tx.wait();
      console.log("✅ initializeFixedRates调用成功");
    } catch (error) {
      console.log("❌ initializeFixedRates调用失败:", error.message);
    }
    
    // 检查常量值
    console.log("\n常量值:");
    try {
      const usdcPerEth = await uniswapIntegration.USDC_PER_ETH();
      const usdcPerBtc = await uniswapIntegration.USDC_PER_BTC();
      const usdcPerLink = await uniswapIntegration.USDC_PER_LINK();
      const usdcPerDai = await uniswapIntegration.USDC_PER_DAI();
      
      console.log("USDC_PER_ETH:", usdcPerEth.toString());
      console.log("USDC_PER_BTC:", usdcPerBtc.toString());
      console.log("USDC_PER_LINK:", usdcPerLink.toString());
      console.log("USDC_PER_DAI:", usdcPerDai.toString());
    } catch (error) {
      console.log("获取常量失败:", error.message);
    }
    
  } catch (error) {
    console.error("❌ 检查失败:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 