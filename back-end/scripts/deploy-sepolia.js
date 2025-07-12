const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Sepolia测试网上的Chainlink价格feed地址
const CHAINLINK_PRICE_FEEDS = {
    // ETH/USD
    ETH: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    // BTC/USD  
    BTC: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
    // LINK/USD
    LINK: "0xc59E3633BAAC79493d908e63626716e204A45EdF",
    // USDC/USD
    USDC: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"
};

// Sepolia测试网上的代币地址
const SEPOLIA_TOKENS = {
    USDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", // USDC on Sepolia
    WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // WETH on Sepolia
    WBTC: "0x29f2D40B0605204364af54EC677bD022dA425d03", // WBTC on Sepolia
    LINK: "0x779877A7B0D9E8603169DdbD7836e478b4624789", // LINK on Sepolia
    DAI: "0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6"   // DAI on Sepolia
};

async function main() {
    console.log("🚀 开始部署MockFund合约到Sepolia测试网...");
    
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    console.log(`网络: ${network.name} (chainId: ${network.chainId})`);
    
    if (network.chainId !== 11155111n) {
        throw new Error("请确保连接到Sepolia测试网 (chainId: 11155111)");
    }
    
    // 获取签名者
    const [deployer] = await ethers.getSigners();
    console.log(`部署者: ${deployer.address}`);
    
    // 检查部署者余额
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`部署者ETH余额: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther("0.1")) {
        throw new Error("部署者ETH余额不足，请确保至少有0.1 ETH用于部署");
    }
    
    try {
        // 1. 部署ChainlinkPriceOracle
        console.log("\n📦 部署ChainlinkPriceOracle...");
        const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
        const chainlinkOracle = await ChainlinkPriceOracle.deploy(deployer.address);
        await chainlinkOracle.waitForDeployment();
        const oracleAddress = await chainlinkOracle.getAddress();
        console.log(`✅ ChainlinkPriceOracle部署成功: ${oracleAddress}`);
        
        // 2. 设置Chainlink价格feeds
        console.log("\n🔮 设置Chainlink价格feeds...");
        await chainlinkOracle.setPriceFeed(SEPOLIA_TOKENS.USDC, CHAINLINK_PRICE_FEEDS.USDC, "USDC");
        await chainlinkOracle.setPriceFeed(SEPOLIA_TOKENS.WETH, CHAINLINK_PRICE_FEEDS.ETH, "WETH");
        await chainlinkOracle.setPriceFeed(SEPOLIA_TOKENS.WBTC, CHAINLINK_PRICE_FEEDS.BTC, "WBTC");
        await chainlinkOracle.setPriceFeed(SEPOLIA_TOKENS.LINK, CHAINLINK_PRICE_FEEDS.LINK, "LINK");
        await chainlinkOracle.setPriceFeed(SEPOLIA_TOKENS.DAI, CHAINLINK_PRICE_FEEDS.USDC, "DAI"); // DAI使用USDC价格feed
        console.log("✅ Chainlink价格feeds设置完成");
        
        // 3. 部署UniswapIntegration
        console.log("\n📦 部署UniswapIntegration...");
        const UniswapIntegration = await ethers.getContractFactory("contracts/UniswapIntegration.sol:UniswapIntegration");
        const uniswapIntegration = await UniswapIntegration.deploy(deployer.address, oracleAddress);
        await uniswapIntegration.waitForDeployment();
        const uniswapAddress = await uniswapIntegration.getAddress();
        console.log(`✅ UniswapIntegration部署成功: ${uniswapAddress}`);
        
        // 4. 部署MockFund
        console.log("\n📦 部署MockFund...");
        const MockFund = await ethers.getContractFactory("contracts/MockFund.sol:MockFund");
        const mockFund = await MockFund.deploy(
            "Mock Fund Coin",
            "MFC",
            deployer.address,
            100, // 1% management fee
            oracleAddress,
            uniswapAddress
        );
        await mockFund.waitForDeployment();
        const fundAddress = await mockFund.getAddress();
        console.log(`✅ MockFund部署成功: ${fundAddress}`);
        
        // 5. 设置支持的代币和权重 (总权重应为10000 = 100%)
        // 配置：50% USDC保留不动，剩余50%分配给4种代币，每种12.5%
        console.log("\n⚙️ 设置支持的代币...");
        await mockFund.addSupportedToken(SEPOLIA_TOKENS.WETH, 1250); // 12.5%
        await mockFund.addSupportedToken(SEPOLIA_TOKENS.WBTC, 1250); // 12.5%
        await mockFund.addSupportedToken(SEPOLIA_TOKENS.LINK, 1250); // 12.5%
        await mockFund.addSupportedToken(SEPOLIA_TOKENS.DAI, 1250);  // 12.5%
        // 注意：剩余50%的USDC将保留在基金中不进行投资
        console.log("✅ 支持的代币设置完成");
        
        // 6. 设置USDC地址
        await mockFund.setUSDCToken(SEPOLIA_TOKENS.USDC);
        console.log(`✅ USDC地址设置完成: ${SEPOLIA_TOKENS.USDC}`);
        
        // 7. 验证价格feeds是否工作
        console.log("\n🔍 验证价格feeds...");
        try {
            const [ethPrice, ethTimestamp] = await chainlinkOracle.getLatestPrice(SEPOLIA_TOKENS.WETH);
            const [btcPrice, btcTimestamp] = await chainlinkOracle.getLatestPrice(SEPOLIA_TOKENS.WBTC);
            const [linkPrice, linkTimestamp] = await chainlinkOracle.getLatestPrice(SEPOLIA_TOKENS.LINK);
            const [usdcPrice, usdcTimestamp] = await chainlinkOracle.getLatestPrice(SEPOLIA_TOKENS.USDC);
            
            console.log(`ETH价格: $${ethers.formatUnits(ethPrice, 8)} (时间戳: ${new Date(Number(ethTimestamp) * 1000).toLocaleString()})`);
            console.log(`BTC价格: $${ethers.formatUnits(btcPrice, 8)} (时间戳: ${new Date(Number(btcTimestamp) * 1000).toLocaleString()})`);
            console.log(`LINK价格: $${ethers.formatUnits(linkPrice, 8)} (时间戳: ${new Date(Number(linkTimestamp) * 1000).toLocaleString()})`);
            console.log(`USDC价格: $${ethers.formatUnits(usdcPrice, 8)} (时间戳: ${new Date(Number(usdcTimestamp) * 1000).toLocaleString()})`);
            console.log("✅ 所有价格feeds工作正常");
        } catch (error) {
            console.warn("⚠️ 价格feeds验证失败:", error.message);
            console.log("这可能是因为网络延迟或价格feed暂时不可用，但不影响合约部署");
        }
        
        // 8. 保存部署信息
        const deploymentInfo = {
            network: "sepolia",
            chainId: Number(network.chainId),
            deployer: deployer.address,
            deploymentTime: new Date().toISOString(),
            contracts: {
                ChainlinkPriceOracle: oracleAddress,
                UniswapIntegration: uniswapAddress,
                MockFund: fundAddress,
                FundShareToken: await mockFund.shareToken()
            },
            tokens: SEPOLIA_TOKENS,
            chainlinkFeeds: CHAINLINK_PRICE_FEEDS,
            configuration: {
                managementFeeRate: 100, // 1%
                supportedTokens: [
                    { token: SEPOLIA_TOKENS.WETH, allocation: 1250 },
                    { token: SEPOLIA_TOKENS.WBTC, allocation: 1250 },
                    { token: SEPOLIA_TOKENS.LINK, allocation: 1250 },
                    { token: SEPOLIA_TOKENS.DAI, allocation: 1250 }
                ]
            }
        };
        
        const deploymentPath = path.join(__dirname, "..", "sepolia-deployment.json");
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n💾 部署信息已保存到: ${deploymentPath}`);
        
        // 9. 显示部署摘要
        console.log("\n📋 部署摘要:");
        console.log("=" * 50);
        console.log(`网络: Sepolia (${network.chainId})`);
        console.log(`部署者: ${deployer.address}`);
        console.log(`ChainlinkPriceOracle: ${oracleAddress}`);
        console.log(`UniswapIntegration: ${uniswapAddress}`);
        console.log(`MockFund: ${fundAddress}`);
        console.log(`FundShareToken: ${await mockFund.shareToken()}`);
        console.log("=" * 50);
        
        console.log("\n🎉 部署完成！");
        console.log("\n📝 下一步操作:");
        console.log("1. 确保你有足够的测试代币 (USDC, WETH, WBTC, LINK, DAI)");
        console.log("2. 使用 initializeFund() 初始化基金");
        console.log("3. 开始投资和赎回测试");
        console.log("\n💡 提示: 你可以从以下水龙头获取测试代币:");
        console.log("- Sepolia ETH: https://sepoliafaucet.com/");
        console.log("- 测试代币: https://faucets.chain.link/sepolia");
        
    } catch (error) {
        console.error("❌ 部署失败:", error);
        throw error;
    }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    process.exit(1);
});

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main;