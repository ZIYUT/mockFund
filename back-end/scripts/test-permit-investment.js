const { ethers } = require("hardhat");

async function main() {
    const [deployer, investor] = await ethers.getSigners();
    console.log("Testing permit investment functionality...");
    console.log("Deployer:", deployer.address);
    console.log("Investor:", investor.address);

    // 读取部署配置
    const fs = require("fs");
    let deploymentInfo;
    try {
        deploymentInfo = JSON.parse(fs.readFileSync("sepolia-deployment-with-permit.json", "utf8"));
    } catch (error) {
        console.log("未找到permit部署配置，使用现有配置...");
        deploymentInfo = JSON.parse(fs.readFileSync("sepolia-deployment.json", "utf8"));
    }

    // 获取合约地址
    const mockUSDCAddress = deploymentInfo.contracts.mockUSDC;
    const mockFundAddress = deploymentInfo.contracts.mockFund;

    console.log("\n合约地址:");
    console.log("MockUSDC:", mockUSDCAddress);
    console.log("MockFund:", mockFundAddress);

    // 获取合约实例
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const MockFund = await ethers.getContractFactory("MockFund");

    const mockUSDC = MockUSDC.attach(mockUSDCAddress);
    const mockFund = MockFund.attach(mockFundAddress);

    // 检查基金状态
    console.log("\n1. 检查基金状态...");
    const isInitialized = await mockFund.isInitialized();
    console.log("基金已初始化:", isInitialized);

    if (!isInitialized) {
        console.log("基金未初始化，无法测试投资功能");
        return;
    }

    // 为投资者铸造USDC
    console.log("\n2. 为投资者铸造USDC...");
    const testAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await mockUSDC.mintForContract(investor.address, testAmount);
    console.log("已为投资者铸造", ethers.formatUnits(testAmount, 6), "USDC");

    // 检查投资者余额
    const investorBalance = await mockUSDC.balanceOf(investor.address);
    console.log("投资者USDC余额:", ethers.formatUnits(investorBalance, 6));

    // 测试传统投资方式
    console.log("\n3. 测试传统投资方式...");
    const traditionalAmount = ethers.parseUnits("100", 6); // 100 USDC
    
    // 授权
    console.log("授权USDC...");
    await mockUSDC.connect(investor).approve(mockFundAddress, traditionalAmount);
    console.log("授权完成");

    // 投资
    console.log("执行传统投资...");
    const investTx = await mockFund.connect(investor).invest(traditionalAmount);
    await investTx.wait();
    console.log("传统投资成功");

    // 检查投资者MFC余额
    const shareTokenAddress = await mockFund.shareToken();
    const FundShareToken = await ethers.getContractFactory("FundShareToken");
    const shareToken = FundShareToken.attach(shareTokenAddress);
    
    const investorMfcBalance = await shareToken.balanceOf(investor.address);
    console.log("投资者MFC余额:", ethers.formatUnits(investorMfcBalance, 18));

    // 测试permit投资方式
    console.log("\n4. 测试permit投资方式...");
    const permitAmount = ethers.parseUnits("200", 6); // 200 USDC

    // 生成permit签名
    console.log("生成permit签名...");
    const deadline = Math.floor(Date.now() / 1000) + 1200; // 20分钟后过期
    
    const domain = {
        name: 'Mock USD Coin',
        version: '1',
        chainId: await ethers.provider.getNetwork().then(net => net.chainId),
        verifyingContract: mockUSDCAddress,
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

    // 获取当前nonce
    const nonce = await mockUSDC.nonces(investor.address);

    const message = {
        owner: investor.address,
        spender: mockFundAddress,
        value: permitAmount.toString(),
        nonce: nonce.toString(),
        deadline: deadline.toString(),
    };

    // 生成签名
    const signature = await investor.signTypedData(domain, types, message);
    const sig = ethers.splitSignature(signature);

    console.log("Permit签名生成完成");
    console.log("v:", sig.v);
    console.log("r:", sig.r);
    console.log("s:", sig.s);
    console.log("deadline:", deadline);

    // 执行permit投资
    console.log("执行permit投资...");
    const permitInvestTx = await mockFund.connect(investor).investWithPermit(
        permitAmount,
        deadline,
        sig.v,
        sig.r,
        sig.s
    );
    await permitInvestTx.wait();
    console.log("Permit投资成功");

    // 检查最终余额
    console.log("\n5. 检查最终余额...");
    const finalUsdcBalance = await mockUSDC.balanceOf(investor.address);
    const finalMfcBalance = await shareToken.balanceOf(investor.address);
    
    console.log("最终USDC余额:", ethers.formatUnits(finalUsdcBalance, 6));
    console.log("最终MFC余额:", ethers.formatUnits(finalMfcBalance, 18));

    // 检查基金状态
    const fundNav = await mockFund.calculateNAV();
    const mfcValue = await mockFund.calculateMFCValue();
    
    console.log("基金NAV:", ethers.formatUnits(fundNav, 6));
    console.log("MFC价值:", ethers.formatUnits(mfcValue, 6));

    console.log("\n✅ Permit投资测试完成！");
    console.log("传统投资和permit投资都成功执行");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 