const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("检查MockFund投资组合状态...");
    
    // 读取部署配置
    const deploymentPath = path.join(__dirname, "../deployments/sepolia-deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const [deployer] = await ethers.getSigners();
    console.log("使用账户:", deployer.address);
    
    // 获取合约实例
    const mockFund = await ethers.getContractAt("contracts/MockFund.sol:MockFund", deployment.contracts.MockFund);
    const mockWETH = await ethers.getContractAt("MockWETH", deployment.tokens.WETH);
    const mockWBTC = await ethers.getContractAt("MockWBTC", deployment.tokens.WBTC);
    const mockLINK = await ethers.getContractAt("MockLINK", deployment.tokens.LINK);
    const mockDAI = await ethers.getContractAt("MockDAI", deployment.tokens.DAI);
    const mockUSDC = await ethers.getContractAt("MockUSDC", deployment.tokens.USDC);
    
    console.log("MockFund地址:", deployment.contracts.MockFund);
    
    // 检查基金基本信息
    console.log("\n=== 基金基本信息 ===");
    try {
        const isInitialized = await mockFund.isInitialized();
        console.log("基金是否已初始化:", isInitialized);
        
        if (!isInitialized) {
            console.log("基金尚未初始化，无法查看投资组合！");
            return;
        }
        
        const fundStats = await mockFund.getFundStats();
        console.log("总供应量:", ethers.formatEther(fundStats[0]));
        console.log("初始供应量:", ethers.formatEther(fundStats[1]));
        console.log("是否暂停:", fundStats[2]);
        
        const nav = await mockFund.calculateNAV();
        console.log("基金NAV (USDC):", ethers.formatUnits(nav, 6));
        
        const mfcValue = await mockFund.calculateMFCValue();
        console.log("单个MFC价值 (USDC):", ethers.formatUnits(mfcValue, 6));
        
        const theoreticalValue = await mockFund.calculateTheoreticalMFCValue();
        console.log("理论MFC价值 (USDC):", ethers.formatUnits(theoreticalValue, 6));
        
    } catch (error) {
        console.log("获取基金基本信息失败:", error.message);
        return;
    }
    
    // 检查支持的代币
    console.log("\n=== 支持的代币 ===");
    try {
        const supportedTokens = await mockFund.getSupportedTokens();
        console.log("支持代币数量:", supportedTokens.length);
        
        for (let i = 0; i < supportedTokens.length; i++) {
            console.log(`代币 ${i + 1}:`, supportedTokens[i]);
        }
    } catch (error) {
        console.log("获取支持代币失败:", error.message);
    }
    
    // 检查MFC代币组合
    console.log("\n=== MFC代币组合 ===");
    try {
        const composition = await mockFund.getMFCComposition();
        console.log("代币地址:", composition.tokens);
        console.log("代币比例:", composition.ratios.map(r => ethers.formatEther(r)));
        console.log("USDC金额:", ethers.formatUnits(composition.usdcAmount, 6));
        
        // 显示每个代币的详细信息
        for (let i = 0; i < composition.tokens.length; i++) {
            const tokenAddress = composition.tokens[i];
            const ratio = composition.ratios[i];
            
            // 获取代币符号
            let symbol = "Unknown";
            if (tokenAddress === deployment.tokens.WETH) symbol = "WETH";
            else if (tokenAddress === deployment.tokens.WBTC) symbol = "WBTC";
            else if (tokenAddress === deployment.tokens.LINK) symbol = "LINK";
            else if (tokenAddress === deployment.tokens.DAI) symbol = "DAI";
            
            console.log(`${symbol}: ${ethers.formatEther(ratio)} (比例)`);
        }
    } catch (error) {
        console.log("获取MFC组合失败:", error.message);
    }
    
    // 检查基金实际持有的代币余额
    console.log("\n=== 基金实际代币余额 ===");
    try {
        const balances = await mockFund.getFundTokenBalances();
        console.log("代币地址:", balances.tokens);
        console.log("代币余额:", balances.balances.map((b, i) => {
            const decimals = balances.decimals[i];
            return ethers.formatUnits(b, decimals);
        }));
        console.log("代币小数位:", balances.decimals);
        
        // 显示每个代币的详细信息
        for (let i = 0; i < balances.tokens.length; i++) {
            const tokenAddress = balances.tokens[i];
            const balance = balances.balances[i];
            const decimals = balances.decimals[i];
            
            // 获取代币符号
            let symbol = "Unknown";
            if (tokenAddress === deployment.tokens.USDC) symbol = "USDC";
            else if (tokenAddress === deployment.tokens.WETH) symbol = "WETH";
            else if (tokenAddress === deployment.tokens.WBTC) symbol = "WBTC";
            else if (tokenAddress === deployment.tokens.LINK) symbol = "LINK";
            else if (tokenAddress === deployment.tokens.DAI) symbol = "DAI";
            
            console.log(`${symbol}: ${ethers.formatUnits(balance, decimals)}`);
        }
    } catch (error) {
        console.log("获取基金余额失败:", error.message);
    }
    
    // 检查管理费情况
    console.log("\n=== 管理费情况 ===");
    try {
        const totalFees = await mockFund.getTotalManagementFees();
        console.log("总管理费 (USDC):", ethers.formatUnits(totalFees, 6));
        
        const withdrawableFees = await mockFund.getWithdrawableManagementFees();
        console.log("可提取管理费 (USDC):", ethers.formatUnits(withdrawableFees, 6));
        
        const circulatingSupply = await mockFund.getCirculatingSupply();
        console.log("流通供应量:", ethers.formatEther(circulatingSupply));
    } catch (error) {
        console.log("获取管理费信息失败:", error.message);
    }
    
    // 检查投资和赎回限制
    console.log("\n=== 投资赎回限制 ===");
    try {
        const minInvestment = await mockFund.minimumInvestment();
        console.log("最小投资额 (USDC):", ethers.formatUnits(minInvestment, 6));
        
        const minRedemption = await mockFund.minimumRedemption();
        console.log("最小赎回额 (USDC):", ethers.formatUnits(minRedemption, 6));
        
        const managementFeeRate = await mockFund.managementFeeRate();
        console.log("管理费率 (基点):", managementFeeRate.toString());
        console.log("管理费率 (%):", (managementFeeRate / 100).toString() + "%");
    } catch (error) {
        console.log("获取限制信息失败:", error.message);
    }
    
    console.log("\n=== 检查完成 ===");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 