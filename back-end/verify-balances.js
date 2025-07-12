// 验证代币余额计算
const { ethers } = require('hardhat');

async function main() {
    console.log('=== 代币余额计算验证 ===\n');
    
    // 基金配置
    const totalUSDC = 1000000; // 1M USDC
    const usdcForTokens = 500000; // 50万USDC用于购买代币
    const tokenAllocation = 0.125; // 每个代币12.5%
    const usdcPerToken = usdcForTokens * tokenAllocation; // 每个代币分配125000 USDC
    
    console.log('基金配置:');
    console.log('总USDC:', totalUSDC);
    console.log('用于购买代币的USDC:', usdcForTokens);
    console.log('每个代币分配的USDC:', usdcPerToken);
    console.log();
    
    // 固定汇率
    const rates = {
        WETH: 3000,   // USDC/WETH
        WBTC: 115000, // USDC/WBTC
        LINK: 15,     // USDC/LINK
        DAI: 1        // USDC/DAI
    };
    
    console.log('固定汇率:');
    Object.entries(rates).forEach(([token, rate]) => {
        console.log(`${token}: ${rate} USDC/${token}`);
    });
    console.log();
    
    // 计算预期代币数量
    console.log('预期代币数量计算:');
    Object.entries(rates).forEach(([token, rate]) => {
        const expectedAmount = usdcPerToken / rate;
        console.log(`${token}: ${usdcPerToken} USDC ÷ ${rate} USDC/${token} = ${expectedAmount} ${token}`);
    });
    console.log();
    
    // 实际测试结果（从最新测试输出）
    const actualBalances = {
        WETH: 0.000000000041666666,
        WBTC: 0.01086956,
        LINK: 0.000000008333333333,
        DAI: 0.000000125
    };
    
    console.log('实际代币余额:');
    Object.entries(actualBalances).forEach(([token, balance]) => {
        console.log(`${token}: ${balance} ${token}`);
    });
    console.log();
    
    // 比较预期与实际
    console.log('预期 vs 实际比较:');
    Object.entries(rates).forEach(([token, rate]) => {
        const expected = usdcPerToken / rate;
        const actual = actualBalances[token];
        const ratio = actual / expected;
        console.log(`${token}:`);
        console.log(`  预期: ${expected}`);
        console.log(`  实际: ${actual}`);
        console.log(`  比例: ${ratio} (${ratio < 0.01 ? '异常小' : '正常'})`);
        console.log();
    });
}

main().catch(console.error);