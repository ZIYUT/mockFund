const { ethers } = require("hardhat");
const deployments = require("../deployments/sepolia.json");

async function main() {
    console.log("\n=== 设置Chainlink价格预言机 ===");
    
    // 获取ChainlinkPriceOracle合约
    const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
    const priceOracle = ChainlinkPriceOracle.attach(deployments.contracts.ChainlinkPriceOracle);
    
    console.log(`ChainlinkPriceOracle地址: ${deployments.contracts.ChainlinkPriceOracle}`);
    
    // Sepolia测试网上的Chainlink价格预言机地址
    const sepoliaPriceFeeds = {
        "ETH/USD": "0x694AA1769357215DE4FAC081bf1f309aDC325306",
        "BTC/USD": "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", 
        "LINK/USD": "0xc59E3633BAAC79493d908e63626716e204A45EdF",
        "USDC/USD": "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E",
        "DAI/USD": "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19"
    };
    
    // 代币配置
    const tokenConfigs = [
        {
            symbol: "USDC",
            address: deployments.contracts.MockUSDC,
            priceFeed: sepoliaPriceFeeds["USDC/USD"]
        },
        {
            symbol: "WETH", 
            address: deployments.contracts.tokens.WETH,
            priceFeed: sepoliaPriceFeeds["ETH/USD"]
        },
        {
            symbol: "WBTC",
            address: deployments.contracts.tokens.WBTC, 
            priceFeed: sepoliaPriceFeeds["BTC/USD"]
        },
        {
            symbol: "LINK",
            address: deployments.contracts.tokens.LINK,
            priceFeed: sepoliaPriceFeeds["LINK/USD"]
        },
        {
            symbol: "DAI",
            address: deployments.contracts.tokens.DAI,
            priceFeed: sepoliaPriceFeeds["DAI/USD"]
        }
    ];
    
    console.log("\n=== 设置价格预言机 ===");
    
    // 检查当前所有者
    try {
        const owner = await priceOracle.owner();
        const [signer] = await ethers.getSigners();
        console.log(`合约所有者: ${owner}`);
        console.log(`当前签名者: ${signer.address}`);
        
        if (owner.toLowerCase() !== signer.address.toLowerCase()) {
            console.log("❌ 当前账户不是合约所有者，无法设置价格预言机");
            return;
        }
    } catch (error) {
        console.log(`❌ 检查所有者失败: ${error.message}`);
        return;
    }
    
    // 逐个设置价格预言机
    for (const config of tokenConfigs) {
        try {
            console.log(`\n设置 ${config.symbol} 价格预言机...`);
            console.log(`代币地址: ${config.address}`);
            console.log(`价格预言机: ${config.priceFeed}`);
            
            const tx = await priceOracle.setPriceFeed(
                config.address,
                config.priceFeed, 
                config.symbol,
                { gasLimit: 200000 }
            );
            
            console.log(`交易哈希: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ ${config.symbol} 价格预言机设置成功`);
            
        } catch (error) {
            console.log(`❌ 设置 ${config.symbol} 价格预言机失败: ${error.message}`);
        }
    }
    
    // 验证设置结果
    console.log("\n=== 验证价格预言机设置 ===");
    for (const config of tokenConfigs) {
        try {
            const priceFeed = await priceOracle.priceFeeds(config.address);
            const tokenBySymbol = await priceOracle.tokenBySymbol(config.symbol);
            
            console.log(`\n${config.symbol}:`);
            console.log(`  价格预言机: ${priceFeed}`);
            console.log(`  符号映射: ${tokenBySymbol}`);
            console.log(`  设置状态: ${priceFeed !== ethers.constants.AddressZero ? '✅ 已设置' : '❌ 未设置'}`);
            
        } catch (error) {
            console.log(`❌ 验证 ${config.symbol} 失败: ${error.message}`);
        }
    }
    
    console.log("\n=== 价格预言机设置完成 ===");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("脚本执行失败:", error);
        process.exit(1);
    });