const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 测试基金代币余额查询功能...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // Sepolia网络合约地址
  const mockFundAddress = "0x92053436b6D0758EcFb765C86a71b2dC4228DEa0";
  const mockUSDCAddress = "0x3664cB1F94442d995f9Ae62062CB26f5A77F58CB";
  const wethAddress = "0xA07EA61f3401eD18d333D47C3bC860070df39205";
  const wbtcAddress = "0x29371fc64Fe735Df95940D83aD5E9a8053804709";
  const linkAddress = "0xE9235b4915D8248526895994d93F6d4c06B0dABb";
  const daiAddress = "0x4c094e79fca22E0ec335015d65E9B1DcED8EE7Cf";

  try {
    // 获取合约实例
    const mockFund = await ethers.getContractAt("MockFund", mockFundAddress);
    const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
    const weth = await ethers.getContractAt("MockWETH", wethAddress);
    const wbtc = await ethers.getContractAt("MockWBTC", wbtcAddress);
    const link = await ethers.getContractAt("MockLINK", linkAddress);
    const dai = await ethers.getContractAt("MockDAI", daiAddress);

    console.log("\n=== 基金代币余额 ===");
    
    // 检查基金是否已初始化
    const isInitialized = await mockFund.isInitialized();
    console.log("基金是否已初始化:", isInitialized);
    
    if (!isInitialized) {
      console.log("❌ 基金未初始化，无法查询余额");
      return;
    }

    // 获取基金持有的各种代币余额
    const usdcBalance = await mockUSDC.balanceOf(mockFundAddress);
    const wethBalance = await weth.balanceOf(mockFundAddress);
    const wbtcBalance = await wbtc.balanceOf(mockFundAddress);
    const linkBalance = await link.balanceOf(mockFundAddress);
    const daiBalance = await dai.balanceOf(mockFundAddress);
    
    console.log("USDC 余额:", ethers.formatUnits(usdcBalance, 6));
    console.log("WETH 余额:", ethers.formatUnits(wethBalance, 18));
    console.log("WBTC 余额:", ethers.formatUnits(wbtcBalance, 8));
    console.log("LINK 余额:", ethers.formatUnits(linkBalance, 18));
    console.log("DAI 余额:", ethers.formatUnits(daiBalance, 18));

    // 获取MFC组成信息
    console.log("\n=== 每份MFC代表的代币数量 ===");
    try {
      const mfcComposition = await mockFund.getMFCComposition();
      const tokens = mfcComposition[0];
      const ratios = mfcComposition[1];
      const usdcAmount = mfcComposition[2];
      
      console.log("每份MFC包含的USDC:", ethers.formatUnits(usdcAmount, 6));
      
      for (let i = 0; i < tokens.length; i++) {
        const tokenAddress = tokens[i];
        const ratio = ratios[i];
        
        let tokenName = "Unknown";
        let decimals = 18;
        
        if (tokenAddress.toLowerCase() === wethAddress.toLowerCase()) {
          tokenName = "WETH";
          decimals = 18;
        } else if (tokenAddress.toLowerCase() === wbtcAddress.toLowerCase()) {
          tokenName = "WBTC";
          decimals = 8;
        } else if (tokenAddress.toLowerCase() === linkAddress.toLowerCase()) {
          tokenName = "LINK";
          decimals = 18;
        } else if (tokenAddress.toLowerCase() === daiAddress.toLowerCase()) {
          tokenName = "DAI";
          decimals = 18;
        }
        
        console.log(`每份MFC包含的${tokenName}:`, ethers.formatUnits(ratio, decimals));
      }
    } catch (error) {
      console.log("❌ 获取MFC组成信息失败:", error.message);
    }

    // 获取基金净值信息
    console.log("\n=== 基金净值信息 ===");
    try {
      const fundNAV = await mockFund.getFundNAV();
      const nav = fundNAV[0];
      const mfcValue = fundNAV[1];
      const totalSupply = fundNAV[2];
      
      console.log("基金净值(NAV):", ethers.formatUnits(nav, 6), "USDC");
      console.log("单个MFC价值:", ethers.formatUnits(mfcValue, 6), "USDC");
      console.log("MFC总供应量:", ethers.formatUnits(totalSupply, 18));
    } catch (error) {
      console.log("❌ 获取基金净值信息失败:", error.message);
    }

  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });