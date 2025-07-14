const fs = require('fs');
const path = require('path');

// 读取部署信息
const deploymentFile = path.join(__dirname, '../../back-end/sepolia-deployment.json');

if (!fs.existsSync(deploymentFile)) {
    console.error('❌ 部署文件不存在，请先部署合约到 Sepolia');
    process.exit(1);
}

const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
const contracts = deploymentInfo.contracts;
const tokens = deploymentInfo.tokens;

console.log('🔄 正在同步 Sepolia 合约地址到前端...');

// 读取前端地址文件
const addressesFile = path.join(__dirname, '../contracts/addresses.ts');
let addressesContent = fs.readFileSync(addressesFile, 'utf8');

// 更新 Sepolia 地址
const sepoliaAddresses = {
    MOCK_FUND: contracts.MockFund,
    FUND_SHARE_TOKEN: contracts.FundShareToken,
    CHAINLINK_PRICE_ORACLE: contracts.ChainlinkPriceOracle,
    UNISWAP_INTEGRATION: contracts.UniswapIntegration,
    MOCK_USDC: tokens.USDC,
    MOCK_WETH: tokens.WETH,
    MOCK_WBTC: tokens.WBTC,
    MOCK_LINK: tokens.LINK,
    MOCK_DAI: tokens.DAI
};

// 更新合约地址
let updatedContent = addressesContent;

// 更新主要合约地址
updatedContent = updatedContent.replace(
    /MockFund: ".*?"/,
    `MockFund: "${sepoliaAddresses.MOCK_FUND}"`
);

updatedContent = updatedContent.replace(
    /FundShareToken: ".*?"/,
    `FundShareToken: "${sepoliaAddresses.FUND_SHARE_TOKEN}"`
);

updatedContent = updatedContent.replace(
    /ChainlinkPriceOracle: ".*?"/,
    `ChainlinkPriceOracle: "${sepoliaAddresses.CHAINLINK_PRICE_ORACLE}"`
);

updatedContent = updatedContent.replace(
    /UniswapIntegration: ".*?"/,
    `UniswapIntegration: "${sepoliaAddresses.UNISWAP_INTEGRATION}"`
);

// 更新代币地址
const tokenUpdates = [
    { symbol: 'WBTC', address: sepoliaAddresses.MOCK_WBTC },
    { symbol: 'WETH', address: sepoliaAddresses.MOCK_WETH },
    { symbol: 'LINK', address: sepoliaAddresses.MOCK_LINK },
    { symbol: 'DAI', address: sepoliaAddresses.MOCK_DAI }
];

tokenUpdates.forEach(({ symbol, address }) => {
    const regex = new RegExp(`${symbol}: ".*?"`, 'g');
    updatedContent = updatedContent.replace(regex, `${symbol}: "${address}"`);
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