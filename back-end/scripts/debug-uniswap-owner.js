const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 调试UniswapIntegration权限问题...");
  
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
    
    // 检查固定汇率模式
    const useFixedRates = await uniswapIntegration.useFixedRates();
    console.log("使用固定汇率模式:", useFixedRates);
    
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
    
    // 如果owner不匹配，尝试转移所有权
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("\n⚠️ Owner不匹配，尝试转移所有权...");
      try {
        const tx = await uniswapIntegration.transferOwnership(deployer.address);
        await tx.wait();
        console.log("✅ 所有权转移成功");
        
        // 验证新的owner
        const newOwner = await uniswapIntegration.owner();
        console.log("新的owner:", newOwner);
      } catch (error) {
        console.log("❌ 所有权转移失败:", error.message);
      }
    } else {
      console.log("\n✅ Owner匹配，尝试设置固定汇率...");
      
      // 尝试设置一个固定汇率
      try {
        const tx = await uniswapIntegration.setFixedRate(
          deployedTokens.WETH, 
          ethers.parseUnits("3000", 6)
        );
        await tx.wait();
        console.log("✅ 固定汇率设置成功");
      } catch (error) {
        console.log("❌ 固定汇率设置失败:", error.message);
        
        // 尝试启用固定汇率模式
        try {
          console.log("尝试启用固定汇率模式...");
          const tx = await uniswapIntegration.setFixedRateMode(true);
          await tx.wait();
          console.log("✅ 固定汇率模式已启用");
          
          // 再次尝试设置固定汇率
          const tx2 = await uniswapIntegration.setFixedRate(
            deployedTokens.WETH, 
            ethers.parseUnits("3000", 6)
          );
          await tx2.wait();
          console.log("✅ 固定汇率设置成功");
        } catch (error2) {
          console.log("❌ 启用固定汇率模式失败:", error2.message);
        }
      }
    }
    
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