const { ethers } = require("hardhat");

async function main() {
    console.log("验证 Sepolia Chainlink 价格预言机...\n");

    // Sepolia 测试网上的 Chainlink 价格预言机地址（移除UNI）
    const priceFeeds = {
        "ETH": "0x694AA1769357215DE4FAC081bf1f309aDC325306",
        "BTC": "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
        "LINK": "0xc59E3633BAAC79493d908e63626716e204A45EdF",
        "USDC": "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E",
        "DAI": "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19"
    };

    // 获取 AggregatorV3Interface ABI
    const aggregatorABI = [
        "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
        "function decimals() external view returns (uint8)",
        "function description() external view returns (string memory)",
        "function version() external view returns (uint256)"
    ];

    for (const [symbol, address] of Object.entries(priceFeeds)) {
        try {
            console.log(`检查 ${symbol} 价格预言机 (${address})...`);
            
            const priceFeed = new ethers.Contract(address, aggregatorABI, ethers.provider);
            
            // 获取预言机信息
            const decimals = await priceFeed.decimals();
            const description = await priceFeed.description();
            const version = await priceFeed.version();
            
            console.log(`  描述: ${description}`);
            console.log(`  版本: ${version}`);
            console.log(`  小数位: ${decimals}`);
            
            // 获取最新价格
            const roundData = await priceFeed.latestRoundData();
            const price = roundData.answer;
            const timestamp = roundData.updatedAt;
            const roundId = roundData.answeredInRound;
            
            // 格式化价格显示 (ethers v6)
            const formattedPrice = ethers.formatUnits(price, BigInt(decimals));
            const date = new Date(Number(timestamp) * 1000);
            
            console.log(`  最新价格: $${formattedPrice}`);
            console.log(`  更新时间: ${date.toLocaleString()}`);
            console.log(`  轮次ID: ${roundId}`);
            
            // 检查价格是否有效
            if (price <= 0) {
                console.log(`  ⚠️  警告: ${symbol} 价格无效 (${price})`);
            } else if (Date.now() / 1000 - Number(timestamp) > 3600) {
                console.log(`  ⚠️  警告: ${symbol} 价格可能过时 (${Math.floor((Date.now() / 1000 - Number(timestamp)) / 60)} 分钟前)`);
            } else {
                console.log(`  ✅ ${symbol} 价格有效`);
            }
            
            console.log("");
            
        } catch (error) {
            console.log(`  ❌ 错误: 无法获取 ${symbol} 价格数据`);
            console.log(`     错误信息: ${error.message}`);
            console.log("");
        }
    }

    // 测试价格计算
    console.log("=== 测试价格计算 ===");
    
    try {
        // 部署一个简单的测试合约来验证价格计算
        const TestPriceOracle = await ethers.getContractFactory("PriceOracle");
        const [deployer] = await ethers.getSigners();
        const testOracle = await TestPriceOracle.deploy(deployer.address);
        
        console.log("测试 PriceOracle 合约已部署到:", testOracle.target);
        
        // 测试设置价格预言机
        await testOracle.setPriceFeedBySymbol("0x1234567890123456789012345678901234567890", "ETH");
        console.log("✅ 价格预言机设置成功");
        
        // 测试获取价格预言机地址
        const ethFeedAddress = await testOracle.getSepoliaPriceFeedAddress("ETH");
        console.log("ETH 价格预言机地址:", ethFeedAddress);
        
        console.log("✅ PriceOracle 合约功能正常");
        
    } catch (error) {
        console.log("❌ PriceOracle 测试失败:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 