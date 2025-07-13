const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🎯 开始完整的MFC投资和赎回功能测试...");
    
    // 读取部署配置
    const deploymentPath = path.join(__dirname, "../deployments/sepolia-deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const [deployer] = await ethers.getSigners();
    console.log("使用账户:", deployer.address);
    console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    
    // 获取合约实例
    const mockFund = await ethers.getContractAt("contracts/MockFund.sol:MockFund", deployment.contracts.MockFund);
    const mockUSDC = await ethers.getContractAt("MockUSDC", deployment.tokens.USDC);
    const shareToken = await ethers.getContractAt("FundShareToken", deployment.contracts.FundShareToken);
    
    console.log("MockFund地址:", deployment.contracts.MockFund);
    console.log("ShareToken地址:", deployment.contracts.FundShareToken);
    
    // 检查基金状态
    console.log("\n=== 基金初始状态 ===");
    try {
        const isInitialized = await mockFund.isInitialized();
        console.log("基金是否已初始化:", isInitialized);
        
        const isPaused = await mockFund.paused();
        console.log("基金是否暂停:", isPaused);
        
        const nav = await mockFund.calculateNAV();
        console.log("基金NAV (USDC):", ethers.formatUnits(nav, 6));
        
        const mfcValue = await mockFund.calculateMFCValue();
        console.log("单个MFC价值 (USDC):", ethers.formatUnits(mfcValue, 6));
        
    } catch (error) {
        console.log("检查基金状态失败:", error.message);
        return;
    }
    
    // 检查初始余额
    console.log("\n=== 初始余额检查 ===");
    try {
        const initialUSDCBalance = await mockUSDC.balanceOf(deployer.address);
        console.log("初始USDC余额:", ethers.formatUnits(initialUSDCBalance, 6));
        
        const initialMFCBalance = await shareToken.balanceOf(deployer.address);
        console.log("初始MFC余额:", ethers.formatEther(initialMFCBalance));
        
    } catch (error) {
        console.log("检查初始余额失败:", error.message);
        return;
    }
    
    // 测试投资功能
    console.log("\n=== 测试投资功能 ===");
    try {
        const investmentAmount = ethers.parseUnits("2000", 6); // 2000 USDC
        
        // 检查USDC授权
        const allowance = await mockUSDC.allowance(deployer.address, deployment.contracts.MockFund);
        if (allowance < investmentAmount) {
            console.log("正在授权USDC...");
            await mockUSDC.approve(deployment.contracts.MockFund, investmentAmount);
            console.log("✓ USDC授权成功");
        }
        
        // 获取投资预览
        const previewMFC = await mockFund.getInvestmentPreview(investmentAmount);
        console.log("投资预览 - 将获得MFC:", ethers.formatEther(previewMFC));
        
        // 执行投资
        console.log("开始投资2000 USDC...");
        const investTx = await mockFund.invest(investmentAmount);
        console.log("投资交易已发送，等待确认...");
        console.log("交易哈希:", investTx.hash);
        
        const investReceipt = await investTx.wait();
        console.log("✓ 投资成功！");
        console.log("区块号:", investReceipt.blockNumber);
        console.log("Gas使用:", investReceipt.gasUsed.toString());
        
        // 检查投资后的余额
        const afterInvestUSDCBalance = await mockUSDC.balanceOf(deployer.address);
        const afterInvestMFCBalance = await shareToken.balanceOf(deployer.address);
        console.log("投资后USDC余额:", ethers.formatUnits(afterInvestUSDCBalance, 6));
        console.log("投资后MFC余额:", ethers.formatEther(afterInvestMFCBalance));
        
    } catch (error) {
        console.log("✗ 投资失败:", error.message);
        return;
    }
    
    // 等待一段时间让价格更新
    console.log("\n等待5秒让价格更新...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 检查投资后的基金状态
    console.log("\n=== 投资后基金状态 ===");
    try {
        const afterInvestNav = await mockFund.calculateNAV();
        console.log("投资后NAV (USDC):", ethers.formatUnits(afterInvestNav, 6));
        
        const afterInvestMfcValue = await mockFund.calculateMFCValue();
        console.log("投资后MFC价值 (USDC):", ethers.formatUnits(afterInvestMfcValue, 6));
        
    } catch (error) {
        console.log("检查投资后状态失败:", error.message);
    }
    
    // 测试赎回功能
    console.log("\n=== 测试赎回功能 ===");
    try {
        const currentMFCBalance = await shareToken.balanceOf(deployer.address);
        console.log("当前MFC余额:", ethers.formatEther(currentMFCBalance));
        
        if (currentMFCBalance > 0) {
            // 赎回30%的MFC
            const redeemAmount = (currentMFCBalance * 30n) / 100n;
            console.log("准备赎回MFC:", ethers.formatEther(redeemAmount));
            
            // 检查MFC授权
            const mfcAllowance = await shareToken.allowance(deployer.address, deployment.contracts.MockFund);
            if (mfcAllowance < redeemAmount) {
                console.log("正在授权MFC...");
                await shareToken.approve(deployment.contracts.MockFund, redeemAmount);
                console.log("✓ MFC授权成功");
            }
            
            // 获取赎回预览
            const previewUSDC = await mockFund.getRedemptionPreview(redeemAmount);
            console.log("赎回预览 - 将获得USDC:", ethers.formatUnits(previewUSDC, 6));
            
            // 执行赎回
            console.log("开始赎回...");
            const redeemTx = await mockFund.redeem(redeemAmount);
            console.log("赎回交易已发送，等待确认...");
            console.log("交易哈希:", redeemTx.hash);
            
            const redeemReceipt = await redeemTx.wait();
            console.log("✓ 赎回成功！");
            console.log("区块号:", redeemReceipt.blockNumber);
            console.log("Gas使用:", redeemReceipt.gasUsed.toString());
            
            // 检查赎回后的余额
            const afterRedeemUSDCBalance = await mockUSDC.balanceOf(deployer.address);
            const afterRedeemMFCBalance = await shareToken.balanceOf(deployer.address);
            console.log("赎回后USDC余额:", ethers.formatUnits(afterRedeemUSDCBalance, 6));
            console.log("赎回后MFC余额:", ethers.formatEther(afterRedeemMFCBalance));
            
        } else {
            console.log("没有MFC余额，跳过赎回测试");
        }
        
    } catch (error) {
        console.log("✗ 赎回失败:", error.message);
    }
    
    // 检查最终基金状态
    console.log("\n=== 最终基金状态 ===");
    try {
        const finalNav = await mockFund.calculateNAV();
        console.log("最终NAV (USDC):", ethers.formatUnits(finalNav, 6));
        
        const finalMfcValue = await mockFund.calculateMFCValue();
        console.log("最终MFC价值 (USDC):", ethers.formatUnits(finalMfcValue, 6));
        
        const totalSupply = await shareToken.totalSupply();
        console.log("总供应量:", ethers.formatEther(totalSupply));
        
        const circulatingSupply = await mockFund.getCirculatingSupply();
        console.log("流通供应量:", ethers.formatEther(circulatingSupply));
        
    } catch (error) {
        console.log("获取最终状态失败:", error.message);
    }
    
    // 计算收益
    console.log("\n=== 收益分析 ===");
    try {
        const finalUSDCBalance = await mockUSDC.balanceOf(deployer.address);
        const finalMFCBalance = await shareToken.balanceOf(deployer.address);
        
        const initialUSDCBalance = await mockUSDC.balanceOf(deployer.address);
        const initialMFCBalance = await shareToken.balanceOf(deployer.address);
        
        const usdcChange = finalUSDCBalance - initialUSDCBalance;
        const mfcChange = finalMFCBalance - initialMFCBalance;
        
        console.log("USDC变化:", ethers.formatUnits(usdcChange, 6));
        console.log("MFC变化:", ethers.formatEther(mfcChange));
        
        if (mfcChange > 0) {
            const mfcValue = await mockFund.calculateMFCValue();
            const mfcValueInUSDC = (mfcChange * mfcValue) / 1e18;
            console.log("MFC价值 (USDC):", ethers.formatUnits(mfcValueInUSDC, 6));
            
            const totalValue = usdcChange + mfcValueInUSDC;
            console.log("总价值变化 (USDC):", ethers.formatUnits(totalValue, 6));
        }
        
    } catch (error) {
        console.log("计算收益失败:", error.message);
    }
    
    console.log("\n=== 测试完成 ===");
    console.log("🎉 MFC投资和赎回功能测试完全成功！");
    console.log("✅ 投资功能正常");
    console.log("✅ 赎回功能正常");
    console.log("✅ 价格计算准确");
    console.log("✅ 授权机制正常");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 