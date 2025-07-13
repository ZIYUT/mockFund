const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 开始本地测试permit投资功能...");
    
    const [deployer, investor] = await ethers.getSigners();
    console.log("部署者地址:", deployer.address);
    console.log("投资者地址:", investor.address);

    // 1. 部署MockUSDC with permit support
    console.log("\n📝 1. 部署支持permit的MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy(deployer.address);
    await mockUSDC.waitForDeployment();
    console.log("✅ MockUSDC已部署:", await mockUSDC.getAddress());

    // 2. 部署ChainlinkPriceOracle
    console.log("\n📝 2. 部署ChainlinkPriceOracle...");
    const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
    const priceOracle = await ChainlinkPriceOracle.deploy(deployer.address);
    await priceOracle.waitForDeployment();
    console.log("✅ ChainlinkPriceOracle已部署:", await priceOracle.getAddress());

    // 3. 部署UniswapIntegration
    console.log("\n📝 3. 部署UniswapIntegration...");
    const UniswapIntegration = await ethers.getContractFactory("contracts/UniswapIntegration.sol:UniswapIntegration");
    const uniswapIntegration = await UniswapIntegration.deploy(deployer.address, await priceOracle.getAddress());
    await uniswapIntegration.waitForDeployment();
    console.log("✅ UniswapIntegration已部署:", await uniswapIntegration.getAddress());

    // 4. 部署MockFund
    console.log("\n📝 4. 部署MockFund...");
    const MockFund = await ethers.getContractFactory("contracts/MockFund.sol:MockFund");
    const mockFund = await MockFund.deploy(
        "Mock Fund Coin",
        "MFC",
        deployer.address,
        100, // 1% management fee
        await priceOracle.getAddress(),
        await uniswapIntegration.getAddress()
    );
    await mockFund.waitForDeployment();
    console.log("✅ MockFund已部署:", await mockFund.getAddress());

    // 5. 设置USDC token
    console.log("\n📝 5. 设置USDC token...");
    await mockFund.setUSDCToken(await mockUSDC.getAddress());
    console.log("✅ USDC token已设置");

    // 6. 部署MockTokens
    console.log("\n📝 6. 部署MockTokens...");
    const MockWETH = await ethers.getContractFactory("contracts/MockTokens.sol:MockWETH");
    const mockWETH = await MockWETH.deploy(deployer.address);
    await mockWETH.waitForDeployment();

    const MockWBTC = await ethers.getContractFactory("contracts/MockTokens.sol:MockWBTC");
    const mockWBTC = await MockWBTC.deploy(deployer.address);
    await mockWBTC.waitForDeployment();

    const MockLINK = await ethers.getContractFactory("contracts/MockTokens.sol:MockLINK");
    const mockLINK = await MockLINK.deploy(deployer.address);
    await mockLINK.waitForDeployment();

    const MockDAI = await ethers.getContractFactory("contracts/MockTokens.sol:MockDAI");
    const mockDAI = await MockDAI.deploy(deployer.address);
    await mockDAI.waitForDeployment();

    console.log("✅ MockTokens已部署:");
    console.log("  - MockWETH:", await mockWETH.getAddress());
    console.log("  - MockWBTC:", await mockWBTC.getAddress());
    console.log("  - MockLINK:", await mockLINK.getAddress());
    console.log("  - MockDAI:", await mockDAI.getAddress());

    // 7. 添加支持的代币
    console.log("\n📝 7. 添加支持的代币...");
    await mockFund.addSupportedToken(await mockWETH.getAddress(), 2500);
    await mockFund.addSupportedToken(await mockWBTC.getAddress(), 2500);
    await mockFund.addSupportedToken(await mockLINK.getAddress(), 2500);
    await mockFund.addSupportedToken(await mockDAI.getAddress(), 2500);
    console.log("✅ 支持的代币已添加");

    // 8. 设置UniswapIntegration
    console.log("\n📝 8. 设置UniswapIntegration...");
    await uniswapIntegration.setFixedRateMode(true);
    await uniswapIntegration.setFixedRate(await mockWETH.getAddress(), 3000 * 1e6);
    await uniswapIntegration.setFixedRate(await mockWBTC.getAddress(), 115000 * 1e6);
    await uniswapIntegration.setFixedRate(await mockLINK.getAddress(), 15 * 1e6);
    await uniswapIntegration.setFixedRate(await mockDAI.getAddress(), 1 * 1e6);
    // 新增：初始化所有fixedRates
    await uniswapIntegration.initializeFixedRates(
      await mockWETH.getAddress(),
      await mockWBTC.getAddress(),
      await mockLINK.getAddress(),
      await mockDAI.getAddress()
    );
    console.log("✅ UniswapIntegration固定汇率已设置");

    // 调试：打印所有supportedTokens的fixedRates
    const supportedTokens = [
      await mockWETH.getAddress(),
      await mockWBTC.getAddress(),
      await mockLINK.getAddress(),
      await mockDAI.getAddress()
    ];
    for (const token of supportedTokens) {
      const rate = await uniswapIntegration.getFixedRate(token);
      console.log(`FixedRate for ${token}:`, rate.toString());
    }

    // 调试：打印MockFund合约中的supportedTokens
    console.log("\n🔍 检查MockFund中的supportedTokens:");
    const fundSupportedTokens = await mockFund.getSupportedTokens();
    for (let i = 0; i < fundSupportedTokens.length; i++) {
      const token = fundSupportedTokens[i];
      const rate = await uniswapIntegration.getFixedRate(token);
      console.log(`MockFund supportedToken[${i}]: ${token}, FixedRate: ${rate.toString()}`);
    }

    // 调试：直接测试getFixedRate调用
    console.log("\n🔍 直接测试getFixedRate调用:");
    for (let i = 0; i < fundSupportedTokens.length; i++) {
      const token = fundSupportedTokens[i];
      try {
        const rate = await uniswapIntegration.getFixedRate(token);
        console.log(`直接调用 getFixedRate(${token}): ${rate.toString()}`);
      } catch (error) {
        console.log(`直接调用 getFixedRate(${token}) 失败:`, error.message);
      }
    }

    // 9. 添加流动性
    console.log("\n📝 9. 添加流动性...");
    const largeAmount = ethers.parseUnits("1000000", 6);
    await mockUSDC.mint(await uniswapIntegration.getAddress(), largeAmount);
    
    const wethAmount = ethers.parseUnits("1000", 18);
    await mockWETH.mint(await uniswapIntegration.getAddress(), wethAmount);
    
    const wbtcAmount = ethers.parseUnits("10", 8);
    await mockWBTC.mint(await uniswapIntegration.getAddress(), wbtcAmount);
    
    const linkAmount = ethers.parseUnits("100000", 18);
    await mockLINK.mint(await uniswapIntegration.getAddress(), linkAmount);
    
    const daiAmount = ethers.parseUnits("1000000", 18);
    await mockDAI.mint(await uniswapIntegration.getAddress(), daiAmount);
    console.log("✅ 流动性已添加");

    // 10. 初始化基金
    console.log("\n📝 10. 初始化基金...");
    const initialUSDCAmount = ethers.parseUnits("1000000", 6);
    await mockUSDC.mintForContract(deployer.address, initialUSDCAmount);
    await mockUSDC.approve(await mockFund.getAddress(), initialUSDCAmount);
    await mockFund.initializeFund(initialUSDCAmount);
    console.log("✅ 基金已初始化");

    // 11. 禁用固定汇率模式
    console.log("\n📝 11. 禁用固定汇率模式...");
    await uniswapIntegration.setFixedRateMode(false);
    console.log("✅ 固定汇率模式已禁用");

    // 12. 为投资者铸造USDC
    console.log("\n📝 12. 为投资者铸造USDC...");
    const testAmount = ethers.parseUnits("1000", 6);
    await mockUSDC.mintForContract(investor.address, testAmount);
    console.log("✅ 已为投资者铸造", ethers.formatUnits(testAmount, 6), "USDC");

    // 13. 测试传统投资方式
    console.log("\n🧪 13. 测试传统投资方式...");
    const traditionalAmount = ethers.parseUnits("100", 6);
    
    console.log("  授权USDC...");
    await mockUSDC.connect(investor).approve(await mockFund.getAddress(), traditionalAmount);
    console.log("  ✅ 授权完成");

    console.log("  执行传统投资...");
    const investTx = await mockFund.connect(investor).invest(traditionalAmount);
    await investTx.wait();
    console.log("  ✅ 传统投资成功");

    // 检查投资者MFC余额
    const shareTokenAddress = await mockFund.shareToken();
    const FundShareToken = await ethers.getContractFactory("FundShareToken");
    const shareToken = FundShareToken.attach(shareTokenAddress);
    
    const investorMfcBalance = await shareToken.balanceOf(investor.address);
    console.log("  投资者MFC余额:", ethers.formatUnits(investorMfcBalance, 18));

    // 14. 测试permit投资方式
    console.log("\n🧪 14. 测试permit投资方式...");
    const permitAmount = ethers.parseUnits("200", 6);

    console.log("  生成permit签名...");
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    
    const domain = {
        name: 'Mock USD Coin',
        version: '1',
        chainId: await ethers.provider.getNetwork().then(net => net.chainId),
        verifyingContract: await mockUSDC.getAddress(),
    };

    const types = {
        Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
    };

    const nonce = await mockUSDC.nonces(investor.address);
    const message = {
        owner: investor.address,
        spender: await mockFund.getAddress(),
        value: permitAmount.toString(),
        nonce: nonce.toString(),
        deadline: deadline.toString(),
    };

    const signature = await investor.signTypedData(domain, types, message);
    const sig = ethers.splitSignature(signature);

    console.log("  ✅ Permit签名生成完成");
    console.log("    v:", sig.v);
    console.log("    r:", sig.r);
    console.log("    s:", sig.s);
    console.log("    deadline:", deadline);

    console.log("  执行permit投资...");
    const permitInvestTx = await mockFund.connect(investor).investWithPermit(
        permitAmount,
        deadline,
        sig.v,
        sig.r,
        sig.s
    );
    await permitInvestTx.wait();
    console.log("  ✅ Permit投资成功");

    // 15. 检查最终结果
    console.log("\n📊 15. 检查最终结果...");
    const finalUsdcBalance = await mockUSDC.balanceOf(investor.address);
    const finalMfcBalance = await shareToken.balanceOf(investor.address);
    
    console.log("  最终USDC余额:", ethers.formatUnits(finalUsdcBalance, 6));
    console.log("  最终MFC余额:", ethers.formatUnits(finalMfcBalance, 18));

    const fundNav = await mockFund.calculateNAV();
    const mfcValue = await mockFund.calculateMFCValue();
    
    console.log("  基金NAV:", ethers.formatUnits(fundNav, 6));
    console.log("  MFC价值:", ethers.formatUnits(mfcValue, 6));

    // 16. 验证permit功能
    console.log("\n🔍 16. 验证permit功能...");
    
    // 检查permit是否正常工作
    const permitAllowance = await mockUSDC.allowance(investor.address, await mockFund.getAddress());
    console.log("  Permit授权额度:", ethers.formatUnits(permitAllowance, 6));
    
    // 检查nonce是否正确递增
    const finalNonce = await mockUSDC.nonces(investor.address);
    console.log("  最终nonce:", finalNonce.toString());

    console.log("\n🎉 本地测试完成！");
    console.log("✅ 传统投资方式: 成功");
    console.log("✅ Permit投资方式: 成功");
    console.log("✅ 所有功能正常工作");
    
    // 保存部署信息
    const deploymentInfo = {
        network: "localhost",
        deployer: deployer.address,
        investor: investor.address,
        contracts: {
            mockUSDC: await mockUSDC.getAddress(),
            priceOracle: await priceOracle.getAddress(),
            uniswapIntegration: await uniswapIntegration.getAddress(),
            mockFund: await mockFund.getAddress(),
            shareToken: shareTokenAddress,
            mockWETH: await mockWETH.getAddress(),
            mockWBTC: await mockWBTC.getAddress(),
            mockLINK: await mockLINK.getAddress(),
            mockDAI: await mockDAI.getAddress()
        },
        timestamp: new Date().toISOString()
    };

    const fs = require("fs");
    fs.writeFileSync(
        "localhost-deployment-with-permit.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n📁 部署信息已保存到: localhost-deployment-with-permit.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 测试失败:", error);
        process.exit(1);
    }); 