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
        
        // 2. Deploy token factory contract
        console.log("\n📦 Deploying token factory contract...");
        const TokenFactory = await ethers.getContractFactory("TokenFactory");
        const tokenFactory = await TokenFactory.deploy(deployer.address);
        await tokenFactory.waitForDeployment();
        const tokenFactoryAddress = await tokenFactory.getAddress();
        deployedContracts.TokenFactory = tokenFactoryAddress;
        console.log("✅ TokenFactory deployed successfully:", tokenFactoryAddress);
        
        // 3. Register tokens in the factory contract
        console.log("\n🔧 Registering tokens in the factory contract...");
        await tokenFactory.registerToken("USDC", usdcAddress);
        await tokenFactory.registerToken("WETH", wethAddress);
        await tokenFactory.registerToken("WBTC", wbtcAddress);
        await tokenFactory.registerToken("LINK", linkAddress);
        await tokenFactory.registerToken("UNI", uniAddress);
        await tokenFactory.registerToken("DAI", daiAddress);
        console.log("✅ All tokens registered successfully");
        
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
        
        // 3. Deploy fund contract
        console.log("\n🏦 Deploying fund contract...");
        const MockFund = await ethers.getContractFactory("MockFund");
        const mockFund = await MockFund.deploy(
            "Mock Fund Shares",  // Share token name
            "MFS",              // Share token symbol
            deployer.address,    // Initial owner
            200                  // Management fee rate 2%
        );
        await mockFund.waitForDeployment();
        const mockFundAddress = await mockFund.getAddress();
        deployedContracts.MockFund = mockFundAddress;
        console.log("✅ MockFund deployed successfully:", mockFundAddress);
        
        // Get share token address
        const shareTokenAddress = await mockFund.shareToken();
        deployedContracts.FundShareToken = shareTokenAddress;
        console.log("✅ FundShareToken address:", shareTokenAddress);
        
        // 4. Configure fund supported tokens
        console.log("\n⚙️ Configuring fund portfolio...");
        
        // Add supported tokens and target allocations (50% USDC保留，其余50%分配给其他代币)
        const tokens = [
            { address: wbtcAddress, allocation: 1000, name: "WBTC" }, // 10%
            { address: wethAddress, allocation: 1000, name: "WETH" }, // 10%
            { address: linkAddress, allocation: 1000, name: "LINK" }, // 10%
            { address: daiAddress, allocation: 1000, name: "DAI" },   // 10%
            { address: uniAddress, allocation: 1000, name: "UNI" }    // 10%
        ];
        
        for (const token of tokens) {
            const tx = await mockFund.addSupportedToken(token.address, token.allocation);
            await tx.wait();
            console.log(`✅ Added ${token.name}: ${token.allocation/100}% allocation`);
        }
        
        // 5. Set USDC token address in MockFund contract
        console.log("\n🔧 Setting USDC token address...");
        const setUSDCTx = await mockFund.setUSDCToken(usdcAddress);
        await setUSDCTx.wait();
        console.log("✅ USDC token address set successfully:", usdcAddress);
        
        // 6. Verify deployment
        console.log("\n🔍 Verifying deployment results...");
        const fundStats = await mockFund.getFundStats();
        console.log("📊 Fund statistics:");
        console.log("   Total assets:", ethers.formatUnits(fundStats[0], 6), "USDC");
        console.log("   Total shares:", ethers.formatEther(fundStats[1]));
        console.log("   Current NAV:", ethers.formatUnits(fundStats[2], 6), "USDC");
        
        const supportedTokens = await mockFund.getSupportedTokens();
        console.log("🎯 Number of supported investment tokens:", supportedTokens.length);
        
        // 7. Save deployment information
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
        
        // 8. Output contract addresses needed for frontend
        console.log("\n📋 Frontend configuration information:");
        console.log("```javascript");
        console.log("export const CONTRACT_ADDRESSES = {");
        console.log(`  MOCK_FUND: "${mockFundAddress}",`);
        console.log(`  FUND_SHARE_TOKEN: "${shareTokenAddress}",`);
        console.log(`  MOCK_USDC: "${usdcAddress}",`);
        console.log(`  MOCK_WETH: "${wethAddress}",`);
        console.log(`  MOCK_WBTC: "${wbtcAddress}",`);
        console.log(`  MOCK_LINK: "${linkAddress}",`);
        console.log(`  MOCK_UNI: "${uniAddress}",`);
        console.log(`  MOCK_DAI: "${daiAddress}",`);
        console.log(`  TOKEN_FACTORY: "${tokenFactoryAddress}"`);
        console.log("};\n");
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