const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting deployment of Mock Fund smart contracts...");
    
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
        
        // 3. Deploy PriceOracle contract
        console.log("\n🔮 Deploying PriceOracle contract...");
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        const priceOracle = await PriceOracle.deploy(deployer.address);
        await priceOracle.waitForDeployment();
        const priceOracleAddress = await priceOracle.getAddress();
        deployedContracts.PriceOracle = priceOracleAddress;
        console.log("✅ PriceOracle deployed successfully:", priceOracleAddress);
        
        // 4. Deploy FixedRateUniswapIntegration contract
        console.log("\n🦄 Deploying FixedRateUniswapIntegration contract...");
        const FixedRateUniswapIntegration = await ethers.getContractFactory("FixedRateUniswapIntegration");
        const fixedRateUniswapIntegration = await FixedRateUniswapIntegration.deploy(
            deployer.address,
            priceOracleAddress
        );
        await fixedRateUniswapIntegration.waitForDeployment();
        const fixedRateUniswapIntegrationAddress = await fixedRateUniswapIntegration.getAddress();
        deployedContracts.FixedRateUniswapIntegration = fixedRateUniswapIntegrationAddress;
        console.log("✅ FixedRateUniswapIntegration deployed successfully:", fixedRateUniswapIntegrationAddress);
        
        // 5. Deploy fund contract
        console.log("\n🏦 Deploying fund contract...");
        const FixedRateMockFund = await ethers.getContractFactory("FixedRateMockFund");
        const fixedRateMockFund = await FixedRateMockFund.deploy(
            "Mock Fund Shares",  // Share token name
            "MFS",              // Share token symbol
            deployer.address,    // Initial owner
            100,                 // Management fee rate 1%
            priceOracleAddress,  // Price oracle address
            fixedRateUniswapIntegrationAddress // FixedRateUniswap integration address
        );
        await fixedRateMockFund.waitForDeployment();
        const fixedRateMockFundAddress = await fixedRateMockFund.getAddress();
        deployedContracts.FixedRateMockFund = fixedRateMockFundAddress;
        console.log("✅ FixedRateMockFund deployed successfully:", fixedRateMockFundAddress);
        
        // Get share token address
        const shareTokenAddress = await fixedRateMockFund.shareToken();
        deployedContracts.FundShareToken = shareTokenAddress;
        console.log("✅ FundShareToken address:", shareTokenAddress);
        
        // 6. Configure fund supported tokens
        console.log("\n⚙️ Configuring fund portfolio...");
        
        // Add supported tokens and target allocations (50% USDC保留，其余50%分配给其他代币)
        const tokens = [
            { address: wbtcAddress, allocation: 1250, name: "WBTC" }, // 12.5%
            { address: wethAddress, allocation: 1250, name: "WETH" }, // 12.5%
            { address: linkAddress, allocation: 1250, name: "LINK" }, // 12.5%
            { address: daiAddress, allocation: 1250, name: "DAI" }    // 12.5%
        ];
        
        for (const token of tokens) {
            const tx = await fixedRateMockFund.addSupportedToken(token.address, token.allocation);
            await tx.wait();
            console.log(`✅ Added ${token.name}: ${token.allocation/100}% allocation`);
        }
        
        // 7. Set USDC token address in FixedRateMockFund contract
        console.log("\n🔧 Setting USDC token address...");
        const setUSDCTx = await fixedRateMockFund.setUSDCToken(usdcAddress);
        await setUSDCTx.wait();
        console.log("✅ USDC token address set successfully:", usdcAddress);
        
        // 8. 为FixedRateUniswapIntegration预存代币用于交换
        console.log("\n💰 Pre-funding FixedRateUniswapIntegration for swaps...");
        const largeAmount = ethers.parseUnits("1000000", 18); // 1M tokens
        await mockWETH.mint(fixedRateUniswapIntegrationAddress, largeAmount);
        await mockWBTC.mint(fixedRateUniswapIntegrationAddress, ethers.parseUnits("10000", 8)); // 10K WBTC
        await mockLINK.mint(fixedRateUniswapIntegrationAddress, largeAmount);
        await mockDAI.mint(fixedRateUniswapIntegrationAddress, largeAmount);
        
        // 为USDC铸造代币给Uniswap集成
        const usdcAmount = ethers.parseUnits("1000000", 6); // 1M USDC
        await mockUSDC.mint(fixedRateUniswapIntegrationAddress, usdcAmount);
        
        // 初始化固定汇率
        await fixedRateUniswapIntegration.initializeFixedRates(
            wethAddress,
            wbtcAddress,
            linkAddress,
            daiAddress
        );
        
        // 为USDC设置固定汇率 (1 USDC = 1 USDC)
        await fixedRateUniswapIntegration.setFixedRate(usdcAddress, ethers.parseUnits("1", 6));
        
        // 启用固定汇率模式
        await fixedRateUniswapIntegration.setFixedRateMode(true)
        
        console.log("✅ FixedRateUniswapIntegration pre-funded and configured");
        
        // 9. Configure price oracle for tokens
        console.log("\n🔮 Configuring price oracle for tokens...");
        
        // Set price feeds for tokens using Sepolia Chainlink oracles
        const tokenMappings = [
            { address: usdcAddress, symbol: "USDC" },
            { address: wethAddress, symbol: "ETH" }, // Note: WETH uses ETH price feed
            { address: wbtcAddress, symbol: "BTC" }, // Note: WBTC uses BTC price feed
            { address: linkAddress, symbol: "LINK" },
            { address: daiAddress, symbol: "DAI" }
        ];
        
        for (const token of tokenMappings) {
            const tx = await priceOracle.setPriceFeedBySymbol(token.address, token.symbol);
            await tx.wait();
            console.log(`✅ Set price feed for ${token.symbol} at address ${token.address}`);
        }
        
        // 10. 初始化基金
        console.log("\n🏦 Initializing fund with 1M USDC...");
        
        // 给部署者铸造 100万 USDC
        const mintUSDCTx = await mockUSDC.mint(deployer.address, ethers.parseUnits("1000000", 6));
        await mintUSDCTx.wait();
        console.log("✅ Minted 1M USDC to deployer");
        
        // 授权基金合约使用 USDC
        const approveUSDCTx = await mockUSDC.approve(fixedRateMockFundAddress, ethers.parseUnits("1000000", 6));
        await approveUSDCTx.wait();
        console.log("✅ Approved USDC for fund contract");
        
        // 初始化基金
        const initializeTx = await fixedRateMockFund.initializeFund(ethers.parseUnits("1000000", 6));
        await initializeTx.wait();
        console.log("✅ Fund initialized with 1M MFC");
        
        // 11. 验证部署
        console.log("\n🔍 Verifying deployment results...");
        const fundStats = await fixedRateMockFund.getFundStats();
        console.log("📊 Fund statistics:");
        console.log("   Total supply:", ethers.formatEther(fundStats[0]));
        console.log("   Initial supply:", ethers.formatEther(fundStats[1]));
        console.log("   Is initialized:", fundStats[2]);
        
        const supportedTokens = await fixedRateMockFund.getSupportedTokens();
        console.log("🎯 Number of supported investment tokens:", supportedTokens.length);
        
        // 12. Save deployment information
        const deploymentInfo = {
            network: await ethers.provider.getNetwork(),
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: deployedContracts,
            gasUsed: {
                // Gas usage for each contract can be recorded here
            }
        };
        
        // Save to file
        const deploymentsDir = path.join(__dirname, "..", "deployments");
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir, { recursive: true });
        }
        
        const networkName = (await ethers.provider.getNetwork()).name || "unknown";
        const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n💾 Deployment information saved to:", deploymentFile);
        
        // 13. Output contract addresses needed for frontend
        console.log("\n📋 Frontend configuration information:");
        console.log("```javascript");
        console.log("export const CONTRACT_ADDRESSES = {");
        console.log(`  MOCK_FUND: "${fixedRateMockFundAddress}",`);
        console.log(`  FUND_SHARE_TOKEN: "${shareTokenAddress}",`);
        console.log(`  PRICE_ORACLE: "${priceOracleAddress}",`);
        console.log(`  MOCK_UNISWAP_INTEGRATION: "${fixedRateUniswapIntegrationAddress}",`);
        console.log(`  MOCK_USDC: "${usdcAddress}",`);
        console.log(`  MOCK_WETH: "${wethAddress}",`);
        console.log(`  MOCK_WBTC: "${wbtcAddress}",`);
        console.log(`  MOCK_LINK: "${linkAddress}",`);
        console.log(`  MOCK_DAI: "${daiAddress}"`);
        console.log("};");
        console.log(`export const NETWORK_ID = ${(await ethers.provider.getNetwork()).chainId};`);
        console.log("```");
        
        console.log("\n🎉 All contracts deployed successfully!");
        console.log("\n📝 Next steps:");
        console.log("1. Copy the contract addresses above to the frontend configuration file");
        console.log("2. Get some test tokens on the testnet");
        console.log("3. Test the fund's investment and redemption functions");
        console.log("4. Verify contracts on the blockchain explorer");
        
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

// 执行部署
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main };