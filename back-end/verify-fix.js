// 验证修复后的计算逻辑
const { ethers } = require('hardhat');

async function main() {
    console.log('=== 验证修复后的计算逻辑 ===\n');
    
    // 模拟修复后的计算逻辑
    const INITIAL_MFC_SUPPLY = 1000000n * 1000000000000000000n; // 1M MFC with 18 decimals
    const perTokenUSDC = 125000; // 每个代币分配125000 USDC
    
    const tokens = {
        WETH: { rate: 3000, decimals: 18 },
        WBTC: { rate: 115000, decimals: 8 },
        LINK: { rate: 15, decimals: 18 },
        DAI: { rate: 1, decimals: 18 }
    };
    
    console.log('修复后的MFC比例计算:');
    Object.entries(tokens).forEach(([token, config]) => {
        const usdcAmount = perTokenUSDC * 1e6; // 转换为6位小数
        const fixedRate = config.rate * 1e6; // 转换为6位小数
        const tokenDecimals = config.decimals;
        
        // 计算tokenAmount（原生小数位数）
        const tokenAmount = (usdcAmount * (10 ** tokenDecimals)) / fixedRate;
        
        // 修复后的逻辑：将tokenAmount标准化为18位小数
        let scaledTokenAmount;
        if (tokenDecimals <= 18) {
            scaledTokenAmount = tokenAmount * (10 ** (18 - tokenDecimals));
        } else {
            scaledTokenAmount = tokenAmount / (10 ** (tokenDecimals - 18));
        }
        
        // 计算MFC比例
        const mfcTokenRatio = (BigInt(Math.floor(scaledTokenAmount)) * 1000000000000000000n) / INITIAL_MFC_SUPPLY;
        
        console.log(`\n${token}:`);
        console.log(`  原始tokenAmount: ${tokenAmount}`);
        console.log(`  标准化scaledTokenAmount: ${scaledTokenAmount}`);
        console.log(`  MFC比例: ${Number(mfcTokenRatio) / 1e18}`);
        
        // 验证：从MFC比例反推代币数量（模拟修复后合约中的逻辑）
        // mfcTokenRatio已经是18位小数标准化的值
        let actualTokenAmount;
        if (tokenDecimals <= 18) {
            actualTokenAmount = Number(mfcTokenRatio) / Math.pow(10, 18 - tokenDecimals);
        } else {
            actualTokenAmount = Number(mfcTokenRatio) * Math.pow(10, tokenDecimals - 18) / 1e18;
        }
        
        console.log(`  反推的代币数量: ${actualTokenAmount}`);
        console.log(`  预期代币数量: ${tokenAmount / (10 ** tokenDecimals)}`);
        
        // 计算1个MFC包含的代币数量
        const tokensPerMFC = actualTokenAmount;
        console.log(`  1个MFC包含的${token}: ${tokensPerMFC}`);
    });
    
    console.log('\n=== 基金余额计算 ===');
    const totalMFC = 1000000; // 1M MFC
    
    Object.entries(tokens).forEach(([token, config]) => {
        const usdcAmount = perTokenUSDC * 1e6;
        const fixedRate = config.rate * 1e6;
        const tokenDecimals = config.decimals;
        
        const tokenAmount = (usdcAmount * (10 ** tokenDecimals)) / fixedRate;
        
        let scaledTokenAmount;
        if (tokenDecimals <= 18) {
            scaledTokenAmount = tokenAmount * (10 ** (18 - tokenDecimals));
        } else {
            scaledTokenAmount = tokenAmount / (10 ** (tokenDecimals - 18));
        }
        
        const mfcTokenRatio = (BigInt(Math.floor(scaledTokenAmount)) * 1000000000000000000n) / INITIAL_MFC_SUPPLY;
        
        // 模拟修复后合约中的基金余额计算
        const scaledFromRatio = Number(mfcTokenRatio) / 1e18;
        let fundBalance;
        if (tokenDecimals <= 18) {
            fundBalance = (scaledFromRatio * totalMFC) / (10 ** (18 - tokenDecimals));
        } else {
            fundBalance = (scaledFromRatio * totalMFC) * (10 ** (tokenDecimals - 18));
        }
        
        console.log(`\n${token} 基金余额:`);
        console.log(`  计算结果: ${fundBalance}`);
        console.log(`  预期结果: ${perTokenUSDC / config.rate}`);
    });
}

main().catch(console.error);