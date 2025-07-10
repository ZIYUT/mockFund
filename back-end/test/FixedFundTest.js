const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockFund 修复版测试", function () {
    let mockFund, mockUSDC, mockWETH, mockWBTC, mockLINK, priceOracle, uniswapIntegration, fundShareToken;
    let owner, user1, user2;
    let INITIAL_USDC_AMOUNT = ethers.parseUnits("1000000", 6); // 100万USDC
    let INITIAL_MFC_SUPPLY = ethers.parseUnits("1000000", 18); // 100万MFC

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // 部署所有合约
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy(owner.address);

        const MockWETH = await ethers.getContractFactory("MockWETH");
        mockWETH = await MockWETH.deploy(owner.address);

        const MockWBTC = await ethers.getContractFactory("MockWBTC");
        mockWBTC = await MockWBTC.deploy(owner.address);

        const MockLINK = await ethers.getContractFactory("MockLINK");
        mockLINK = await MockLINK.deploy(owner.address);

        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        priceOracle = await PriceOracle.deploy();

        const MockUniswapIntegration = await ethers.getContractFactory("MockUniswapIntegration");
        uniswapIntegration = await MockUniswapIntegration.deploy();

        const FundShareToken = await ethers.getContractFactory("FundShareToken");
        fundShareToken = await FundShareToken.deploy("MockFund Coin", "MFC");

        const MockFund = await ethers.getContractFactory("MockFund");
        mockFund = await MockFund.deploy(
            fundShareToken.target,
            priceOracle.target,
            uniswapIntegration.target
        );

        // 设置USDC代币地址
        await mockFund.setUSDCToken(mockUSDC.target);

        // 设置价格预言机
        await priceOracle.setPriceFeedBySymbol("WETH", mockWETH.target);
        await priceOracle.setPriceFeedBySymbol("WBTC", mockWBTC.target);
        await priceOracle.setPriceFeedBySymbol("LINK", mockLINK.target);
        await priceOracle.setPriceFeedBySymbol("USDC", mockUSDC.target);

        // 设置Uniswap交换率
        await uniswapIntegration.setExchangeRate(mockUSDC.target, mockWETH.target, ethers.parseUnits("2000", 6)); // 1 ETH = 2000 USDC
        await uniswapIntegration.setExchangeRate(mockUSDC.target, mockWBTC.target, ethers.parseUnits("40000", 6)); // 1 BTC = 40000 USDC
        await uniswapIntegration.setExchangeRate(mockUSDC.target, mockLINK.target, ethers.parseUnits("15", 6)); // 1 LINK = 15 USDC

        // 添加支持的代币
        await mockFund.addSupportedToken(mockWETH.target, 2500); // 25%
        await mockFund.addSupportedToken(mockWBTC.target, 2500); // 25%
        await mockFund.addSupportedToken(mockLINK.target, 2500); // 25%
        await mockFund.addSupportedToken(mockUSDC.target, 2500); // 25%

        // 给部署者铸造USDC
        await mockUSDC.mint(owner.address, INITIAL_USDC_AMOUNT);
        await mockUSDC.approve(mockFund.target, INITIAL_USDC_AMOUNT);

        // 初始化基金
        await mockFund.initializeFund(INITIAL_USDC_AMOUNT);

        // 给测试用户铸造USDC
        await mockUSDC.mint(user1.address, ethers.parseUnits("10000", 6));
        await mockUSDC.mint(user2.address, ethers.parseUnits("10000", 6));
    });

    describe("基础功能测试", function () {
        it("应该正确初始化基金", async function () {
            const [totalSupply, initialSupply, initialized] = await mockFund.getFundStats();
            expect(initialSupply).to.equal(INITIAL_MFC_SUPPLY);
            expect(initialized).to.be.true;
            expect(totalSupply).to.equal(INITIAL_MFC_SUPPLY);
        });

        it("应该正确计算NAV", async function () {
            const nav = await mockFund.calculateNAV();
            expect(nav).to.be.above(ethers.parseUnits("950000", 6)); // 至少95万USDC
        });

        it("应该正确计算MFC价值", async function () {
            const mfcValue = await mockFund.calculateMFCValue();
            expect(mfcValue).to.be.above(ethers.parseUnits("0.95", 6)); // 至少0.95 USDC
        });

        it("应该正确计算投资预览", async function () {
            const investmentAmount = ethers.parseUnits("1000", 6);
            const mfcAmount = await mockFund.getInvestmentPreview(investmentAmount);
            expect(mfcAmount).to.be.above(0);
        });

        it("应该成功投资USDC获得MFC", async function () {
            const investmentAmount = ethers.parseUnits("1000", 6);
            await mockUSDC.connect(user1).approve(mockFund.target, investmentAmount);

            const balanceBefore = await fundShareToken.balanceOf(user1.address);
            await mockFund.connect(user1).invest(investmentAmount);
            const balanceAfter = await fundShareToken.balanceOf(user1.address);

            expect(balanceAfter).to.be.above(balanceBefore);
        });

        it("应该拒绝低于最小投资额的投资", async function () {
            const smallAmount = ethers.parseUnits("1", 6); // 1 USDC
            await mockUSDC.connect(user1).approve(mockFund.target, smallAmount);

            await expect(
                mockFund.connect(user1).invest(smallAmount)
            ).to.be.revertedWith("Investment below minimum");
        });

        it("应该拒绝未批准的投资", async function () {
            const investmentAmount = ethers.parseUnits("1000", 6);
            await expect(
                mockFund.connect(user1).invest(investmentAmount)
            ).to.be.reverted;
        });

        it("应该正确计算赎回预览", async function () {
            // 先投资一些MFC
            const investmentAmount = ethers.parseUnits("1000", 6);
            await mockUSDC.connect(user1).approve(mockFund.target, investmentAmount);
            await mockFund.connect(user1).invest(investmentAmount);

            const shareAmount = ethers.parseUnits("100", 18);
            const usdcAmount = await mockFund.getRedemptionPreview(shareAmount);
            expect(usdcAmount).to.be.above(0);
        });

        it("应该成功赎回MFC获得USDC", async function () {
            // 先投资一些MFC
            const investmentAmount = ethers.parseUnits("1000", 6);
            await mockUSDC.connect(user1).approve(mockFund.target, investmentAmount);
            await mockFund.connect(user1).invest(investmentAmount);

            const shareAmount = ethers.parseUnits("100", 18);
            const balanceBefore = await mockUSDC.balanceOf(user1.address);
            await mockFund.connect(user1).redeem(shareAmount);
            const balanceAfter = await mockUSDC.balanceOf(user1.address);

            expect(balanceAfter).to.be.above(balanceBefore);
        });

        it("应该拒绝重复初始化", async function () {
            await expect(
                mockFund.initializeFund(INITIAL_USDC_AMOUNT)
            ).to.be.revertedWith("Fund already initialized");
        });

        it("应该拒绝非所有者添加代币", async function () {
            const MockDAI = await ethers.getContractFactory("MockDAI");
            const mockDAI = await MockDAI.deploy(owner.address);

            await expect(
                mockFund.connect(user1).addSupportedToken(mockDAI.target, 2500)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("应该拒绝零地址代币", async function () {
            await expect(
                mockFund.addSupportedToken(ethers.ZeroAddress, 2500)
            ).to.be.revertedWith("Invalid token address");
        });

        it("应该允许所有者收取管理费", async function () {
            await expect(
                mockFund.collectManagementFee()
            ).to.not.be.reverted;
        });

        it("应该拒绝非所有者收取管理费", async function () {
            await expect(
                mockFund.connect(user1).collectManagementFee()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("应该正确返回支持的代币列表", async function () {
            const tokens = await mockFund.getSupportedTokens();
            expect(tokens.length).to.equal(4);
            expect(tokens[0]).to.equal(mockWETH.target);
            expect(tokens[1]).to.equal(mockWBTC.target);
            expect(tokens[2]).to.equal(mockLINK.target);
            expect(tokens[3]).to.equal(mockUSDC.target);
        });

        it("应该正确返回MFC组成", async function () {
            const [tokens, ratios, usdcAmount] = await mockFund.getMFCComposition();
            expect(tokens.length).to.equal(4);
            expect(ratios.length).to.equal(4);
            expect(usdcAmount).to.be.above(0);
        });

        it("应该正确返回基金净值信息", async function () {
            const [nav, mfcValue, totalSupply] = await mockFund.getFundNAV();
            expect(nav).to.be.above(0);
            expect(mfcValue).to.be.above(0);
            expect(totalSupply).to.equal(INITIAL_MFC_SUPPLY);
        });

        it("应该正确返回流通供应量", async function () {
            const circulatingSupply = await mockFund.getCirculatingSupply();
            expect(circulatingSupply).to.equal(0); // 初始时所有MFC都在所有者手中
        });

        it("应该正确返回累计管理费", async function () {
            const totalFees = await mockFund.getTotalManagementFees();
            expect(totalFees).to.equal(0); // 初始时没有管理费
        });
    });

    describe("多用户投资测试", function () {
        it("应该支持多个用户投资", async function () {
            const investmentAmount = ethers.parseUnits("1000", 6);
            
            // 用户1投资
            await mockUSDC.connect(user1).approve(mockFund.target, investmentAmount);
            await mockFund.connect(user1).invest(investmentAmount);
            
            // 用户2投资
            await mockUSDC.connect(user2).approve(mockFund.target, investmentAmount);
            await mockFund.connect(user2).invest(investmentAmount);
            
            const user1Balance = await fundShareToken.balanceOf(user1.address);
            const user2Balance = await fundShareToken.balanceOf(user2.address);
            
            expect(user1Balance).to.be.above(0);
            expect(user2Balance).to.be.above(0);
        });
    });

    describe("暂停功能测试", function () {
        it("暂停后应该拒绝投资", async function () {
            await mockFund.pause();
            
            const investmentAmount = ethers.parseUnits("1000", 6);
            await mockUSDC.connect(user1).approve(mockFund.target, investmentAmount);
            
            await expect(
                mockFund.connect(user1).invest(investmentAmount)
            ).to.be.revertedWithCustomError(mockFund, "EnforcedPause");
        });

        it("暂停后应该拒绝赎回", async function () {
            await mockFund.pause();
            
            const shareAmount = ethers.parseUnits("100", 18);
            
            await expect(
                mockFund.connect(user1).redeem(shareAmount)
            ).to.be.revertedWithCustomError(mockFund, "EnforcedPause");
        });

        it("恢复后应该允许正常操作", async function () {
            await mockFund.pause();
            await mockFund.unpause();
            
            const investmentAmount = ethers.parseUnits("1000", 6);
            await mockUSDC.connect(user1).approve(mockFund.target, investmentAmount);
            
            await expect(
                mockFund.connect(user1).invest(investmentAmount)
            ).to.not.be.reverted;
        });
    });

    describe("精度测试", function () {
        it("应该正确处理不同金额的投资", async function () {
            const amounts = [
                ethers.parseUnits("100", 6),   // 100 USDC
                ethers.parseUnits("1000", 6),  // 1000 USDC
                ethers.parseUnits("10000", 6)  // 10000 USDC
            ];
            
            for (const amount of amounts) {
                await mockUSDC.connect(user1).approve(mockFund.target, amount);
                await expect(
                    mockFund.connect(user1).invest(amount)
                ).to.not.be.reverted;
            }
        });

        it("应该正确处理小额投资", async function () {
            const smallAmount = ethers.parseUnits("100", 6); // 最小投资额
            await mockUSDC.connect(user1).approve(mockFund.target, smallAmount);
            
            await expect(
                mockFund.connect(user1).invest(smallAmount)
            ).to.not.be.reverted;
        });
    });

    describe("边界条件测试", function () {
        it("应该拒绝零金额投资", async function () {
            await expect(
                mockFund.connect(user1).invest(0)
            ).to.be.revertedWith("Investment below minimum");
        });

        it("应该拒绝零金额赎回", async function () {
            await expect(
                mockFund.connect(user1).redeem(0)
            ).to.be.revertedWith("Invalid share amount");
        });

        it("应该拒绝超过余额的赎回", async function () {
            const largeAmount = ethers.parseUnits("1000000", 18);
            await expect(
                mockFund.connect(user1).redeem(largeAmount)
            ).to.be.revertedWith("Insufficient shares");
        });
    });
}); 