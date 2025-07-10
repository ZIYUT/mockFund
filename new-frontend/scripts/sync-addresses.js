// 自动同步合约地址脚本
// 用法：node scripts/sync-addresses.js

const fs = require('fs');
const path = require('path');

// 读取部署信息
function readDeploymentInfo() {
  const deploymentFile = path.join(__dirname, '../../back-end/deployments/sepolia-deployment.json');
  
  if (!fs.existsSync(deploymentFile)) {
    console.error('❌ 部署信息文件不存在，请先运行部署脚本');
    process.exit(1);
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  return deploymentData.contracts;
}

// 生成前端地址配置文件
function generateAddressesFile(contracts) {
  const addressesContent = `// 本文件由 scripts/sync-addresses.js 自动生成，请勿手动修改
export const CONTRACT_ADDRESSES = {
  31337: {
    MOCK_FUND: '0x0B306BF915C4d645ff596e518fAf3F9669b97016',
    FUND_SHARE_TOKEN: '0x524F04724632eED237cbA3c37272e018b3A7967e',
    PRICE_ORACLE: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
    UNISWAP_INTEGRATION: '0x9A676e781A523b5d0C0e43731313A708CB607508',
    MOCK_USDC: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    MOCK_WETH: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    MOCK_WBTC: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    MOCK_LINK: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    MOCK_UNI: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    MOCK_DAI: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    TOKEN_FACTORY: '0x0165878A594ca255338adfa4d48449f69242Eb8F'
  },
  11155111: { // Sepolia
    MOCK_FUND: '${contracts.MockFund}',
    FUND_SHARE_TOKEN: '${contracts.FundShareToken}',
    PRICE_ORACLE: '${contracts.PriceOracle}',
    UNISWAP_INTEGRATION: '${contracts.MockUniswapIntegration}',
    MOCK_USDC: '${contracts.MockUSDC}',
    MOCK_WETH: '${contracts.MockWETH}',
    MOCK_WBTC: '${contracts.MockWBTC}',
    MOCK_LINK: '${contracts.MockLINK}',
    MOCK_DAI: '${contracts.MockDAI}',
    TOKEN_FACTORY: '${contracts.MockTokensFactory}'
  }
} as const;

// 获取当前网络的合约地址
export function getContractAddresses(chainId) {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[11155111]; // 默认使用 Sepolia
}

// 支持的代币列表
export const SUPPORTED_TOKENS = {
  USDC: {
    symbol: 'USDC',
    name: 'Mock USD Coin',
    decimals: 6,
    address: '${contracts.MockUSDC}' // Sepolia 地址
  },
  WETH: {
    symbol: 'WETH',
    name: 'Mock Wrapped Ether',
    decimals: 18,
    address: '${contracts.MockWETH}' // Sepolia 地址
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Mock Wrapped Bitcoin',
    decimals: 8,
    address: '${contracts.MockWBTC}' // Sepolia 地址
  },
  LINK: {
    symbol: 'LINK',
    name: 'Mock Chainlink Token',
    decimals: 18,
    address: '${contracts.MockLINK}' // Sepolia 地址
  },
  DAI: {
    symbol: 'DAI',
    name: 'Mock Dai Stablecoin',
    decimals: 18,
    address: '${contracts.MockDAI}' // Sepolia 地址
  }
};

// 导出主要合约地址
export const MOCK_FUND_ADDRESS = '${contracts.MockFund}';
export const FUND_SHARE_TOKEN_ADDRESS = '${contracts.FundShareToken}';
export const MOCK_USDC_ADDRESS = '${contracts.MockUSDC}';
export const PRICE_ORACLE_ADDRESS = '${contracts.PriceOracle}';
export const UNISWAP_INTEGRATION_ADDRESS = '${contracts.MockUniswapIntegration}';
`;

  return addressesContent;
}

// 主函数
function main() {
  console.log('🔄 开始同步合约地址到前端...');
  
  try {
    // 读取部署信息
    const contracts = readDeploymentInfo();
    console.log('✅ 读取部署信息成功');
    
    // 生成地址文件内容
    const addressesContent = generateAddressesFile(contracts);
    
    // 写入前端地址文件
    const addressesFile = path.join(__dirname, '../src/contracts/addresses.ts');
    fs.writeFileSync(addressesFile, addressesContent);
    
    console.log('✅ 合约地址已同步到:', addressesFile);
    console.log('\n=== 同步的合约地址 ===');
    Object.entries(contracts).forEach(([name, address]) => {
      console.log(`${name}: ${address}`);
    });
    
    console.log('\n🎉 地址同步完成！现在可以启动前端应用了。');
    
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    process.exit(1);
  }
}

main(); 