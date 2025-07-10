const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('🔍 Starting contract verification process...');
    
    // Get network name from command line arguments or default to sepolia
    const networkName = process.argv[2] || 'sepolia';
    console.log(`📡 Network: ${networkName}`);
    
    // Load deployment information
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
    
    if (!fs.existsSync(deploymentFile)) {
        console.error(`❌ Deployment file not found: ${deploymentFile}`);
        console.error('Please deploy contracts first using: npx hardhat run scripts/deploy.js --network sepolia');
        process.exit(1);
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const contracts = deploymentInfo.contracts;
    
    console.log('📋 Deployed contracts:');
    Object.entries(contracts).forEach(([name, address]) => {
        console.log(`   ${name}: ${address}`);
    });
    
    // Verify MockUSDC
    try {
        console.log('\n🔎 Verifying MockUSDC...');
        const command = `npx hardhat verify --network ${networkName} ${contracts.MockUSDC} "${deploymentInfo.deployer}"`;
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log('✅ MockUSDC verified successfully');
    } catch (error) {
        console.error('⚠️ Error verifying MockUSDC:', error.message);
    }
    
    // Verify MockTokensFactory
    try {
        console.log('\n🔎 Verifying MockTokensFactory...');
        const command = `npx hardhat verify --network ${networkName} ${contracts.MockTokensFactory} "${deploymentInfo.deployer}"`;
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log('✅ MockTokensFactory verified successfully');
    } catch (error) {
        console.error('⚠️ Error verifying MockTokensFactory:', error.message);
    }
    
    // Verify ChainlinkPriceOracle
    try {
        console.log('\n🔎 Verifying ChainlinkPriceOracle...');
        const command = `npx hardhat verify --network ${networkName} ${contracts.ChainlinkPriceOracle} "${deploymentInfo.deployer}"`;
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log('✅ ChainlinkPriceOracle verified successfully');
    } catch (error) {
        console.error('⚠️ Error verifying ChainlinkPriceOracle:', error.message);
    }

    // Verify UniswapIntegration
    try {
        console.log('\n🔎 Verifying UniswapIntegration...');
        const command = `npx hardhat verify --network ${networkName} ${contracts.UniswapIntegration} "${deploymentInfo.deployer}" "${contracts.ChainlinkPriceOracle}"`;
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log('✅ UniswapIntegration verified successfully');
    } catch (error) {
        console.error('⚠️ Error verifying UniswapIntegration:', error.message);
    }

    // Verify MockFund
    try {
        console.log('\n🔎 Verifying MockFund...');
        const command = `npx hardhat verify --network ${networkName} ${contracts.MockFund} "Mock Fund Shares" "MFC" "${deploymentInfo.deployer}" "100" "${contracts.ChainlinkPriceOracle}" "${contracts.UniswapIntegration}"`;
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log('✅ MockFund verified successfully');
    } catch (error) {
        console.error('⚠️ Error verifying MockFund:', error.message);
    }
    
    // Note: FundShareToken is deployed by MockFund, so it's more complex to verify
    console.log('\n⚠️ Note: FundShareToken is deployed by the MockFund contract and requires manual verification');
    console.log(`   FundShareToken address: ${contracts.FundShareToken}`);
    console.log('   Manual verification command:');
    console.log(`   npx hardhat verify --network ${networkName} ${contracts.FundShareToken} "Mock Fund Shares" "MFC" "${contracts.MockFund}"`);
    
    console.log('\n🎉 Verification process completed!');
}

// Execute verification
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main };