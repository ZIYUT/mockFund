const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("使用 Sepolia Chainlink 预言机部署合约");
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", (await deployer.getBalance()).toString());

    // 部署 Mock 代币
    console.log("\n=== 部署 Mock 代币 ===");
    
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy(deployer.address);
    await mockUSDC.deployed();
    console.log("MockUSDC deployed to:", mockUSDC.address);

    const MockWETH = await ethers.getContractFactory("MockWETH");
    const mockWETH = await MockWETH.deploy(deployer.address);
    await mockWETH.deployed();
    console.log("MockWETH deployed to:", mockWETH.address);

    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const mockWBTC = await MockWBTC.deploy(deployer.address);
    await mockWBTC.deployed();
    console.log("MockWBTC deployed to:", mockWBTC.address);

    const MockLINK = await ethers.getContractFactory("MockLINK");
    const mockLINK = await MockLINK.deploy(deployer.address);
    await mockLINK.deployed();
    console.log("MockLINK deployed to:", mockLINK.address);

    const MockUNI = await ethers.getContractFactory("MockUNI");
    const mockUNI = await MockUNI.deploy(deployer.address);
    await mockUNI.deployed();
    console.log("MockUNI deployed to:", mockUNI.address);

    const MockDAI = await ethers.getContractFactory("MockDAI");
    const mockDAI = await MockDAI.deploy(deployer.address);
    await mockDAI.deployed();
    console.log("MockDAI deployed to:", mockDAI.address);

    // 部署 Sepolia Chainlink 价格预言机
    console.log("\n=== 部署 Sepolia Chainlink 价格预言机 ===");
    const SepoliaPriceOracle = await ethers.getContractFactory("SepoliaPriceOracle");
    const sepoliaPriceOracle = await SepoliaPriceOracle.deploy(deployer.address);
    await sepoliaPriceOracle.deployed();
    console.log("SepoliaPriceOracle deployed to:", sepoliaPriceOracle.address);

    // 配置价格预言机
    console.log("\n=== 配置 Sepolia Chainlink 价格预言机 ===");
    
    // 使用预定义的 Sepolia 价格预言机
    await sepoliaPriceOracle.setPriceFeedBySymbol(mockWETH.address, "ETH");
    console.log("WETH price feed configured");
    
    await sepoliaPriceOracle.setPriceFeedBySymbol(mockWBTC.address, "BTC");
    console.log("WBTC price feed configured");
    
    await sepoliaPriceOracle.setPriceFeedBySymbol(mockLINK.address, "LINK");
    console.log("LINK price feed configured");
    
    await sepoliaPriceOracle.setPriceFeedBySymbol(mockUSDC.address, "USDC");
    console.log("USDC price feed configured");
    
    await sepoliaPriceOracle.setPriceFeedBySymbol(mockDAI.address, "DAI");
    console.log("DAI price feed configured");

    // 测试获取真实价格
    console.log("\n=== 测试获取真实价格 ===");
    try {
        const [wethPrice, wethTimestamp] = await sepoliaPriceOracle.getLatestPrice(mockWETH.address);
        console.log("WETH 价格:", ethers.utils.formatUnits(wethPrice, 8), "USD");
        console.log("价格时间戳:", new Date(wethTimestamp * 1000).toLocaleString());
        
        const [btcPrice, btcTimestamp] = await sepoliaPriceOracle.getLatestPrice(mockWBTC.address);
        console.log("WBTC 价格:", ethers.utils.formatUnits(btcPrice, 8), "USD");
        console.log("价格时间戳:", new Date(btcTimestamp * 1000).toLocaleString());
        
        const [linkPrice, linkTimestamp] = await sepoliaPriceOracle.getLatestPrice(mockLINK.address);
        console.log("LINK 价格:", ethers.utils.formatUnits(linkPrice, 8), "USD");
        console.log("价格时间戳:", new Date(linkTimestamp * 1000).toLocaleString());
        
    } catch (error) {
        console.log("获取价格失败（可能是网络问题）:", error.message);
    }

    // 部署 Mock Uniswap 集成
    console.log("\n=== 部署 Mock Uniswap 集成 ===");
    const MockUniswapIntegration = await ethers.getContractFactory("MockUniswapIntegration");
    const mockUniswapIntegration = await MockUniswapIntegration.deploy(deployer.address);
    await mockUniswapIntegration.deployed();
    console.log("MockUniswapIntegration deployed to:", mockUniswapIntegration.address);

    // 设置交换比率（基于真实价格）
    console.log("\n=== 配置交换比率 ===");
    
    // 获取真实价格来计算交换比率
    try {
        const [wethPrice] = await sepoliaPriceOracle.getLatestPrice(mockWETH.address);
        const [btcPrice] = await sepoliaPriceOracle.getLatestPrice(mockWBTC.address);
        const [linkPrice] = await sepoliaPriceOracle.getLatestPrice(mockLINK.address);
        
        // 计算交换比率（1 USDC = ? 代币）
        const wethRate = Math.floor((1 / parseFloat(ethers.utils.formatUnits(wethPrice, 8))) * 10000);
        const btcRate = Math.floor((1 / parseFloat(ethers.utils.formatUnits(btcPrice, 8))) * 10000);
        const linkRate = Math.floor((1 / parseFloat(ethers.utils.formatUnits(linkPrice, 8))) * 10000);
        
        await mockUniswapIntegration.setExchangeRate(mockUSDC.address, mockWETH.address, wethRate);
        await mockUniswapIntegration.setExchangeRate(mockUSDC.address, mockWBTC.address, btcRate);
        await mockUniswapIntegration.setExchangeRate(mockUSDC.address, mockLINK.address, linkRate);
        await mockUniswapIntegration.setExchangeRate(mockUSDC.address, mockDAI.address, 10000); // 1:1
        
        console.log("交换比率设置完成（基于真实价格）");
        
    } catch (error) {
        console.log("使用默认交换比率:", error.message);
        // 使用默认比率
        await mockUniswapIntegration.setExchangeRate(mockUSDC.address, mockWETH.address, 500);
        await mockUniswapIntegration.setExchangeRate(mockUSDC.address, mockWBTC.address, 25);
        await mockUniswapIntegration.setExchangeRate(mockUSDC.address, mockLINK.address, 6667);
        await mockUniswapIntegration.setExchangeRate(mockUSDC.address, mockDAI.address, 10000);
    }

    // 部署基金合约（使用 Sepolia 价格预言机）
    console.log("\n=== 部署基金合约 ===");
    const MockFund = await ethers.getContractFactory("MockFund");
    const mockFund = await MockFund.deploy(
        "Mock Fund Share Token",
        "MFC",
        deployer.address,
        200, // 2% 管理费
        sepoliaPriceOracle.address, // 使用 Sepolia 价格预言机
        mockUniswapIntegration.address
    );
    await mockFund.deployed();
    console.log("MockFund deployed to:", mockFund.address);

    // 配置基金合约
    console.log("\n=== 配置基金合约 ===");
    await mockFund.setUSDCToken(mockUSDC.address);
    console.log("USDC token set");

    // 添加支持的代币
    const supportedTokens = [mockWETH.address, mockWBTC.address, mockLINK.address, mockUNI.address, mockDAI.address];
    const allocation = 2000; // 20% of 50% = 10% of total

    for (const token of supportedTokens) {
        await mockFund.addSupportedToken(token, allocation);
        console.log(`Added supported token: ${token} with allocation: ${allocation}`);
    }

    // 为 Mock Uniswap 集成预存代币
    console.log("\n=== 预存代币到 Mock Uniswap ===");
    const depositAmounts = [
        { token: mockWETH, amount: ethers.utils.parseEther("100") },
        { token: mockWBTC, amount: ethers.utils.parseUnits("10", 8) },
        { token: mockLINK, amount: ethers.utils.parseEther("10000") },
        { token: mockUNI, amount: ethers.utils.parseEther("10000") },
        { token: mockDAI, amount: ethers.utils.parseEther("1000000") },
    ];

    for (const deposit of depositAmounts) {
        await deposit.token.approve(mockUniswapIntegration.address, deposit.amount);
        await mockUniswapIntegration.depositToken(deposit.token.address, deposit.amount);
        console.log(`Deposited ${ethers.utils.formatEther(deposit.amount)} ${await deposit.token.symbol()} to MockUniswap`);
    }

    // 初始化基金
    console.log("\n=== 初始化基金 ===");
    const initialUSDCAmount = ethers.utils.parseUnits("1000000", 6); // 100万 USDC
    await mockUSDC.approve(mockFund.address, initialUSDCAmount);
    await mockFund.initializeFund(initialUSDCAmount);
    console.log("Fund initialized with 1,000,000 USDC");

    // 输出部署信息
    console.log("\n=== 部署完成 ===");
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);
    console.log("\n合约地址:");
    console.log("MockUSDC:", mockUSDC.address);
    console.log("MockWETH:", mockWETH.address);
    console.log("MockWBTC:", mockWBTC.address);
    console.log("MockLINK:", mockLINK.address);
    console.log("MockUNI:", mockUNI.address);
    console.log("MockDAI:", mockDAI.address);
    console.log("SepoliaPriceOracle:", sepoliaPriceOracle.address);
    console.log("MockUniswapIntegration:", mockUniswapIntegration.address);
    console.log("MockFund:", mockFund.address);
    console.log("FundShareToken:", await mockFund.shareToken());

    // 保存部署信息
    const deploymentInfo = {
        network: network.name,
        deployer: deployer.address,
        contracts: {
            MockUSDC: mockUSDC.address,
            MockWETH: mockWETH.address,
            MockWBTC: mockWBTC.address,
            MockLINK: mockLINK.address,
            MockUNI: mockUNI.address,
            MockDAI: mockDAI.address,
            SepoliaPriceOracle: sepoliaPriceOracle.address,
            MockUniswapIntegration: mockUniswapIntegration.address,
            MockFund: mockFund.address,
            FundShareToken: await mockFund.shareToken(),
        },
        deploymentTime: new Date().toISOString(),
        priceOracleType: "Sepolia Chainlink",
    };

    const fs = require("fs");
    fs.writeFileSync(
        `deployments/sepolia-chainlink-${Date.now()}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n部署信息已保存到 deployments 文件夹");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 