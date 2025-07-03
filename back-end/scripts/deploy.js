const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 开始部署 Mock Fund 智能合约...");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("📝 部署者地址:", deployer.address);
    console.log("💰 部署者余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    
    const deployedContracts = {};
    
    try {
        // 1. 部署模拟代币
        console.log("\n🪙 部署模拟代币...");
        
        // 部署USDC
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        const mockUSDC = await MockUSDC.deploy(deployer.address);
        await mockUSDC.waitForDeployment();
        const usdcAddress = await mockUSDC.getAddress();
        console.log("✅ USDC 部署成功:", usdcAddress);
        
        // 部署WETH
        const MockWETH = await ethers.getContractFactory("MockWETH");
        const mockWETH = await MockWETH.deploy(deployer.address);
        await mockWETH.waitForDeployment();
        const wethAddress = await mockWETH.getAddress();
        console.log("✅ WETH 部署成功:", wethAddress);
        
        // 部署WBTC
        const MockWBTC = await ethers.getContractFactory("MockWBTC");
        const mockWBTC = await MockWBTC.deploy(deployer.address);
        await mockWBTC.waitForDeployment();
        const wbtcAddress = await mockWBTC.getAddress();
        console.log("✅ WBTC 部署成功:", wbtcAddress);
        
        // 部署LINK
        const MockLINK = await ethers.getContractFactory("MockLINK");
        const mockLINK = await MockLINK.deploy(deployer.address);
        await mockLINK.waitForDeployment();
        const linkAddress = await mockLINK.getAddress();
        console.log("✅ LINK 部署成功:", linkAddress);
        
        // 部署UNI
        const MockUNI = await ethers.getContractFactory("MockUNI");
        const mockUNI = await MockUNI.deploy(deployer.address);
        await mockUNI.waitForDeployment();
        const uniAddress = await mockUNI.getAddress();
        console.log("✅ UNI 部署成功:", uniAddress);
        
        // 2. 部署代币工厂合约
        console.log("\n📦 部署代币工厂合约...");
        const TokenFactory = await ethers.getContractFactory("TokenFactory");
        const tokenFactory = await TokenFactory.deploy(deployer.address);
        await tokenFactory.waitForDeployment();
        const tokenFactoryAddress = await tokenFactory.getAddress();
        deployedContracts.TokenFactory = tokenFactoryAddress;
        console.log("✅ TokenFactory 部署成功:", tokenFactoryAddress);
        
        // 3. 注册代币到工厂合约
        console.log("\n🔧 注册代币到工厂合约...");
        await tokenFactory.registerToken("USDC", usdcAddress);
        await tokenFactory.registerToken("WETH", wethAddress);
        await tokenFactory.registerToken("WBTC", wbtcAddress);
        await tokenFactory.registerToken("LINK", linkAddress);
        await tokenFactory.registerToken("UNI", uniAddress);
        console.log("✅ 所有代币注册完成");
        
        deployedContracts.MockUSDC = usdcAddress;
        deployedContracts.MockWETH = wethAddress;
        deployedContracts.MockWBTC = wbtcAddress;
        deployedContracts.MockLINK = linkAddress;
        deployedContracts.MockUNI = uniAddress;
        
        console.log("📍 代币地址:");
        console.log("   USDC:", usdcAddress);
        console.log("   WETH:", wethAddress);
        console.log("   WBTC:", wbtcAddress);
        console.log("   LINK:", linkAddress);
        console.log("   UNI:", uniAddress);
        
        // 3. 部署基金合约
        console.log("\n🏦 部署基金合约...");
        const MockFund = await ethers.getContractFactory("MockFund");
        const mockFund = await MockFund.deploy(
            "Mock Fund Shares",  // 份额代币名称
            "MFS",              // 份额代币符号
            deployer.address,    // 初始所有者
            200                  // 管理费率 2%
        );
        await mockFund.waitForDeployment();
        const mockFundAddress = await mockFund.getAddress();
        deployedContracts.MockFund = mockFundAddress;
        console.log("✅ MockFund 部署成功:", mockFundAddress);
        
        // 获取份额代币地址
        const shareTokenAddress = await mockFund.shareToken();
        deployedContracts.FundShareToken = shareTokenAddress;
        console.log("✅ FundShareToken 地址:", shareTokenAddress);
        
        // 4. 配置基金支持的代币
        console.log("\n⚙️ 配置基金投资组合...");
        
        // 添加支持的代币和目标分配
        const tokens = [
            { address: wethAddress, allocation: 4000, name: "WETH" }, // 40%
            { address: wbtcAddress, allocation: 3000, name: "WBTC" }, // 30%
            { address: linkAddress, allocation: 2000, name: "LINK" }, // 20%
            { address: uniAddress, allocation: 1000, name: "UNI" }    // 10%
        ];
        
        for (const token of tokens) {
            const tx = await mockFund.addSupportedToken(token.address, token.allocation);
            await tx.wait();
            console.log(`✅ 添加 ${token.name}: ${token.allocation/100}% 分配`);
        }
        
        // 5. 设置MockFund合约中的USDC地址
        console.log("\n🔧 设置USDC代币地址...");
        const setUSDCTx = await mockFund.setUSDCToken(usdcAddress);
        await setUSDCTx.wait();
        console.log("✅ USDC代币地址设置成功:", usdcAddress);
        
        // 6. 验证部署
        console.log("\n🔍 验证部署结果...");
        const fundStats = await mockFund.getFundStats();
        console.log("📊 基金统计:");
        console.log("   总资产:", ethers.formatUnits(fundStats[0], 6), "USDC");
        console.log("   总份额:", ethers.formatEther(fundStats[1]));
        console.log("   当前NAV:", ethers.formatUnits(fundStats[2], 6), "USDC");
        
        const supportedTokens = await mockFund.getSupportedTokens();
        console.log("🎯 支持的投资代币数量:", supportedTokens.length);
        
        // 7. 保存部署信息
        const deploymentInfo = {
            network: await ethers.provider.getNetwork(),
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: deployedContracts,
            gasUsed: {
                // 这里可以记录各个合约的gas使用情况
            }
        };
        
        // 保存到文件
        const deploymentsDir = path.join(__dirname, "..", "deployments");
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir, { recursive: true });
        }
        
        const networkName = (await ethers.provider.getNetwork()).name || "unknown";
        const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n💾 部署信息已保存到:", deploymentFile);
        
        // 8. 输出前端需要的合约地址
        console.log("\n📋 前端配置信息:");
        console.log("```javascript");
        console.log("export const CONTRACT_ADDRESSES = {");
        console.log(`  MOCK_FUND: "${mockFundAddress}",`);
        console.log(`  FUND_SHARE_TOKEN: "${shareTokenAddress}",`);
        console.log(`  MOCK_USDC: "${usdcAddress}",`);
        console.log(`  MOCK_WETH: "${wethAddress}",`);
        console.log(`  MOCK_WBTC: "${wbtcAddress}",`);
        console.log(`  MOCK_LINK: "${linkAddress}",`);
        console.log(`  MOCK_UNI: "${uniAddress}",`);
        console.log(`  TOKEN_FACTORY: "${tokenFactoryAddress}"`);
        console.log("};\n");
        console.log(`export const NETWORK_ID = ${(await ethers.provider.getNetwork()).chainId};`);
        console.log("```");
        
        console.log("\n🎉 所有合约部署完成!");
        console.log("\n📝 下一步:");
        console.log("1. 复制上面的合约地址到前端配置文件");
        console.log("2. 在测试网上获取一些测试代币");
        console.log("3. 测试基金的投资和赎回功能");
        console.log("4. 验证合约在区块链浏览器上");
        
    } catch (error) {
        console.error("❌ 部署失败:", error);
        process.exit(1);
    }
}

// 错误处理
process.on('unhandledRejection', (error) => {
    console.error('未处理的Promise拒绝:', error);
    process.exit(1);
});

// 执行部署
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main };