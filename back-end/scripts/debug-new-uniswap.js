const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 调试新部署的UniswapIntegration...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  
  // 新部署的UniswapIntegration地址
  const newUniswapAddress = "0x062f607638Dbb06Acdfd61880307E86d478f5462";
  
  const deployedTokens = {
    WETH: "0xB6431F9274C3d915d4D3aca47Bb1B79cFcFf544b",
    WBTC: "0xD45596794d85224898596cDEfbA5BfFFcD26E6c7",
    LINK: "0xD6a2f2EdC679f928172b1D8B8bE594c429b2Cc80",
    DAI: "0xa9f2cc90751F4f9e1381a21BF786C2A887B74AeC"
  };

  try {
    // 连接到新的UniswapIntegration合约
    const UniswapIntegration = await ethers.getContractFactory("contracts/UniswapIntegration.sol:UniswapIntegration");
    const uniswapIntegration = UniswapIntegration.attach(newUniswapAddress);
    
    // 检查owner
    const owner = await uniswapIntegration.owner();
    console.log("新的UniswapIntegration owner:", owner);
    console.log("部署者地址:", deployer.address);
    console.log("Owner匹配:", owner.toLowerCase() === deployer.address.toLowerCase());
    
    // 检查priceOracle
    const priceOracle = await uniswapIntegration.priceOracle();
    console.log("PriceOracle地址:", priceOracle);
    
    // 检查固定汇率模式
    const useFixedRates = await uniswapIntegration.useFixedRates();
    console.log("使用固定汇率模式:", useFixedRates);
    
    // 检查当前固定汇率
    console.log("\n当前固定汇率:");
    for (const [name, address] of Object.entries(deployedTokens)) {
      try {
        const rate = await uniswapIntegration.fixedRates(address);
        console.log(`${name}: ${rate.toString()}`);
      } catch (error) {
        console.log(`${name}: 获取失败 - ${error.message}`);
      }
    }
    
    // 尝试重新设置固定汇率
    console.log("\n📝 重新设置固定汇率...");
    try {
      const tx1 = await uniswapIntegration.setFixedRate(deployedTokens.WETH, ethers.parseUnits("3000", 6));
      await tx1.wait();
      console.log("✅ WETH固定汇率设置成功");
    } catch (error) {
      console.log("❌ WETH固定汇率设置失败:", error.message);
    }
    
    try {
      const tx2 = await uniswapIntegration.setFixedRate(deployedTokens.WBTC, ethers.parseUnits("118000", 6));
      await tx2.wait();
      console.log("✅ WBTC固定汇率设置成功");
    } catch (error) {
      console.log("❌ WBTC固定汇率设置失败:", error.message);
    }
    
    try {
      const tx3 = await uniswapIntegration.setFixedRate(deployedTokens.LINK, ethers.parseUnits("15", 6));
      await tx3.wait();
      console.log("✅ LINK固定汇率设置成功");
    } catch (error) {
      console.log("❌ LINK固定汇率设置失败:", error.message);
    }
    
    try {
      const tx4 = await uniswapIntegration.setFixedRate(deployedTokens.DAI, ethers.parseUnits("1", 6));
      await tx4.wait();
      console.log("✅ DAI固定汇率设置成功");
    } catch (error) {
      console.log("❌ DAI固定汇率设置失败:", error.message);
    }
    
    // 启用固定汇率模式
    try {
      const tx5 = await uniswapIntegration.setFixedRateMode(true);
      await tx5.wait();
      console.log("✅ 固定汇率模式启用成功");
    } catch (error) {
      console.log("❌ 固定汇率模式启用失败:", error.message);
    }
    
    // 再次检查固定汇率
    console.log("\n设置后的固定汇率:");
    for (const [name, address] of Object.entries(deployedTokens)) {
      try {
        const rate = await uniswapIntegration.fixedRates(address);
        console.log(`${name}: ${rate.toString()}`);
      } catch (error) {
        console.log(`${name}: 获取失败 - ${error.message}`);
      }
    }
    
    const newUseFixedRates = await uniswapIntegration.useFixedRates();
    console.log("使用固定汇率模式:", newUseFixedRates);
    
  } catch (error) {
    console.error("❌ 调试失败:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 