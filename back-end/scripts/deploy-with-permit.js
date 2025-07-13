const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with permit support using account:", deployer.address);

    // Deploy MockUSDC with permit support
    console.log("\n1. Deploying MockUSDC with permit support...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy(deployer.address);
    await mockUSDC.waitForDeployment();
    console.log("MockUSDC deployed to:", await mockUSDC.getAddress());

    // Deploy ChainlinkPriceOracle
    console.log("\n2. Deploying ChainlinkPriceOracle...");
    const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
    const priceOracle = await ChainlinkPriceOracle.deploy();
    await priceOracle.waitForDeployment();
    console.log("ChainlinkPriceOracle deployed to:", await priceOracle.getAddress());

    // Deploy UniswapIntegration
    console.log("\n3. Deploying UniswapIntegration...");
    const UniswapIntegration = await ethers.getContractFactory("UniswapIntegration");
    const uniswapIntegration = await UniswapIntegration.deploy();
    await uniswapIntegration.waitForDeployment();
    console.log("UniswapIntegration deployed to:", await uniswapIntegration.getAddress());

    // Deploy MockFund with permit support
    console.log("\n4. Deploying MockFund with permit support...");
    const MockFund = await ethers.getContractFactory("MockFund");
    const mockFund = await MockFund.deploy(
        "Mock Fund Coin",
        "MFC",
        deployer.address,
        100, // 1% management fee
        await priceOracle.getAddress(),
        await uniswapIntegration.getAddress()
    );
    await mockFund.waitForDeployment();
    console.log("MockFund deployed to:", await mockFund.getAddress());

    // Set USDC token in MockFund
    console.log("\n5. Setting USDC token in MockFund...");
    await mockFund.setUSDCToken(await mockUSDC.getAddress());
    console.log("USDC token set in MockFund");

    // Deploy MockTokens
    console.log("\n6. Deploying MockTokens...");
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const mockWETH = await MockWETH.deploy(deployer.address);
    await mockWETH.waitForDeployment();
    console.log("MockWETH deployed to:", await mockWETH.getAddress());

    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const mockWBTC = await MockWBTC.deploy(deployer.address);
    await mockWBTC.waitForDeployment();
    console.log("MockWBTC deployed to:", await mockWBTC.getAddress());

    const MockLINK = await ethers.getContractFactory("MockLINK");
    const mockLINK = await MockLINK.deploy(deployer.address);
    await mockLINK.waitForDeployment();
    console.log("MockLINK deployed to:", await mockLINK.getAddress());

    const MockDAI = await ethers.getContractFactory("MockDAI");
    const mockDAI = await MockDAI.deploy(deployer.address);
    await mockDAI.waitForDeployment();
    console.log("MockDAI deployed to:", await mockDAI.getAddress());

    // Add supported tokens to MockFund
    console.log("\n7. Adding supported tokens to MockFund...");
    await mockFund.addSupportedToken(await mockWETH.getAddress(), 2500); // 25%
    await mockFund.addSupportedToken(await mockWBTC.getAddress(), 2500); // 25%
    await mockFund.addSupportedToken(await mockLINK.getAddress(), 2500); // 25%
    await mockFund.addSupportedToken(await mockDAI.getAddress(), 2500); // 25%
    console.log("Supported tokens added to MockFund");

    // Set up UniswapIntegration
    console.log("\n8. Setting up UniswapIntegration...");
    await uniswapIntegration.setFixedRateMode(true);
    await uniswapIntegration.setFixedRate(await mockWETH.getAddress(), 3000 * 1e6); // $3000 per WETH
    await uniswapIntegration.setFixedRate(await mockWBTC.getAddress(), 115000 * 1e6); // $115,000 per WBTC
    await uniswapIntegration.setFixedRate(await mockLINK.getAddress(), 15 * 1e6); // $15 per LINK
    await uniswapIntegration.setFixedRate(await mockDAI.getAddress(), 1 * 1e6); // $1 per DAI
    console.log("UniswapIntegration fixed rates set");

    // Add liquidity to UniswapIntegration
    console.log("\n9. Adding liquidity to UniswapIntegration...");
    const largeAmount = ethers.parseUnits("1000000", 6); // 1M USDC
    await mockUSDC.mintForContract(await uniswapIntegration.getAddress(), largeAmount);
    
    const wethAmount = ethers.parseUnits("1000", 18); // 1000 WETH
    await mockWETH.mintForContract(await uniswapIntegration.getAddress(), wethAmount);
    
    const wbtcAmount = ethers.parseUnits("10", 8); // 10 WBTC
    await mockWBTC.mintForContract(await uniswapIntegration.getAddress(), wbtcAmount);
    
    const linkAmount = ethers.parseUnits("100000", 18); // 100K LINK
    await mockLINK.mintForContract(await uniswapIntegration.getAddress(), linkAmount);
    
    const daiAmount = ethers.parseUnits("1000000", 18); // 1M DAI
    await mockDAI.mintForContract(await uniswapIntegration.getAddress(), daiAmount);
    console.log("Liquidity added to UniswapIntegration");

    // Initialize MockFund
    console.log("\n10. Initializing MockFund...");
    const initialUSDCAmount = ethers.parseUnits("1000000", 6); // 1M USDC
    await mockUSDC.mintForContract(deployer.address, initialUSDCAmount);
    await mockUSDC.approve(await mockFund.getAddress(), initialUSDCAmount);
    await mockFund.initializeFund(initialUSDCAmount);
    console.log("MockFund initialized successfully");

    // Disable fixed rate mode
    console.log("\n11. Disabling fixed rate mode...");
    await uniswapIntegration.setFixedRateMode(false);
    console.log("Fixed rate mode disabled");

    // Save deployment info
    const deploymentInfo = {
        network: "sepolia",
        deployer: deployer.address,
        contracts: {
            mockUSDC: await mockUSDC.getAddress(),
            priceOracle: await priceOracle.getAddress(),
            uniswapIntegration: await uniswapIntegration.getAddress(),
            mockFund: await mockFund.getAddress(),
            mockWETH: await mockWETH.getAddress(),
            mockWBTC: await mockWBTC.getAddress(),
            mockLINK: await mockLINK.getAddress(),
            mockDAI: await mockDAI.getAddress()
        },
        timestamp: new Date().toISOString()
    };

    const fs = require("fs");
    fs.writeFileSync(
        "sepolia-deployment-with-permit.json",
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n✅ Deployment completed successfully!");
    console.log("Deployment info saved to: sepolia-deployment-with-permit.json");
    console.log("\nContract addresses:");
    console.log("MockUSDC:", await mockUSDC.getAddress());
    console.log("MockFund:", await mockFund.getAddress());
    console.log("PriceOracle:", await priceOracle.getAddress());
    console.log("UniswapIntegration:", await uniswapIntegration.getAddress());
    console.log("MockWETH:", await mockWETH.getAddress());
    console.log("MockWBTC:", await mockWBTC.getAddress());
    console.log("MockLINK:", await mockLINK.getAddress());
    console.log("MockDAI:", await mockDAI.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 