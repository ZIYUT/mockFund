const fs = require('fs');
const path = require('path');

// 读取部署信息
const deploymentFile = path.join(__dirname, '../../back-end/deployments/sepolia-real-prices.json');

if (!fs.existsSync(deploymentFile)) {
    console.error('❌ 部署文件不存在，请先部署合约到 Sepolia');
    process.exit(1);
}

const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
const contracts = deploymentInfo.contracts;

console.log('🔄 正在同步 Sepolia 合约地址到前端...');

// 读取前端地址文件
const addressesFile = path.join(__dirname, '../src/contracts/addresses.ts');
let addressesContent = fs.readFileSync(addressesFile, 'utf8');

// 更新 Sepolia 地址
const sepoliaAddresses = {
    MOCK_FUND: contracts.MockFund,
    FUND_SHARE_TOKEN: contracts.FundShareToken,
    PRICE_ORACLE: contracts.PriceOracle,
    MOCK_UNISWAP_INTEGRATION: contracts.MockUniswapIntegration,
    MOCK_USDC: contracts.MockUSDC,
    MOCK_WETH: contracts.MockWETH,
    MOCK_WBTC: contracts.MockWBTC,
    MOCK_LINK: contracts.MockLINK,
    MOCK_DAI: contracts.MockDAI
};

// 替换 Sepolia 地址部分
let updatedContent = addressesContent.replace(
    /11155111: \{ \/\/ Sepolia[\s\S]*?\}/,
    `11155111: { // Sepolia
    MOCK_FUND: '${sepoliaAddresses.MOCK_FUND}',
    FUND_SHARE_TOKEN: '${sepoliaAddresses.FUND_SHARE_TOKEN}',
    PRICE_ORACLE: '${sepoliaAddresses.PRICE_ORACLE}',
    UNISWAP_INTEGRATION: '${sepoliaAddresses.MOCK_UNISWAP_INTEGRATION}',
    MOCK_USDC: '${sepoliaAddresses.MOCK_USDC}',
    MOCK_WETH: '${sepoliaAddresses.MOCK_WETH}',
    MOCK_WBTC: '${sepoliaAddresses.MOCK_WBTC}',
    MOCK_LINK: '${sepoliaAddresses.MOCK_LINK}',
    MOCK_DAI: '${sepoliaAddresses.MOCK_DAI}'
  }`
);

// 更新 SUPPORTED_TOKENS 地址
const tokenUpdates = [
    { symbol: 'USDC', address: sepoliaAddresses.MOCK_USDC },
    { symbol: 'WETH', address: sepoliaAddresses.MOCK_WETH },
    { symbol: 'WBTC', address: sepoliaAddresses.MOCK_WBTC },
    { symbol: 'LINK', address: sepoliaAddresses.MOCK_LINK },
    { symbol: 'DAI', address: sepoliaAddresses.MOCK_DAI }
];

tokenUpdates.forEach(({ symbol, address }) => {
    const regex = new RegExp(`address: '.*?' // ${symbol} 地址`, 'g');
    updatedContent = updatedContent.replace(regex, `address: '${address}' // ${symbol} 地址`);
});

// 写回文件
fs.writeFileSync(addressesFile, updatedContent);

console.log('✅ 合约地址已同步到前端');
console.log('\n📋 更新的地址:');
Object.entries(sepoliaAddresses).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
});

console.log('\n🚀 现在可以启动前端进行测试了！');
console.log('   cd new-frontend && npm run dev'); 