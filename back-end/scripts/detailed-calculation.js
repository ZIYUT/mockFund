// 详细的代币余额计算分析
const { ethers } = require('hardhat');

async function main() {
    console.log('=== 详细代币余额计算分析 ===\n');
    
    // 基金配置
    const totalUSDC = 1000000; // 1M USDC
    const usdcForTokens = 500000; // 50万USDC用于购买代币
    const perTokenUSDC = usdcForTokens / 4; // 每个代币分配125000 USDC
    
    console.log('基金配置:');
    console.log('总USDC:', totalUSDC);
    console.log('用于购买代币的USDC:', usdcForTokens);
    console.log('每个代币分配的USDC:', perTokenUSDC);
    console.log();
    
    // 固定汇率（USDC per token）
    const rates = {
        WETH: { rate: 3000, decimals: 18 },
        WBTC: { rate: 115000, decimals: 8 },
        LINK: { rate: 15, decimals: 18 },
        DAI: { rate: 1, decimals: 18 }
    };
    
    console.log('固定汇率和小数位数:');
    Object.entries(rates).forEach(([token, config]) => {
        console.log(`${token}: ${config.rate} USDC/${token}, ${config.decimals} decimals`);
    });
    console.log();
    
    // 模拟合约中的计算逻辑
    console.log('=== 合约计算逻辑模拟 ===');
    Object.entries(rates).forEach(([token, config]) => {
        const usdcAmount = perTokenUSDC * 1e6; // 转换为6位小数表示
        const fixedRate = config.rate * 1e6; // 转换为6位小数表示
        const tokenDecimals = config.decimals;
        
        console.log(`\n${token} 计算:`);
        console.log(`  usdcAmount: ${usdcAmount} (${perTokenUSDC} USDC * 1e6)`);
        console.log(`  fixedRate: ${fixedRate} (${config.rate} * 1e6)`);
        console.log(`  tokenDecimals: ${tokenDecimals}`);
        
        // 合约中的计算公式: tokenAmount = (_usdcAmount * (10 ** tokenDecimals)) / fixedRate
        const tokenAmount = (usdcAmount * (10 ** tokenDecimals)) / fixedRate;
        console.log(`  计算公式: (${usdcAmount} * 10^${tokenDecimals}) / ${fixedRate}`);
        console.log(`  tokenAmount (raw): ${tokenAmount}`);
        
        // 转换为可读格式
        const readableAmount = tokenAmount / (10 ** tokenDecimals);
        console.log(`  tokenAmount (readable): ${readableAmount} ${token}`);
        
        // 预期结果
        const expectedAmount = perTokenUSDC / config.rate;
        console.log(`  预期结果: ${expectedAmount} ${token}`);
        
        // 比较
        const ratio = readableAmount / expectedAmount;
        console.log(`  比例: ${ratio} (${ratio === 1 ? '正确' : '错误'})`);
    });
    
    console.log('\n=== MFC比例计算 ===');
    const INITIAL_MFC_SUPPLY = 1000000n * 1000000000000000000n; // 1M MFC with 18 decimals
    
    Object.entries(rates).forEach(([token, config]) => {
        const usdcAmount = perTokenUSDC * 1e6;
        const fixedRate = config.rate * 1e6;
        const tokenDecimals = config.decimals;
        
        const tokenAmount = (usdcAmount * (10 ** tokenDecimals)) / fixedRate;
        const tokenAmountInt = Math.floor(tokenAmount);
        const mfcTokenRatio = (BigInt(tokenAmountInt) * 1000000000000000000n) / INITIAL_MFC_SUPPLY;
        
        console.log(`\n${token} MFC比例:`);
        console.log(`  tokenAmount: ${tokenAmount}`);
        console.log(`  mfcTokenRatio: ${mfcTokenRatio}`);
        console.log(`  mfcTokenRatio (readable): ${Number(mfcTokenRatio) / 1e18}`);
    });
}

main().catch(console.error);