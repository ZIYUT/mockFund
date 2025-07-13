const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 从部署文件加载合约地址
function loadDeploymentInfo() {
    const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia-deployment.json");
    if (!fs.existsSync(deploymentPath)) {
        throw new Error(`部署文件不存在: ${deploymentPath}\n请先运行 deploy-sepolia.js 脚本`);
    }
    return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
}

async function main() {
    console.log("🚀 开始测试Sepolia测试网上的MockFund合约...");
    
    // 加载部署信息
    const deploymentInfo = loadDeploymentInfo();
    console.log(`加载部署信息: ${deploymentInfo.deploymentTime}`);
    
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    console.log(`网络: ${network.name} (chainId: ${network.chainId})`);
    
    if (network.chainId !== 11155111n) {
        throw new Error("请确保连接到Sepolia测试网 (chainId: 11155111)");
    }
    
    // 获取签名者
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    const investor1 = signers[1] || deployer; // 如果没有第二个账户，使用部署者
    const investor2 = signers[2] || deployer; // 如果没有第三个账户，使用部署者
    
    console.log(`部署者: ${deployer.address}`);
    console.log(`投资者1: ${investor1.address}`);
    console.log(`投资者2: ${investor2.address}`);
    
    if (signers.length === 1) {
        console.log(`⚠️ 只检测到一个账户，将使用部署者账户进行所有测试`);
    }
    
    try {
        // 1. 连接到已部署的合约
        console.log("\n🔗 连接到已部署的合约...");
        
        const mockFund = await ethers.getContractAt("contracts/MockFund.sol:MockFund", deploymentInfo.contracts.MockFund);
        const chainlinkOracle = await ethers.getContractAt("ChainlinkPriceOracle", deploymentInfo.contracts.ChainlinkPriceOracle);
        const shareToken = await ethers.getContractAt("FundShareToken", deploymentInfo.contracts.FundShareToken);
        const uniswapIntegration = await ethers.getContractAt("contracts/UniswapIntegration.sol:UniswapIntegration", deploymentInfo.contracts.UniswapIntegration);
        
        console.log(`✅ MockFund: ${await mockFund.getAddress()}`);
        console.log(`✅ ChainlinkPriceOracle: ${await chainlinkOracle.getAddress()}`);
        console.log(`✅ FundShareToken: ${await shareToken.getAddress()}`);
        
        // 2. 连接到代币合约
        console.log("\n🪙 连接到代币合约...");
        const usdc = await ethers.getContractAt("IERC20", deploymentInfo.tokens.USDC);
        const weth = await ethers.getContractAt("IERC20", deploymentInfo.tokens.WETH);
        const wbtc = await ethers.getContractAt("IERC20", deploymentInfo.tokens.WBTC);
        const link = await ethers.getContractAt("IERC20", deploymentInfo.tokens.LINK);
        const dai = await ethers.getContractAt("IERC20", deploymentInfo.tokens.DAI);
        
        console.log(`✅ USDC: ${deploymentInfo.tokens.USDC}`);
        console.log(`✅ WETH: ${deploymentInfo.tokens.WETH}`);
        console.log(`✅ WBTC: ${deploymentInfo.tokens.WBTC}`);
        console.log(`✅ LINK: ${deploymentInfo.tokens.LINK}`);
        console.log(`✅ DAI: ${deploymentInfo.tokens.DAI}`);
        
        // 3. 检查实时价格
        console.log("\n📊 检查实时价格...");
        
        console.log("\n📊 当前投资组合配置:");
        console.log("- USDC保留: 50% (不进行投资)");
        console.log("- WETH: 12.5%");
        console.log("- WBTC: 12.5%");
        console.log("- LINK: 12.5%");
        console.log("- DAI: 12.5%");
        try {
            const [ethPrice, ethTimestamp] = await chainlinkOracle.getLatestPrice(deploymentInfo.tokens.WETH);
            const [btcPrice, btcTimestamp] = await chainlinkOracle.getLatestPrice(deploymentInfo.tokens.WBTC);
            const [linkPrice, linkTimestamp] = await chainlinkOracle.getLatestPrice(deploymentInfo.tokens.LINK);
            const [usdcPrice, usdcTimestamp] = await chainlinkOracle.getLatestPrice(deploymentInfo.tokens.USDC);
            
            console.log(`ETH价格: $${ethers.formatUnits(ethPrice, 8)} (${new Date(Number(ethTimestamp) * 1000).toLocaleString()})`);
            console.log(`BTC价格: $${ethers.formatUnits(btcPrice, 8)} (${new Date(Number(btcTimestamp) * 1000).toLocaleString()})`);
            console.log(`LINK价格: $${ethers.formatUnits(linkPrice, 8)} (${new Date(Number(linkTimestamp) * 1000).toLocaleString()})`);
            console.log(`USDC价格: $${ethers.formatUnits(usdcPrice, 8)} (${new Date(Number(usdcTimestamp) * 1000).toLocaleString()})`);
        } catch (error) {
            console.warn("⚠️ 获取价格失败:", error.message);
        }
        
        // 4. 检查代币余额
        console.log("\n💰 检查代币余额...");
        const deployerUSDCBalance = await usdc.balanceOf(deployer.address);
        const deployerWETHBalance = await weth.balanceOf(deployer.address);
        const deployerWBTCBalance = await wbtc.balanceOf(deployer.address);
        const deployerLINKBalance = await link.balanceOf(deployer.address);
        const deployerDAIBalance = await dai.balanceOf(deployer.address);
        
        console.log(`部署者USDC余额: ${ethers.formatUnits(deployerUSDCBalance, 6)}`);
        console.log(`部署者WETH余额: ${ethers.formatEther(deployerWETHBalance)}`);
        console.log(`部署者WBTC余额: ${ethers.formatUnits(deployerWBTCBalance, 8)}`);
        console.log(`部署者LINK余额: ${ethers.formatEther(deployerLINKBalance)}`);
        console.log(`部署者DAI余额: ${ethers.formatEther(deployerDAIBalance)}`);
        
        // 检查基金是否已初始化
        const totalSupply = await shareToken.totalSupply();
        const isInitialized = totalSupply > 0;
        
        console.log(`\n📊 基金状态:`);
        console.log(`是否已初始化: ${isInitialized}`);
        console.log(`MFC总供应量: ${ethers.formatEther(totalSupply)}`);
        
        if (!isInitialized) {
            console.log("\n⚠️ 基金尚未初始化");
            
            // 检查是否有足够的USDC进行初始化
            const minInitAmount = ethers.parseUnits("1000000", 6); // 最少1,000,000 USDC
            if (deployerUSDCBalance < minInitAmount) {
                console.log(`❌ USDC余额不足，需要至少 ${ethers.formatUnits(minInitAmount, 6)} USDC 进行初始化`);
                console.log("请从水龙头获取测试USDC: https://faucets.chain.link/sepolia");
                return;
            }
            
            // 初始化基金
            console.log("\n🏗️ 初始化基金...");
            const initAmount = ethers.parseUnits("1000000", 6); // 1,000,000 USDC
            
            // 批准USDC
            console.log("批准USDC使用...");
            await usdc.approve(await mockFund.getAddress(), initAmount);
            
            // 初始化基金
            console.log("执行基金初始化...");
            await mockFund.initializeFund(initAmount);
            console.log(`✅ 基金初始化完成，使用 ${ethers.formatUnits(initAmount, 6)} USDC`);
            
            // 重新检查状态
            const newTotalSupply = await shareToken.totalSupply();
            console.log(`新MFC总供应量: ${ethers.formatEther(newTotalSupply)}`);
        }
        
        // 5. 检查基金详细状态
        console.log("\n📊 检查基金详细状态...");
        const nav = await mockFund.calculateNAV();
        const mfcValue = await mockFund.calculateMFCValue();
        const deployerShares = await shareToken.balanceOf(deployer.address);
        
        console.log(`基金NAV: ${ethers.formatUnits(nav, 6)} USDC`);
        console.log(`单个MFC价值: ${ethers.formatUnits(mfcValue, 6)} USDC`);
        console.log(`部署者MFC余额: ${ethers.formatEther(deployerShares)}`);
        
        // 显示管理费信息
        const managementFeeRate = await mockFund.managementFeeRate();
        const totalManagementFeesCollected = await mockFund.totalManagementFeesCollected();
        const withdrawableManagementFees = await mockFund.getWithdrawableManagementFees();
        const lastFeeCollection = await mockFund.lastFeeCollection();
        
        console.log(`\n💰 管理费信息:`);
        console.log(`管理费率: ${Number(managementFeeRate) / 100}% (${managementFeeRate} basis points)`);
        console.log(`累计管理费: ${ethers.formatUnits(totalManagementFeesCollected, 6)} USDC`);
        console.log(`可提取管理费: ${ethers.formatUnits(withdrawableManagementFees, 6)} USDC`);
        console.log(`上次收费时间: ${new Date(Number(lastFeeCollection) * 1000).toLocaleString()}`);
        
        // 6. 测试投资功能（如果有足够的USDC）
        const investorUSDCBalance = await usdc.balanceOf(investor1.address);
        const minInvestAmount = ethers.parseUnits("100", 6); // 最少100 USDC
        
        if (investorUSDCBalance >= minInvestAmount) {
            console.log("\n🔄 测试投资功能...");
            
            const investAmount = ethers.parseUnits("100", 6); // 100 USDC
            
            console.log(`投资前 - 投资者1 USDC余额: ${ethers.formatUnits(await usdc.balanceOf(investor1.address), 6)}`);
            console.log(`投资前 - 投资者1 MFC余额: ${ethers.formatEther(await shareToken.balanceOf(investor1.address))}`);
            
            // 批准和投资
            await usdc.connect(investor1).approve(await mockFund.getAddress(), investAmount);
            await mockFund.connect(investor1).invest(investAmount);
            
            console.log(`投资后 - 投资者1 USDC余额: ${ethers.formatUnits(await usdc.balanceOf(investor1.address), 6)}`);
            console.log(`投资后 - 投资者1 MFC余额: ${ethers.formatEther(await shareToken.balanceOf(investor1.address))}`);
            
            // 检查投资后的基金状态
            const newNav = await mockFund.calculateNAV();
            const newMfcValue = await mockFund.calculateMFCValue();
            const newTotalSupply = await shareToken.totalSupply();
            
            console.log(`\n📊 投资后基金状态:`);
            console.log(`新基金NAV: ${ethers.formatUnits(newNav, 6)} USDC`);
            console.log(`新单个MFC价值: ${ethers.formatUnits(newMfcValue, 6)} USDC`);
            console.log(`新总供应量: ${ethers.formatEther(newTotalSupply)} MFC`);
            
            // 7. 测试赎回功能
            console.log("\n🔄 测试赎回功能...");
            
            const investor1Shares = await shareToken.balanceOf(investor1.address);
            if (investor1Shares > 0) {
                const redeemAmount = investor1Shares / 2n; // 赎回一半
                
                console.log(`赎回前 - 投资者1 USDC余额: ${ethers.formatUnits(await usdc.balanceOf(investor1.address), 6)}`);
                console.log(`赎回前 - 投资者1 MFC余额: ${ethers.formatEther(await shareToken.balanceOf(investor1.address))}`);
                console.log(`准备赎回: ${ethers.formatEther(redeemAmount)} MFC`);
                
                // 计算预期赎回价值
                const currentMFCValue = await mockFund.calculateMFCValue();
                const redeemValue = (redeemAmount * currentMFCValue) / ethers.parseEther("1");
                const redemptionFee = (redeemValue * managementFeeRate) / 10000n;
                const netRedeemValue = redeemValue - redemptionFee;
                
                console.log(`预期赎回总价值: ${ethers.formatUnits(redeemValue, 6)} USDC`);
                console.log(`预期赎回手续费: ${ethers.formatUnits(redemptionFee, 6)} USDC`);
                console.log(`预期净赎回金额: ${ethers.formatUnits(netRedeemValue, 6)} USDC`);
                
                // 执行赎回
                await shareToken.connect(investor1).approve(await mockFund.getAddress(), redeemAmount);
                await mockFund.connect(investor1).redeem(redeemAmount);
                
                console.log(`赎回后 - 投资者1 USDC余额: ${ethers.formatUnits(await usdc.balanceOf(investor1.address), 6)}`);
                console.log(`赎回后 - 投资者1 MFC余额: ${ethers.formatEther(await shareToken.balanceOf(investor1.address))}`);
            }
        } else {
            console.log(`\n⚠️ 投资者1 USDC余额不足 (${ethers.formatUnits(investorUSDCBalance, 6)}), 跳过投资测试`);
            console.log("请从水龙头获取测试USDC: https://faucets.chain.link/sepolia");
        }
        
        // 8. 测试管理费提取功能
        console.log(`\n🏦 测试管理费提取功能...`);
        
        const finalWithdrawableManagementFees = await mockFund.getWithdrawableManagementFees();
        
        if (finalWithdrawableManagementFees > 0) {
            console.log(`提取前 - 部署者USDC余额: ${ethers.formatUnits(await usdc.balanceOf(deployer.address), 6)}`);
            console.log(`提取前 - 可提取管理费: ${ethers.formatUnits(finalWithdrawableManagementFees, 6)} USDC`);
            
            // 执行管理费提取
            await mockFund.withdrawAllManagementFees();
            
            console.log(`提取后 - 部署者USDC余额: ${ethers.formatUnits(await usdc.balanceOf(deployer.address), 6)}`);
            console.log(`提取后 - 可提取管理费: ${ethers.formatUnits(await mockFund.getWithdrawableManagementFees(), 6)} USDC`);
            console.log(`✅ 管理费提取成功`);
        } else {
            console.log(`⚠️ 当前没有可提取的管理费`);
        }
        
        // 9. 最终状态检查
        console.log("\n📊 最终基金状态...");
        const finalNav = await mockFund.calculateNAV();
        const finalMfcValue = await mockFund.calculateMFCValue();
        const finalTotalSupply = await shareToken.totalSupply();
        const finalTotalFees = await mockFund.totalManagementFeesCollected();
        
        console.log(`最终基金NAV: ${ethers.formatUnits(finalNav, 6)} USDC`);
        console.log(`最终单个MFC价值: ${ethers.formatUnits(finalMfcValue, 6)} USDC`);
        console.log(`最终总供应量: ${ethers.formatEther(finalTotalSupply)} MFC`);
        console.log(`最终累计管理费: ${ethers.formatUnits(finalTotalFees, 6)} USDC`);
        
        // 10. 保存测试结果
        const testResults = {
            network: "sepolia",
            testTime: new Date().toISOString(),
            contracts: deploymentInfo.contracts,
            finalState: {
                nav: ethers.formatUnits(finalNav, 6),
                mfcValue: ethers.formatUnits(finalMfcValue, 6),
                totalSupply: ethers.formatEther(finalTotalSupply),
                totalFeesCollected: ethers.formatUnits(finalTotalFees, 6),
                withdrawableManagementFees: ethers.formatUnits(await mockFund.getWithdrawableManagementFees(), 6)
            },
            balances: {
                deployer: {
                    usdc: ethers.formatUnits(await usdc.balanceOf(deployer.address), 6),
                    mfc: ethers.formatEther(await shareToken.balanceOf(deployer.address))
                },
                investor1: {
                    usdc: ethers.formatUnits(await usdc.balanceOf(investor1.address), 6),
                    mfc: ethers.formatEther(await shareToken.balanceOf(investor1.address))
                }
            }
        };
        
        const testResultsPath = path.join(__dirname, "..", "sepolia-test-results.json");
        fs.writeFileSync(testResultsPath, JSON.stringify(testResults, null, 2));
        console.log(`\n💾 测试结果已保存到: ${testResultsPath}`);
        
        console.log("\n🎉 Sepolia测试网测试完成！");
        
    } catch (error) {
        console.error("❌ 测试失败:", error);
        throw error;
    }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    process.exit(1);
});

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main;