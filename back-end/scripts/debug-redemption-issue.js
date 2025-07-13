const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("调试赎回失败问题...");
    
    // 读取部署配置
    const deploymentPath = path.join(__dirname, "../deployments/sepolia-deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const [deployer] = await ethers.getSigners();
    console.log("使用账户:", deployer.address);
    
    // 获取合约实例
    const mockFund = await ethers.getContractAt("contracts/MockFund.sol:MockFund", deployment.contracts.MockFund);
    const shareToken = await ethers.getContractAt("FundShareToken", deployment.contracts.FundShareToken);
    
    console.log("MockFund地址:", deployment.contracts.MockFund);
    console.log("ShareToken地址:", deployment.contracts.FundShareToken);
    
    // 检查用户余额
    console.log("\n=== 检查用户余额 ===");
    try {
        const mfcBalance = await shareToken.balanceOf(deployer.address);
        console.log("用户MFC余额:", ethers.formatEther(mfcBalance));
        
        const usdcBalance = await mockFund.getUSDCBalance(deployer.address);
        console.log("用户USDC余额:", ethers.formatUnits(usdcBalance, 6));
        
    } catch (error) {
        console.log("检查余额失败:", error.message);
    }
    
    // 检查赎回预览
    console.log("\n=== 检查赎回预览 ===");
    try {
        const redeemAmount = ethers.parseEther("500.190072227446429643");
        const previewUSDC = await mockFund.getRedemptionPreview(redeemAmount);
        console.log("赎回预览 - 将获得USDC:", ethers.formatUnits(previewUSDC, 6));
        
        const minRedemption = await mockFund.minimumRedemption();
        console.log("最小赎回额:", ethers.formatUnits(minRedemption, 6));
        
        if (previewUSDC < minRedemption) {
            console.log("✗ 赎回金额低于最小赎回额");
        } else {
            console.log("✓ 赎回金额满足最小要求");
        }
        
    } catch (error) {
        console.log("检查赎回预览失败:", error.message);
    }
    
    // 检查基金状态
    console.log("\n=== 检查基金状态 ===");
    try {
        const isPaused = await mockFund.paused();
        console.log("基金是否暂停:", isPaused);
        
        const isInitialized = await mockFund.isInitialized();
        console.log("基金是否已初始化:", isInitialized);
        
        const nav = await mockFund.calculateNAV();
        console.log("基金NAV:", ethers.formatUnits(nav, 6));
        
        const mfcValue = await mockFund.calculateMFCValue();
        console.log("MFC价值:", ethers.formatUnits(mfcValue, 6));
        
    } catch (error) {
        console.log("检查基金状态失败:", error.message);
    }
    
    // 检查授权
    console.log("\n=== 检查授权 ===");
    try {
        const allowance = await shareToken.allowance(deployer.address, deployment.contracts.MockFund);
        console.log("MockFund对MFC的授权:", ethers.formatEther(allowance));
        
        if (allowance === 0n) {
            console.log("需要授权MockFund使用MFC...");
            
            const approveAmount = ethers.parseEther("1000");
            const approveTx = await shareToken.approve(deployment.contracts.MockFund, approveAmount);
            console.log("授权交易已发送，等待确认...");
            console.log("交易哈希:", approveTx.hash);
            
            await approveTx.wait();
            console.log("✓ MFC授权成功");
            
        } else {
            console.log("MFC授权已存在");
        }
        
    } catch (error) {
        console.log("检查或设置授权失败:", error.message);
    }
    
    // 尝试静态调用赎回函数
    console.log("\n=== 静态调用赎回函数 ===");
    try {
        const redeemAmount = ethers.parseEther("500.190072227446429643");
        
        // 使用静态调用检查赎回函数
        const encodedData = mockFund.interface.encodeFunctionData("redeem", [redeemAmount]);
        
        const result = await ethers.provider.call({
            to: deployment.contracts.MockFund,
            data: encodedData,
            from: deployer.address
        });
        
        console.log("静态调用成功，结果:", result);
        
    } catch (error) {
        console.log("静态调用失败，错误:", error.message);
        
        // 尝试解码错误
        if (error.data) {
            try {
                const decodedError = mockFund.interface.parseError(error.data);
                console.log("解码错误:", decodedError);
            } catch (decodeError) {
                console.log("无法解码错误数据");
            }
        }
    }
    
    console.log("\n=== 调试完成 ===");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 