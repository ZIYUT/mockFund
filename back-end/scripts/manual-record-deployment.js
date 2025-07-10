const fs = require('fs');
const path = require('path');

// 示例：填入你实际部署的合约地址
const SEPOLIA_DEPLOYMENT = {
  network: {
    name: "sepolia",
    chainId: "11155111"
  },
  deployer: "0x...", // 填入你的部署者地址
  timestamp: new Date().toISOString(),
  contracts: {
    "MockUSDC": "0x...", // 填入 MockUSDC 合约地址
    "MockWETH": "0x...", // 填入 MockWETH 合约地址
    "MockWBTC": "0x...", // 填入 MockWBTC 合约地址
    "MockLINK": "0x...", // 填入 MockLINK 合约地址
    "MockUNI": "0x...",  // 填入 MockUNI 合约地址
    "MockDAI": "0x...",  // 填入 MockDAI 合约地址
    "PriceOracle": "0x...", // 填入 PriceOracle 合约地址
    "UniswapIntegration": "0x...", // 填入 UniswapIntegration 合约地址
    "MockFund": "0x...", // 填入 MockFund 合约地址
    "FundShareToken": "0x..." // 填入 FundShareToken 合约地址
  },
  gasUsed: {},
  notes: "Sepolia 测试网部署记录"
};

// 保存部署记录
function saveDeploymentRecord(networkName, deploymentData) {
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  
  // 确保 deployments 目录存在
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  
  // 写入部署记录
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  
  console.log(`✅ 部署记录已保存到: ${deploymentFile}`);
  
  // 生成前端地址配置
  generateFrontendAddresses(networkName, deploymentData.contracts);
}

// 生成前端地址配置文件
function generateFrontendAddresses(networkName, contracts) {
  const frontendAddressesFile = path.join(__dirname, '..', '..', 'new-frontend', 'src', 'contracts', 'addresses.ts');
  
  let addressesContent = `// 自动生成的合约地址配置 - ${networkName}
export const CONTRACT_ADDRESSES = {
`;

  Object.entries(contracts).forEach(([contractName, address]) => {
    addressesContent += `  ${contractName}: "${address}",\n`;
  });
  
  addressesContent += `};

export default CONTRACT_ADDRESSES;
`;

  // 确保前端目录存在
  const frontendDir = path.dirname(frontendAddressesFile);
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  
  fs.writeFileSync(frontendAddressesFile, addressesContent);
  console.log(`✅ 前端地址配置已生成: ${frontendAddressesFile}`);
}

// 显示使用说明
function showUsage() {
  console.log(`
📝 手动记录部署地址使用说明:

1. 编辑此脚本，填入实际的合约地址:
   - 将所有的 "0x..." 替换为实际的合约地址
   - 填入 deployer 地址

2. 运行脚本记录部署:
   node scripts/manual-record-deployment.js

3. 脚本会自动:
   - 保存部署记录到 deployments/sepolia.json
   - 生成前端地址配置文件

4. 或者直接调用函数:
   saveDeploymentRecord('sepolia', SEPOLIA_DEPLOYMENT);
  `);
}

// 主函数
async function main() {
  console.log('🚀 开始记录 Sepolia 部署...');
  
  // 检查是否有实际的地址
  const hasRealAddresses = Object.values(SEPOLIA_DEPLOYMENT.contracts).some(addr => addr !== "0x...");
  
  if (!hasRealAddresses) {
    console.log('⚠️  请先编辑此脚本，填入实际的合约地址！');
    showUsage();
    return;
  }
  
  // 保存部署记录
  saveDeploymentRecord('sepolia', SEPOLIA_DEPLOYMENT);
  
  console.log('✅ 部署记录完成！');
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  saveDeploymentRecord,
  generateFrontendAddresses,
  SEPOLIA_DEPLOYMENT
}; 