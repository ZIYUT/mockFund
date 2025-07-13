const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("调试投资失败问题...");
    
    // 读取部署配置
    const deploymentPath = path.join(__dirname, "../deployments/sepolia-deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const [deployer] = await ethers.getSigners();
    console.log("使用账户:", deployer.address);
    
    // 获取合约实例
    const mockFund = await ethers.getContractAt("contracts/MockFund.sol:MockFund", deployment.contracts.MockFund);
    const mockUSDC = await ethers.getContractAt("MockUSDC", deployment.tokens.USDC);
    const uniswapIntegration = await ethers.getContractAt("contracts/UniswapIntegration.sol:UniswapIntegration", deployment.contracts.UniswapIntegration);
    
    console.log("MockFund地址:", deployment.contracts.MockFund);
    console.log("UniswapIntegration地址:", deployment.contracts.UniswapIntegration);
    
    // 检查基金状态
    console.log("\n=== 基金状态检查 ===");
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
    }
    
    // 检查基金代币余额
    console.log("\n=== 基金代币余额检查 ===");
    try {
        const balances = await mockFund.getFundTokenBalances();
        for (let i = 0; i < balances.tokens.length; i++) {
            const tokenAddress = balances.tokens[i];
            const balance = balances.balances[i];
            const decimals = balances.decimals[i];
            
            let symbol = "Unknown";
            if (tokenAddress === deployment.tokens.USDC) symbol = "USDC";
            else if (tokenAddress === deployment.tokens.WETH) symbol = "WETH";
            else if (tokenAddress === deployment.tokens.WBTC) symbol = "WBTC";
            else if (tokenAddress === deployment.tokens.LINK) symbol = "LINK";
            else if (tokenAddress === deployment.tokens.DAI) symbol = "DAI";
            
            console.log(`${symbol}: ${ethers.formatUnits(balance, decimals)}`);
        }
    } catch (error) {
        console.log("检查基金余额失败:", error.message);
    }
    
    // 检查UniswapIntegration代币余额
    console.log("\n=== UniswapIntegration代币余额检查 ===");
    try {
        const mockWETH = await ethers.getContractAt("MockWETH", deployment.tokens.WETH);
        const mockWBTC = await ethers.getContractAt("MockWBTC", deployment.tokens.WBTC);
        const mockLINK = await ethers.getContractAt("MockLINK", deployment.tokens.LINK);
        const mockDAI = await ethers.getContractAt("MockDAI", deployment.tokens.DAI);
        
        const wethBalance = await mockWETH.balanceOf(deployment.contracts.UniswapIntegration);
        const wbtcBalance = await mockWBTC.balanceOf(deployment.contracts.UniswapIntegration);
        const linkBalance = await mockLINK.balanceOf(deployment.contracts.UniswapIntegration);
        const daiBalance = await mockDAI.balanceOf(deployment.contracts.UniswapIntegration);
        const usdcBalance = await mockUSDC.balanceOf(deployment.contracts.UniswapIntegration);
        
        console.log("UniswapIntegration WETH余额:", ethers.formatEther(wethBalance));
        console.log("UniswapIntegration WBTC余额:", ethers.formatUnits(wbtcBalance, 8));
        console.log("UniswapIntegration LINK余额:", ethers.formatEther(linkBalance));
        console.log("UniswapIntegration DAI余额:", ethers.formatEther(daiBalance));
        console.log("UniswapIntegration USDC余额:", ethers.formatUnits(usdcBalance, 6));
        
    } catch (error) {
        console.log("检查UniswapIntegration余额失败:", error.message);
    }
    
    // 检查固定汇率设置
    console.log("\n=== 固定汇率检查 ===");
    try {
        const supportedTokens = await mockFund.getSupportedTokens();
        for (let i = 0; i < supportedTokens.length; i++) {
            const tokenAddress = supportedTokens[i];
            const fixedRate = await uniswapIntegration.getFixedRate(tokenAddress);
            
            let symbol = "Unknown";
            if (tokenAddress === deployment.tokens.WETH) symbol = "WETH";
            else if (tokenAddress === deployment.tokens.WBTC) symbol = "WBTC";
            else if (tokenAddress === deployment.tokens.LINK) symbol = "LINK";
            else if (tokenAddress === deployment.tokens.DAI) symbol = "DAI";
            
            console.log(`${symbol} 固定汇率: ${ethers.formatUnits(fixedRate, 6)} USDC`);
        }
    } catch (error) {
        console.log("检查固定汇率失败:", error.message);
    }
    
    // 检查授权情况
    console.log("\n=== 授权检查 ===");
    try {
        const fundAllowance = await mockUSDC.allowance(deployer.address, deployment.contracts.MockFund);
        console.log("MockFund USDC授权:", ethers.formatUnits(fundAllowance, 6));
        
        const uniswapAllowance = await mockUSDC.allowance(deployment.contracts.MockFund, deployment.contracts.UniswapIntegration);
        console.log("UniswapIntegration USDC授权:", ethers.formatUnits(uniswapAllowance, 6));
        
    } catch (error) {
        console.log("检查授权失败:", error.message);
    }
    
    // 尝试静态调用投资函数
    console.log("\n=== 静态调用投资函数 ===");
    try {
        const investmentAmount = ethers.parseUnits("1000", 6);
        
        // 使用静态调用检查投资函数
        const encodedData = mockFund.interface.encodeFunctionData("invest", [investmentAmount]);
        
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