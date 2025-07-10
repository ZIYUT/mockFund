const { ethers } = require("hardhat");

async function main() {
    console.log("检查 Sepolia 测试网上 AAVE 价格预言机...\n");

    // AAVE 在 Sepolia 测试网上的可能地址（需要验证）
    const possibleAAVEAddresses = [
        "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // 可能的 AAVE/USD 地址
        "0x6Df09E975c830ECae5bd4eD9d90f3A95a4f88012", // 另一个可能的地址
        "0x2E8F5e00a9c5D450a72700546B89eCc8c56e4e8c"  // 备用地址
    ];

    // 获取 AggregatorV3Interface ABI
    const aggregatorABI = [
        "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
        "function decimals() external view returns (uint8)",
        "function description() external view returns (string memory)",
        "function version() external view returns (uint256)"
    ];

    for (let i = 0; i < possibleAAVEAddresses.length; i++) {
        const address = possibleAAVEAddresses[i];
        try {
            console.log(`检查地址 ${i + 1}: ${address}...`);
            
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
            
            // 格式化价格显示
            const formattedPrice = ethers.formatUnits(price, BigInt(decimals));
            const date = new Date(Number(timestamp) * 1000);
            
            console.log(`  最新价格: $${formattedPrice}`);
            console.log(`  更新时间: ${date.toLocaleString()}`);
            console.log(`  轮次ID: ${roundId}`);
            
            if (price <= 0) {
                console.log(`  ⚠️  警告: 价格无效 (${price})`);
            } else if (Date.now() / 1000 - Number(timestamp) > 3600) {
                console.log(`  ⚠️  警告: 价格可能过时 (${Math.floor((Date.now() / 1000 - Number(timestamp)) / 60)} 分钟前)`);
            } else {
                console.log(`  ✅ 价格有效`);
            }
            
            // 如果描述包含 AAVE，说明找到了
            if (description.toLowerCase().includes('aave')) {
                console.log(`  🎉 找到 AAVE 价格预言机！`);
                console.log(`  AAVE/USD 地址: ${address}`);
                return;
            }
            
            console.log("");
            
        } catch (error) {
            console.log(`  ❌ 错误: 无法获取价格数据`);
            console.log(`     错误信息: ${error.message}`);
            console.log("");
        }
    }

    console.log("❌ 未找到有效的 AAVE 价格预言机");
    console.log("\n建议：");
    console.log("1. 使用 ETH、BTC、LINK、DAI 等有价格预言机的代币");
    console.log("2. 或者使用 CoinGecko API 获取 AAVE 价格（需要外部调用）");
    console.log("3. 或者使用其他有价格预言机的热门代币如 MATIC、UNI 等");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 