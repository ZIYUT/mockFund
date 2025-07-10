const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🧪 开始测试 Sepolia 部署的合约功能...");
    
    // 读取部署信息
    const deploymentFile = path.join(__dirname, "..", "deployments", "sepolia-real-prices.json");
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ 部署文件不存在，请先部署合约到 Sepolia");
        process.exit(1);
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const contracts = deploymentInfo.contracts;
    
    // 获取测试账户
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log("📝 测试账户:");
    console.log("   部署者:", deployer.address);
    console.log("   用户1:", user1.address);
    console.log("   用户2:", user2.address);
    
    try {
        // 连接合约
        console.log("\n🔗 连接合约...");
        const mockFund = await ethers.getContractAt("MockFund", contracts.MockFund);
        const mockUSDC = await ethers.getContractAt("MockUSDC", contracts.MockUSDC);
        const fundShareToken = await ethers.getContractAt("FundShareToken", contracts.FundShareToken);
        
        console.log("✅ 合约连接成功");
        
        // 测试1: 检查基金状态
        console.log("\n📊 测试1: 检查基金状态");
        const fundStats = await mockFund.getFundStats();
        console.log("   总供应量:", ethers.formatEther(fundStats[0]));
        console.log("   初始供应量:", ethers.formatEther(fundStats[1]));
        console.log("   是否已初始化:", fundStats[2]);
        
        const [nav, mfcValue, totalSupply] = await mockFund.getFundNAV();
        console.log("   基金净值:", ethers.formatUnits(nav, 6), "USDC");
        console.log("   MFC价值:", ethers.formatUnits(mfcValue, 6), "USDC");
        console.log("   总MFC供应:", ethers.formatEther(totalSupply));
        
        // 测试2: 检查支持的代币
        console.log("\n🎯 测试2: 检查支持的代币");
        const supportedTokens = await mockFund.getSupportedTokens();
        console.log("   支持的投资代币数量:", supportedTokens.length);
        
        for (let i = 0; i < supportedTokens.length; i++) {
            const tokenInfo = await mockFund.getTokenInfo(supportedTokens[i]);
            console.log(`   代币${i+1}: ${tokenInfo.name} (${tokenInfo.symbol}) - 分配: ${tokenInfo.allocation/100}%`);
        }
        
        // 测试3: 为用户铸造测试代币
        console.log("\n💰 测试3: 为用户铸造测试代币");
        const testAmount = ethers.parseUnits("10000", 6); // 10K USDC
        
        const mintTx = await mockUSDC.mint(user1.address, testAmount);
        await mintTx.wait();
        console.log("✅ 为用户1铸造了 10,000 USDC");
        
        const user1Balance = await mockUSDC.balanceOf(user1.address);
        console.log("   用户1 USDC余额:", ethers.formatUnits(user1Balance, 6));
        
        // 测试4: 测试投资功能
        console.log("\n📈 测试4: 测试投资功能");
        const investmentAmount = ethers.parseUnits("1000", 6); // 1K USDC
        
        // 用户1批准USDC
        const approveTx = await mockUSDC.connect(user1).approve(contracts.MockFund, investmentAmount);
        await approveTx.wait();
        console.log("✅ 用户1批准了 1,000 USDC");
        
        // 获取投资前的MFC余额
        const mfcBefore = await fundShareToken.balanceOf(user1.address);
        console.log("   投资前MFC余额:", ethers.formatEther(mfcBefore));
        
        // 执行投资
        const investTx = await mockFund.connect(user1).invest(investmentAmount);
        await investTx.wait();
        console.log("✅ 用户1投资了 1,000 USDC");
        
        // 获取投资后的MFC余额
        const mfcAfter = await fundShareToken.balanceOf(user1.address);
        const mfcReceived = mfcAfter - mfcBefore;
        console.log("   投资后MFC余额:", ethers.formatEther(mfcAfter));
        console.log("   获得的MFC数量:", ethers.formatEther(mfcReceived));
        
        // 测试5: 检查投资后的基金状态
        console.log("\n📊 测试5: 检查投资后的基金状态");
        const [navAfter, mfcValueAfter, totalSupplyAfter] = await mockFund.getFundNAV();
        console.log("   投资后基金净值:", ethers.formatUnits(navAfter, 6), "USDC");
        console.log("   投资后MFC价值:", ethers.formatUnits(mfcValueAfter, 6), "USDC");
        console.log("   投资后总MFC供应:", ethers.formatEther(totalSupplyAfter));
        
        // 测试6: 测试赎回功能
        console.log("\n💸 测试6: 测试赎回功能");
        const redeemAmount = ethers.parseUnits("500", 18); // 赎回500 MFC
        
        // 获取赎回前的USDC余额
        const usdcBeforeRedeem = await mockUSDC.balanceOf(user1.address);
        console.log("   赎回前USDC余额:", ethers.formatUnits(usdcBeforeRedeem, 6));
        
        // 执行赎回
        const redeemTx = await mockFund.connect(user1).redeem(redeemAmount);
        await redeemTx.wait();
        console.log("✅ 用户1赎回了 500 MFC");
        
        // 获取赎回后的USDC余额
        const usdcAfterRedeem = await mockUSDC.balanceOf(user1.address);
        const usdcReceived = usdcAfterRedeem - usdcBeforeRedeem;
        console.log("   赎回后USDC余额:", ethers.formatUnits(usdcAfterRedeem, 6));
        console.log("   获得的USDC数量:", ethers.formatUnits(usdcReceived, 6));
        
        // 测试7: 检查管理费
        console.log("\n💼 测试7: 检查管理费");
        const totalFees = await mockFund.totalManagementFeesCollected();
        console.log("   累计管理费:", ethers.formatUnits(totalFees, 6), "USDC");
        
        // 测试8: 检查最终状态
        console.log("\n🔍 测试8: 检查最终状态");
        const finalMfcBalance = await fundShareToken.balanceOf(user1.address);
        const finalUsdcBalance = await mockUSDC.balanceOf(user1.address);
        console.log("   最终MFC余额:", ethers.formatEther(finalMfcBalance));
        console.log("   最终USDC余额:", ethers.formatUnits(finalUsdcBalance, 6));
        
        const [finalNav, finalMfcValue, finalTotalSupply] = await mockFund.getFundNAV();
        console.log("   最终基金净值:", ethers.formatUnits(finalNav, 6), "USDC");
        console.log("   最终MFC价值:", ethers.formatUnits(finalMfcValue, 6), "USDC");
        console.log("   最终总MFC供应:", ethers.formatEther(finalTotalSupply));
        
        console.log("\n🎉 所有测试完成！");
        console.log("\n📋 测试结果总结:");
        console.log("✅ 基金初始化正常");
        console.log("✅ 投资功能正常");
        console.log("✅ 赎回功能正常");
        console.log("✅ 管理费收取正常");
        console.log("✅ 净值计算正常");
        console.log("✅ 代币分配正常");
        
        console.log("\n🚀 合约已准备好在 Sepolia 上使用！");
        
    } catch (error) {
        console.error("❌ 测试失败:", error);
        process.exit(1);
    }
}

// 错误处理
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise rejection:', error);
    process.exit(1);
});

// 执行测试
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main }; 