const { ethers } = require("hardhat");

async function main() {
    console.log("=== 调试代币计算逻辑 ===");
    
    // 模拟计算
    const perTokenUSDC = ethers.parseUnits("125000", 6); // 125,000 USDC
    const wbtcRate = ethers.parseUnits("115000", 6); // 115,000 USDC per WBTC
    const wethRate = ethers.parseUnits("3000", 6); // 3,000 USDC per WETH
    const linkRate = ethers.parseUnits("15", 6); // 15 USDC per LINK
    
    console.log("每个代币分配的USDC:", ethers.formatUnits(perTokenUSDC, 6), "USDC");
    
    // WBTC计算 (8位小数)
    const wbtcDecimals = 8;
    const wbtcAmount = (perTokenUSDC * (10n ** BigInt(wbtcDecimals))) / wbtcRate;
    console.log("WBTC计算:");
    console.log("  原始计算:", wbtcAmount.toString());
    console.log("  格式化:", ethers.formatUnits(wbtcAmount, wbtcDecimals), "WBTC");
    
    // WETH计算 (18位小数)
    const wethDecimals = 18;
    const wethAmount = (perTokenUSDC * (10n ** BigInt(wethDecimals))) / wethRate;
    console.log("WETH计算:");
    console.log("  原始计算:", wethAmount.toString());
    console.log("  格式化:", ethers.formatUnits(wethAmount, wethDecimals), "WETH");
    
    // LINK计算 (18位小数)
    const linkAmount = (perTokenUSDC * (10n ** BigInt(wethDecimals))) / linkRate;
    console.log("LINK计算:");
    console.log("  原始计算:", linkAmount.toString());
    console.log("  格式化:", ethers.formatUnits(linkAmount, wethDecimals), "LINK");
    
    // MFC比例计算
    const INITIAL_MFC_SUPPLY = ethers.parseUnits("1000000", 18); // 1M MFC
    console.log("\nMFC比例计算:");
    console.log("初始MFC供应量:", ethers.formatUnits(INITIAL_MFC_SUPPLY, 18), "MFC");
    
    const wbtcRatio = (wbtcAmount * (10n ** 18n)) / INITIAL_MFC_SUPPLY;
    const wethRatio = (wethAmount * (10n ** 18n)) / INITIAL_MFC_SUPPLY;
    const linkRatio = (linkAmount * (10n ** 18n)) / INITIAL_MFC_SUPPLY;
    
    console.log("WBTC比例:", ethers.formatUnits(wbtcRatio, 18));
    console.log("WETH比例:", ethers.formatUnits(wethRatio, 18));
    console.log("LINK比例:", ethers.formatUnits(linkRatio, 18));
    
    // 验证：1个MFC应该包含多少代币
    console.log("\n1个MFC包含的代币数量:");
    console.log("WBTC:", ethers.formatUnits(wbtcRatio, 18), "(比例) =", ethers.formatUnits(wbtcRatio, 18-8), "WBTC");
    console.log("WETH:", ethers.formatUnits(wethRatio, 18), "(比例) =", ethers.formatUnits(wethRatio, 0), "WETH");
    console.log("LINK:", ethers.formatUnits(linkRatio, 18), "(比例) =", ethers.formatUnits(linkRatio, 0), "LINK");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});