const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("开始部署 FixedRateMockFund 合约...");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署者地址:", deployer.address);
    console.log("部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // 读取现有的部署地址
    const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia.json");
    let deployments = {};
    
    if (fs.existsSync(deploymentPath)) {
        deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
        console.log("已加载现有部署地址");
    }
    
    // 检查必需的合约地址
    const requiredContracts = {
        MockUSDC: deployments.contracts?.MockUSDC,
        MockWETH: deployments.contracts?.tokens?.WETH,
        MockWBTC: deployments.contracts?.tokens?.WBTC,
        MockLINK: deployments.contracts?.tokens?.LINK,
        MockDAI: deployments.contracts?.tokens?.DAI,
        ChainlinkPriceOracle: deployments.contracts?.ChainlinkPriceOracle
    };
    
    for (const [contractName, address] of Object.entries(requiredContracts)) {
        if (!address) {
            throw new Error(`缺少必需的合约地址: ${contractName}`);
        }
    }
    
    console.log("\n=== 部署 FixedRateUniswapIntegration ===");
    
    // 部署 FixedRateUniswapIntegration
    const FixedRateUniswapIntegration = await ethers.getContractFactory("FixedRateUniswapIntegration");
    const uniswapIntegration = await FixedRateUniswapIntegration.deploy(
        deployer.address,           // Initial owner
        requiredContracts.ChainlinkPriceOracle  // Price oracle
    );
    
    console.log("等待 FixedRateUniswapIntegration 部署确认...");
    await uniswapIntegration.waitForDeployment();
    const uniswapIntegrationAddress = await uniswapIntegration.getAddress();
    console.log("FixedRateUniswapIntegration 部署地址:", uniswapIntegrationAddress);
    
    // 初始化固定汇率
    console.log("\n=== 初始化固定汇率 ===");
    const initTx = await uniswapIntegration.initializeFixedRates(
        requiredContracts.MockWETH,
        requiredContracts.MockWBTC,
        requiredContracts.MockLINK,
        requiredContracts.MockDAI
    );
    await initTx.wait();
    console.log("固定汇率初始化完成");
    
    // 验证固定汇率设置
    console.log("\n=== 验证固定汇率 ===");
    const wethRate = await uniswapIntegration.getFixedRate(requiredContracts.MockWETH);
    const wbtcRate = await uniswapIntegration.getFixedRate(requiredContracts.MockWBTC);
    const linkRate = await uniswapIntegration.getFixedRate(requiredContracts.MockLINK);
    const daiRate = await uniswapIntegration.getFixedRate(requiredContracts.MockDAI);
    
    console.log(`WETH 固定汇率: ${ethers.formatUnits(wethRate, 6)} USDC/WETH`);
    console.log(`WBTC 固定汇率: ${ethers.formatUnits(wbtcRate, 6)} USDC/WBTC`);
    console.log(`LINK 固定汇率: ${ethers.formatUnits(linkRate, 6)} USDC/LINK`);
    console.log(`DAI 固定汇率: ${ethers.formatUnits(daiRate, 6)} USDC/DAI`);
    
    console.log("\n=== 部署 FixedRateMockFund ===");
    
    // 部署 FixedRateMockFund
    const FixedRateMockFund = await ethers.getContractFactory("FixedRateMockFund");
    const fund = await FixedRateMockFund.deploy(
        "Mock Fund Coin",           // Share token name
        "MFC",                      // Share token symbol
        deployer.address,           // Initial owner
        ethers.toBigInt(100),       // Management fee rate (1%)
        requiredContracts.ChainlinkPriceOracle,
        uniswapIntegrationAddress
    );
    
    console.log("等待合约部署确认...");
    await fund.waitForDeployment();
    const fundAddress = await fund.getAddress();
    console.log("FixedRateMockFund 部署地址:", fundAddress);
    
    // 获取 ShareToken 地址
    const shareTokenAddress = await fund.shareToken();
    console.log("FundShareToken 地址:", shareTokenAddress);
    
    console.log("\n=== 配置基金 ===");
    
    // 设置 USDC 地址
    const setUSDCTx = await fund.setUSDCToken(requiredContracts.MockUSDC);
    await setUSDCTx.wait();
    console.log("USDC 地址设置完成");
    
    // 添加支持的代币
    const supportedTokens = [
        { address: requiredContracts.MockWETH, name: "WETH" },
        { address: requiredContracts.MockWBTC, name: "WBTC" },
        { address: requiredContracts.MockLINK, name: "LINK" },
        { address: requiredContracts.MockDAI, name: "DAI" }
    ];
    
    for (const token of supportedTokens) {
        const addTokenTx = await fund.addSupportedToken(token.address, 1250); // 12.5% each
        await addTokenTx.wait();
        console.log(`${token.name} 代币添加完成`);
    }
    
    console.log("\n=== 准备初始化基金 ===");
    
    // 获取 USDC 合约
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = MockUSDC.attach(requiredContracts.MockUSDC);
    
    // 检查部署者的 USDC 余额
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log(`部署者 USDC 余额: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
    
    const requiredUSDC = ethers.parseUnits("1000000", 6); // 1 million USDC
    
    if (usdcBalance < requiredUSDC) {
        console.log("USDC 余额不足，正在获取测试代币...");
        try {
            // 使用 getLargeAmount 多次获取 USDC (每次100,000)
            const largeAmount = ethers.parseUnits("100000", 6); // 100,000 USDC
            const timesNeeded = Math.ceil(Number(ethers.formatUnits(requiredUSDC, 6)) / 100000);
            
            console.log(`需要调用 ${timesNeeded} 次 getLargeAmount 来获取足够的 USDC`);
            
            for (let i = 0; i < timesNeeded; i++) {
                console.log(`第 ${i + 1}/${timesNeeded} 次获取 USDC...`);
                const getLargeTx = await usdc.getLargeAmount({
                    gasLimit: 100000,
                    gasPrice: ethers.parseUnits("20", "gwei")
                });
                await getLargeTx.wait();
            }
            
            // 重新检查余额
            const newBalance = await usdc.balanceOf(deployer.address);
            console.log(`获取完成，当前余额: ${ethers.formatUnits(newBalance, 6)} USDC`);
            
            if (newBalance < requiredUSDC) {
                console.log(`余额仍不足，调整所需金额为: ${ethers.formatUnits(newBalance, 6)} USDC`);
                requiredUSDC = newBalance;
            }
        } catch (error) {
            console.log("获取USDC失败:", error.message);
            if (usdcBalance === 0n) {
                throw new Error("没有USDC余额且获取失败");
            }
            console.log(`使用现有余额: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
            requiredUSDC = usdcBalance;
        }
    }
    
    // 授权基金合约使用 USDC
    console.log("授权基金合约使用 USDC...");
    const approveTx = await usdc.approve(fundAddress, requiredUSDC);
    await approveTx.wait();
    console.log("USDC 授权完成");
    
    // 初始化基金
    console.log("\n=== 初始化基金 ===");
    console.log("基金总额: 1,000,000 USDC");
    console.log("USDC 保留: 500,000 USDC (50%)");
    console.log("代币购买: 500,000 USDC (50%)");
    console.log("每种代币分配: 125,000 USDC");
    console.log("");
    console.log("预期代币数量:");
    console.log(`- WETH: ${125000 / 3000} = ${(125000 / 3000).toFixed(6)} WETH`);
    console.log(`- WBTC: ${125000 / 118000} = ${(125000 / 118000).toFixed(8)} WBTC`);
    console.log(`- LINK: ${125000 / 15} = ${(125000 / 15).toFixed(6)} LINK`);
    console.log(`- DAI: ${125000 / 1} = ${(125000 / 1).toFixed(6)} DAI`);
    console.log("");
    
    const initFundTx = await fund.initializeFund(requiredUSDC);
    await initFundTx.wait();
    console.log("基金初始化完成！");
    
    // 验证基金状态
    console.log("\n=== 验证基金状态 ===");
    const [totalSupply, initialSupply, isInitialized] = await fund.getFundStats();
    console.log(`MFC 总供应量: ${ethers.formatEther(totalSupply)} MFC`);
    console.log(`初始供应量: ${ethers.formatEther(initialSupply)} MFC`);
    console.log(`是否已初始化: ${isInitialized}`);
    
    // 获取 MFC 组成
    const [tokens, ratios, usdcAmount] = await fund.getMFCComposition();
    console.log("\n=== MFC 组成 ===");
    console.log(`每份 MFC 包含 USDC: ${ethers.formatUnits(usdcAmount, 18)} (scaled)`);
    
    for (let i = 0; i < tokens.length; i++) {
        const tokenName = supportedTokens.find(t => t.address === tokens[i])?.name || "Unknown";
        console.log(`每份 MFC 包含 ${tokenName}: ${ethers.formatUnits(ratios[i], 18)} (scaled)`);
    }
    
    // 计算 MFC 价值
    const nav = await fund.calculateNAV();
    const mfcValue = await fund.calculateMFCValue();
    const theoreticalValue = await fund.calculateTheoreticalMFCValue();
    
    console.log("\n=== 基金价值 ===");
    console.log(`基金 NAV: ${ethers.formatUnits(nav, 6)} USDC`);
    console.log(`单份 MFC 价值: ${ethers.formatUnits(mfcValue, 6)} USDC`);
    console.log(`理论 MFC 价值: ${ethers.formatUnits(theoreticalValue, 6)} USDC`);
    
    // 获取基金代币余额
    const [balanceTokens, balances, decimals] = await fund.getFundTokenBalances();
    console.log("\n=== 基金代币余额 ===");
    for (let i = 0; i < balanceTokens.length; i++) {
        const tokenName = i === 0 ? "USDC" : supportedTokens.find(t => t.address === balanceTokens[i])?.name || "Unknown";
        console.log(`${tokenName}: ${ethers.formatUnits(balances[i], decimals[i])}`);
    }
    
    // 保存部署地址
    if (!deployments.contracts) deployments.contracts = {};
    deployments.contracts.FixedRateUniswapIntegration = uniswapIntegrationAddress;
    deployments.contracts.FixedRateMockFund = fundAddress;
    deployments.contracts.FixedRateFundShareToken = shareTokenAddress;
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
    console.log("\n部署地址已保存到:", deploymentPath);
    
    console.log("\n=== 部署完成 ===");
    console.log("FixedRateUniswapIntegration:", uniswapIntegrationAddress);
    console.log("FixedRateMockFund:", fundAddress);
    console.log("FundShareToken:", shareTokenAddress);
    
    console.log("\n=== 固定汇率设置 ===");
    console.log("USDC/ETH = 3000");
    console.log("USDC/BTC = 118000");
    console.log("USDC/LINK = 15");
    console.log("USDC/DAI = 1");
    
    console.log("\n基金已成功初始化，包含 1,000,000 份 MFC，每份价值约 1 USDC");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署失败:", error);
        process.exit(1);
    });