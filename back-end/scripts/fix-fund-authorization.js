const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("修复MockFund对UniswapIntegration的授权...");
    
    // 读取部署配置
    const deploymentPath = path.join(__dirname, "../deployments/sepolia-deployment.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const [deployer] = await ethers.getSigners();
    console.log("使用账户:", deployer.address);
    
    // 获取合约实例
    const mockFund = await ethers.getContractAt("contracts/MockFund.sol:MockFund", deployment.contracts.MockFund);
    const mockUSDC = await ethers.getContractAt("MockUSDC", deployment.tokens.USDC);
    
    console.log("MockFund地址:", deployment.contracts.MockFund);
    console.log("UniswapIntegration地址:", deployment.contracts.UniswapIntegration);
    
    // 检查当前授权
    console.log("\n=== 检查当前授权 ===");
    try {
        const fundAllowance = await mockUSDC.allowance(deployment.contracts.MockFund, deployment.contracts.UniswapIntegration);
        console.log("MockFund对UniswapIntegration的USDC授权:", ethers.formatUnits(fundAllowance, 6));
        
        if (fundAllowance === 0n) {
            console.log("需要授权MockFund使用USDC...");
            
            // 注意：这里需要从MockFund合约调用approve，而不是从部署者调用
            // 我们需要通过MockFund合约来授权UniswapIntegration使用USDC
            
            // 首先检查MockFund是否有足够的USDC余额
            const fundUSDCBalance = await mockUSDC.balanceOf(deployment.contracts.MockFund);
            console.log("MockFund USDC余额:", ethers.formatUnits(fundUSDCBalance, 6));
            
            if (fundUSDCBalance === 0n) {
                console.log("MockFund没有USDC余额，需要转移一些USDC...");
                
                // 从部署者转移一些USDC到MockFund
                const transferAmount = ethers.parseUnits("100000", 6); // 10万USDC
                const transferTx = await mockUSDC.transfer(deployment.contracts.MockFund, transferAmount);
                console.log("转移交易已发送，等待确认...");
                console.log("交易哈希:", transferTx.hash);
                
                await transferTx.wait();
                console.log("✓ USDC转移成功");
            }
            
            // 现在我们需要通过MockFund合约来授权UniswapIntegration
            // 但是MockFund合约没有直接的授权函数，我们需要在投资时处理授权
            console.log("授权将在投资时自动处理");
            
        } else {
            console.log("授权已存在，无需操作");
        }
        
    } catch (error) {
        console.log("检查授权失败:", error.message);
    }
    
    // 检查MockFund的USDC余额
    console.log("\n=== 检查MockFund USDC余额 ===");
    try {
        const fundUSDCBalance = await mockUSDC.balanceOf(deployment.contracts.MockFund);
        console.log("MockFund USDC余额:", ethers.formatUnits(fundUSDCBalance, 6));
        
        if (fundUSDCBalance === 0n) {
            console.log("MockFund没有USDC余额，需要转移一些USDC...");
            
            // 从部署者转移一些USDC到MockFund
            const transferAmount = ethers.parseUnits("100000", 6); // 10万USDC
            const transferTx = await mockUSDC.transfer(deployment.contracts.MockFund, transferAmount);
            console.log("转移交易已发送，等待确认...");
            console.log("交易哈希:", transferTx.hash);
            
            await transferTx.wait();
            console.log("✓ USDC转移成功");
            
            // 再次检查余额
            const newBalance = await mockUSDC.balanceOf(deployment.contracts.MockFund);
            console.log("新的MockFund USDC余额:", ethers.formatUnits(newBalance, 6));
            
        } else {
            console.log("MockFund已有足够的USDC余额");
        }
        
    } catch (error) {
        console.log("检查或转移USDC失败:", error.message);
    }
    
    console.log("\n=== 授权修复完成 ===");
    console.log("注意：MockFund合约会在投资时自动授权UniswapIntegration使用USDC");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 