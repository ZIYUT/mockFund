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
        
        // Deploy UNI
        const MockUNI = await ethers.getContractFactory("MockUNI");
        const mockUNI = await MockUNI.deploy(deployer.address);
        await mockUNI.waitForDeployment();
        const uniAddress = await mockUNI.getAddress();
        console.log("✅ UNI deployed successfully:", uniAddress);
        
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
        deployedContracts.MockUNI = uniAddress;
        deployedContracts.MockDAI = daiAddress;
        
        console.log("📍 Token addresses:");
        console.log("   USDC:", usdcAddress);
        console.log("   WETH:", wethAddress);
        console.log("   WBTC:", wbtcAddress);
        console.log("   LINK:", linkAddress);
        console.log("   UNI:", uniAddress);
        console.log("   DAI:", daiAddress);
        
        // 3. Deploy PriceOracle contract
        console.log("\n🔮 Deploying PriceOracle contract...");
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        const priceOracle = await PriceOracle.deploy(deployer.address);
        await priceOracle.waitForDeployment();
        const priceOracleAddress = await priceOracle.getAddress();
        deployedContracts.PriceOracle = priceOracleAddress;
        console.log("✅ PriceOracle deployed successfully:", priceOracleAddress);
        
        // 4. Deploy MockUniswapIntegration contract
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
        
        // 5. Deploy fund contract
        console.log("\n🏦 Deploying fund contract...");
        const MockFund = await ethers.getContractFactory("MockFund");
        const mockFund = await MockFund.deploy(
            "Mock Fund Shares",  // Share token name
            "MFS",              // Share token symbol
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
            const tx = await mockFund.addSupportedToken(token.address, token.allocation);
            await tx.wait();
            console.log(`✅ Added ${token.name}: ${token.allocation/100}% allocation`);
        }
        
        // 7. Set USDC token address in MockFund contract
        console.log("\n🔧 Setting USDC token address...");
        const setUSDCTx = await mockFund.setUSDCToken(usdcAddress);
        await setUSDCTx.wait();
        console.log("✅ USDC token address set successfully:", usdcAddress);
        
        // 8. 为MockUniswapIntegration预存代币用于交换
        console.log("\n💰 Pre-funding MockUniswapIntegration for swaps...");
        const largeAmount = ethers.parseUnits("1000000", 18); // 1M tokens
        await mockWETH.mint(mockUniswapIntegrationAddress, largeAmount);
        await mockWBTC.mint(mockUniswapIntegrationAddress, ethers.parseUnits("10000", 8)); // 10K WBTC
        await mockLINK.mint(mockUniswapIntegrationAddress, largeAmount);
        await mockDAI.mint(mockUniswapIntegrationAddress, largeAmount);
        
        // 为USDC铸造代币给Uniswap集成
        const usdcAmount = ethers.parseUnits("1000000", 6); // 1M USDC
        await mockUSDC.mint(mockUniswapIntegrationAddress, usdcAmount);
        
        // 设置简单的交换比率（1:1）
        await mockUniswapIntegration.setExchangeRate(usdcAddress, wethAddress, 10000); // 1:1
        await mockUniswapIntegration.setExchangeRate(usdcAddress, wbtcAddress, 10000); // 1:1
        await mockUniswapIntegration.setExchangeRate(usdcAddress, linkAddress, 10000); // 1:1
        await mockUniswapIntegration.setExchangeRate(usdcAddress, daiAddress, 10000); // 1:1
        
        console.log("✅ MockUniswapIntegration pre-funded and configured");
        
        // 9. 初始化基金
        console.log("\n🏦 Initializing fund with 1M USDC...");
        
        // 给部署者铸造 100万 USDC
        const mintUSDCTx = await mockUSDC.mint(deployer.address, ethers.parseUnits("1000000", 6));
        await mintUSDCTx.wait();
        console.log("✅ Minted 1M USDC to deployer");
        
        // 授权基金合约使用 USDC
        const approveUSDCTx = await mockUSDC.approve(mockFundAddress, ethers.parseUnits("1000000", 6));
        await approveUSDCTx.wait();
        console.log("✅ Approved USDC for fund contract");
        
        // 初始化基金
        const initializeTx = await mockFund.initializeFund(ethers.parseUnits("1000000", 6));
        await initializeTx.wait();
        console.log("✅ Fund initialized with 1M MFC");
        
        // 10. 验证部署
        console.log("\n🔍 Verifying deployment results...");
        const fundStats = await mockFund.getFundStats();
        console.log("📊 Fund statistics:");
        console.log("   Total supply:", ethers.formatEther(fundStats[0]));
        console.log("   Initial supply:", ethers.formatEther(fundStats[1]));
        console.log("   Is initialized:", fundStats[2]);
        
        const supportedTokens = await mockFund.getSupportedTokens();
        console.log("🎯 Number of supported investment tokens:", supportedTokens.length);
        
        // 11. Save deployment information
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
        
        // 12. Output contract addresses needed for frontend
        console.log("\n📋 Frontend configuration information:");
        console.log("```javascript");
        console.log("export const CONTRACT_ADDRESSES = {");
        console.log(`  MOCK_FUND: "${mockFundAddress}",`);
        console.log(`  FUND_SHARE_TOKEN: "${shareTokenAddress}",`);
        console.log(`  PRICE_ORACLE: "${priceOracleAddress}",`);
        console.log(`  MOCK_UNISWAP_INTEGRATION: "${mockUniswapIntegrationAddress}",`);
        console.log(`  MOCK_USDC: "${usdcAddress}",`);
        console.log(`  MOCK_WETH: "${wethAddress}",`);
        console.log(`  MOCK_WBTC: "${wbtcAddress}",`);
        console.log(`  MOCK_LINK: "${linkAddress}",`);
        console.log(`  MOCK_UNI: "${uniAddress}",`);
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