const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("开始初始化MockFund合约...");
    
    // 读取部署配置
    const deploymentPath = path.join(__dirname, "../deployments/sepolia-deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const [deployer] = await ethers.getSigners();
    console.log("使用账户:", deployer.address);
    console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    
    // 获取合约实例
    const mockFund = await ethers.getContractAt("contracts/MockFund.sol:MockFund", deployment.contracts.MockFund);
    const mockUSDC = await ethers.getContractAt("MockUSDC", deployment.tokens.USDC);
    
    console.log("MockFund地址:", deployment.contracts.MockFund);
    console.log("MockUSDC地址:", deployment.tokens.USDC);
    
    // 检查基金是否已初始化
    try {
        const isInitialized = await mockFund.isInitialized();
        console.log("基金是否已初始化:", isInitialized);
        
        if (isInitialized) {
            console.log("基金已经初始化过了！");
            return;
        }
    } catch (error) {
        console.log("检查初始化状态失败:", error.message);
    }
    
    // 检查部署者的USDC余额
    try {
        const deployerUSDCBalance = await mockUSDC.balanceOf(deployer.address);
        console.log("部署者USDC余额:", ethers.formatUnits(deployerUSDCBalance, 6));
        
        // 检查是否需要铸造USDC
        const requiredUSDC = ethers.parseUnits("1000000", 6); // 100万USDC
        if (deployerUSDCBalance < requiredUSDC) {
            console.log("部署者USDC余额不足，正在铸造...");
            try {
                await mockUSDC.mint(deployer.address, requiredUSDC);
                console.log("✓ 铸造USDC成功");
            } catch (error) {
                console.log("✗ 铸造USDC失败:", error.message);
                return;
            }
        }
    } catch (error) {
        console.log("检查USDC余额失败:", error.message);
        return;
    }
    
    // 检查USDC授权
    try {
        const allowance = await mockUSDC.allowance(deployer.address, deployment.contracts.MockFund);
        console.log("USDC授权额度:", ethers.formatUnits(allowance, 6));
        
        const requiredUSDC = ethers.parseUnits("1000000", 6);
        if (allowance < requiredUSDC) {
            console.log("正在授权USDC...");
            try {
                await mockUSDC.approve(deployment.contracts.MockFund, requiredUSDC);
                console.log("✓ USDC授权成功");
            } catch (error) {
                console.log("✗ USDC授权失败:", error.message);
                return;
            }
        }
    } catch (error) {
        console.log("检查USDC授权失败:", error.message);
        return;
    }
    
    // 初始化基金
    console.log("\n=== 开始初始化基金 ===");
    const initialUSDCAmount = ethers.parseUnits("1000000", 6); // 100万USDC
    
    try {
        console.log("调用initializeFund函数...");
        const tx = await mockFund.initializeFund(initialUSDCAmount);
        console.log("交易已发送，等待确认...");
        console.log("交易哈希:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✓ 基金初始化成功！");
        console.log("区块号:", receipt.blockNumber);
        console.log("Gas使用:", receipt.gasUsed.toString());
        
        // 检查初始化后的状态
        const isInitialized = await mockFund.isInitialized();
        console.log("基金初始化状态:", isInitialized);
        
        if (isInitialized) {
            console.log("🎉 MockFund合约初始化成功！");
            console.log("现在可以进行投资和赎回操作了。");
        }
        
    } catch (error) {
        console.log("✗ 基金初始化失败:", error.message);
        
        // 尝试获取更详细的错误信息
        if (error.data) {
            console.log("错误数据:", error.data);
        }
        
        // 检查是否是余额不足的问题
        if (error.message.includes("Insufficient") || error.message.includes("balance")) {
            console.log("可能是代币余额不足，请检查UniswapIntegration合约的代币余额。");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 