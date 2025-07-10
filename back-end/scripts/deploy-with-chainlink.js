const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Sepolia 测试网的 Chainlink 价格预言机地址
const SEPOLIA_PRICE_FEEDS = {
    // ETH/USD
    ETH: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    // BTC/USD  
    BTC: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
    // LINK/USD
    LINK: "0xc59E3633BAAC79493d908e63626716e204A45EdF",
    // USDC/USD
    USDC: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E",
    // DAI/USD
    DAI: "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19"
};

async function main() {
    console.log("🚀 Starting deployment of Mock Fund with Chainlink real prices...");
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deployer address:", deployer.address);
    console.log("💰 Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    
    const deployedContracts = {};
    
    try {
        console.log("\n🪙 Deploying mock tokens...");
        
        // Deploy USDC
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        const mockUSDC = await MockUSDC.deploy(deployer.address);
        await mockUSDC.waitForDeployment();
        const usdcAddress = await mockUSDC.getAddress();
        console.log("✅ USDC deployed successfully:", usdcAddress);
        
        // Deploy WETH
        const MockWETH = await ethers.getContractFactory("MockWETH");
        const mockWETH = await MockWETH.deploy(deployer.address);
        await mockWETH.waitForDeployment();
        const wethAddress = await mockWETH.getAddress();
        console.log("✅ WETH deployed successfully:", wethAddress);
        
        // Deploy WBTC
        const MockWBTC = await ethers.getContractFactory("MockWBTC");
        const mockWBTC = await MockWBTC.deploy(deployer.address);
        await mockWBTC.waitForDeployment();
        const wbtcAddress = await mockWBTC.getAddress();
        console.log("✅ WBTC deployed successfully:", wbtcAddress);
        
        // Deploy LINK
        const MockLINK = await ethers.getContractFactory("MockLINK");
        const mockLINK = await MockLINK.deploy(deployer.address);
        await mockLINK.waitForDeployment();
        const linkAddress = await mockLINK.getAddress();
        console.log("✅ LINK deployed successfully:", linkAddress);
        
        // Deploy DAI
        const MockDAI = await ethers.getContractFactory("MockDAI");
        const mockDAI = await MockDAI.deploy(deployer.address);
        await mockDAI.waitForDeployment();
        const daiAddress = await mockDAI.getAddress();
        console.log("✅ DAI deployed successfully:", daiAddress);
        
        deployedContracts.MockUSDC = usdcAddress;
        deployedContracts.MockWETH = wethAddress;
        deployedContracts.MockWBTC = wbtcAddress;
        deployedContracts.MockLINK = linkAddress;
        deployedContracts.MockDAI = daiAddress;
        
        console.log("📍 Token addresses:");
        console.log("   USDC:", usdcAddress);
        console.log("   WETH:", wethAddress);
        console.log("   WBTC:", wbtcAddress);
        console.log("   LINK:", linkAddress);
        console.log("   DAI:", daiAddress);
        
        // Deploy ChainlinkPriceOracle contract
        console.log("\n🔮 Deploying ChainlinkPriceOracle contract...");
        const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
        const chainlinkPriceOracle = await ChainlinkPriceOracle.deploy(deployer.address);
        await chainlinkPriceOracle.waitForDeployment();
        const chainlinkPriceOracleAddress = await chainlinkPriceOracle.getAddress();
        deployedContracts.ChainlinkPriceOracle = chainlinkPriceOracleAddress;
        console.log("✅ ChainlinkPriceOracle deployed successfully:", chainlinkPriceOracleAddress);
        
        // Deploy RealUniswapIntegration contract
        console.log("\n🦄 Deploying RealUniswapIntegration contract...");
        const RealUniswapIntegration = await ethers.getContractFactory("RealUniswapIntegration");
        const realUniswapIntegration = await RealUniswapIntegration.deploy(
            deployer.address,
            chainlinkPriceOracleAddress
        );
        await realUniswapIntegration.waitForDeployment();
        const realUniswapIntegrationAddress = await realUniswapIntegration.getAddress();
        deployedContracts.RealUniswapIntegration = realUniswapIntegrationAddress;
        console.log("✅ RealUniswapIntegration deployed successfully:", realUniswapIntegrationAddress);
        
        // Deploy fund contract
        console.log("\n🏦 Deploying fund contract...");
        const MockFund = await ethers.getContractFactory("MockFund");
        const mockFund = await MockFund.deploy(
            "MockFund Coin",     // Share token name
            "MFC",              // Share token symbol
            deployer.address,    // Initial owner
            100,                 // Management fee rate 1%
            chainlinkPriceOracleAddress,  // Chainlink price oracle address
            realUniswapIntegrationAddress // Real Uniswap integration address
        );
        await mockFund.waitForDeployment();
        const mockFundAddress = await mockFund.getAddress();
        deployedContracts.MockFund = mockFundAddress;
        console.log("✅ MockFund deployed successfully:", mockFundAddress);
        
        // Get share token address
        const shareTokenAddress = await mockFund.shareToken();
        deployedContracts.FundShareToken = shareTokenAddress;
        console.log("✅ FundShareToken address:", shareTokenAddress);
        
        // Configure fund supported tokens
        console.log("\n⚙️ Configuring fund portfolio...");
        
        // Add supported tokens with equal allocation (25% each)
        const tokens = [
            { address: wethAddress, allocation: 2500, name: "WETH" }, // 25%
            { address: wbtcAddress, allocation: 2500, name: "WBTC" }, // 25%
            { address: linkAddress, allocation: 2500, name: "LINK" }, // 25%
            { address: daiAddress, allocation: 2500, name: "DAI" }    // 25%
        ];
        
        for (const token of tokens) {
            const tx = await mockFund.addSupportedToken(token.address, token.allocation);
            await tx.wait();
            console.log(`✅ Added ${token.name}: ${token.allocation/100}% allocation`);
        }
        
        // Set USDC token address in MockFund contract
        console.log("\n🔧 Setting USDC token address...");
        const setUSDCTx = await mockFund.setUSDCToken(usdcAddress);
        await setUSDCTx.wait();
        console.log("✅ USDC token address set successfully:", usdcAddress);
        
        // Configure ChainlinkPriceOracle with Sepolia price feeds
        console.log("\n🔮 Configuring ChainlinkPriceOracle with Sepolia price feeds...");
        
        const priceFeedConfigs = [
            { token: wethAddress, priceFeed: SEPOLIA_PRICE_FEEDS.ETH, symbol: "ETH" },
            { token: wbtcAddress, priceFeed: SEPOLIA_PRICE_FEEDS.BTC, symbol: "BTC" },
            { token: linkAddress, priceFeed: SEPOLIA_PRICE_FEEDS.LINK, symbol: "LINK" },
            { token: usdcAddress, priceFeed: SEPOLIA_PRICE_FEEDS.USDC, symbol: "USDC" },
            { token: daiAddress, priceFeed: SEPOLIA_PRICE_FEEDS.DAI, symbol: "DAI" }
        ];
        
        for (const config of priceFeedConfigs) {
            const tx = await chainlinkPriceOracle.setPriceFeed(
                config.token,
                config.priceFeed,
                config.symbol
            );
            await tx.wait();
            console.log(`✅ Set Chainlink price feed for ${config.symbol}: ${config.priceFeed}`);
        }
        
        // Pre-fund RealUniswapIntegration for swaps
        console.log("\n💰 Pre-funding RealUniswapIntegration for swaps...");
        const largeAmount = ethers.parseUnits("1000000", 18); // 1M tokens
        await mockWETH.mint(realUniswapIntegrationAddress, largeAmount);
        await mockWBTC.mint(realUniswapIntegrationAddress, ethers.parseUnits("10000", 8)); // 10K WBTC
        await mockLINK.mint(realUniswapIntegrationAddress, largeAmount);
        await mockDAI.mint(realUniswapIntegrationAddress, largeAmount);
        
        // Pre-fund USDC
        const usdcAmount = ethers.parseUnits("1000000", 6); // 1M USDC
        await mockUSDC.mint(realUniswapIntegrationAddress, usdcAmount);
        
        console.log("✅ RealUniswapIntegration pre-funded");
        
        // Update cached rates with real prices
        console.log("\n📊 Updating cached rates with real Chainlink prices...");
        
        const rateUpdates = [
            { tokenIn: usdcAddress, tokenOut: wethAddress, name: "USDC/ETH" },
            { tokenIn: usdcAddress, tokenOut: wbtcAddress, name: "USDC/BTC" },
            { tokenIn: usdcAddress, tokenOut: linkAddress, name: "USDC/LINK" },
            { tokenIn: usdcAddress, tokenOut: daiAddress, name: "USDC/DAI" }
        ];
        
        for (const update of rateUpdates) {
            try {
                const tx = await realUniswapIntegration.updateCachedRate(
                    update.tokenIn,
                    update.tokenOut
                );
                await tx.wait();
                console.log(`✅ Updated cached rate for ${update.name}`);
            } catch (error) {
                console.log(`⚠️ Failed to update rate for ${update.name}:`, error.message);
            }
        }
        
        // Initialize fund with 1M USDC
        console.log("\n🏦 Initializing fund with 1M USDC...");
        
        // Mint 1M USDC to deployer
        const mintUSDCTx = await mockUSDC.mint(deployer.address, ethers.parseUnits("1000000", 6));
        await mintUSDCTx.wait();
        console.log("✅ Minted 1M USDC to deployer");
        
        // Approve USDC for fund contract
        const approveUSDCTx = await mockUSDC.approve(mockFundAddress, ethers.parseUnits("1000000", 6));
        await approveUSDCTx.wait();
        console.log("✅ Approved USDC for fund contract");
        
        // Initialize fund
        const initializeTx = await mockFund.initializeFund(ethers.parseUnits("1000000", 6));
        await initializeTx.wait();
        console.log("✅ Fund initialized with 1M MFC");
        
        // Verify deployment
        console.log("\n🔍 Verifying deployment results...");
        const fundStats = await mockFund.getFundStats();
        console.log("📊 Fund statistics:");
        console.log("   Total supply:", ethers.formatEther(fundStats[0]));
        console.log("   Initial supply:", ethers.formatEther(fundStats[1]));
        console.log("   Is initialized:", fundStats[2]);
        
        const supportedTokens = await mockFund.getSupportedTokens();
        console.log("🎯 Number of supported investment tokens:", supportedTokens.length);
        
        // Get fund NAV and MFC value
        const [nav, mfcValue, totalSupply] = await mockFund.getFundNAV();
        console.log("💰 Fund NAV:", ethers.formatUnits(nav, 6), "USDC");
        console.log("💎 MFC Value:", ethers.formatUnits(mfcValue, 6), "USDC");
        console.log("📈 Total MFC Supply:", ethers.formatEther(totalSupply));
        
        // Test real price fetching
        console.log("\n🔗 Testing real price fetching from Chainlink...");
        try {
            const [ethPrice, ethTimestamp] = await chainlinkPriceOracle.getLatestPrice(wethAddress);
            console.log("✅ ETH/USD price from Chainlink:", ethers.formatUnits(ethPrice, 8));
            console.log("   Timestamp:", new Date(ethTimestamp * 1000).toISOString());
            
            const [btcPrice, btcTimestamp] = await chainlinkPriceOracle.getLatestPrice(wbtcAddress);
            console.log("✅ BTC/USD price from Chainlink:", ethers.formatUnits(btcPrice, 8));
            console.log("   Timestamp:", new Date(btcTimestamp * 1000).toISOString());
            
        } catch (error) {
            console.log("⚠️ Failed to fetch real prices:", error.message);
        }
        
        // Save deployment information
        const deploymentInfo = {
            network: await ethers.provider.getNetwork(),
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: deployedContracts,
            chainlinkPriceFeeds: SEPOLIA_PRICE_FEEDS,
            fundStats: {
                totalSupply: fundStats[0].toString(),
                initialSupply: fundStats[1].toString(),
                isInitialized: fundStats[2],
                nav: nav.toString(),
                mfcValue: mfcValue.toString(),
                totalMFCSupply: totalSupply.toString()
            }
        };
        
        // Save to file
        const deploymentsDir = path.join(__dirname, "..", "deployments");
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir, { recursive: true });
        }
        
        const networkName = (await ethers.provider.getNetwork()).name || "unknown";
        const deploymentFile = path.join(deploymentsDir, `${networkName}-chainlink.json`);
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n💾 Deployment information saved to:", deploymentFile);
        
        // Output frontend configuration
        console.log("\n📋 Frontend configuration:");
        console.log("```javascript");
        console.log("// Contract addresses for frontend (Chainlink version)");
        console.log("export const CONTRACT_ADDRESSES = {");
        console.log(`  MOCK_FUND: "${mockFundAddress}",`);
        console.log(`  FUND_SHARE_TOKEN: "${shareTokenAddress}",`);
        console.log(`  CHAINLINK_PRICE_ORACLE: "${chainlinkPriceOracleAddress}",`);
        console.log(`  REAL_UNISWAP_INTEGRATION: "${realUniswapIntegrationAddress}",`);
        console.log(`  MOCK_USDC: "${usdcAddress}",`);
        console.log(`  MOCK_WETH: "${wethAddress}",`);
        console.log(`  MOCK_WBTC: "${wbtcAddress}",`);
        console.log(`  MOCK_LINK: "${linkAddress}",`);
        console.log(`  MOCK_DAI: "${daiAddress}"`);
        console.log("};");
        console.log(`export const NETWORK_ID = ${(await ethers.provider.getNetwork()).chainId};`);
        console.log("```");
        
        console.log("\n🎉 Deployment completed successfully with Chainlink real prices!");
        console.log("\n📝 Key features:");
        console.log("✅ Real-time prices from Chainlink");
        console.log("✅ Price caching for gas efficiency");
        console.log("✅ Slippage protection");
        console.log("✅ Automatic rate updates");
        console.log("\n📝 Next steps:");
        console.log("1. Copy the contract addresses above to your frontend");
        console.log("2. Test investment and redemption with real prices");
        console.log("3. Monitor price updates and cache performance");
        console.log("4. Verify contracts on blockchain explorer");
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }
}

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise rejection:', error);
    process.exit(1);
});

// Execute deployment
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main }; 