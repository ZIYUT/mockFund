const { ethers } = require("hardhat");

async function main() {
    console.log("在本地网络测试部署 FixedRateMockFund 合约...");
    
    const [deployer] = await ethers.getSigners();
    console.log("部署者地址:", deployer.address);
    console.log("部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    try {
        console.log("\n=== 第1步: 部署基础合约 ===");
        
        // 1. 部署 MockUSDC
        console.log("部署 MockUSDC...");
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        const usdc = await MockUSDC.deploy(deployer.address);
        await usdc.waitForDeployment();
        const usdcAddress = await usdc.getAddress();
        console.log("MockUSDC 部署成功:", usdcAddress);
        
        // 2. 部署 ChainlinkPriceOracle
        console.log("部署 ChainlinkPriceOracle...");
        const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
        const priceOracle = await ChainlinkPriceOracle.deploy(deployer.address);
        await priceOracle.waitForDeployment();
        const priceOracleAddress = await priceOracle.getAddress();
        console.log("ChainlinkPriceOracle 部署成功:", priceOracleAddress);
        
        // 3. 部署测试代币
        console.log("部署测试代币...");
        const MockTokens = await ethers.getContractFactory("MockTokens");
        const tokens = await MockTokens.deploy(deployer.address);
        await tokens.waitForDeployment();
        const tokensAddress = await tokens.getAddress();
        console.log("MockTokens 部署成功:", tokensAddress);
        
        // 获取代币地址
        const wethAddress = await tokens.WETH();
        const wbtcAddress = await tokens.WBTC();
        const linkAddress = await tokens.LINK();
        const daiAddress = await tokens.DAI();
        
        console.log("WETH 地址:", wethAddress);
        console.log("WBTC 地址:", wbtcAddress);
        console.log("LINK 地址:", linkAddress);
        console.log("DAI 地址:", daiAddress);
        
        console.log("\n=== 第2步: 部署 FixedRateUniswapIntegration ===");
        
        // 4. 部署 FixedRateUniswapIntegration
        const FixedRateUniswapIntegration = await ethers.getContractFactory("FixedRateUniswapIntegration");
        const uniswapIntegration = await FixedRateUniswapIntegration.deploy(
            deployer.address,
            priceOracleAddress
        );
        await uniswapIntegration.waitForDeployment();
        const uniswapIntegrationAddress = await uniswapIntegration.getAddress();
        console.log("FixedRateUniswapIntegration 部署成功:", uniswapIntegrationAddress);
        
        // 初始化固定汇率
        console.log("初始化固定汇率...");
        const initTx = await uniswapIntegration.initializeFixedRates(
            wethAddress,
            wbtcAddress,
            linkAddress,
            daiAddress
        );
        await initTx.wait();
        console.log("固定汇率初始化完成");
        
        console.log("\n=== 第3步: 部署 FixedRateMockFund ===");
        
        // 5. 部署 FixedRateMockFund
        const FixedRateMockFund = await ethers.getContractFactory("FixedRateMockFund");
        const fund = await FixedRateMockFund.deploy(
            "Mock Fund Coin",
            "MFC",
            deployer.address,
            ethers.toBigInt(100), // 1% 管理费
            priceOracleAddress,
            uniswapIntegrationAddress
        );
        await fund.waitForDeployment();
        const fundAddress = await fund.getAddress();
        console.log("FixedRateMockFund 部署成功:", fundAddress);
        
        const shareTokenAddress = await fund.shareToken();
        console.log("FundShareToken 地址:", shareTokenAddress);
        
        console.log("\n=== 第4步: 配置基金 ===");
        
        // 设置 USDC 地址
        const setUSDCTx = await fund.setUSDCToken(usdcAddress);
        await setUSDCTx.wait();
        console.log("USDC 地址设置完成");
        
        // 添加支持的代币
        const supportedTokens = [
            { address: wethAddress, name: "WETH" },
            { address: wbtcAddress, name: "WBTC" },
            { address: linkAddress, name: "LINK" },
            { address: daiAddress, name: "DAI" }
        ];
        
        for (const token of supportedTokens) {
            const addTokenTx = await fund.addSupportedToken(token.address, 1250); // 12.5% each
            await addTokenTx.wait();
            console.log(`${token.name} 代币添加完成`);
        }
        
        console.log("\n=== 第5步: 准备 USDC ===");
        
        // 获取 USDC 用于测试
        const requiredUSDC = ethers.parseUnits("100000", 6); // 100,000 USDC for testing
        const getLargeTx = await usdc.getLargeAmount();
        await getLargeTx.wait();
        console.log("获取 100,000 USDC 完成");
        
        // 授权基金合约使用 USDC
        const approveTx = await usdc.approve(fundAddress, requiredUSDC);
        await approveTx.wait();
        console.log("USDC 授权完成");
        
        console.log("\n=== 第6步: 初始化基金 ===");
        
        const initFundTx = await fund.initializeFund(requiredUSDC);
        await initFundTx.wait();
        console.log("基金初始化完成！");
        
        console.log("\n=== 第7步: 验证基金状态 ===");
        
        // 验证基金状态
        const [totalSupply, initialSupply, isInitialized] = await fund.getFundStats();
        console.log(`MFC 总供应量: ${ethers.formatEther(totalSupply)} MFC`);
        console.log(`初始供应量: ${ethers.formatEther(initialSupply)} MFC`);
        console.log(`是否已初始化: ${isInitialized}`);
        
        // 获取 MFC 组成
        const [tokens_comp, ratios, usdcAmount] = await fund.getMFCComposition();
        console.log("\n=== MFC 组成 ===");
        console.log(`每份 MFC 包含 USDC: ${ethers.formatUnits(usdcAmount, 18)} (scaled)`);
        
        for (let i = 0; i < tokens_comp.length; i++) {
            const tokenName = supportedTokens.find(t => t.address === tokens_comp[i])?.name || "Unknown";
            console.log(`每份 MFC 包含 ${tokenName}: ${ethers.formatUnits(ratios[i], 18)} (scaled)`);
        }
        
        // 计算 MFC 价值
        const nav = await fund.calculateNAV();
        const mfcValue = await fund.calculateMFCValue();
        const theoreticalValue = await fund.calculateTheoreticalMFCValue();
        
        console.log("\n=== 基金价值 ===");
        console.log(`基金 NAV: ${ethers.formatUnits(nav, 6)} USDC`);
        console.log(`单份 MFC 价值: ${ethers.formatUnits(mfcValue, 6)} USDC`);
        console.log(`理论 MFC 价值: ${ethers.formatUnits(theoreticalValue, 6)} USDC`);
        
        // 获取基金代币余额
        const [balanceTokens, balances, decimals] = await fund.getFundTokenBalances();
        console.log("\n=== 基金代币余额 ===");
        for (let i = 0; i < balanceTokens.length; i++) {
            const tokenName = i === 0 ? "USDC" : supportedTokens.find(t => t.address === balanceTokens[i])?.name || "Unknown";
            console.log(`${tokenName}: ${ethers.formatUnits(balances[i], decimals[i])}`);
        }
        
        console.log("\n=== 测试完成 ===");
        console.log("✅ 所有合约部署成功");
        console.log("✅ 基金初始化成功");
        console.log("✅ 固定汇率功能正常");
        console.log("\n合约地址汇总:");
        console.log(`MockUSDC: ${usdcAddress}`);
        console.log(`ChainlinkPriceOracle: ${priceOracleAddress}`);
        console.log(`MockTokens: ${tokensAddress}`);
        console.log(`FixedRateUniswapIntegration: ${uniswapIntegrationAddress}`);
        console.log(`FixedRateMockFund: ${fundAddress}`);
        console.log(`FundShareToken: ${shareTokenAddress}`);
        
        return {
            success: true,
            contracts: {
                MockUSDC: usdcAddress,
                ChainlinkPriceOracle: priceOracleAddress,
                MockTokens: tokensAddress,
                FixedRateUniswapIntegration: uniswapIntegrationAddress,
                FixedRateMockFund: fundAddress,
                FundShareToken: shareTokenAddress,
                tokens: {
                    WETH: wethAddress,
                    WBTC: wbtcAddress,
                    LINK: linkAddress,
                    DAI: daiAddress
                }
            }
        };
        
    } catch (error) {
        console.error("\n❌ 测试部署失败:", error.message);
        console.error("错误详情:", error);
        return { success: false, error: error.message };
    }
}

main()
    .then((result) => {
        if (result.success) {
            console.log("\n🎉 本地测试部署成功！现在可以安全地部署到 Sepolia 网络。");
        } else {
            console.log("\n💥 本地测试失败，需要修复问题后再部署到 Sepolia。");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("测试失败:", error);
        process.exit(1);
    });