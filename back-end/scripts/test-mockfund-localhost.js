const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 开始测试MockFund合约的投资和赎回功能...");
    
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    console.log(`网络: ${network.name} (chainId: ${network.chainId})`);
    
    // 获取签名者
    const [deployer, investor1, investor2] = await ethers.getSigners();
    console.log(`部署者: ${deployer.address}`);
    console.log(`投资者1: ${investor1.address}`);
    console.log(`投资者2: ${investor2.address}`);
    
    try {
        // 1. 部署Mock代币
        console.log("\n📦 部署Mock代币...");
        
        // 部署USDC
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        const mockUSDC = await MockUSDC.deploy(deployer.address);
        await mockUSDC.waitForDeployment();
        const usdcAddress = await mockUSDC.getAddress();
        console.log("✅ USDC部署成功:", usdcAddress);
        
        // 部署WETH
        const MockWETH = await ethers.getContractFactory("MockWETH");
        const mockWETH = await MockWETH.deploy(deployer.address);
        await mockWETH.waitForDeployment();
        const wethAddress = await mockWETH.getAddress();
        console.log("✅ WETH部署成功:", wethAddress);
        
        // 部署WBTC
        const MockWBTC = await ethers.getContractFactory("MockWBTC");
        const mockWBTC = await MockWBTC.deploy(deployer.address);
        await mockWBTC.waitForDeployment();
        const wbtcAddress = await mockWBTC.getAddress();
        console.log("✅ WBTC部署成功:", wbtcAddress);
        
        // 部署LINK
        const MockLINK = await ethers.getContractFactory("MockLINK");
        const mockLINK = await MockLINK.deploy(deployer.address);
        await mockLINK.waitForDeployment();
        const linkAddress = await mockLINK.getAddress();
        console.log("✅ LINK部署成功:", linkAddress);
        
        // 部署DAI
        const MockDAI = await ethers.getContractFactory("MockDAI");
        const mockDAI = await MockDAI.deploy(deployer.address);
        await mockDAI.waitForDeployment();
        const daiAddress = await mockDAI.getAddress();
        console.log("✅ DAI部署成功:", daiAddress);
        
        console.log(`USDC: ${usdcAddress}`);
        console.log(`WETH: ${wethAddress}`);
        console.log(`WBTC: ${wbtcAddress}`);
        console.log(`LINK: ${linkAddress}`);
        console.log(`DAI: ${daiAddress}`);
        
        // 部署PriceOracle
        console.log("📦 部署PriceOracle...");
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        const priceOracle = await PriceOracle.deploy(deployer.address);
        await priceOracle.waitForDeployment();
        console.log(`✅ PriceOracle部署成功: ${await priceOracle.getAddress()}`);
        
        // 部署UniswapIntegration
        console.log("📦 部署UniswapIntegration...");
        const UniswapIntegration = await ethers.getContractFactory("contracts/UniswapIntegration.sol:UniswapIntegration");
        const uniswapIntegration = await UniswapIntegration.deploy(deployer.address, await priceOracle.getAddress());
        await uniswapIntegration.waitForDeployment();
        console.log(`✅ UniswapIntegration部署成功: ${await uniswapIntegration.getAddress()}`);
        
        // ⚙️ 设置固定汇率...
        console.log("⚙️ 设置固定汇率...");
        // 设置各代币的固定汇率 (USDC per token, scaled by 1e6)
        await uniswapIntegration.setFixedRate(usdcAddress, ethers.parseUnits("1", 6)); // 1 USDC per USDC
        await uniswapIntegration.setFixedRate(wethAddress, ethers.parseUnits("3000", 6)); // 3000 USDC per ETH
        await uniswapIntegration.setFixedRate(wbtcAddress, ethers.parseUnits("115000", 6)); // 115000 USDC per BTC
        await uniswapIntegration.setFixedRate(linkAddress, ethers.parseUnits("15", 6)); // 15 USDC per LINK
        await uniswapIntegration.setFixedRate(daiAddress, ethers.parseUnits("1", 6)); // 1 USDC per DAI
        console.log("✅ 固定汇率设置完成");
        
        // 为UniswapIntegration合约铸造代币用于交换
        console.log("💰 为UniswapIntegration铸造代币...");
        const uniswapAddress = await uniswapIntegration.getAddress();
        await mockWETH.mint(uniswapAddress, ethers.parseEther("1000")); // 1000 WETH
        await mockWBTC.mint(uniswapAddress, ethers.parseUnits("50", 8)); // 50 WBTC (8 decimals)
        await mockLINK.mint(uniswapAddress, ethers.parseEther("100000")); // 100000 LINK
        await mockDAI.mint(uniswapAddress, ethers.parseEther("1000000")); // 1000000 DAI
        console.log("✅ UniswapIntegration代币铸造完成");
        
        // 部署MockFund
        console.log("📦 部署MockFund...");
        const MockFund = await ethers.getContractFactory("contracts/MockFund.sol:MockFund");
        const mockFund = await MockFund.deploy(
            "Mock Fund Coin",
            "MFC",
            deployer.address,
            100, // 1% management fee
            await priceOracle.getAddress(),
            await uniswapIntegration.getAddress()
        );
        await mockFund.waitForDeployment();
        console.log(`✅ MockFund部署成功: ${await mockFund.getAddress()}`);
        
        // 6. 设置支持的代币和权重 (总权重应为10000 = 100%)
        // 配置：50% USDC保留不动，剩余50%分配给4种代币，每种12.5%
        console.log("\n⚙️ 设置支持的代币和权重...");
        await mockFund.addSupportedToken(wethAddress, 1250); // 12.5%
        await mockFund.addSupportedToken(wbtcAddress, 1250); // 12.5%
        await mockFund.addSupportedToken(linkAddress, 1250); // 12.5%
        await mockFund.addSupportedToken(daiAddress, 1250); // 12.5%
        // 注意：剩余50%的USDC将保留在基金中不进行投资
        console.log("✅ 支持的代币设置完成");
        
        // 7. 设置USDC地址
        await mockFund.setUSDCToken(usdcAddress);
        console.log(`✅ USDC地址设置完成: ${usdcAddress}`);
        
        // 8. 配置价格预言机
        console.log("\n🔮 配置价格预言机...");
        
        // 部署MockPriceFeed合约用于模拟价格
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        
        // 为每个代币部署价格feed
        const usdcPriceFeed = await MockPriceFeed.deploy(100000000, 8, "USDC/USD"); // $1.00
        await usdcPriceFeed.waitForDeployment();
        
        const ethPriceFeed = await MockPriceFeed.deploy(300000000000, 8, "ETH/USD"); // $3000.00
        await ethPriceFeed.waitForDeployment();
        
        const btcPriceFeed = await MockPriceFeed.deploy(11500000000000, 8, "BTC/USD"); // $115000.00
        await btcPriceFeed.waitForDeployment();
        
        const linkPriceFeed = await MockPriceFeed.deploy(1500000000, 8, "LINK/USD"); // $15.00
        await linkPriceFeed.waitForDeployment();
        
        const daiPriceFeed = await MockPriceFeed.deploy(100000000, 8, "DAI/USD"); // $1.00
        await daiPriceFeed.waitForDeployment();
        
        // 设置价格feed
        await priceOracle.setPriceFeed(usdcAddress, await usdcPriceFeed.getAddress());
        await priceOracle.setPriceFeed(wethAddress, await ethPriceFeed.getAddress());
        await priceOracle.setPriceFeed(wbtcAddress, await btcPriceFeed.getAddress());
        await priceOracle.setPriceFeed(linkAddress, await linkPriceFeed.getAddress());
        await priceOracle.setPriceFeed(daiAddress, await daiPriceFeed.getAddress());
        
        console.log("✅ 价格预言机配置完成");
        
        // 9. 启用固定汇率模式进行初始化
        console.log("\n⚙️ 启用固定汇率模式...");
        await uniswapIntegration.setFixedRateMode(true);
        
        // 10. 为部署者铸造初始USDC
        console.log("\n💰 为部署者铸造初始USDC...");
        const usdc = await ethers.getContractAt("MockUSDC", usdcAddress);
        const initialUSDC = ethers.parseUnits("1000000", 6); // 1M USDC
        await usdc.mint(deployer.address, initialUSDC);
        console.log(`✅ 铸造了 ${ethers.formatUnits(initialUSDC, 6)} USDC`);
        
        // 11. 批准MockFund使用USDC
        console.log("\n✅ 批准MockFund使用USDC...");
        await usdc.approve(await mockFund.getAddress(), initialUSDC);
        
        // 12. 初始化基金
        console.log("\n🏗️ 初始化基金...");
        await mockFund.initializeFund(initialUSDC);
        console.log("✅ 基金初始化完成");
        
        // 13. 禁用固定汇率模式
        console.log("\n⚙️ 禁用固定汇率模式...");
        await uniswapIntegration.setFixedRateMode(false);
        
        // 14. 检查基金状态
        console.log("\n📊 检查基金初始状态...");
        const shareToken = await ethers.getContractAt("FundShareToken", await mockFund.shareToken());
        const totalSupply = await shareToken.totalSupply();
        const deployerShares = await shareToken.balanceOf(deployer.address);
        const nav = await mockFund.calculateNAV();
        const mfcValue = await mockFund.calculateMFCValue();
        
        console.log(`总供应量: ${ethers.formatEther(totalSupply)} MFC`);
        console.log(`合约持有: ${ethers.formatEther(await shareToken.balanceOf(await mockFund.getAddress()))} MFC`);
        console.log(`部署者持有: ${ethers.formatEther(deployerShares)} MFC`);
        console.log(`基金NAV: ${ethers.formatUnits(nav, 6)} USDC`);
        console.log(`单个MFC价值: ${ethers.formatUnits(mfcValue, 6)} USDC`);
        
        // 显示管理费信息
        const managementFeeRate = await mockFund.managementFeeRate();
        const totalManagementFeesCollected = await mockFund.totalManagementFeesCollected();
        const lastFeeCollection = await mockFund.lastFeeCollection();
        console.log(`\n💰 管理费信息:`);
        console.log(`管理费率: ${Number(managementFeeRate) / 100}% (${managementFeeRate} basis points)`);
        console.log(`累计管理费: ${ethers.formatUnits(totalManagementFeesCollected, 6)} USDC`);
        console.log(`上次收费时间: ${new Date(Number(lastFeeCollection) * 1000).toLocaleString()}`);
        
        // 显示MFC组成
        console.log(`\n📊 MFC组成详情:`);
        const composition = await mockFund.getMFCComposition();
        console.log(`每份MFC包含的USDC: ${ethers.formatUnits(composition.usdcAmount, 6)} USDC`);
        
        // 显示每种代币的详细价值计算
        console.log(`\n💰 代币价值计算详情:`);
        let totalTokenValue = 0;
        for (let i = 0; i < composition.tokens.length; i++) {
            const tokenAddress = composition.tokens[i];
            const ratio = composition.ratios[i];
            let tokenSymbol = "Unknown";
            if (tokenAddress === wethAddress) tokenSymbol = "WETH";
            else if (tokenAddress === wbtcAddress) tokenSymbol = "WBTC";
            else if (tokenAddress === linkAddress) tokenSymbol = "LINK";
            else if (tokenAddress === daiAddress) tokenSymbol = "DAI";
            
            // 获取代币价格
            const [tokenPrice, ] = await priceOracle.getLatestPrice(tokenAddress);
            const token = await ethers.getContractAt("MockUSDC", tokenAddress);
            const tokenBalance = await token.balanceOf(await mockFund.getAddress());
            
            // 获取代币小数位数
            let tokenDecimals = 18;
            if (tokenSymbol === "WBTC") tokenDecimals = 8;
            else if (tokenSymbol === "USDC") tokenDecimals = 6;
            
            console.log(`${tokenSymbol}:`);
            console.log(`  - 每份MFC包含: ${ethers.formatEther(ratio)} tokens`);
            console.log(`  - 当前价格: ${ethers.formatUnits(tokenPrice, 8)} USDC`);
            console.log(`  - 合约余额: ${ethers.formatUnits(tokenBalance, tokenDecimals)} ${tokenSymbol}`);
            
            // 计算单个MFC中该代币的价值
            const tokenValuePerMFC = (ratio * tokenPrice) / (10n ** 8n); // ratio是18位小数，price是8位小数
            const tokenValueInUSDC = ethers.formatUnits(tokenValuePerMFC, 18);
            console.log(`  - 单个MFC中${tokenSymbol}价值: ${tokenValueInUSDC} USDC`);
            totalTokenValue += parseFloat(tokenValueInUSDC);
        }
        
        console.log(`\n📊 价值汇总:`);
        console.log(`USDC部分: ${ethers.formatUnits(composition.usdcAmount, 6)} USDC`);
        console.log(`代币部分总计: ${totalTokenValue.toFixed(6)} USDC`);
        console.log(`理论MFC价值: ${(parseFloat(ethers.formatUnits(composition.usdcAmount, 6)) + totalTokenValue).toFixed(6)} USDC`);
        
        // 15. 为投资者铸造USDC进行测试
        console.log("\n💰 为投资者铸造测试USDC...");
        const investAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
        await usdc.mint(investor1.address, investAmount);
        await usdc.mint(investor2.address, investAmount);
        console.log(`✅ 为每个投资者铸造了 ${ethers.formatUnits(investAmount, 6)} USDC`);
        
        // 16. 测试投资功能
        console.log("\n🔄 测试投资功能...");
        
        // 投资者1投资
        const investAmount1 = ethers.parseUnits("5000", 6); // 5,000 USDC
        await usdc.connect(investor1).approve(await mockFund.getAddress(), investAmount1);
        
        console.log(`投资前 - 投资者1 USDC余额: ${ethers.formatUnits(await usdc.balanceOf(investor1.address), 6)}`);
        console.log(`投资前 - 投资者1 MFC余额: ${ethers.formatEther(await shareToken.balanceOf(investor1.address))}`);
        
        await mockFund.connect(investor1).invest(investAmount1);
        
        console.log(`投资后 - 投资者1 USDC余额: ${ethers.formatUnits(await usdc.balanceOf(investor1.address), 6)}`);
        console.log(`投资后 - 投资者1 MFC余额: ${ethers.formatEther(await shareToken.balanceOf(investor1.address))}`);
        
        // 投资者2投资
        const investAmount2 = ethers.parseUnits("3000", 6); // 3,000 USDC
        await usdc.connect(investor2).approve(await mockFund.getAddress(), investAmount2);
        
        console.log(`\n投资前 - 投资者2 USDC余额: ${ethers.formatUnits(await usdc.balanceOf(investor2.address), 6)}`);
        console.log(`投资前 - 投资者2 MFC余额: ${ethers.formatEther(await shareToken.balanceOf(investor2.address))}`);
        
        await mockFund.connect(investor2).invest(investAmount2);
        
        console.log(`投资后 - 投资者2 USDC余额: ${ethers.formatUnits(await usdc.balanceOf(investor2.address), 6)}`);
        console.log(`投资后 - 投资者2 MFC余额: ${ethers.formatEther(await shareToken.balanceOf(investor2.address))}`);
        
        // 17. 检查投资后的基金状态
        console.log("\n📊 检查投资后的基金状态...");
        const newTotalSupply = await shareToken.totalSupply();
        const newNav = await mockFund.calculateNAV();
        const newMfcValue = await mockFund.calculateMFCValue();
        
        console.log(`新总供应量: ${ethers.formatEther(newTotalSupply)} MFC`);
        console.log(`新基金NAV: ${ethers.formatUnits(newNav, 6)} USDC`);
        console.log(`新单个MFC价值: ${ethers.formatUnits(newMfcValue, 6)} USDC`);
        
        // 显示投资后的管理费信息
        const totalFeesAfterInvest = await mockFund.totalManagementFeesCollected();
        const lastFeeAfterInvest = await mockFund.lastFeeCollection();
        console.log(`\n💰 投资后管理费信息:`);
        console.log(`累计管理费: ${ethers.formatUnits(totalFeesAfterInvest, 6)} USDC`);
        console.log(`上次收费时间: ${new Date(Number(lastFeeAfterInvest) * 1000).toLocaleString()}`);
        
        // 18. 测试赎回功能
        console.log("\n🔄 测试赎回功能...");
        
        // 投资者1部分赎回
        const investor1Shares = await shareToken.balanceOf(investor1.address);
        const redeemAmount1 = investor1Shares / 2n; // 赎回一半
        
        console.log(`赎回前 - 投资者1 USDC余额: ${ethers.formatUnits(await usdc.balanceOf(investor1.address), 6)}`);
        console.log(`赎回前 - 投资者1 MFC余额: ${ethers.formatEther(await shareToken.balanceOf(investor1.address))}`);
        console.log(`准备赎回: ${ethers.formatEther(redeemAmount1)} MFC`);
        
        // 计算预期赎回价值和手续费
        const currentMFCValue = await mockFund.calculateMFCValue();
        const redeemValue = (redeemAmount1 * currentMFCValue) / ethers.parseEther("1");
        const redemptionFee = (redeemValue * managementFeeRate) / 10000n;
        const netRedeemValue = redeemValue - redemptionFee;
        
        console.log(`预期赎回总价值: ${ethers.formatUnits(redeemValue, 6)} USDC`);
        console.log(`预期赎回手续费 (1%): ${ethers.formatUnits(redemptionFee, 6)} USDC`);
        console.log(`预期净赎回金额: ${ethers.formatUnits(netRedeemValue, 6)} USDC`);
        
        // 记录赎回前的管理费
        const feesBeforeRedeem = await mockFund.totalManagementFeesCollected();
        
        // 需要先批准合约转移MFC
        await shareToken.connect(investor1).approve(await mockFund.getAddress(), redeemAmount1);
        await mockFund.connect(investor1).redeem(redeemAmount1);
        
        console.log(`赎回后 - 投资者1 USDC余额: ${ethers.formatUnits(await usdc.balanceOf(investor1.address), 6)}`);
        console.log(`赎回后 - 投资者1 MFC余额: ${ethers.formatEther(await shareToken.balanceOf(investor1.address))}`);
        
        // 显示赎回后的管理费变化
        const feesAfterRedeem = await mockFund.totalManagementFeesCollected();
        const actualRedemptionFee = feesAfterRedeem - feesBeforeRedeem;
        console.log(`\n💰 赎回手续费信息:`);
        console.log(`实际收取的赎回手续费: ${ethers.formatUnits(actualRedemptionFee, 6)} USDC`);
        console.log(`累计管理费 (含赎回费): ${ethers.formatUnits(feesAfterRedeem, 6)} USDC`);
        
        // 19. 检查最终基金状态
        console.log("\n📊 检查最终基金状态...");
        const finalTotalSupply = await shareToken.totalSupply();
        const finalNav = await mockFund.calculateNAV();
        const finalMfcValue = await mockFund.calculateMFCValue();
        
        console.log(`最终总供应量: ${ethers.formatEther(finalTotalSupply)} MFC`);
        console.log(`最终基金NAV: ${ethers.formatUnits(finalNav, 6)} USDC`);
        console.log(`最终单个MFC价值: ${ethers.formatUnits(finalMfcValue, 6)} USDC`);
        
        // 显示最终管理费统计
        const finalTotalFees = await mockFund.totalManagementFeesCollected();
        const finalLastFeeCollection = await mockFund.lastFeeCollection();
        const withdrawableManagementFees = await mockFund.getWithdrawableManagementFees();
        console.log(`\n💰 最终管理费统计:`);
        console.log(`总累计管理费: ${ethers.formatUnits(finalTotalFees, 6)} USDC`);
        console.log(`可提取管理费余额: ${ethers.formatUnits(withdrawableManagementFees, 6)} USDC`);
        console.log(`管理费占初始NAV比例: ${(parseFloat(ethers.formatUnits(finalTotalFees, 6)) / parseFloat(ethers.formatUnits(nav, 6)) * 100).toFixed(4)}%`);
        console.log(`最后收费时间: ${new Date(Number(finalLastFeeCollection) * 1000).toLocaleString()}`);
        
        // 20. 测试管理费提取功能
        console.log(`\n🏦 测试管理费提取功能...`);
        
        if (withdrawableManagementFees > 0) {
            console.log(`提取前 - 部署者USDC余额: ${ethers.formatUnits(await usdc.balanceOf(deployer.address), 6)}`);
            console.log(`提取前 - 可提取管理费: ${ethers.formatUnits(withdrawableManagementFees, 6)} USDC`);
            
            // 执行管理费提取
            await mockFund.withdrawAllManagementFees();
            
            console.log(`提取后 - 部署者USDC余额: ${ethers.formatUnits(await usdc.balanceOf(deployer.address), 6)}`);
            console.log(`提取后 - 可提取管理费: ${ethers.formatUnits(await mockFund.getWithdrawableManagementFees(), 6)} USDC`);
            
            console.log(`✅ 管理费提取成功！`);
        } else {
            console.log(`⚠️ 当前没有可提取的管理费`);
        }
        
        // 21. 保存部署信息
        const deploymentInfo = {
            network: {
                name: network.name,
                chainId: network.chainId.toString(),
                deployedAt: new Date().toISOString()
            },
            deployer: deployer.address,
            contracts: {
                MockUSDC: usdcAddress,
                MockWETH: wethAddress,
                MockWBTC: wbtcAddress,
                MockLINK: linkAddress,
                MockDAI: daiAddress,
                PriceOracle: await priceOracle.getAddress(),
                UniswapIntegration: await uniswapIntegration.getAddress(),
                MockFund: await mockFund.getAddress(),
                FundShareToken: await mockFund.shareToken()
            },
            tokens: {
                USDC: usdcAddress,
                WETH: wethAddress,
                WBTC: wbtcAddress,
                LINK: linkAddress,
                DAI: daiAddress
            },
            testResults: {
                initialSupply: ethers.formatEther(totalSupply),
                finalSupply: ethers.formatEther(finalTotalSupply),
                initialNAV: ethers.formatUnits(nav, 6),
                finalNAV: ethers.formatUnits(finalNav, 6),
                investor1Investment: ethers.formatUnits(investAmount1, 6),
                investor2Investment: ethers.formatUnits(investAmount2, 6),
                investor1Redemption: ethers.formatEther(redeemAmount1),
                managementFees: {
                    feeRate: managementFeeRate.toString(),
                    totalFeesCollected: ethers.formatUnits(finalTotalFees, 6),
                    withdrawableManagementFees: ethers.formatUnits(withdrawableManagementFees, 6),
                    feePercentageOfInitialNAV: (parseFloat(ethers.formatUnits(finalTotalFees, 6)) / parseFloat(ethers.formatUnits(nav, 6)) * 100).toFixed(4),
                    lastFeeCollectionTime: new Date(Number(finalLastFeeCollection) * 1000).toISOString(),
                    managementFeeWithdrawn: withdrawableManagementFees > 0
                }
            }
        };
        
        const deploymentPath = path.join(__dirname, "..", "deployments", "localhost-mockfund-test.json");
        fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n💾 测试结果已保存到: ${deploymentPath}`);
        
        console.log("\n🎉 MockFund投资和赎回测试完成!");
        
        console.log("\n📋 测试总结:");
        console.log(`✅ 网络: ${network.name} (${network.chainId})`);
        console.log(`✅ MockFund合约: ${await mockFund.getAddress()}`);
        console.log(`✅ 初始基金规模: ${ethers.formatUnits(nav, 6)} USDC`);
        console.log(`✅ 投资测试: 两个投资者成功投资`);
        console.log(`✅ 赎回测试: 投资者1成功部分赎回`);
        console.log(`✅ 最终基金规模: ${ethers.formatUnits(finalNav, 6)} USDC`);
        
    } catch (error) {
        console.error("❌ 测试过程中发生错误:", error);
        throw error;
    }
}

// 运行测试
if (require.main === module) {
    main()
        .then(() => {
            console.log("✅ 脚本执行完成");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ 脚本执行失败:", error);
            process.exit(1);
        });
}

module.exports = main;