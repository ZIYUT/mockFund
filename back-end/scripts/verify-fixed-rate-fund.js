const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("验证 FixedRateMockFund 合约状态...");
    
    const [deployer] = await ethers.getSigners();
    console.log("验证者地址:", deployer.address);
    
    // 读取部署地址
    const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia.json");
    const deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    // 检查是否有 FixedRateMockFund 地址
    const fixedRateFundAddress = deployments.contracts?.FixedRateMockFund;
    const fixedRateUniswapAddress = deployments.contracts?.FixedRateUniswapIntegration;
    
    if (!fixedRateFundAddress) {
        console.log("未找到 FixedRateMockFund 部署地址");
        return;
    }
    
    console.log("FixedRateMockFund 地址:", fixedRateFundAddress);
    console.log("FixedRateUniswapIntegration 地址:", fixedRateUniswapAddress);
    
    // 连接到合约
    const FixedRateMockFund = await ethers.getContractFactory("FixedRateMockFund");
    const fund = FixedRateMockFund.attach(fixedRateFundAddress);
    
    try {
        // 检查基金状态
        console.log("\n=== 基金状态 ===");
        const [totalSupply, initialSupply, isInitialized] = await fund.getFundStats();
        console.log(`MFC 总供应量: ${ethers.formatEther(totalSupply)} MFC`);
        console.log(`初始供应量: ${ethers.formatEther(initialSupply)} MFC`);
        console.log(`是否已初始化: ${isInitialized}`);
        
        if (isInitialized) {
            console.log("\n=== 基金已初始化，获取详细信息 ===");
            
            // 获取 MFC 组成
            const [tokens, ratios, usdcAmount] = await fund.getMFCComposition();
            console.log("\n=== MFC 组成 ===");
            console.log(`每份 MFC 包含 USDC: ${ethers.formatUnits(usdcAmount, 18)} (scaled)`);
            
            const supportedTokens = [
                { address: deployments.contracts.tokens.WETH, name: "WETH" },
                { address: deployments.contracts.tokens.WBTC, name: "WBTC" },
                { address: deployments.contracts.tokens.LINK, name: "LINK" },
                { address: deployments.contracts.tokens.DAI, name: "DAI" }
            ];
            
            for (let i = 0; i < tokens.length; i++) {
                const tokenName = supportedTokens.find(t => t.address === tokens[i])?.name || "Unknown";
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
        } else {
            console.log("\n基金尚未初始化");
            
            // 检查支持的代币
            const supportedTokens = await fund.getSupportedTokens();
            console.log("\n=== 支持的代币 ===");
            console.log(`支持的代币数量: ${supportedTokens.length}`);
            for (const token of supportedTokens) {
                console.log(`代币地址: ${token}`);
            }
        }
        
        // 检查 FixedRateUniswapIntegration
        if (fixedRateUniswapAddress) {
            console.log("\n=== 验证 FixedRateUniswapIntegration ===");
            const FixedRateUniswapIntegration = await ethers.getContractFactory("FixedRateUniswapIntegration");
            const uniswap = FixedRateUniswapIntegration.attach(fixedRateUniswapAddress);
            
            const useFixedRates = await uniswap.useFixedRates();
            console.log(`使用固定汇率: ${useFixedRates}`);
            
            if (useFixedRates) {
                const wethRate = await uniswap.getFixedRate(deployments.contracts.tokens.WETH);
                const wbtcRate = await uniswap.getFixedRate(deployments.contracts.tokens.WBTC);
                const linkRate = await uniswap.getFixedRate(deployments.contracts.tokens.LINK);
                const daiRate = await uniswap.getFixedRate(deployments.contracts.tokens.DAI);
                
                console.log(`WETH 固定汇率: ${ethers.formatUnits(wethRate, 6)} USDC/WETH`);
                console.log(`WBTC 固定汇率: ${ethers.formatUnits(wbtcRate, 6)} USDC/WBTC`);
                console.log(`LINK 固定汇率: ${ethers.formatUnits(linkRate, 6)} USDC/LINK`);
                console.log(`DAI 固定汇率: ${ethers.formatUnits(daiRate, 6)} USDC/DAI`);
            }
        }
        
    } catch (error) {
        console.error("验证过程中出错:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("验证失败:", error);
        process.exit(1);
    });