const fs = require('fs');
const { ethers } = require('hardhat');

async function main() {
    console.log("=== 调试赎回效率低的问题 ===");
    
    // 读取部署地址
    const deploymentData = JSON.parse(fs.readFileSync('localhost-deployment.json', 'utf8'));
    
    // 获取合约实例
    const [deployer] = await ethers.getSigners();
    console.log("测试账户:", deployer.address);
    
    const mockFund = await ethers.getContractAt("FixedRateMockFund", deploymentData.contracts.FixedRateMockFund);
    const usdc = await ethers.getContractAt("MockUSDC", deploymentData.contracts.MockUSDC);
    const fundShareToken = await ethers.getContractAt("FundShareToken", deploymentData.contracts.FundShareToken);
    
    console.log("\n=== 步骤1: 检查基金当前状态 ===");
    
    // 检查基金是否初始化
    const isInitialized = await mockFund.isInitialized();
    console.log("基金是否已初始化:", isInitialized);
    
    if (!isInitialized) {
        console.log("❌ 基金未初始化，无法进行测试");
        return;
    }
    
    // 获取基金组成
    const [tokens, ratios, usdcAmount] = await mockFund.getMFCComposition();
    console.log("\n基金组成:");
    console.log("USDC每MFC:", ethers.formatUnits(usdcAmount, 6), "USDC");
    
    for (let i = 0; i < tokens.length; i++) {
        const tokenContract = await ethers.getContractAt("MockWETH", tokens[i]);
        const decimals = await tokenContract.decimals();
        const symbol = await tokenContract.symbol();
        console.log(`${symbol}每MFC:`, ethers.formatUnits(ratios[i], decimals), symbol);
    }
    
    // 检查基金当前余额
    console.log("\n=== 步骤2: 检查基金当前余额 ===");
    const fundUsdcBalance = await usdc.balanceOf(deploymentData.contracts.FixedRateMockFund);
    console.log("基金USDC余额:", ethers.formatUnits(fundUsdcBalance, 6), "USDC");
    
    for (let i = 0; i < tokens.length; i++) {
        const tokenContract = await ethers.getContractAt("MockWETH", tokens[i]);
        const balance = await tokenContract.balanceOf(deploymentData.contracts.FixedRateMockFund);
        const decimals = await tokenContract.decimals();
        const symbol = await tokenContract.symbol();
        console.log(`基金${symbol}余额:`, ethers.formatUnits(balance, decimals), symbol);
    }
    
    console.log("\n=== 步骤3: 模拟赎回5000 MFC的详细过程 ===");
    
    const redeemAmount = ethers.parseEther("5000");
    console.log("赎回数量:", ethers.formatEther(redeemAmount), "MFC");
    
    // 计算预期的USDC部分
    const expectedUsdcPart = (redeemAmount * usdcAmount) / ethers.parseEther("1");
    console.log("\n预期直接获得的USDC:", ethers.formatUnits(expectedUsdcPart, 6), "USDC");
    
    // 计算预期的代币部分价值
    let expectedTokenValue = 0n;
    console.log("\n预期需要换回USDC的代币:");
    
    for (let i = 0; i < tokens.length; i++) {
        const tokenAmountPerMFC = (redeemAmount * ratios[i]) / ethers.parseEther("1");
        const tokenContract = await ethers.getContractAt("MockWETH", tokens[i]);
        const decimals = await tokenContract.decimals();
        const symbol = await tokenContract.symbol();
        
        // 转换为实际代币数量
        let actualTokenAmount;
        const decimalsNum = Number(decimals);
        if (decimalsNum <= 18) {
            actualTokenAmount = tokenAmountPerMFC / (10n ** BigInt(18 - decimalsNum));
        } else {
            actualTokenAmount = tokenAmountPerMFC * (10n ** BigInt(decimalsNum - 18)) / ethers.parseEther("1");
        }
        
        console.log(`${symbol}数量:`, ethers.formatUnits(actualTokenAmount, decimals), symbol);
        
        // 获取代币价格并计算USDC价值
        try {
            const priceOracle = await ethers.getContractAt("ChainlinkPriceOracle", deploymentData.contracts.ChainlinkPriceOracle);
            const [price] = await priceOracle.getLatestPrice(tokens[i]);
            const tokenValueInUSDC = (actualTokenAmount * price) / (10n ** 8n);
            expectedTokenValue += tokenValueInUSDC;
            
            console.log(`${symbol}价格:`, price.toString(), "(8位小数)");
            console.log(`${symbol}价值:`, ethers.formatUnits(tokenValueInUSDC, 6), "USDC");
        } catch (error) {
            console.log(`❌ 无法获取${symbol}价格:`, error.message);
        }
    }
    
    const totalExpectedValue = expectedUsdcPart + expectedTokenValue;
    console.log("\n总预期价值:", ethers.formatUnits(totalExpectedValue, 6), "USDC");
    
    // 计算管理费
    const managementFee = (totalExpectedValue * 1n) / 100n; // 1%
    const netExpectedValue = totalExpectedValue - managementFee;
    console.log("管理费(1%):", ethers.formatUnits(managementFee, 6), "USDC");
    console.log("预期净收益:", ethers.formatUnits(netExpectedValue, 6), "USDC");
    
    console.log("\n=== 步骤4: 分析问题原因 ===");
    
    // 检查赎回预览
    try {
        const redemptionPreview = await mockFund.getRedemptionPreview(redeemAmount);
        console.log("合约计算的赎回价值:", ethers.formatUnits(redemptionPreview, 6), "USDC");
        
        const actualNetValue = redemptionPreview - (redemptionPreview * 1n) / 100n;
        console.log("扣除管理费后:", ethers.formatUnits(actualNetValue, 6), "USDC");
        
        const efficiency = (actualNetValue * 100n) / netExpectedValue;
        console.log("赎回效率:", efficiency.toString() + "%");
        
        if (efficiency < 90n) {
            console.log("\n🔍 问题分析:");
            console.log("1. 赎回时只返回基金中的USDC部分:", ethers.formatUnits(expectedUsdcPart, 6), "USDC");
            console.log("2. 其他代币需要通过Uniswap换回USDC，但可能存在以下问题:");
            console.log("   - Uniswap交换时的滑点损失");
            console.log("   - 价格预言机与Uniswap实际价格的差异");
            console.log("   - 代币余额不足或交换失败");
            console.log("   - 基金组成比例计算错误");
            
            const usdcRatio = (expectedUsdcPart * 100n) / totalExpectedValue;
            console.log("\n基金中USDC占比:", usdcRatio.toString() + "%");
            
            if (usdcRatio >= 50n) {
                console.log("✅ 您的分析正确！基金中约50%是USDC，其余代币需要通过Uniswap换回USDC");
                console.log("💡 建议检查:");
                console.log("   1. _swapTokenForUSDC函数是否正常工作");
                console.log("   2. Uniswap集成是否配置正确");
                console.log("   3. 代币价格预言机是否准确");
                console.log("   4. 基金代币余额是否充足");
            }
        }
        
    } catch (error) {
        console.log("❌ 无法获取赎回预览:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 脚本执行失败:", error);
        process.exit(1);
    });