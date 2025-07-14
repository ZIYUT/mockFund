const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 调试新部署的MockFund合约...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  
  // 新部署的MockFund地址
  const newMockFundAddress = "0x4f302f0F58DC884Cd59Bb7e2fEa4Af2749aeb4B6";
  
  const deployedTokens = {
    WETH: "0xB6431F9274C3d915d4D3aca47Bb1B79cFcFf544b",
    WBTC: "0xD45596794d85224898596cDEfbA5BfFFcD26E6c7",
    LINK: "0xD6a2f2EdC679f928172b1D8B8bE594c429b2Cc80",
    DAI: "0xa9f2cc90751F4f9e1381a21BF786C2A887B74AeC"
  };

  try {
    // 连接到新的MockFund合约
    const MockFund = await ethers.getContractFactory("contracts/MockFund.sol:MockFund");
    const mockFund = MockFund.attach(newMockFundAddress);
    
    // 检查基本信息
    console.log("📝 检查基本信息...");
    const owner = await mockFund.owner();
    const shareToken = await mockFund.shareToken();
    const priceOracle = await mockFund.priceOracle();
    const uniswapIntegration = await mockFund.uniswapIntegration();
    const managementFeeRate = await mockFund.managementFeeRate();
    const isInitialized = await mockFund.isInitialized();
    
    console.log("Owner:", owner);
    console.log("ShareToken:", shareToken);
    console.log("PriceOracle:", priceOracle);
    console.log("UniswapIntegration:", uniswapIntegration);
    console.log("ManagementFeeRate:", managementFeeRate.toString());
    console.log("IsInitialized:", isInitialized);
    
    // 检查支持的代币数量
    console.log("\n📝 检查支持的代币...");
    const supportedTokens = await mockFund.getSupportedTokens();
    console.log("支持的代币数量:", supportedTokens.length);
    console.log("支持的代币:", supportedTokens);
    
    // 检查每个支持的代币
    for (let i = 0; i < supportedTokens.length; i++) {
      console.log(`代币 ${i}:`, supportedTokens[i]);
    }
    
    // 尝试添加支持的代币
    console.log("\n📝 尝试添加支持的代币...");
    try {
      const tx1 = await mockFund.addSupportedToken(deployedTokens.WETH, 1250);
      await tx1.wait();
      console.log("✅ WETH添加成功");
    } catch (error) {
      console.log("❌ WETH添加失败:", error.message);
    }
    
    try {
      const tx2 = await mockFund.addSupportedToken(deployedTokens.WBTC, 1250);
      await tx2.wait();
      console.log("✅ WBTC添加成功");
    } catch (error) {
      console.log("❌ WBTC添加失败:", error.message);
    }
    
    try {
      const tx3 = await mockFund.addSupportedToken(deployedTokens.LINK, 1250);
      await tx3.wait();
      console.log("✅ LINK添加成功");
    } catch (error) {
      console.log("❌ LINK添加失败:", error.message);
    }
    
    try {
      const tx4 = await mockFund.addSupportedToken(deployedTokens.DAI, 1250);
      await tx4.wait();
      console.log("✅ DAI添加成功");
    } catch (error) {
      console.log("❌ DAI添加失败:", error.message);
    }
    
    // 再次检查支持的代币数量
    console.log("\n📝 再次检查支持的代币...");
    const newSupportedTokens = await mockFund.getSupportedTokens();
    console.log("支持的代币数量:", newSupportedTokens.length);
    console.log("支持的代币:", newSupportedTokens);
    
    // 如果代币数量正确，尝试初始化基金
    if (newSupportedTokens.length == 4) {
      console.log("\n📝 尝试初始化基金...");
      
      // 首先为部署者铸造USDC
      const MockUSDC = await ethers.getContractFactory("MockUSDC");
      const mockUSDC = MockUSDC.attach("0x4fCffF7a71255d78EB67182C81235b468CDF0f7A");
      
      try {
        const mintTx = await mockUSDC.mint(deployer.address, ethers.parseUnits("1000000", 6));
        await mintTx.wait();
        console.log("✅ USDC铸造成功");
      } catch (error) {
        console.log("❌ USDC铸造失败:", error.message);
      }
      
      // 批准MockFund使用USDC
      try {
        const approveTx = await mockUSDC.approve(newMockFundAddress, ethers.parseUnits("1000000", 6));
        await approveTx.wait();
        console.log("✅ USDC授权成功");
      } catch (error) {
        console.log("❌ USDC授权失败:", error.message);
      }
      
      // 初始化基金
      try {
        const initTx = await mockFund.initializeFund(ethers.parseUnits("1000000", 6));
        await initTx.wait();
        console.log("✅ 基金初始化成功");
      } catch (error) {
        console.log("❌ 基金初始化失败:", error.message);
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