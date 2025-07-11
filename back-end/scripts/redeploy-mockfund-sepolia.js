const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 重新部署 MockFund 合约到 Sepolia 测试网...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  console.log("部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 从现有部署文件读取地址
  const deploymentsPath = path.join(__dirname, "..", "deployments", "sepolia.json");
  let existingDeployments = {};
  
  if (fs.existsSync(deploymentsPath)) {
    existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    console.log("✅ 读取现有部署地址");
  } else {
    throw new Error("未找到现有的 Sepolia 部署文件");
  }

  const chainlinkPriceOracleAddress = existingDeployments.ChainlinkPriceOracle;
  const uniswapIntegrationAddress = existingDeployments.UniswapIntegration;
  
  if (!chainlinkPriceOracleAddress || !uniswapIntegrationAddress) {
    throw new Error("缺少必要的合约地址");
  }

  try {
    // 重新部署 MockFund
    console.log("\n📝 重新部署 MockFund...");
    const MockFund = await ethers.getContractFactory("MockFund");
    const mockFund = await MockFund.deploy(
      "Mock Fund Shares",  // Share token name
      "MFC",              // Share token symbol
      deployer.address,    // Initial owner
      100,                 // Management fee rate 1%
      chainlinkPriceOracleAddress,  // ChainlinkPriceOracle address
      uniswapIntegrationAddress // UniswapIntegration address
    );
    await mockFund.waitForDeployment();
    const mockFundAddress = await mockFund.getAddress();
    console.log("✅ MockFund 重新部署成功:", mockFundAddress);

    // 获取份额代币地址
    const shareTokenAddress = await mockFund.shareToken();
    console.log("✅ FundShareToken 地址:", shareTokenAddress);

    // 配置基金支持的代币
    console.log("\n🔧 配置基金投资组合...");
    
    const tokens = [
      { address: existingDeployments.MockWBTC, allocation: 1250, name: "WBTC" },
      { address: existingDeployments.MockWETH, allocation: 1250, name: "WETH" },
      { address: existingDeployments.MockLINK, allocation: 1250, name: "LINK" },
      { address: existingDeployments.MockDAI, allocation: 1250, name: "DAI" }
    ];
    
    for (const token of tokens) {
      const tx = await mockFund.addSupportedToken(token.address, token.allocation);
      await tx.wait();
      console.log(`✅ 添加 ${token.name}: ${token.allocation/100}% 分配`);
    }

    // 设置 USDC 代币地址
    console.log("\n💰 设置 USDC 代币地址...");
    const setUSDCTx = await mockFund.setUSDCToken(existingDeployments.MockUSDC);
    await setUSDCTx.wait();
    console.log("✅ USDC 代币地址设置成功:", existingDeployments.MockUSDC);

    // 初始化基金
    console.log("\n🎯 初始化基金...");
    
    // 获取USDC合约实例
    const mockUSDC = await ethers.getContractAt("MockUSDC", existingDeployments.MockUSDC);
    
    // 检查部署者的USDC余额
    const deployerUSDCBalance = await mockUSDC.balanceOf(deployer.address);
    console.log("部署者USDC余额:", ethers.formatUnits(deployerUSDCBalance, 6));
    
    let initAmount;
    if (deployerUSDCBalance > 0) {
      // 使用现有余额
      initAmount = deployerUSDCBalance;
    } else {
      // 铸造新的USDC
      initAmount = ethers.parseUnits("1000000", 6); // 100万 USDC
      await mockUSDC.mint(deployer.address, initAmount);
      console.log("✅ 铸造 100万 USDC 给部署者");
    }
    
    // 授权基金合约使用 USDC
    await mockUSDC.approve(mockFundAddress, initAmount);
    console.log("✅ 授权 USDC 给基金合约");
    
    // 调用初始化函数
    const initTx = await mockFund.initializeFund(initAmount);
    await initTx.wait();
    console.log("✅ 基金初始化完成");

    // 更新部署文件
    const updatedDeployments = {
      ...existingDeployments,
      MockFund: mockFundAddress,
      FundShareToken: shareTokenAddress
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(updatedDeployments, null, 2));
    console.log("\n📄 部署地址已保存到:", deploymentsPath);

    // 验证部署结果
    console.log("\n📊 验证部署结果...");
    
    const fundStats = await mockFund.getFundStats();
    console.log("基金总供应量:", ethers.formatEther(fundStats[0]));
    console.log("是否已初始化:", fundStats[2]);
    
    // 测试新的getFundTokenBalances函数
    console.log("\n🧪 测试新的 getFundTokenBalances 函数...");
    try {
      const result = await mockFund.getFundTokenBalances();
      console.log("✅ getFundTokenBalances 函数调用成功!");
      console.log("代币数量:", result[0].length);
    } catch (error) {
      console.log("❌ getFundTokenBalances 函数调用失败:", error.message);
    }

    console.log("\n🎉 MockFund 重新部署完成!");
    console.log("新的 MockFund 地址:", mockFundAddress);
    console.log("FundShareToken 地址:", shareTokenAddress);

  } catch (error) {
    console.error("❌ 部署失败:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });