const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
    console.log("账户余额:", (await deployer.getBalance()).toString());
  
    // 1. 部署 MockUSDC
    console.log("\n1. 部署 MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.deployed();
    console.log("MockUSDC 已部署到:", mockUSDC.address);

    // 2. 部署 MockTokensFactory
    console.log("\n2. 部署 MockTokensFactory...");
    const MockTokensFactory = await ethers.getContractFactory("MockTokensFactory");
    const mockTokensFactory = await MockTokensFactory.deploy(deployer.address);
    await mockTokensFactory.deployed();
    console.log("MockTokensFactory 已部署到:", mockTokensFactory.address);

    // 部署所有代币
    console.log("部署所有代币...");
    await mockTokensFactory.deployAllTokens();
    console.log("所有代币已部署");

    // 获取各个代币地址
    const [wbtcAddress, wethAddress, linkAddress, daiAddress] = await mockTokensFactory.getAllTokenAddresses();

    console.log("WBTC 地址:", wbtcAddress);
    console.log("WETH 地址:", wethAddress);
    console.log("LINK 地址:", linkAddress);
    console.log("DAI 地址:", daiAddress);

    // 3. 部署 PriceOracle (使用 Chainlink 真实预言机)
    console.log("\n3. 部署 PriceOracle (Chainlink)...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy(deployer.address);
    await priceOracle.deployed();
    console.log("PriceOracle 已部署到:", priceOracle.address);

    // 4. 部署 MockUniswapIntegration
    console.log("\n4. 部署 MockUniswapIntegration...");
  const MockUniswapIntegration = await ethers.getContractFactory("MockUniswapIntegration");
    const mockUniswapIntegration = await MockUniswapIntegration.deploy(deployer.address, priceOracle.address);
    await mockUniswapIntegration.deployed();
    console.log("MockUniswapIntegration 已部署到:", mockUniswapIntegration.address);

    // 5. 部署 MockFund
    console.log("\n5. 部署 MockFund...");
  const MockFund = await ethers.getContractFactory("MockFund");
  const mockFund = await MockFund.deploy(
    "Mock Fund Share Token",
        "MFC",
    deployer.address,
    200, // 2% 管理费
        priceOracle.address,
        mockUniswapIntegration.address
  );
    await mockFund.deployed();
    console.log("MockFund 已部署到:", mockFund.address);

    // 6. 配置 PriceOracle 的价格预言机
    console.log("\n6. 配置 PriceOracle 的价格预言机...");
    
    // 使用 Sepolia 测试网的 Chainlink 价格预言机地址
    const sepoliaPriceFeeds = {
        "ETH": "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD
        "BTC": "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", // BTC/USD
        "LINK": "0xc59E3633BAAC79493d908e63626716e204A45EdF", // LINK/USD
        "USDC": "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E", // USDC/USD
        "DAI": "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19"   // DAI/USD
    };

    // 设置各个代币的价格预言机
    await priceOracle.setPriceFeedBySymbol(wethAddress, "ETH");
    console.log("已设置 WETH 价格预言机");
    
    await priceOracle.setPriceFeedBySymbol(wbtcAddress, "BTC");
    console.log("已设置 WBTC 价格预言机");
    
    await priceOracle.setPriceFeedBySymbol(linkAddress, "LINK");
    console.log("已设置 LINK 价格预言机");
    
    await priceOracle.setPriceFeedBySymbol(daiAddress, "DAI");
    console.log("已设置 DAI 价格预言机");
    
    await priceOracle.setPriceFeedBySymbol(mockUSDC.address, "USDC");
    console.log("已设置 USDC 价格预言机");

    // 7. 配置 MockUniswapIntegration 的交换比率
    console.log("\n7. 配置 MockUniswapIntegration 的交换比率...");
  
    // 只配置ETH、BTC、LINK、DAI
    await mockUniswapIntegration.calculateAndSetExchangeRate(mockUSDC.address, wethAddress);
    await mockUniswapIntegration.calculateAndSetExchangeRate(mockUSDC.address, wbtcAddress);
    await mockUniswapIntegration.calculateAndSetExchangeRate(mockUSDC.address, linkAddress);
    await mockUniswapIntegration.calculateAndSetExchangeRate(mockUSDC.address, daiAddress);
    // 反向
    await mockUniswapIntegration.calculateAndSetExchangeRate(wethAddress, mockUSDC.address);
    await mockUniswapIntegration.calculateAndSetExchangeRate(wbtcAddress, mockUSDC.address);
    await mockUniswapIntegration.calculateAndSetExchangeRate(linkAddress, mockUSDC.address);
    await mockUniswapIntegration.calculateAndSetExchangeRate(daiAddress, mockUSDC.address);
    
    console.log("已计算并设置所有交换比率");

    // 8. 配置 MockFund
    console.log("\n8. 配置 MockFund...");
    
    // 设置 USDC 代币地址
    await mockFund.setUSDCToken(mockUSDC.address);
    console.log("已设置 USDC 代币地址");

    // 添加支持的代币（ETH、BTC、LINK、DAI 各占 12.5%，USDC 50%）
    await mockFund.addSupportedToken(wbtcAddress, 1250); // 12.5%
    await mockFund.addSupportedToken(wethAddress, 1250); // 12.5%
    await mockFund.addSupportedToken(linkAddress, 1250); // 12.5%
    await mockFund.addSupportedToken(daiAddress, 1250);  // 12.5%
    // 不再添加UNI
    
    console.log("已添加所有支持的代币");

    // 9. 为测试准备代币
    console.log("\n9. 为测试准备代币...");
  
    // 铸造测试代币给部署者
    const testAmount = ethers.utils.parseUnits("1000000", 6); // 100万 USDC
  await mockUSDC.mint(deployer.address, testAmount);
    console.log("已铸造 100万 USDC 给部署者");

    // 为 MockUniswapIntegration 预存一些代币用于交换
    const swapAmount = ethers.utils.parseUnits("100000", 6); // 10万 USDC
    await mockUSDC.approve(mockUniswapIntegration.address, swapAmount);
    await mockUniswapIntegration.depositToken(mockUSDC.address, swapAmount);
    console.log("已为 MockUniswapIntegration 预存 10万 USDC");
  
    // 10. 初始化基金
    console.log("\n10. 初始化基金...");
    
    // 批准 USDC 给基金
    const initialAmount = ethers.utils.parseUnits("1000000", 6); // 100万 USDC
    await mockUSDC.approve(mockFund.address, initialAmount);
  
    // 初始化基金
    await mockFund.initializeFund(initialAmount);
    console.log("基金已初始化");

    // 11. 输出部署信息
  console.log("\n=== 部署完成 ===");
    console.log("MockUSDC:", mockUSDC.address);
    console.log("MockTokensFactory:", mockTokensFactory.address);
    console.log("PriceOracle:", priceOracle.address);
    console.log("MockUniswapIntegration:", mockUniswapIntegration.address);
    console.log("MockFund:", mockFund.address);
    console.log("FundShareToken:", await mockFund.shareToken());
    
    console.log("\n=== 代币地址 ===");
    console.log("WBTC:", wbtcAddress);
    console.log("WETH:", wethAddress);
    console.log("LINK:", linkAddress);
    console.log("DAI:", daiAddress);
    
    console.log("\n=== 测试信息 ===");
    console.log("部署者地址:", deployer.address);
    console.log("部署者 USDC 余额:", ethers.utils.formatUnits(await mockUSDC.balanceOf(deployer.address), 6));
    console.log("部署者 MFC 余额:", ethers.utils.formatUnits(await mockFund.shareToken().balanceOf(deployer.address), 18));
    
    // 保存部署地址到文件
    const fs = require('fs');
    const deploymentInfo = {
        network: "sepolia",
        deployer: deployer.address,
        contracts: {
            MockUSDC: mockUSDC.address,
            MockTokensFactory: mockTokensFactory.address,
            PriceOracle: priceOracle.address,
            MockUniswapIntegration: mockUniswapIntegration.address,
            MockFund: mockFund.address,
            FundShareToken: await mockFund.shareToken()
        },
        tokens: {
            WBTC: wbtcAddress,
            WETH: wethAddress,
            LINK: linkAddress,
            DAI: daiAddress
        },
        deploymentTime: new Date().toISOString()
    };
    
    fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("\n部署信息已保存到 deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });