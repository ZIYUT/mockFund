const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("测试小额MFC赎回...");
    
    // 读取部署配置
    const deploymentPath = path.join(__dirname, "../deployments/sepolia-deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const [deployer] = await ethers.getSigners();
    console.log("使用账户:", deployer.address);
    
    // 获取合约实例
    const mockFund = await ethers.getContractAt("contracts/MockFund.sol:MockFund", deployment.contracts.MockFund);
    const shareToken = await ethers.getContractAt("FundShareToken", deployment.contracts.FundShareToken);
    const mockUSDC = await ethers.getContractAt("MockUSDC", deployment.tokens.USDC);
    
    console.log("MockFund地址:", deployment.contracts.MockFund);
    console.log("ShareToken地址:", deployment.contracts.FundShareToken);
    
    // 检查当前余额
    console.log("\n=== 检查当前余额 ===");
    try {
        const mfcBalance = await shareToken.balanceOf(deployer.address);
        console.log("MFC余额:", ethers.formatEther(mfcBalance));
        
        const usdcBalance = await mockUSDC.balanceOf(deployer.address);
        console.log("USDC余额:", ethers.formatUnits(usdcBalance, 6));
        
    } catch (error) {
        console.log("检查余额失败:", error.message);
        return;
    }
    
    // 测试小额赎回
    console.log("\n=== 测试小额赎回 ===");
    try {
        const currentMFCBalance = await shareToken.balanceOf(deployer.address);
        console.log("当前MFC余额:", ethers.formatEther(currentMFCBalance));
        
        if (currentMFCBalance > 0) {
            // 赎回10%的MFC
            const redeemAmount = (currentMFCBalance * 10n) / 100n;
            console.log("准备赎回MFC:", ethers.formatEther(redeemAmount));
            
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
            const finalUSDCBalance = await mockUSDC.balanceOf(deployer.address);
            const finalMFCBalance = await shareToken.balanceOf(deployer.address);
            console.log("赎回后USDC余额:", ethers.formatUnits(finalUSDCBalance, 6));
            console.log("赎回后MFC余额:", ethers.formatEther(finalMFCBalance));
            
        } else {
            console.log("没有MFC余额，无法赎回");
        }
        
    } catch (error) {
        console.log("✗ 赎回失败:", error.message);
        
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
    
    console.log("\n=== 小额赎回测试完成 ===");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 