const fs = require('fs');
const path = require('path');

async function main() {
  console.log("💾 保存合约地址...");
  
  // 合约地址（从部署输出中获取）
  const addresses = {
    network: "sepolia",
    deployer: "0x...", // 需要从部署者获取
    contracts: {
      MockUSDC: "0x5aA5F9d612280f553310966a461A200DCaeF1ce5",
      MockFund: "0xB13eb6DAc1d4306402142b416Eda581871538621",
      FundShareToken: "0x04e07b7A2138A5192583A3491817eaFfD02CDA50",
      ChainlinkPriceOracle: "0x16018E1a3d92eDD9C939C4885B2C690f33d0a3bF",
      UniswapIntegration: "0x449E05b43a522DbF421D54a6cB23Fe91c0147E62",
      MockTokensFactory: "0x31E77f1dA22acc1ac62D4bD33ac7cD2cc27aefA6",
      tokens: {
        WETH: "0xf6dccE145e44463d1Bc82974383015aF3A115aD5",
        WBTC: "0x6A3d9b277C807f35eF12DD94c13f903fA31864Cd",
        LINK: "0xb74720FFFd322F11092deBf197df7CEa3b6824bD",
        DAI: "0x77E0Aa7b8e9Fa0e7a908f3b7cFaF86286E713C6D"
      }
    },
    deploymentTime: new Date().toISOString(),
    description: "使用 Chainlink 真实价格数据的完整部署"
  };

  // 保存到 deployments 目录
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, 'sepolia-deployment.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
  console.log("✅ 部署信息已保存到:", deploymentFile);

  // 创建前端地址配置文件
  const frontendAddresses = {
    MockUSDC: addresses.contracts.MockUSDC,
    MockFund: addresses.contracts.MockFund,
    FundShareToken: addresses.contracts.FundShareToken,
    ChainlinkPriceOracle: addresses.contracts.ChainlinkPriceOracle,
    UniswapIntegration: addresses.contracts.UniswapIntegration,
    MockTokensFactory: addresses.contracts.MockTokensFactory,
    WETH: addresses.contracts.tokens.WETH,
    WBTC: addresses.contracts.tokens.WBTC,
    LINK: addresses.contracts.tokens.LINK,
    DAI: addresses.contracts.tokens.DAI
  };

  const frontendFile = path.join(__dirname, '..', '..', 'new-frontend', 'src', 'contracts', 'addresses.ts');
  const frontendContent = `// 自动生成的合约地址配置
// 部署时间: ${addresses.deploymentTime}
// 网络: ${addresses.network}

export const CONTRACT_ADDRESSES = {
  MockUSDC: "${frontendAddresses.MockUSDC}",
  MockFund: "${frontendAddresses.MockFund}",
  FundShareToken: "${frontendAddresses.FundShareToken}",
  ChainlinkPriceOracle: "${frontendAddresses.ChainlinkPriceOracle}",
  UniswapIntegration: "${frontendAddresses.UniswapIntegration}",
  MockTokensFactory: "${frontendAddresses.MockTokensFactory}",
  WETH: "${frontendAddresses.WETH}",
  WBTC: "${frontendAddresses.WBTC}",
  LINK: "${frontendAddresses.LINK}",
  DAI: "${frontendAddresses.DAI}"
} as const;

export type ContractAddresses = typeof CONTRACT_ADDRESSES;
`;

  fs.writeFileSync(frontendFile, frontendContent);
  console.log("✅ 前端地址配置已更新:", frontendFile);

  // 显示部署摘要
  console.log("\n📋 部署摘要:");
  console.log("网络:", addresses.network);
  console.log("部署时间:", addresses.deploymentTime);
  console.log("\n主要合约:");
  console.log("  MockFund:", addresses.contracts.MockFund);
  console.log("  FundShareToken:", addresses.contracts.FundShareToken);
  console.log("  MockUSDC:", addresses.contracts.MockUSDC);
  console.log("  ChainlinkPriceOracle:", addresses.contracts.ChainlinkPriceOracle);
  console.log("  UniswapIntegration:", addresses.contracts.UniswapIntegration);
  
  console.log("\n投资代币:");
  console.log("  WETH:", addresses.contracts.tokens.WETH);
  console.log("  WBTC:", addresses.contracts.tokens.WBTC);
  console.log("  LINK:", addresses.contracts.tokens.LINK);
  console.log("  DAI:", addresses.contracts.tokens.DAI);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 