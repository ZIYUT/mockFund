const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 测试价格预言机在Sepolia测试网上的工作...\n");

    // 获取部署的合约地址
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    
    // 这里需要替换为实际部署的PriceOracle地址
    const priceOracleAddress = "YOUR_PRICE_ORACLE_ADDRESS"; // 需要替换
    const priceOracle = PriceOracle.attach(priceOracleAddress);

    // 测试代币地址（Sepolia测试网上的真实代币地址）
    const testTokens = {
        "WETH": "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", // Sepolia WETH
        "WBTC": "0x29f2D40B0605204364af54EC677bD022dA425d03", // Sepolia WBTC
        "LINK": "0x779877A7B0D9E8603169DdbD7836e478b4624789", // Sepolia LINK
        "USDC": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC
        "DAI": "0x68194a729C2450ad26072b3D33ADaCbcef39D574"   // Sepolia DAI
    };

    try {
        console.log("📊 测试价格预言机连接...");
        
        // 测试1: 检查价格预言机是否已设置
        for (const [symbol, address] of Object.entries(testTokens)) {
            try {
                const isSet = await priceOracle.isPriceFeedSet(address);
                console.log(`✅ ${symbol} 价格预言机已设置: ${isSet}`);
                
                if (isSet) {
                    // 获取价格信息
                    const [price, timestamp] = await priceOracle.getLatestPrice(address);
                    const decimals = await priceOracle.getPriceFeedDecimals(address);
                    
                    console.log(`   💰 ${symbol} 价格: ${ethers.formatUnits(price, decimals)} USD`);
                    console.log(`   ⏰ 更新时间: ${new Date(timestamp * 1000).toLocaleString()}`);
                    console.log(`   🔢 小数位数: ${decimals}`);
                }
            } catch (error) {
                console.log(`❌ ${symbol} 价格获取失败: ${error.message}`);
            }
            console.log("");
        }

        // 测试2: 测试代币价值计算
        console.log("🧮 测试代币价值计算...");
        const testAmount = ethers.parseUnits("1", 18); // 1个代币
        
        for (const [symbol, address] of Object.entries(testTokens)) {
            if (symbol === "USDC") continue; // 跳过USDC，因为它是基准货币
            
            try {
                const usdcValue = await priceOracle.calculateTokenValue(address, testAmount);
                console.log(`✅ ${symbol} 1个代币 = ${ethers.formatUnits(usdcValue, 6)} USDC`);
            } catch (error) {
                console.log(`❌ ${symbol} 价值计算失败: ${error.message}`);
            }
        }

        // 测试3: 获取价格预言机详细信息
        console.log("\n📋 获取价格预言机详细信息...");
        for (const [symbol, address] of Object.entries(testTokens)) {
            try {
                const [priceFeedAddress, decimals, description, version] = await priceOracle.getPriceFeedInfo(address);
                console.log(`✅ ${symbol} 详细信息:`);
                console.log(`   📍 预言机地址: ${priceFeedAddress}`);
                console.log(`   📝 描述: ${description}`);
                console.log(`   🔢 版本: ${version}`);
                console.log(`   🎯 小数位数: ${decimals}`);
            } catch (error) {
                console.log(`❌ ${symbol} 详细信息获取失败: ${error.message}`);
            }
            console.log("");
        }

    } catch (error) {
        console.error("❌ 价格预言机测试失败:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 