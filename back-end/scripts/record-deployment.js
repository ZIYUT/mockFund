const fs = require('fs');
const path = require('path');

async function recordDeployment(networkName, deployerAddress, contracts, gasUsed = {}) {
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  
  // 确保 deployments 目录存在
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  
  const deploymentRecord = {
    network: {
      name: networkName,
      chainId: getChainId(networkName)
    },
    deployer: deployerAddress,
    timestamp: new Date().toISOString(),
    contracts: contracts,
    gasUsed: gasUsed
  };
  
  // 写入部署记录
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentRecord, null, 2));
  
  console.log(`✅ 部署记录已保存到: ${deploymentFile}`);
  
  // 同时更新前端的地址配置
  updateFrontendAddresses(networkName, contracts);
}

function getChainId(networkName) {
  const chainIds = {
    'localhost': '31337',
    'hardhat': '31337',
    'sepolia': '11155111',
    'goerli': '5',
    'mainnet': '1'
  };
  return chainIds[networkName] || 'unknown';
}

function updateFrontendAddresses(networkName, contracts) {
  const frontendAddressesFile = path.join(__dirname, '..', '..', 'new-frontend', 'src', 'contracts', 'addresses.ts');
  
  if (!fs.existsSync(frontendAddressesFile)) {
    console.log('⚠️  前端地址文件不存在，跳过更新');
    return;
  }
  
  let addressesContent = fs.readFileSync(frontendAddressesFile, 'utf8');
  
  // 更新合约地址
  Object.entries(contracts).forEach(([contractName, address]) => {
    const regex = new RegExp(`(${contractName}:\\s*['"])[^'"]*['"]`, 'g');
    addressesContent = addressesContent.replace(regex, `$1${address}"`);
  });
  
  fs.writeFileSync(frontendAddressesFile, addressesContent);
  console.log(`✅ 前端地址配置已更新: ${frontendAddressesFile}`);
}

// 导出函数供其他脚本使用
module.exports = {
  recordDeployment,
  updateFrontendAddresses
};

// 如果直接运行此脚本，显示使用说明
if (require.main === module) {
  console.log(`
📝 部署记录脚本使用说明:

1. 在部署脚本中导入并使用:
   const { recordDeployment } = require('./scripts/record-deployment.js');
   
2. 部署完成后调用:
   await recordDeployment('sepolia', deployer.address, {
     MockUSDC: mockUSDC.address,
     MockFund: mockFund.address,
     // ... 其他合约
   });

3. 脚本会自动:
   - 保存部署记录到 deployments/sepolia.json
   - 更新前端地址配置
  `);
} 