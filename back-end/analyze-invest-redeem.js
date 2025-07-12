const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("=== MFC投资和赎回详细分析 ===");
    
    // 读取部署地址
    const deploymentData = JSON.parse(fs.readFileSync('localhost-deployment.json', 'utf8'));
    
    // 获取合约实例
    const [deployer] = await ethers.getSigners();
    console.log("测试账户:", deployer.address);
    
    // 连接到已部署的合约
    const mockFund = await ethers.getContractAt("FixedRateMockFund", deploymentData.contracts.FixedRateMockFund);
    const usdc = await ethers.getContractAt("MockUSDC", deploymentData.contracts.MockUSDC);
    const fundShareToken = await ethers.getContractAt("FundShareToken", deploymentData.contracts.FundShareToken);
    
    // 测试金额
    const investAmount = ethers.parseUnits("10000", 6); // 10000 USDC
    
    console.log("\n=== 基金状态分析 ===");
    
    // 获取基金统计信息
    const [totalSupply, initialSupply, isInitialized] = await mockFund.getFundStats();
    console.log("MFC总供应量:", ethers.formatUnits(totalSupply, 18), "MFC");
    console.log("初始MFC供应量:", ethers.formatUnits(initialSupply, 18), "MFC");
    console.log("基金已初始化:", isInitialized);
    
    // 获取NAV和MFC价值
    const nav = await mockFund.calculateNAV();
    const mfcValue = await mockFund.calculateMFCValue();
    const theoreticalValue = await mockFund.calculateTheoreticalMFCValue();
    
    console.log("\n=== 价值计算分析 ===");
    console.log("基金NAV:", ethers.formatUnits(nav, 6), "USDC");
    console.log("MFC市场价值:", ethers.formatUnits(mfcValue, 6), "USDC per MFC");
    console.log("MFC理论价值:", ethers.formatUnits(theoreticalValue, 6), "USDC per MFC");
    
    // 检查基金组成
    console.log("\n=== 基金组成分析 ===");
    const supportedTokens = [
        { name: "WETH", address: deploymentData.contracts.tokens.WETH, contractName: "MockWETH" },
        { name: "WBTC", address: deploymentData.contracts.tokens.WBTC, contractName: "MockWBTC" },
        { name: "LINK", address: deploymentData.contracts.tokens.LINK, contractName: "MockLINK" },
        { name: "DAI", address: deploymentData.contracts.tokens.DAI, contractName: "MockDAI" }
    ];
    
    for (const token of supportedTokens) {
        const tokenContract = await ethers.getContractAt(token.contractName, token.address);
        const balance = await tokenContract.balanceOf(deploymentData.contracts.FixedRateMockFund);
        const decimals = await tokenContract.decimals();
        
        console.log(`${token.name}:`);
        console.log(`  基金余额: ${ethers.formatUnits(balance, decimals)} ${token.name}`);
    }
    
    // 获取MFC组成信息
    const [tokens, ratios, usdcAmount] = await mockFund.getMFCComposition();
    console.log(`\nMFC组成信息:`);
    console.log(`  USDC每MFC: ${ethers.formatUnits(usdcAmount, 6)} USDC`);
    
    for (let i = 0; i < tokens.length; i++) {
        const tokenAddress = tokens[i];
        const ratio = ratios[i];
        
        // 找到对应的代币信息
        const tokenInfo = supportedTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
        if (tokenInfo) {
            const tokenContract = await ethers.getContractAt(tokenInfo.contractName, tokenAddress);
            const decimals = await tokenContract.decimals();
            console.log(`  ${tokenInfo.name}每MFC: ${ethers.formatUnits(ratio, decimals)} ${tokenInfo.name}`);
        }
    }
    
    // USDC余额
    const usdcBalance = await usdc.balanceOf(deploymentData.contracts.FixedRateMockFund);
    console.log(`USDC:`);
    console.log(`  基金余额: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
    
    console.log("\n=== 投资计算分析 ===");
    
    // 模拟投资计算
    console.log(`投资金额: ${ethers.formatUnits(investAmount, 6)} USDC`);
    console.log(`当前MFC价格: ${ethers.formatUnits(mfcValue, 6)} USDC per MFC`);
    
    const expectedMfcFromInvest = (investAmount * ethers.parseUnits("1", 18)) / mfcValue;
    console.log(`预期获得MFC: ${ethers.formatUnits(expectedMfcFromInvest, 18)} MFC`);
    
    console.log("\n=== 赎回计算分析 ===");
    
    // 模拟赎回计算
    const redeemMfcAmount = expectedMfcFromInvest / 2n; // 赎回一半
    console.log(`赎回MFC数量: ${ethers.formatUnits(redeemMfcAmount, 18)} MFC`);
    
    const expectedUsdcFromRedeem = (redeemMfcAmount * mfcValue) / ethers.parseUnits("1", 18);
    console.log(`预期赎回USDC: ${ethers.formatUnits(expectedUsdcFromRedeem, 6)} USDC`);
    
    // 检查是否有费用
    console.log("\n=== 费用分析 ===");
    
    // 检查合约中是否有费用设置
    try {
        // 尝试获取管理费率
        const managementFee = await mockFund.managementFeeRate();
        console.log("管理费率:", ethers.formatUnits(managementFee, 4), "%");
    } catch (error) {
        console.log("未找到管理费率设置");
    }
    
    try {
        // 尝试获取赎回费率
        const redeemFee = await mockFund.redeemFeeRate();
        console.log("赎回费率:", ethers.formatUnits(redeemFee, 4), "%");
    } catch (error) {
        console.log("未找到赎回费率设置");
    }
    
    console.log("\n=== 实际测试执行 ===");
    
    // 检查用户当前余额
    const userUsdcBefore = await usdc.balanceOf(deployer.address);
    const userMfcBefore = await fundShareToken.balanceOf(deployer.address);
    
    console.log(`用户投资前USDC余额: ${ethers.formatUnits(userUsdcBefore, 6)} USDC`);
    console.log(`用户投资前MFC余额: ${ethers.formatUnits(userMfcBefore, 18)} MFC`);
    
    // 确保有足够USDC
    if (userUsdcBefore < investAmount) {
        const mintTx = await usdc.mint(deployer.address, investAmount * 2n);
        await mintTx.wait();
        console.log("已铸造额外USDC");
    }
    
    // 授权并投资
    const approveTx = await usdc.approve(deploymentData.contracts.FixedRateMockFund, investAmount);
    await approveTx.wait();
    
    console.log("\n执行投资...");
    const investTx = await mockFund.invest(investAmount);
    const investReceipt = await investTx.wait();
    
    // 检查投资后状态
    const userUsdcAfterInvest = await usdc.balanceOf(deployer.address);
    const userMfcAfterInvest = await fundShareToken.balanceOf(deployer.address);
    const actualMfcReceived = userMfcAfterInvest - userMfcBefore;
    
    console.log(`投资后USDC余额: ${ethers.formatUnits(userUsdcAfterInvest, 6)} USDC`);
    console.log(`投资后MFC余额: ${ethers.formatUnits(userMfcAfterInvest, 18)} MFC`);
    console.log(`实际获得MFC: ${ethers.formatUnits(actualMfcReceived, 18)} MFC`);
    
    // 投资效率分析
    const investEfficiency = (actualMfcReceived * 10000n) / expectedMfcFromInvest;
    console.log(`投资效率: ${ethers.formatUnits(investEfficiency, 2)}%`);
    
    // 获取投资后的MFC价格
    const mfcValueAfterInvest = await mockFund.calculateMFCValue();
    console.log(`投资后MFC价格: ${ethers.formatUnits(mfcValueAfterInvest, 6)} USDC per MFC`);
    
    console.log("\n执行赎回...");
    const redeemTx = await mockFund.redeem(redeemMfcAmount);
    const redeemReceipt = await redeemTx.wait();
    
    // 检查赎回后状态
    const userUsdcAfterRedeem = await usdc.balanceOf(deployer.address);
    const userMfcAfterRedeem = await fundShareToken.balanceOf(deployer.address);
    const actualUsdcReceived = userUsdcAfterRedeem - userUsdcAfterInvest;
    
    console.log(`赎回后USDC余额: ${ethers.formatUnits(userUsdcAfterRedeem, 6)} USDC`);
    console.log(`赎回后MFC余额: ${ethers.formatUnits(userMfcAfterRedeem, 18)} MFC`);
    console.log(`实际赎回USDC: ${ethers.formatUnits(actualUsdcReceived, 6)} USDC`);
    
    // 赎回效率分析
    const redeemEfficiency = (actualUsdcReceived * 10000n) / expectedUsdcFromRedeem;
    console.log(`赎回效率: ${ethers.formatUnits(redeemEfficiency, 2)}%`);
    
    // 获取赎回后的MFC价格
    const mfcValueAfterRedeem = await mockFund.calculateMFCValue();
    console.log(`赎回后MFC价格: ${ethers.formatUnits(mfcValueAfterRedeem, 6)} USDC per MFC`);
    
    console.log("\n=== 总结分析 ===");
    const totalUsdcChange = userUsdcAfterRedeem - userUsdcBefore;
    const totalMfcChange = userMfcAfterRedeem - userMfcBefore;
    
    console.log(`净USDC变化: ${ethers.formatUnits(totalUsdcChange, 6)} USDC`);
    console.log(`净MFC变化: ${ethers.formatUnits(totalMfcChange, 18)} MFC`);
    
    // 分析价格变化的原因
    console.log("\n=== 价格变化分析 ===");
    console.log(`初始MFC价格: ${ethers.formatUnits(mfcValue, 6)} USDC`);
    console.log(`投资后MFC价格: ${ethers.formatUnits(mfcValueAfterInvest, 6)} USDC`);
    console.log(`赎回后MFC价格: ${ethers.formatUnits(mfcValueAfterRedeem, 6)} USDC`);
    
    const priceChangeInvest = ((mfcValueAfterInvest - mfcValue) * 10000n) / mfcValue;
    const priceChangeRedeem = ((mfcValueAfterRedeem - mfcValueAfterInvest) * 10000n) / mfcValueAfterInvest;
    
    console.log(`投资导致的价格变化: ${ethers.formatUnits(priceChangeInvest, 2)}%`);
    console.log(`赎回导致的价格变化: ${ethers.formatUnits(priceChangeRedeem, 2)}%`);
    
    console.log("\n=== 分析完成 ===");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });