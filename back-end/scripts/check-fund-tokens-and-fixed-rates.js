const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查MockFund的supportedTokens与UniswapIntegration的fixedRates...");

  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // MockFund合约地址
  const mockFundAddress = "0x4f302f0F58DC884Cd59Bb7e2fEa4Af2749aeb4B6";

  try {
    // 连接MockFund
    const MockFund = await ethers.getContractFactory("contracts/MockFund.sol:MockFund");
    const mockFund = MockFund.attach(mockFundAddress);

    // 获取supportedTokens
    const supportedTokens = await mockFund.getSupportedTokens();
    console.log("\nMockFund.supportedTokens:");
    supportedTokens.forEach((addr, idx) => {
      console.log(`  [${idx}] ${addr}`);
    });

    // 获取UniswapIntegration地址
    const uniswapIntegrationAddress = await mockFund.uniswapIntegration();
    console.log("\nMockFund.uniswapIntegration:", uniswapIntegrationAddress);

    // 连接UniswapIntegration
    const UniswapIntegration = await ethers.getContractFactory("contracts/UniswapIntegration.sol:UniswapIntegration");
    const uniswapIntegration = UniswapIntegration.attach(uniswapIntegrationAddress);

    // 检查每个token的fixedRates
    let allSet = true;
    console.log("\nUniswapIntegration.fixedRates:");
    for (let i = 0; i < supportedTokens.length; i++) {
      const token = supportedTokens[i];
      const rate = await uniswapIntegration.fixedRates(token);
      console.log(`  [${i}] ${token} => ${rate.toString()}`);
      if (rate == 0) {
        allSet = false;
      }
    }

    // 检查fixedRate模式
    const useFixedRates = await uniswapIntegration.useFixedRates();
    console.log("\nUniswapIntegration.useFixedRates:", useFixedRates);

    if (allSet && useFixedRates) {
      console.log("\n✅ 所有supportedTokens的fixedRates都已设置且模式已启用，可以初始化基金。");
    } else {
      console.log("\n❌ 有token未设置fixedRates或未启用fixedRate模式，请检查上面输出。");
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