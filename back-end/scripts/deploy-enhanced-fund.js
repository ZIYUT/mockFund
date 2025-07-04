const { ethers } = require("hardhat");

async function main() {
    console.log("开始部署增强版 MockFund 系统...");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署者地址:", deployer.address);
    console.log("部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // Uniswap V3 合约地址 (Ethereum Mainnet)
    const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
    const UNISWAP_QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
    
    // 主要代币地址 (Ethereum Mainnet)
    const USDC_ADDRESS = "0xA0b86a33E6417c4c6b4c6b4c6b4c6b4c6b4c6b4c"; // 示例地址
    const WBTC_ADDRESS = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const LINK_ADDRESS = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
    const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const UNI_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
    
    // Chainlink 价格源地址 (Ethereum Mainnet)
    const CHAINLINK_FEEDS = {
        [WBTC_ADDRESS]: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c", // BTC/USD
        [WETH_ADDRESS]: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // ETH/USD
        [LINK_ADDRESS]: "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c", // LINK/USD
        [DAI_ADDRESS]: "0xAed0c38402d20D9df4c2a5d2e26de4eFd83c32e7", // DAI/USD
        [UNI_ADDRESS]: "0x553303d460EE0afB37EdFf9bE42922D8FF63220e"  // UNI/USD
    };
    
    try {
        // 1. 部署 PriceOracle 合约
        console.log("\n1. 部署 PriceOracle 合约...");
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        const priceOracle = await PriceOracle.deploy(deployer.address);
        await priceOracle.waitForDeployment();
        console.log("PriceOracle 部署地址:", await priceOracle.getAddress());
        
        // 2. 部署 UniswapIntegration 合约
        console.log("\n2. 部署 UniswapIntegration 合约...");
        const UniswapIntegration = await ethers.getContractFactory("UniswapIntegration");
        const uniswapIntegration = await UniswapIntegration.deploy(
            UNISWAP_ROUTER,
            UNISWAP_QUOTER,
            deployer.address
        );
        await uniswapIntegration.waitForDeployment();
        console.log("UniswapIntegration 部署地址:", await uniswapIntegration.getAddress());
        
        // 3. 部署 MockFund 合约
        console.log("\n3. 部署 MockFund 合约...");
        const MockFund = await ethers.getContractFactory("MockFund");
        const mockFund = await MockFund.deploy(
            "MockFund Shares",
            "MFS",
            deployer.address,
            200, // 2% 管理费
            await priceOracle.getAddress(),
            await uniswapIntegration.getAddress()
        );
        await mockFund.waitForDeployment();
        console.log("MockFund 部署地址:", await mockFund.getAddress());
        
        // 4. 设置 USDC 代币地址
        console.log("\n4. 设置 USDC 代币地址...");
        await mockFund.setUSDCToken(USDC_ADDRESS);
        console.log("USDC 代币地址已设置:", USDC_ADDRESS);
        
        // 5. 配置价格预言机
        console.log("\n5. 配置价格预言机...");
        const tokens = [WBTC_ADDRESS, WETH_ADDRESS, LINK_ADDRESS, DAI_ADDRESS, UNI_ADDRESS];
        const tokenNames = ["WBTC", "WETH", "LINK", "DAI", "UNI"];
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const feed = CHAINLINK_FEEDS[token];
            if (feed) {
                await priceOracle.setPriceFeed(token, feed);
                console.log(`${tokenNames[i]} 价格源已设置:`, feed);
            }
        }
        
        // 6. 添加支持的代币并设置目标分配
        console.log("\n6. 添加支持的代币并设置目标分配...");
        const targetAllocation = 2000; // 20% 每个代币
        
        for (let i = 0; i < tokens.length; i++) {
            await mockFund.addSupportedToken(tokens[i], targetAllocation);
            console.log(`${tokenNames[i]} 已添加，目标分配: ${targetAllocation / 100}%`);
        }
        
        // 7. 验证部署
        console.log("\n7. 验证部署...");
        const supportedTokens = await mockFund.getSupportedTokens();
        console.log("支持的代币数量:", supportedTokens.length);
        
        const fundStats = await mockFund.getFundStats();
        console.log("基金统计:");
        console.log("- 总资产:", ethers.formatUnits(fundStats[0], 6), "USDC");
        console.log("- 总供应量:", ethers.formatEther(fundStats[1]), "份额");
        console.log("- 当前 NAV:", ethers.formatUnits(fundStats[2], 6), "USDC");
        
        // 8. 输出部署摘要
        console.log("\n=== 部署摘要 ===");
        console.log("PriceOracle:", await priceOracle.getAddress());
        console.log("UniswapIntegration:", await uniswapIntegration.getAddress());
        console.log("MockFund:", await mockFund.getAddress());
        console.log("ShareToken:", await mockFund.shareToken());
        
        // 9. 保存部署信息到文件
        const deploymentInfo = {
            network: "localhost",
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            contracts: {
                PriceOracle: await priceOracle.getAddress(),
                UniswapIntegration: await uniswapIntegration.getAddress(),
                MockFund: await mockFund.getAddress(),
                ShareToken: await mockFund.shareToken()
            },
            tokens: {
                USDC: USDC_ADDRESS,
                WBTC: WBTC_ADDRESS,
                WETH: WETH_ADDRESS,
                LINK: LINK_ADDRESS,
                DAI: DAI_ADDRESS,
                UNI: UNI_ADDRESS
            },
            configuration: {
                managementFeeRate: "2%",
                targetAllocationPerToken: "20%",
                rebalanceThreshold: "5%",
                minimumInvestment: "100 USDC",
                minimumRedemption: "10 USDC"
            }
        };
        
        const fs = require('fs');
        const path = require('path');
        const deploymentPath = path.join(__dirname, '../deployments');
        
        if (!fs.existsSync(deploymentPath)) {
            fs.mkdirSync(deploymentPath, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(deploymentPath, 'enhanced-fund-deployment.json'),
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log("\n部署信息已保存到: deployments/enhanced-fund-deployment.json");
        console.log("\n🎉 增强版 MockFund 系统部署完成！");
        
    } catch (error) {
        console.error("部署过程中发生错误:", error);
        process.exit(1);
    }
}

// 运行部署脚本
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });