const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查UniswapIntegration状态...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 合约地址
  const uniswapIntegrationAddress = "0x08f6628a0aCC60Fb0B1FE3B3136d042140831F8a";
  const mockUSDCAddress = "0x62320274bc84147Fd245a587B32F3f56af823eAe";
  const wethAddress = "0x21AC6C404AEA60dc657d7BC341ff8a72Cc0755B9";

  try {
    // 获取合约实例
    const uniswapIntegration = await ethers.getContractAt("UniswapIntegration", uniswapIntegrationAddress);
    const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
    const weth = await ethers.getContractAt("MockWETH", wethAddress);

    console.log("\n=== UniswapIntegration 状态 ===");
    
    // 检查合约余额
    const usdcBalance = await mockUSDC.balanceOf(uniswapIntegrationAddress);
    const wethBalance = await weth.balanceOf(uniswapIntegrationAddress);
    
    console.log("UniswapIntegration USDC余额:", ethers.formatUnits(usdcBalance, 6));
    console.log("UniswapIntegration WETH余额:", ethers.formatUnits(wethBalance, 18));

    // 尝试小额交换测试
    console.log("\n=== 测试小额交换 ===");
    const testAmount = ethers.parseUnits("100", 6); // 100 USDC
    
    // 给部署者一些USDC用于测试
    await mockUSDC.mint(deployer.address, testAmount);
    console.log("✅ 铸造100 USDC给部署者用于测试");
    
    // 授权UniswapIntegration使用USDC
    await mockUSDC.approve(uniswapIntegrationAddress, testAmount);
    console.log("✅ 授权UniswapIntegration使用100 USDC");
    
    try {
      // 尝试交换
      const tx = await uniswapIntegration.swapExactInputSingle(
        mockUSDCAddress,
        wethAddress,
        testAmount,
        deployer.address,
        3000 // 0.3% fee
      );
      await tx.wait();
      console.log("✅ 小额交换测试成功");
    } catch (swapError) {
      console.log("❌ 小额交换测试失败:", swapError.message);
    }

  } catch (error) {
    console.error("❌ 检查失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });