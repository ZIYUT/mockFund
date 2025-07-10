const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting deployment of Mock Fund with real price configuration...");
    
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
        
        // Deploy PriceOracle contract
        console.log("\n🔮 Deploying PriceOracle contract...");
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        const priceOracle = await PriceOracle.deploy(deployer.address);
        await priceOracle.waitForDeployment();
        const priceOracleAddress = await priceOracle.getAddress();
        deployedContracts.PriceOracle = priceOracleAddress;
        console.log("✅ PriceOracle deployed successfully:", priceOracleAddress);
        
        // Deploy MockUniswapIntegration contract
        console.log("\n🦄 Deploying MockUniswapIntegration contract...");
        const MockUniswapIntegration = await ethers.getContractFactory("MockUniswapIntegration");
        const mockUniswapIntegration = await MockUniswapIntegration.deploy(
            deployer.address,
            priceOracleAddress
        );
        await mockUniswapIntegration.waitForDeployment();
        const mockUniswapIntegrationAddress = await mockUniswapIntegration.getAddress();
        deployedContracts.MockUniswapIntegration = mockUniswapIntegrationAddress;
        console.log("✅ MockUniswapIntegration deployed successfully:", mockUniswapIntegrationAddress);
        
        // Deploy fund contract
        console.log("\n🏦 Deploying fund contract...");
        const MockFund = await ethers.getContractFactory("MockFund");
        const mockFund = await MockFund.deploy(
            "MockFund Coin",     // Share token name
            "MFC",              // Share token symbol
            deployer.address,    // Initial owner
            100,                 // Management fee rate 1%
            priceOracleAddress,  // Price oracle address
            mockUniswapIntegrationAddress // MockUniswap integration address
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
        
        // Configure PriceOracle with Sepolia price feeds
        console.log("\n🔮 Configuring PriceOracle with Sepolia price feeds...");
        
        // Set price feeds for each token using Sepolia addresses
        const priceFeedTxs = [
            { token: wethAddress, symbol: "ETH" },
            { token: wbtcAddress, symbol: "BTC" },
            { token: linkAddress, symbol: "LINK" },
            { token: usdcAddress, symbol: "USDC" },
            { token: daiAddress, symbol: "DAI" }
        ];
        
        for (const { token, symbol } of priceFeedTxs) {
            const tx = await priceOracle.setPriceFeedBySymbol(token, symbol);
            await tx.wait();
            console.log(`✅ Set price feed for ${symbol}: ${token}`);
        }
        
        // Configure MockUniswapIntegration with realistic exchange rates
        console.log("\n🦄 Configuring MockUniswapIntegration with realistic rates...");
        
        // Pre-fund MockUniswapIntegration for swaps
        const largeAmount = ethers.parseUnits("1000000", 18); // 1M tokens
        await mockWETH.mint(mockUniswapIntegrationAddress, largeAmount);
        await mockWBTC.mint(mockUniswapIntegrationAddress, ethers.parseUnits("10000", 8)); // 10K WBTC
        await mockLINK.mint(mockUniswapIntegrationAddress, largeAmount);
        await mockDAI.mint(mockUniswapIntegrationAddress, largeAmount);
        
        // Pre-fund USDC
        const usdcAmount = ethers.parseUnits("1000000", 6); // 1M USDC
        await mockUSDC.mint(mockUniswapIntegrationAddress, usdcAmount);
        
        // Set realistic exchange rates (approximate current market rates)
        const exchangeRates = [
            { tokenIn: usdcAddress, tokenOut: wethAddress, rate: 2000000000, description: "1 ETH = 2000 USDC" },
            { tokenIn: usdcAddress, tokenOut: wbtcAddress, rate: 40000000000, description: "1 BTC = 40000 USDC" },
            { tokenIn: usdcAddress, tokenOut: linkAddress, rate: 15000000, description: "1 LINK = 15 USDC" },
            { tokenIn: usdcAddress, tokenOut: daiAddress, rate: 1000000, description: "1 DAI = 1 USDC" }
        ];
        
        for (const { tokenIn, tokenOut, rate, description } of exchangeRates) {
            const tx = await mockUniswapIntegration.setExchangeRate(tokenIn, tokenOut, rate);
            await tx.wait();
            console.log(`✅ Set exchange rate: ${description}`);
        }
        
        console.log("✅ MockUniswapIntegration configured with realistic rates");
        
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
        
        // Save deployment information
        const deploymentInfo = {
            network: await ethers.provider.getNetwork(),
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: deployedContracts,
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
        const deploymentFile = path.join(deploymentsDir, `${networkName}-real-prices.json`);
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n💾 Deployment information saved to:", deploymentFile);
        
        // Output frontend configuration
        console.log("\n📋 Frontend configuration:");
        console.log("```javascript");
        console.log("// Contract addresses for frontend");
        console.log("export const CONTRACT_ADDRESSES = {");
        console.log(`  MOCK_FUND: "${mockFundAddress}",`);
        console.log(`  FUND_SHARE_TOKEN: "${shareTokenAddress}",`);
        console.log(`  PRICE_ORACLE: "${priceOracleAddress}",`);
        console.log(`  MOCK_UNISWAP_INTEGRATION: "${mockUniswapIntegrationAddress}",`);
        console.log(`  MOCK_USDC: "${usdcAddress}",`);
        console.log(`  MOCK_WETH: "${wethAddress}",`);
        console.log(`  MOCK_WBTC: "${wbtcAddress}",`);
        console.log(`  MOCK_LINK: "${linkAddress}",`);
        console.log(`  MOCK_DAI: "${daiAddress}"`);
        console.log("};");
        console.log(`export const NETWORK_ID = ${(await ethers.provider.getNetwork()).chainId};`);
        console.log("```");
        
        console.log("\n🎉 Deployment completed successfully!");
        console.log("\n📝 Next steps:");
        console.log("1. Copy the contract addresses above to your frontend");
        console.log("2. Test investment and redemption functions");
        console.log("3. Verify contracts on blockchain explorer");
        console.log("4. Monitor fund performance and management fees");
        
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