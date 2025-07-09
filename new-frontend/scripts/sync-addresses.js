// 自动同步合约地址脚本
// 用法：node scripts/sync-addresses.js

const fs = require('fs');
const path = require('path');

const DEPLOYMENT_FILE = path.resolve(__dirname, '../../back-end/deployments/localhost.json');
const OUTPUT_FILE = path.resolve(__dirname, '../src/contracts/addresses.ts');

function extractSupportedTokens(oldContent) {
  // 简单正则提取 SUPPORTED_TOKENS 导出
  const match = oldContent.match(/export const SUPPORTED_TOKENS[\s\S]*?};/);
  return match ? match[0] : '';
}

function main() {
  if (!fs.existsSync(DEPLOYMENT_FILE)) {
    console.error('未找到部署信息文件:', DEPLOYMENT_FILE);
    process.exit(1);
  }
  const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, 'utf-8'));
  const c = deployment.contracts;

  // 读取旧文件，提取 SUPPORTED_TOKENS
  let oldContent = '';
  if (fs.existsSync(OUTPUT_FILE)) {
    oldContent = fs.readFileSync(OUTPUT_FILE, 'utf-8');
  }
  const supportedTokensExport = extractSupportedTokens(oldContent);

  // 生成 TypeScript 地址配置
  const content = `// 本文件由 scripts/sync-addresses.js 自动生成，请勿手动修改
export const CONTRACT_ADDRESSES = {
  31337: {
    MOCK_FUND: '${c.MockFund}',
    FUND_SHARE_TOKEN: '${c.FundShareToken}',
    PRICE_ORACLE: '${c.PriceOracle}',
    UNISWAP_INTEGRATION: '${c.UniswapIntegration}',
    MOCK_USDC: '${c.MockUSDC}',
    MOCK_WETH: '${c.MockWETH}',
    MOCK_WBTC: '${c.MockWBTC}',
    MOCK_LINK: '${c.MockLINK}',
    MOCK_UNI: '${c.MockUNI}',
    MOCK_DAI: '${c.MockDAI}',
    TOKEN_FACTORY: '${c.TokenFactory}'
  }
};

export function getContractAddress(contractName, chainId = 31337) {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) throw new Error('Unsupported chain ID: ' + chainId);
  return addresses[contractName];
}

${supportedTokensExport}
`;

  fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
  console.log('✅ 合约地址及 SUPPORTED_TOKENS 已同步到:', OUTPUT_FILE);
}

main(); 