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
    
    // Verify MockWETH
    try {
        console.log('\n🔎 Verifying MockWETH...');
        const command = `npx hardhat verify --network ${networkName} ${contracts.MockWETH} "${deploymentInfo.deployer}"`;
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log('✅ MockWETH verified successfully');
    } catch (error) {
        console.error('⚠️ Error verifying MockWETH:', error.message);
    }
    
    // Verify MockWBTC
    try {
        console.log('\n🔎 Verifying MockWBTC...');
        const command = `npx hardhat verify --network ${networkName} ${contracts.MockWBTC} "${deploymentInfo.deployer}"`;
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log('✅ MockWBTC verified successfully');
    } catch (error) {
        console.error('⚠️ Error verifying MockWBTC:', error.message);
    }
    
    // Verify MockLINK
    try {
        console.log('\n🔎 Verifying MockLINK...');
        const command = `npx hardhat verify --network ${networkName} ${contracts.MockLINK} "${deploymentInfo.deployer}"`;
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log('✅ MockLINK verified successfully');
    } catch (error) {
        console.error('⚠️ Error verifying MockLINK:', error.message);
    }
    
    // Verify MockUNI
    try {
        console.log('\n🔎 Verifying MockUNI...');
        const command = `npx hardhat verify --network ${networkName} ${contracts.MockUNI} "${deploymentInfo.deployer}"`;
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log('✅ MockUNI verified successfully');
    } catch (error) {
        console.error('⚠️ Error verifying MockUNI:', error.message);
    }
    
    // Verify TokenFactory
    try {
        console.log('\n🔎 Verifying TokenFactory...');
        const command = `npx hardhat verify --network ${networkName} ${contracts.TokenFactory} "${deploymentInfo.deployer}"`;
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log('✅ TokenFactory verified successfully');
    } catch (error) {
        console.error('⚠️ Error verifying TokenFactory:', error.message);
    }
    
    // Verify MockFund
    try {
        console.log('\n🔎 Verifying MockFund...');
        const command = `npx hardhat verify --network ${networkName} ${contracts.MockFund} "Mock Fund Shares" "MFS" "${deploymentInfo.deployer}" "200"`;
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log('✅ MockFund verified successfully');
    } catch (error) {
        console.error('⚠️ Error verifying MockFund:', error.message);
    }
    
    // Note: FundShareToken is deployed by MockFund, so it's more complex to verify
    console.log('\n⚠️ Note: FundShareToken is deployed by the MockFund contract and requires manual verification');
    console.log(`   FundShareToken address: ${contracts.FundShareToken}`);
    
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