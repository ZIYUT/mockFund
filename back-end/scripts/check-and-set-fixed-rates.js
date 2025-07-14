const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查并设置固定汇率...");

  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 新MockFund地址
  const mockFundAddress = "0x4f302f0F58DC884Cd59Bb7e2fEa4Af2749aeb4B6";

  const deployedTokens = {
    WETH: "0xB6431F9274C3d915d4D3aca47Bb1B79cFcFf544b",
    WBTC: "0xD45596794d85224898596cDEfbA5BfFFcD26E6c7",
    LINK: "0xD6a2f2EdC679f928172b1D8B8bE594c429b2Cc80",
    DAI: "0xa9f2cc90751F4f9e1381a21BF786C2A887B74AeC"
  };

  try {
    // 连接MockFund合约
    const MockFund = await ethers.getContractFactory("contracts/MockFund.sol:MockFund");
    const mockFund = MockFund.attach(mockFundAddress);

    // 获取UniswapIntegration地址
    const uniswapIntegrationAddress = await mockFund.uniswapIntegration();
    console.log("MockFund使用的UniswapIntegration地址:", uniswapIntegrationAddress);

    // 连接UniswapIntegration合约
    const UniswapIntegration = await ethers.getContractFactory("contracts/UniswapIntegration.sol:UniswapIntegration");
    const uniswapIntegration = UniswapIntegration.attach(uniswapIntegrationAddress);

    // 检查owner
    const owner = await uniswapIntegration.owner();
    console.log("UniswapIntegration owner:", owner);
    console.log("部署者地址:", deployer.address);
    console.log("Owner匹配:", owner.toLowerCase() === deployer.address.toLowerCase());

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

    // 如果owner匹配，设置固定汇率
    if (owner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("\n📝 设置固定汇率...");
      
      // 检查是否需要设置固定汇率
      const wethRate = await uniswapIntegration.fixedRates(deployedTokens.WETH);
      if (wethRate == 0) {
        console.log("设置固定汇率...");
        await uniswapIntegration.setFixedRate(deployedTokens.WETH, ethers.parseUnits("3000", 6));
        await uniswapIntegration.setFixedRate(deployedTokens.WBTC, ethers.parseUnits("118000", 6));
        await uniswapIntegration.setFixedRate(deployedTokens.LINK, ethers.parseUnits("15", 6));
        await uniswapIntegration.setFixedRate(deployedTokens.DAI, ethers.parseUnits("1", 6));
        console.log("✅ 固定汇率设置成功");
      } else {
        console.log("✅ 固定汇率已设置");
      }

      // 启用固定汇率模式
      if (!useFixedRates) {
        console.log("启用固定汇率模式...");
        await uniswapIntegration.setFixedRateMode(true);
        console.log("✅ 固定汇率模式已启用");
      } else {
        console.log("✅ 固定汇率模式已启用");
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
    } else {
      console.log("❌ Owner不匹配，无法设置固定汇率");
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