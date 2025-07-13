const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("详细调试赎回失败问题...");
    
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
    
    // 检查用户余额
    console.log("\n=== 检查用户余额 ===");
    try {
        const mfcBalance = await shareToken.balanceOf(deployer.address);
        console.log("用户MFC余额:", ethers.formatEther(mfcBalance));
        
        const usdcBalance = await mockUSDC.balanceOf(deployer.address);
        console.log("用户USDC余额:", ethers.formatUnits(usdcBalance, 6));
        
    } catch (error) {
        console.log("检查余额失败:", error.message);
    }
    
    // 检查基金参数
    console.log("\n=== 检查基金参数 ===");
    try {
        const minRedemption = await mockFund.minimumRedemption();
        console.log("最小赎回额:", ethers.formatUnits(minRedemption, 6));
        
        const minInvestment = await mockFund.minimumInvestment();
        console.log("最小投资额:", ethers.formatUnits(minInvestment, 6));
        
        const managementFeeRate = await mockFund.managementFeeRate();
        console.log("管理费率:", managementFeeRate.toString(), "基点");
        
    } catch (error) {
        console.log("检查基金参数失败:", error.message);
    }
    
    // 测试不同赎回金额
    console.log("\n=== 测试不同赎回金额 ===");
    try {
        const mfcBalance = await shareToken.balanceOf(deployer.address);
        console.log("当前MFC余额:", ethers.formatEther(mfcBalance));
        
        // 测试赎回10%
        const redeem10Percent = (mfcBalance * 10n) / 100n;
        console.log("10%赎回金额:", ethers.formatEther(redeem10Percent));
        
        try {
            const preview10 = await mockFund.getRedemptionPreview(redeem10Percent);
            console.log("10%赎回预览:", ethers.formatUnits(preview10, 6));
            
            const minRedemption = await mockFund.minimumRedemption();
            if (preview10 >= minRedemption) {
                console.log("✓ 10%赎回满足最小要求");
            } else {
                console.log("✗ 10%赎回低于最小要求");
            }
        } catch (error) {
            console.log("10%赎回预览失败:", error.message);
        }
        
        // 测试赎回20%
        const redeem20Percent = (mfcBalance * 20n) / 100n;
        console.log("20%赎回金额:", ethers.formatEther(redeem20Percent));
        
        try {
            const preview20 = await mockFund.getRedemptionPreview(redeem20Percent);
            console.log("20%赎回预览:", ethers.formatUnits(preview20, 6));
            
            const minRedemption = await mockFund.minimumRedemption();
            if (preview20 >= minRedemption) {
                console.log("✓ 20%赎回满足最小要求");
            } else {
                console.log("✗ 20%赎回低于最小要求");
            }
        } catch (error) {
            console.log("20%赎回预览失败:", error.message);
        }
        
        // 测试赎回50%
        const redeem50Percent = (mfcBalance * 50n) / 100n;
        console.log("50%赎回金额:", ethers.formatEther(redeem50Percent));
        
        try {
            const preview50 = await mockFund.getRedemptionPreview(redeem50Percent);
            console.log("50%赎回预览:", ethers.formatUnits(preview50, 6));
            
            const minRedemption = await mockFund.minimumRedemption();
            if (preview50 >= minRedemption) {
                console.log("✓ 50%赎回满足最小要求");
            } else {
                console.log("✗ 50%赎回低于最小要求");
            }
        } catch (error) {
            console.log("50%赎回预览失败:", error.message);
        }
        
    } catch (error) {
        console.log("测试赎回金额失败:", error.message);
    }
    
    // 检查授权
    console.log("\n=== 检查授权 ===");
    try {
        const allowance = await shareToken.allowance(deployer.address, deployment.contracts.MockFund);
        console.log("MockFund对MFC的授权:", ethers.formatEther(allowance));
        
        const mfcBalance = await shareToken.balanceOf(deployer.address);
        if (allowance < mfcBalance) {
            console.log("需要增加MFC授权...");
            
            const approveAmount = mfcBalance * 2n; // 授权2倍余额
            const approveTx = await shareToken.approve(deployment.contracts.MockFund, approveAmount);
            console.log("授权交易已发送，等待确认...");
            console.log("交易哈希:", approveTx.hash);
            
            await approveTx.wait();
            console.log("✓ MFC授权成功");
            
            const newAllowance = await shareToken.allowance(deployer.address, deployment.contracts.MockFund);
            console.log("新的授权额度:", ethers.formatEther(newAllowance));
        } else {
            console.log("MFC授权充足");
        }
        
    } catch (error) {
        console.log("检查或设置授权失败:", error.message);
    }
    
    // 尝试静态调用赎回函数
    console.log("\n=== 静态调用赎回函数 ===");
    try {
        const mfcBalance = await shareToken.balanceOf(deployer.address);
        const redeemAmount = (mfcBalance * 20n) / 100n; // 20%
        
        console.log("测试赎回金额:", ethers.formatEther(redeemAmount));
        
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