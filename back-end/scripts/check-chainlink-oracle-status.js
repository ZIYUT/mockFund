const { ethers } = require("hardhat");
const deployments = require("../deployments/sepolia.json");

async function main() {
    console.log("\n=== 检查ChainlinkPriceOracle合约状态 ===");
    
    const oracleAddress = deployments.contracts.ChainlinkPriceOracle;
    console.log(`ChainlinkPriceOracle地址: ${oracleAddress}`);
    
    // 检查合约是否存在
    const provider = ethers.provider;
    const code = await provider.getCode(oracleAddress);
    
    if (code === "0x") {
        console.log("❌ 合约不存在或未部署");
        return;
    }
    
    console.log(`✅ 合约已部署，字节码长度: ${code.length}`);
    
    // 尝试不同的方法连接合约
    try {
        // 方法1: 使用工厂连接
        console.log("\n--- 方法1: 使用ContractFactory ---");
        const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
        const priceOracle1 = ChainlinkPriceOracle.attach(oracleAddress);
        
        // 测试基本调用
        try {
            const owner = await priceOracle1.owner();
            console.log(`✅ 所有者: ${owner}`);
        } catch (error) {
            console.log(`❌ 获取所有者失败: ${error.message}`);
        }
        
    } catch (error) {
        console.log(`❌ 方法1失败: ${error.message}`);
    }
    
    try {
        // 方法2: 直接使用ABI
        console.log("\n--- 方法2: 使用ABI ---");
        const abi = [
            "function owner() view returns (address)",
            "function priceFeeds(address) view returns (address)",
            "function tokenBySymbol(string) view returns (address)",
            "function setPriceFeed(address,address,string) external",
            "function getLatestPrice(address) view returns (int256,uint256)"
        ];
        
        const priceOracle2 = new ethers.Contract(oracleAddress, abi, provider);
        
        try {
            const owner = await priceOracle2.owner();
            console.log(`✅ 所有者: ${owner}`);
        } catch (error) {
            console.log(`❌ 获取所有者失败: ${error.message}`);
        }
        
    } catch (error) {
        console.log(`❌ 方法2失败: ${error.message}`);
    }
    
    try {
        // 方法3: 检查是否是Ownable合约
        console.log("\n--- 方法3: 检查Ownable ---");
        const ownableAbi = ["function owner() view returns (address)"];
        const ownableContract = new ethers.Contract(oracleAddress, ownableAbi, provider);
        
        const owner = await ownableContract.owner();
        console.log(`✅ Ownable所有者: ${owner}`);
        
        const [signer] = await ethers.getSigners();
        console.log(`当前签名者: ${signer.address}`);
        console.log(`是否为所有者: ${owner.toLowerCase() === signer.address.toLowerCase()}`);
        
    } catch (error) {
        console.log(`❌ 方法3失败: ${error.message}`);
    }
    
    // 检查合约接口
    console.log("\n--- 检查合约接口 ---");
    try {
        // 尝试调用一些基本函数
        const testAbi = [
            "function priceFeeds(address) view returns (address)",
            "function tokenBySymbol(string) view returns (address)"
        ];
        
        const testContract = new ethers.Contract(oracleAddress, testAbi, provider);
        
        // 测试priceFeeds映射
        const testAddress = "0x0000000000000000000000000000000000000001";
        const priceFeed = await testContract.priceFeeds(testAddress);
        console.log(`✅ priceFeeds函数可用，测试结果: ${priceFeed}`);
        
        // 测试tokenBySymbol映射
        const tokenAddress = await testContract.tokenBySymbol("TEST");
        console.log(`✅ tokenBySymbol函数可用，测试结果: ${tokenAddress}`);
        
    } catch (error) {
        console.log(`❌ 接口测试失败: ${error.message}`);
    }
    
    console.log("\n=== 检查完成 ===");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("脚本执行失败:", error);
        process.exit(1);
    });