const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("=== MFC投资和赎回测试脚本 ===");
    
    // 读取部署地址
    const deploymentData = JSON.parse(fs.readFileSync('localhost-deployment.json', 'utf8'));
    
    // 获取合约实例
    const [deployer] = await ethers.getSigners();
    console.log("测试账户:", deployer.address);
    
    // 连接到已部署的合约
    const mockFund = await ethers.getContractAt("FixedRateMockFund", deploymentData.contracts.FixedRateMockFund);
    const usdc = await ethers.getContractAt("MockUSDC", deploymentData.contracts.MockUSDC);
    const fundShareToken = await ethers.getContractAt("FundShareToken", deploymentData.contracts.FundShareToken);
    
    console.log("基金合约地址:", deploymentData.contracts.FixedRateMockFund);
    console.log("USDC合约地址:", deploymentData.contracts.MockUSDC);
    console.log("MFC代币合约地址:", deploymentData.contracts.FundShareToken);
    
    // 测试金额
    const investAmount = ethers.parseUnits("10000", 6); // 10000 USDC
    console.log("\n=== 测试参数 ===");
    console.log("投资金额:", ethers.formatUnits(investAmount, 6), "USDC");
    
    // 检查初始余额
    console.log("\n=== 初始余额检查 ===");
    const initialUsdcBalance = await usdc.balanceOf(deployer.address);
    const initialMfcBalance = await fundShareToken.balanceOf(deployer.address);
    console.log("用户初始USDC余额:", ethers.formatUnits(initialUsdcBalance, 6), "USDC");
    console.log("用户初始MFC余额:", ethers.formatUnits(initialMfcBalance, 18), "MFC");
    
    // 检查基金状态
    const fundInitialized = await mockFund.isInitialized();
    const fundUsdcBalance = await usdc.balanceOf(deploymentData.contracts.FixedRateMockFund);
    console.log("基金已初始化:", fundInitialized);
    console.log("基金USDC余额:", ethers.formatUnits(fundUsdcBalance, 6), "USDC");
    
    // 获取当前MFC价格
    const currentMfcValue = await mockFund.calculateMFCValue();
    console.log("当前MFC价格:", ethers.formatUnits(currentMfcValue, 6), "USDC per MFC");
    
    // 计算预期获得的MFC数量
    const expectedMfcAmount = (investAmount * ethers.parseUnits("1", 18)) / currentMfcValue;
    console.log("预期获得MFC数量:", ethers.formatUnits(expectedMfcAmount, 18), "MFC");
    
    // 确保用户有足够的USDC
    if (initialUsdcBalance < investAmount) {
        console.log("\n=== 铸造测试USDC ===");
        const mintTx = await usdc.mint(deployer.address, investAmount * 2n);
        await mintTx.wait();
        const newUsdcBalance = await usdc.balanceOf(deployer.address);
        console.log("铸造后USDC余额:", ethers.formatUnits(newUsdcBalance, 6), "USDC");
    }
    
    // 授权基金合约使用USDC
    console.log("\n=== 授权USDC ===");
    const approveTx = await usdc.approve(deploymentData.contracts.FixedRateMockFund, investAmount);
    await approveTx.wait();
    console.log("USDC授权完成");
    
    // 执行投资
    console.log("\n=== 执行投资 ===");
    try {
        const investTx = await mockFund.invest(investAmount);
        const receipt = await investTx.wait();
        console.log("投资交易成功，Gas使用:", receipt.gasUsed.toString());
        
        // 检查投资后余额
        const afterInvestUsdcBalance = await usdc.balanceOf(deployer.address);
        const afterInvestMfcBalance = await fundShareToken.balanceOf(deployer.address);
        console.log("投资后USDC余额:", ethers.formatUnits(afterInvestUsdcBalance, 6), "USDC");
        console.log("投资后MFC余额:", ethers.formatUnits(afterInvestMfcBalance, 18), "MFC");
        
        const actualMfcReceived = afterInvestMfcBalance - initialMfcBalance;
        console.log("实际获得MFC数量:", ethers.formatUnits(actualMfcReceived, 18), "MFC");
        
        // 检查基金状态变化
        const afterInvestFundUsdcBalance = await usdc.balanceOf(deploymentData.contracts.FixedRateMockFund);
        console.log("投资后基金USDC余额:", ethers.formatUnits(afterInvestFundUsdcBalance, 6), "USDC");
        
        // 等待一段时间再执行赎回（模拟实际使用场景）
        console.log("\n=== 等待片刻后执行赎回 ===");
        
        // 获取当前MFC价格（可能有变化）
        const redeemMfcValue = await mockFund.calculateMFCValue();
        console.log("赎回时MFC价格:", ethers.formatUnits(redeemMfcValue, 6), "USDC per MFC");
        
        // 计算赎回金额（赎回一半MFC）
        const redeemMfcAmount = actualMfcReceived / 2n;
        console.log("计划赎回MFC数量:", ethers.formatUnits(redeemMfcAmount, 18), "MFC");
        
        const expectedUsdcFromRedeem = (redeemMfcAmount * redeemMfcValue) / ethers.parseUnits("1", 18);
        console.log("预期赎回USDC数量:", ethers.formatUnits(expectedUsdcFromRedeem, 6), "USDC");
        
        // 执行赎回
        console.log("\n=== 执行赎回 ===");
        const redeemTx = await mockFund.redeem(redeemMfcAmount);
        const redeemReceipt = await redeemTx.wait();
        console.log("赎回交易成功，Gas使用:", redeemReceipt.gasUsed.toString());
        
        // 检查赎回后余额
        const afterRedeemUsdcBalance = await usdc.balanceOf(deployer.address);
        const afterRedeemMfcBalance = await fundShareToken.balanceOf(deployer.address);
        console.log("赎回后USDC余额:", ethers.formatUnits(afterRedeemUsdcBalance, 6), "USDC");
        console.log("赎回后MFC余额:", ethers.formatUnits(afterRedeemMfcBalance, 18), "MFC");
        
        const actualUsdcReceived = afterRedeemUsdcBalance - afterInvestUsdcBalance;
        console.log("实际赎回USDC数量:", ethers.formatUnits(actualUsdcReceived, 6), "USDC");
        
        // 检查基金状态变化
        const afterRedeemFundUsdcBalance = await usdc.balanceOf(deploymentData.contracts.FixedRateMockFund);
        console.log("赎回后基金USDC余额:", ethers.formatUnits(afterRedeemFundUsdcBalance, 6), "USDC");
        
        // 总结测试结果
        console.log("\n=== 测试总结 ===");
        console.log("投资金额:", ethers.formatUnits(investAmount, 6), "USDC");
        console.log("获得MFC:", ethers.formatUnits(actualMfcReceived, 18), "MFC");
        console.log("赎回MFC:", ethers.formatUnits(redeemMfcAmount, 18), "MFC");
        console.log("赎回USDC:", ethers.formatUnits(actualUsdcReceived, 6), "USDC");
        console.log("剩余MFC:", ethers.formatUnits(afterRedeemMfcBalance - initialMfcBalance, 18), "MFC");
        
        const netUsdcChange = afterRedeemUsdcBalance - initialUsdcBalance;
        console.log("净USDC变化:", ethers.formatUnits(netUsdcChange, 6), "USDC");
        
        // 验证计算准确性
        const investmentEfficiency = (actualMfcReceived * currentMfcValue) / (investAmount * ethers.parseUnits("1", 18));
        const redeemEfficiency = (actualUsdcReceived * ethers.parseUnits("1", 18)) / (redeemMfcAmount * redeemMfcValue);
        
        console.log("\n=== 效率分析 ===");
        console.log("投资效率:", ethers.formatUnits(investmentEfficiency * 100n, 16), "%");
        console.log("赎回效率:", ethers.formatUnits(redeemEfficiency * 100n, 16), "%");
        
    } catch (error) {
        console.error("交易失败:", error.message);
        if (error.data) {
            console.error("错误数据:", error.data);
        }
    }
    
    console.log("\n=== 测试完成 ===");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });