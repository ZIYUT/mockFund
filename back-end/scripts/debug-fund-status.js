const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查基金状态...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 合约地址
  const mockFundAddress = "0x872318dd7b3100b3909DA08aA68FC3801F460437";
  const mockUSDCAddress = "0x62320274bc84147Fd245a587B32F3f56af823eAe";

  try {
    // 获取合约实例
    const mockFund = await ethers.getContractAt("MockFund", mockFundAddress);
    const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);

    // 检查基金状态
    console.log("\n=== 基金状态 ===");
    const fundStats = await mockFund.getFundStats();
    console.log("基金总供应量:", ethers.formatEther(fundStats[0]));
    console.log("初始供应量:", ethers.formatEther(fundStats[1]));
    console.log("是否已初始化:", fundStats[2]);

    // 检查支持的代币
    const supportedTokens = await mockFund.getSupportedTokens();
    console.log("支持的代币数量:", supportedTokens.length);
    console.log("支持的代币地址:", supportedTokens);

    // 检查部署者USDC余额
    const deployerUSDCBalance = await mockUSDC.balanceOf(deployer.address);
    console.log("部署者USDC余额:", ethers.formatUnits(deployerUSDCBalance, 6));

    // 检查授权额度
    const allowance = await mockUSDC.allowance(deployer.address, mockFundAddress);
    console.log("授权给基金的USDC额度:", ethers.formatUnits(allowance, 6));

    // 检查基金拥有者
    const owner = await mockFund.owner();
    console.log("基金拥有者:", owner);
    console.log("部署者是否为拥有者:", owner.toLowerCase() === deployer.address.toLowerCase());

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