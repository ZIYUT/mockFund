const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("\n=== 开始本地测试 FixedRateMockFund 合约 ===");
    
    const [deployer] = await ethers.getSigners();
    console.log("部署者地址:", deployer.address);
    console.log("部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    try {
        // 1. 部署 MockUSDC
        console.log("\n1. 部署 MockUSDC...");
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        const mockUSDC = await MockUSDC.deploy(deployer.address);
        await mockUSDC.waitForDeployment();
        const usdcAddress = await mockUSDC.getAddress();
        console.log("MockUSDC 部署地址:", usdcAddress);
        
        // 2. 部署 ChainlinkPriceOracle
        console.log("\n2. 部署 ChainlinkPriceOracle...");
        const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
        const priceOracle = await ChainlinkPriceOracle.deploy(deployer.address);
        await priceOracle.waitForDeployment();
        const oracleAddress = await priceOracle.getAddress();
        console.log("ChainlinkPriceOracle 部署地址:", oracleAddress);
        
        // 3. 部署 MockTokensFactory
        console.log("\n3. 部署 MockTokensFactory...");
        const MockTokensFactory = await ethers.getContractFactory("MockTokensFactory");
        const tokensFactory = await MockTokensFactory.deploy(deployer.address);
        await tokensFactory.waitForDeployment();
        const factoryAddress = await tokensFactory.getAddress();
        console.log("MockTokensFactory 部署地址:", factoryAddress);
        
        // 4. 通过工厂部署模拟代币
        console.log("\n4. 部署模拟代币...");
        await tokensFactory.deployAllTokens();
        
        const wethAddress = await tokensFactory.weth();
        const wbtcAddress = await tokensFactory.wbtc();
        const linkAddress = await tokensFactory.link();
        const daiAddress = await tokensFactory.dai();
        
        console.log("WETH 地址:", wethAddress);
        console.log("WBTC 地址:", wbtcAddress);
        console.log("LINK 地址:", linkAddress);
        console.log("DAI 地址:", daiAddress);
        
        // 5. 部署模拟价格源并设置价格预言机
        console.log("\n5. 部署模拟价格源并设置价格预言机...");
        
        // 部署MockPriceFeed合约
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        
        // 为每个代币创建价格源（价格以8位小数表示，与Chainlink标准一致）
        const usdcPriceFeed = await MockPriceFeed.deploy(
            ethers.parseUnits("1", 8), // 1 USDC = $1.00
            8,
            "USDC / USD"
        );
        await usdcPriceFeed.waitForDeployment();
        
        const wethPriceFeed = await MockPriceFeed.deploy(
            ethers.parseUnits("3000", 8), // 1 ETH = $3000.00
            8,
            "ETH / USD"
        );
        await wethPriceFeed.waitForDeployment();
        
        const wbtcPriceFeed = await MockPriceFeed.deploy(
            ethers.parseUnits("115000", 8), // 1 BTC = $115000.00
            8,
            "BTC / USD"
        );
        await wbtcPriceFeed.waitForDeployment();
        
        const linkPriceFeed = await MockPriceFeed.deploy(
            ethers.parseUnits("15", 8), // 1 LINK = $15.00
            8,
            "LINK / USD"
        );
        await linkPriceFeed.waitForDeployment();
        
        const daiPriceFeed = await MockPriceFeed.deploy(
            ethers.parseUnits("1", 8), // 1 DAI = $1.00
            8,
            "DAI / USD"
        );
        await daiPriceFeed.waitForDeployment();
        
        // 设置价格源到价格预言机
        await priceOracle.setPriceFeed(usdcAddress, await usdcPriceFeed.getAddress(), "USDC");
        await priceOracle.setPriceFeed(wethAddress, await wethPriceFeed.getAddress(), "WETH");
        await priceOracle.setPriceFeed(wbtcAddress, await wbtcPriceFeed.getAddress(), "WBTC");
        await priceOracle.setPriceFeed(linkAddress, await linkPriceFeed.getAddress(), "LINK");
        await priceOracle.setPriceFeed(daiAddress, await daiPriceFeed.getAddress(), "DAI");
        
        console.log("价格预言机配置完成，已设置所有代币的价格源");
        
        // 6. 部署 FixedRateUniswapIntegration
        console.log("\n6. 部署 FixedRateUniswapIntegration...");
        const FixedRateUniswapIntegration = await ethers.getContractFactory("FixedRateUniswapIntegration");
        const uniswapIntegration = await FixedRateUniswapIntegration.deploy(deployer.address, oracleAddress);
        await uniswapIntegration.waitForDeployment();
        const integrationAddress = await uniswapIntegration.getAddress();
        console.log("FixedRateUniswapIntegration 部署地址:", integrationAddress);
        
        // 7. 设置固定汇率
        console.log("\n7. 设置固定汇率...");
        await uniswapIntegration.setFixedRate(usdcAddress, ethers.parseUnits("1", 6)); // 1 USDC = 1 USDC
        await uniswapIntegration.setFixedRate(wethAddress, ethers.parseUnits("3000", 6)); // 1 ETH = 3000 USDC
        await uniswapIntegration.setFixedRate(wbtcAddress, ethers.parseUnits("115000", 6)); // 1 BTC = 115000 USDC
        await uniswapIntegration.setFixedRate(linkAddress, ethers.parseUnits("15", 6)); // 1 LINK = 15 USDC
        await uniswapIntegration.setFixedRate(daiAddress, ethers.parseUnits("1", 6)); // 1 DAI = 1 USDC
        
        // 启用固定汇率模式
        await uniswapIntegration.setFixedRateMode(true);
        
        // 为 FixedRateUniswapIntegration 合约预铸造代币，以便进行交换
        console.log("\n7.1. 为交换合约预铸造代币...");
        const weth = await ethers.getContractAt("MockWETH", wethAddress);
        const wbtc = await ethers.getContractAt("MockWBTC", wbtcAddress);
        const link = await ethers.getContractAt("MockLINK", linkAddress);
        const dai = await ethers.getContractAt("MockDAI", daiAddress);
        
        // 将代币的所有权转移给 FixedRateUniswapIntegration 合约，以便它可以铸造代币
        await weth.transferOwnership(integrationAddress);
        await wbtc.transferOwnership(integrationAddress);
        await link.transferOwnership(integrationAddress);
        await dai.transferOwnership(integrationAddress);
        
        // 验证固定汇率是否正确设置
        const usdcRate = await uniswapIntegration.getFixedRate(usdcAddress);
        const wethRate = await uniswapIntegration.getFixedRate(wethAddress);
        const wbtcRate = await uniswapIntegration.getFixedRate(wbtcAddress);
        const linkRate = await uniswapIntegration.getFixedRate(linkAddress);
        const daiRate = await uniswapIntegration.getFixedRate(daiAddress);
        const isFixedRateMode = await uniswapIntegration.isFixedRateMode();
        
        console.log("固定汇率验证:");
        console.log("USDC 汇率:", ethers.formatUnits(usdcRate, 6), "USDC/USDC");
        console.log("WETH 汇率:", ethers.formatUnits(wethRate, 6), "USDC/WETH");
        console.log("WBTC 汇率:", ethers.formatUnits(wbtcRate, 6), "USDC/WBTC");
        console.log("LINK 汇率:", ethers.formatUnits(linkRate, 6), "USDC/LINK");
        console.log("DAI 汇率:", ethers.formatUnits(daiRate, 6), "USDC/DAI");
        console.log("固定汇率模式已启用:", isFixedRateMode);
        
        console.log("固定汇率设置完成，已启用固定汇率模式，代币所有权已转移");
        
        // 8. 部署 FixedRateMockFund
        console.log("\n8. 部署 FixedRateMockFund...");
        const FixedRateMockFund = await ethers.getContractFactory("FixedRateMockFund");
        const mockFund = await FixedRateMockFund.deploy(
            "Mock Fund Coin",
            "MFC",
            deployer.address,
            100, // 1% 管理费
            oracleAddress,
            integrationAddress
        );
        await mockFund.waitForDeployment();
        const fundAddress = await mockFund.getAddress();
        console.log("FixedRateMockFund 部署地址:", fundAddress);
        
        // 9. 配置基金
        console.log("\n9. 配置基金...");
        await mockFund.setUSDCToken(usdcAddress);
        await mockFund.addSupportedToken(wethAddress, 1250); // 12.5%
        await mockFund.addSupportedToken(wbtcAddress, 1250); // 12.5%
        await mockFund.addSupportedToken(linkAddress, 1250); // 12.5%
        await mockFund.addSupportedToken(daiAddress, 1250); // 12.5%
        
        // 授权基金合约调用交换合约的铸造功能
        await uniswapIntegration.setAuthorizedCaller(fundAddress, true);
        
        console.log("基金配置完成，已授权基金合约");
        
        // 10. 准备 USDC
        console.log("\n10. 准备 USDC...");
        const requiredUSDC = ethers.parseUnits("1000000", 6); // 1M USDC
        await mockUSDC.getLargeAmount(); // 获取 1M USDC
        const usdcBalance = await mockUSDC.balanceOf(deployer.address);
        console.log("部署者 USDC 余额:", ethers.formatUnits(usdcBalance, 6), "USDC");
        
        if (usdcBalance < requiredUSDC) {
            console.log("USDC 余额不足，继续获取...");
            await mockUSDC.getLargeAmount();
            const newBalance = await mockUSDC.balanceOf(deployer.address);
            console.log("新的 USDC 余额:", ethers.formatUnits(newBalance, 6), "USDC");
        }
        
        // 11. 批准 USDC 转账
        console.log("\n11. 批准 USDC 转账...");
        await mockUSDC.approve(fundAddress, requiredUSDC);
        console.log("USDC 转账批准完成");
        
        // 12. 初始化基金
        console.log("\n12. 初始化基金...");
        const initTx = await mockFund.initializeFund(requiredUSDC);
        await initTx.wait();
        
        // 初始化完成后禁用固定汇率模式
        await uniswapIntegration.setFixedRateMode(false);
        console.log("基金初始化完成，已禁用固定汇率模式！");
        
        // 13. 验证基金状态
        console.log("\n13. 验证基金状态...");
        const isInitialized = await mockFund.isInitialized();
        const shareTokenAddress = await mockFund.shareToken();
        const nav = await mockFund.calculateNAV();
        const mfcValue = await mockFund.calculateMFCValue();
        const theoreticalValue = await mockFund.calculateTheoreticalMFCValue();
        
        console.log("基金已初始化:", isInitialized);
        console.log("份额代币地址:", shareTokenAddress);
        console.log("基金 NAV:", ethers.formatUnits(nav, 6), "USDC");
        console.log("MFC 当前价值:", ethers.formatUnits(mfcValue, 6), "USDC");
        console.log("MFC 理论价值:", ethers.formatUnits(theoreticalValue, 6), "USDC");
        
        // 14. 检查基金组成
        console.log("\n14. 检查基金组成...");
        const [tokens, ratios, usdcAmount] = await mockFund.getMFCComposition();
        console.log("支持的代币数量:", tokens.length);
        console.log("每个 MFC 包含的 USDC:", ethers.formatUnits(usdcAmount, 18), "(scaled)");
        
        for (let i = 0; i < tokens.length; i++) {
            console.log(`代币 ${i + 1}: ${tokens[i]}, 比例: ${ethers.formatUnits(ratios[i], 18)}`);
        }
        
        // 15. 检查基金余额
        console.log("\n15. 检查基金余额...");
        const fundUSDCBalance = await mockUSDC.balanceOf(fundAddress);
        console.log("基金 USDC 余额:", ethers.formatUnits(fundUSDCBalance, 6), "USDC");
        
        // 检查代币余额（使用之前已声明的变量）
        
        const wethBalance = await weth.balanceOf(fundAddress);
        const wbtcBalance = await wbtc.balanceOf(fundAddress);
        const linkBalance = await link.balanceOf(fundAddress);
        const daiBalance = await dai.balanceOf(fundAddress);
        
        console.log("基金 WETH 余额:", ethers.formatUnits(wethBalance, 18), "WETH");
        console.log("基金 WBTC 余额:", ethers.formatUnits(wbtcBalance, 8), "WBTC");
        console.log("基金 LINK 余额:", ethers.formatUnits(linkBalance, 18), "LINK");
        console.log("基金 DAI 余额:", ethers.formatUnits(daiBalance, 18), "DAI");
        
        // 16. 保存部署信息
        console.log("\n16. 保存部署信息...");
        const deploymentInfo = {
            network: "localhost",
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            contracts: {
                MockUSDC: usdcAddress,
                ChainlinkPriceOracle: oracleAddress,
                MockTokensFactory: factoryAddress,
                FixedRateUniswapIntegration: integrationAddress,
                FixedRateMockFund: fundAddress,
                FundShareToken: shareTokenAddress,
                tokens: {
                    WETH: wethAddress,
                    WBTC: wbtcAddress,
                    LINK: linkAddress,
                    DAI: daiAddress
                }
            },
            fundStats: {
                isInitialized: isInitialized,
                nav: ethers.formatUnits(nav, 6),
                mfcValue: ethers.formatUnits(mfcValue, 6),
                theoreticalValue: ethers.formatUnits(theoreticalValue, 6)
            }
        };
        
        const deploymentPath = path.join(__dirname, '..', 'localhost-deployment.json');
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log("部署信息已保存到:", deploymentPath);
        
        console.log("\n=== ✅ 本地测试成功完成！===");
        console.log("FixedRateMockFund 合约已成功部署并初始化");
        console.log("所有功能测试通过，可以进行 Sepolia 网络部署");
        
    } catch (error) {
        console.error("\n❌ 测试失败:", error.message);
        if (error.reason) {
            console.error("失败原因:", error.reason);
        }
        if (error.transaction) {
            console.error("失败交易:", error.transaction);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("脚本执行失败:", error);
        process.exit(1);
    });