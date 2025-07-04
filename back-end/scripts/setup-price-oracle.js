const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔮 Setting up Price Oracle for local development...");
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deployer address:", deployer.address);
    
    // Load existing deployment info
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const networkName = (await ethers.provider.getNetwork()).name || "unknown";
    const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
    
    let deploymentInfo = {};
    if (fs.existsSync(deploymentFile)) {
        deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        console.log("📋 Loaded existing deployment info");
    } else {
        console.error("❌ No deployment file found. Please run deploy.js first.");
        process.exit(1);
    }
    
    try {
        // 1. Deploy PriceOracle contract
        console.log("\n1. Deploying PriceOracle contract...");
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        const priceOracle = await PriceOracle.deploy(deployer.address);
        await priceOracle.waitForDeployment();
        const priceOracleAddress = await priceOracle.getAddress();
        console.log("✅ PriceOracle deployed successfully:", priceOracleAddress);
        
        // 2. Deploy Mock Price Feeds for each token
        console.log("\n2. Deploying Mock Price Feeds...");
        
        const tokens = [
            { name: "WETH", address: deploymentInfo.contracts.MockWETH, price: ethers.parseUnits("2000", 8) }, // $2000
            { name: "WBTC", address: deploymentInfo.contracts.MockWBTC, price: ethers.parseUnits("45000", 8) }, // $45000
            { name: "LINK", address: deploymentInfo.contracts.MockLINK, price: ethers.parseUnits("15", 8) }, // $15
            { name: "UNI", address: deploymentInfo.contracts.MockUNI, price: ethers.parseUnits("8", 8) }, // $8
            { name: "DAI", address: deploymentInfo.contracts.MockDAI, price: ethers.parseUnits("1", 8) } // $1
        ];
        
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        const priceFeeds = {};
        
        for (const token of tokens) {
            if (!token.address) {
                console.log(`⚠️  Skipping ${token.name}: address not found in deployment`);
                continue;
            }
            
            const priceFeed = await MockPriceFeed.deploy(
                token.price, // initial price
                8, // decimals
                `${token.name}/USD Price Feed` // description
            );
            await priceFeed.waitForDeployment();
            const priceFeedAddress = await priceFeed.getAddress();
            priceFeeds[token.name] = priceFeedAddress;
            
            console.log(`✅ ${token.name} Price Feed deployed:`, priceFeedAddress, `(Price: $${ethers.formatUnits(token.price, 8)})`);
        }
        
        // 3. Set price feeds in PriceOracle
        console.log("\n3. Setting price feeds in PriceOracle...");
        
        for (const token of tokens) {
            if (!token.address || !priceFeeds[token.name]) {
                console.log(`⚠️  Skipping ${token.name}: missing address or price feed`);
                continue;
            }
            
            const tx = await priceOracle.setPriceFeed(token.address, priceFeeds[token.name]);
            await tx.wait();
            console.log(`✅ ${token.name} price feed set successfully`);
        }
        
        // 4. Update MockFund to use PriceOracle (if it supports it)
        console.log("\n4. Checking if MockFund supports PriceOracle...");
        
        const MockFund = await ethers.getContractFactory("MockFund");
        const mockFund = MockFund.attach(deploymentInfo.contracts.MockFund);
        
        try {
            // Try to set price oracle if the function exists
            const setPriceOracleTx = await mockFund.setPriceOracle(priceOracleAddress);
            await setPriceOracleTx.wait();
            console.log("✅ PriceOracle set in MockFund successfully");
        } catch (error) {
            console.log("ℹ️  MockFund doesn't support setPriceOracle function (this is normal for basic version)");
        }
        
        // 5. Test price oracle functionality
        console.log("\n5. Testing price oracle functionality...");
        
        for (const token of tokens) {
            if (!token.address) continue;
            
            try {
                const price = await priceOracle.getTokenPrice(token.address);
                console.log(`📊 ${token.name} current price: $${ethers.formatUnits(price, 8)}`);
            } catch (error) {
                console.log(`❌ Failed to get ${token.name} price:`, error.message);
            }
        }
        
        // Test batch price fetching
        const tokenAddresses = tokens.filter(t => t.address).map(t => t.address);
        if (tokenAddresses.length > 0) {
            try {
                const batchResult = await priceOracle.getMultiplePrices(tokenAddresses);
                console.log(`\n📊 Batch price test successful - got ${batchResult[0].length} prices`);
            } catch (error) {
                console.log(`❌ Batch price test failed:`, error.message);
            }
        }
        
        // 6. Update deployment info
        deploymentInfo.contracts.PriceOracle = priceOracleAddress;
        deploymentInfo.contracts.PriceFeeds = priceFeeds;
        deploymentInfo.priceOracleSetup = {
            timestamp: new Date().toISOString(),
            tokens: tokens.map(t => ({
                name: t.name,
                address: t.address,
                priceFeed: priceFeeds[t.name],
                initialPrice: ethers.formatUnits(t.price, 8)
            }))
        };
        
        // Save updated deployment info
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        console.log("\n💾 Updated deployment information saved");
        
        // 7. Output updated frontend configuration
        console.log("\n📋 Updated frontend configuration:");
        console.log("```javascript");
        console.log("export const CONTRACT_ADDRESSES = {");
        Object.entries(deploymentInfo.contracts).forEach(([name, address]) => {
            if (typeof address === 'string') {
                console.log(`  ${name.toUpperCase()}: "${address}",`);
            }
        });
        console.log("};");
        console.log("```");
        
        console.log("\n🎉 Price Oracle setup completed successfully!");
        console.log("\n📝 What was set up:");
        console.log("   • PriceOracle contract deployed");
        console.log("   • Mock price feeds for all tokens");
        console.log("   • Initial token prices set");
        console.log("   • Price oracle functionality tested");
        console.log("\n💡 Token prices can be updated using the price feed contracts");
        console.log("   You can call updatePrice() on each MockPriceFeed to simulate price changes");
        
    } catch (error) {
        console.error("❌ Price Oracle setup failed:", error);
        process.exit(1);
    }
}

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise rejection:', error);
    process.exit(1);
});

// Execute setup
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main };