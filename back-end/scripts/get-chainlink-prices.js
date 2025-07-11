const { ethers } = require("hardhat");
const deployments = require("../deployments/sepolia.json");

async function main() {
    console.log("\n=== 获取Chainlink代币价格 ===");
    
    // 获取ChainlinkPriceOracle合约
    const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
    const priceOracle = ChainlinkPriceOracle.attach(deployments.contracts.ChainlinkPriceOracle);
    
    console.log(`ChainlinkPriceOracle地址: ${deployments.contracts.ChainlinkPriceOracle}`);
    
    // 代币列表
    const tokens = [
        { symbol: "USDC", address: deployments.contracts.MockUSDC },
        { symbol: "WETH", address: deployments.contracts.tokens.WETH },
        { symbol: "WBTC", address: deployments.contracts.tokens.WBTC },
        { symbol: "LINK", address: deployments.contracts.tokens.LINK },
        { symbol: "DAI", address: deployments.contracts.tokens.DAI }
    ];
    
    console.log("\n=== 代币价格信息 ===");
    
    for (const token of tokens) {
        try {
            console.log(`\n--- ${token.symbol} ---`);
            console.log(`代币地址: ${token.address}`);
            
            // 获取价格预言机信息
            try {
                const [priceFeed, decimals, description] = await priceOracle.getPriceFeedInfo(token.address);
                console.log(`价格预言机地址: ${priceFeed}`);
                console.log(`价格小数位: ${decimals}`);
                console.log(`描述: ${description}`);
            } catch (error) {
                console.log(`❌ 未找到价格预言机: ${error.message}`);
                continue;
            }
            
            // 获取最新价格
            try {
                const [price, timestamp] = await priceOracle.getLatestPrice(token.address);
                const priceFormatted = ethers.utils.formatUnits(price, 8); // Chainlink价格通常是8位小数
                const date = new Date(timestamp * 1000);
                
                console.log(`💰 最新价格: $${priceFormatted}`);
                console.log(`⏰ 更新时间: ${date.toLocaleString()}`);
                
                // 检查价格是否过时（超过1小时）
                const now = Math.floor(Date.now() / 1000);
                const ageInMinutes = Math.floor((now - timestamp) / 60);
                
                if (ageInMinutes > 60) {
                    console.log(`⚠️  价格可能过时 (${ageInMinutes}分钟前)`);
                } else {
                    console.log(`✅ 价格新鲜 (${ageInMinutes}分钟前)`);
                }
                
            } catch (error) {
                console.log(`❌ 获取价格失败: ${error.message}`);
            }
            
            // 尝试通过符号获取价格
            try {
                const [priceBySymbol, timestampBySymbol] = await priceOracle.getLatestPriceBySymbol(token.symbol);
                const priceFormattedBySymbol = ethers.utils.formatUnits(priceBySymbol, 8);
                console.log(`📊 通过符号获取价格: $${priceFormattedBySymbol}`);
            } catch (error) {
                console.log(`❌ 通过符号获取价格失败: ${error.message}`);
            }
            
        } catch (error) {
            console.log(`❌ 处理${token.symbol}时出错: ${error.message}`);
        }
    }
    
    // 批量获取价格
    console.log("\n=== 批量获取价格 ===");
    try {
        const tokenAddresses = tokens.map(t => t.address);
        const [prices, timestamps] = await priceOracle.getMultiplePrices(tokenAddresses);
        
        console.log("批量价格结果:");
        for (let i = 0; i < tokens.length; i++) {
            const priceFormatted = ethers.utils.formatUnits(prices[i], 8);
            const date = new Date(timestamps[i] * 1000);
            console.log(`${tokens[i].symbol}: $${priceFormatted} (${date.toLocaleString()})`);
        }
    } catch (error) {
        console.log(`❌ 批量获取价格失败: ${error.message}`);
    }
    
    console.log("\n=== 价格获取完成 ===");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("脚本执行失败:", error);
        process.exit(1);
    });