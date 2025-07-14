const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 只做USDC授权和基金初始化...");

  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 新MockFund和MockUSDC地址
  const mockFundAddress = "0x4f302f0F58DC884Cd59Bb7e2fEa4Af2749aeb4B6";
  const mockUSDCAddress = "0x4fCffF7a71255d78EB67182C81235b468CDF0f7A";

  try {
    // 连接合约
    const MockFund = await ethers.getContractFactory("contracts/MockFund.sol:MockFund");
    const mockFund = MockFund.attach(mockFundAddress);
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = MockUSDC.attach(mockUSDCAddress);

    // 检查是否已初始化
    const isInitialized = await mockFund.isInitialized();
    if (isInitialized) {
      console.log("⚠️ 基金已初始化，无需重复操作。");
      return;
    }

    // 设置USDC地址
    console.log("📝 设置USDC地址...");
    const setUSDCTx = await mockFund.setUSDCToken(mockUSDCAddress);
    await setUSDCTx.wait();
    console.log("✅ USDC地址设置成功");

    // 为部署者铸造USDC
    const mintAmount = ethers.parseUnits("1000000", 6);
    const deployerUSDC = await mockUSDC.balanceOf(deployer.address);
    if (deployerUSDC < mintAmount) {
      console.log("🪙 为部署者铸造USDC...");
      const mintTx = await mockUSDC.mint(deployer.address, mintAmount);
      await mintTx.wait();
      console.log("✅ USDC铸造成功");
    } else {
      console.log("✅ 部署者USDC余额充足");
    }

    // 授权MockFund使用USDC
    const allowance = await mockUSDC.allowance(deployer.address, mockFundAddress);
    if (allowance < mintAmount) {
      console.log("📝 授权MockFund使用USDC...");
      const approveTx = await mockUSDC.approve(mockFundAddress, mintAmount);
      await approveTx.wait();
      console.log("✅ 授权成功");
    } else {
      console.log("✅ 授权已足够");
    }

    // 初始化基金
    console.log("📝 初始化基金...");
    const initTx = await mockFund.initializeFund(mintAmount);
    await initTx.wait();
    console.log("✅ 基金初始化成功");

  } catch (error) {
    console.error("❌ 操作失败:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 