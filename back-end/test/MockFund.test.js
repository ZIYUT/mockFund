const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MockFund", function () {
    // 部署合约的fixture
    async function deployMockFundFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    
    // 部署各个代币
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy(owner.address);
    await usdc.waitForDeployment();
    
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const weth = await MockWETH.deploy(owner.address);
    await weth.waitForDeployment();
    
    const MockWBTC = await ethers.getContractFactory("MockWBTC");
    const wbtc = await MockWBTC.deploy(owner.address);
    await wbtc.waitForDeployment();
    
    const MockLINK = await ethers.getContractFactory("MockLINK");
    const link = await MockLINK.deploy(owner.address);
    await link.waitForDeployment();
    
    const MockUNI = await ethers.getContractFactory("MockUNI");
    const uni = await MockUNI.deploy(owner.address);
    await uni.waitForDeployment();
    
    // 部署TokenFactory
    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    const tokenFactory = await TokenFactory.deploy(owner.address);
    await tokenFactory.waitForDeployment();
    
    // 注册代币到工厂
    await tokenFactory.registerToken("USDC", await usdc.getAddress());
    await tokenFactory.registerToken("WETH", await weth.getAddress());
    await tokenFactory.registerToken("WBTC", await wbtc.getAddress());
    await tokenFactory.registerToken("LINK", await link.getAddress());
    await tokenFactory.registerToken("UNI", await uni.getAddress());
    
    // 获取代币地址
    const usdcAddress = await usdc.getAddress();
    const wethAddress = await weth.getAddress();
    const wbtcAddress = await wbtc.getAddress();
    const linkAddress = await link.getAddress();
    const uniAddress = await uni.getAddress();
        
        // 部署基金合约
        const MockFund = await ethers.getContractFactory("MockFund");
        const mockFund = await MockFund.deploy(
            "Mock Fund Shares",
            "MFS",
            owner.address,
            200 // 2% 管理费
        );
        await mockFund.waitForDeployment();
        
        // 设置USDC代币地址
        await mockFund.setUSDCToken(usdcAddress);
        
        // 获取份额代币
        const shareTokenAddress = await mockFund.shareToken();
        const shareToken = await ethers.getContractAt("FundShareToken", shareTokenAddress);
        
        // 给投资者分发测试代币
        const testAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
        await usdc.mint(user1.address, testAmount);
        await usdc.mint(user2.address, testAmount);
        
        return {
            mockFund,
            shareToken,
            tokenFactory,
            usdc,
            weth,
            wbtc,
            link,
            uni,
            owner,
            user1,
            user2
        };
    }
    
    describe("部署", function () {
        it("应该正确部署所有合约", async function () {
            const { mockFund, shareToken, usdc } = await loadFixture(deployMockFundFixture);
            
            expect(await mockFund.getAddress()).to.be.properAddress;
            expect(await shareToken.getAddress()).to.be.properAddress;
            expect(await usdc.getAddress()).to.be.properAddress;
        });
        
        it("应该设置正确的初始参数", async function () {
            const { mockFund, owner } = await loadFixture(deployMockFundFixture);
            
            expect(await mockFund.owner()).to.equal(owner.address);
            expect(await mockFund.managementFeeRate()).to.equal(200);
            expect(await mockFund.minimumInvestment()).to.equal(ethers.parseUnits("100", 6));
            expect(await mockFund.minimumRedemption()).to.equal(ethers.parseUnits("10", 6));
        });
        
        it("份额代币应该设置正确的基金合约地址", async function () {
            const { mockFund, shareToken } = await loadFixture(deployMockFundFixture);
            
            expect(await shareToken.fundContract()).to.equal(await mockFund.getAddress());
        });
    });
    
    describe("代币管理", function () {
        it("应该能添加支持的代币", async function () {
            const { mockFund, weth, owner } = await loadFixture(deployMockFundFixture);
            
            await expect(mockFund.connect(owner).addSupportedToken(await weth.getAddress(), 5000))
                .to.emit(mockFund, "TokenAdded")
                .withArgs(await weth.getAddress(), 5000);
            
            expect(await mockFund.isSupportedToken(await weth.getAddress())).to.be.true;
            expect(await mockFund.targetAllocations(await weth.getAddress())).to.equal(5000);
        });
        
        it("应该拒绝非所有者添加代币", async function () {
            const { mockFund, weth, user1 } = await loadFixture(deployMockFundFixture);
            
            await expect(mockFund.connect(user1).addSupportedToken(await weth.getAddress(), 5000))
                .to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
        });
        
        it("应该拒绝超过100%的总分配", async function () {
            const { mockFund, weth, wbtc, owner } = await loadFixture(deployMockFundFixture);
            
            await mockFund.connect(owner).addSupportedToken(await weth.getAddress(), 6000);
            
            await expect(mockFund.connect(owner).addSupportedToken(await wbtc.getAddress(), 5000))
                .to.be.revertedWith("Total allocation exceeds 100%");
        });
        
        it("应该能移除支持的代币", async function () {
            const { mockFund, weth, owner } = await loadFixture(deployMockFundFixture);
            
            await mockFund.connect(owner).addSupportedToken(await weth.getAddress(), 5000);
            
            await expect(mockFund.connect(owner).removeSupportedToken(await weth.getAddress()))
                .to.emit(mockFund, "TokenRemoved")
                .withArgs(await weth.getAddress());
            
            expect(await mockFund.isSupportedToken(await weth.getAddress())).to.be.false;
        });
    });
    
    describe("投资功能", function () {
        beforeEach(async function () {
            // 在每个测试前设置投资组合
            const { mockFund, weth, wbtc, link, uni, owner } = await loadFixture(deployMockFundFixture);
            this.contracts = { mockFund, weth, wbtc, link, uni, owner };
            
            await mockFund.connect(owner).addSupportedToken(await weth.getAddress(), 4000);
            await mockFund.connect(owner).addSupportedToken(await wbtc.getAddress(), 3000);
            await mockFund.connect(owner).addSupportedToken(await link.getAddress(), 2000);
            await mockFund.connect(owner).addSupportedToken(await uni.getAddress(), 1000);
        });
        
        it("应该拒绝低于最小投资金额的投资", async function () {
            const { mockFund, usdc, user1 } = await loadFixture(deployMockFundFixture);
            
            const smallAmount = ethers.parseUnits("50", 6); // 50 USDC
            await usdc.connect(user1).approve(await mockFund.getAddress(), smallAmount);
            
            await expect(mockFund.connect(user1).invest(smallAmount))
                .to.be.revertedWith("Investment below minimum");
        });
        
        it("应该能进行首次投资", async function () {
            const { mockFund, usdc, shareToken, user1 } = await loadFixture(deployMockFundFixture);
            
            const investAmount = ethers.parseUnits("1000", 6); // 1000 USDC
            await usdc.connect(user1).approve(await mockFund.getAddress(), investAmount);
            
            await expect(mockFund.connect(user1).invest(investAmount))
                .to.emit(mockFund, "Investment")
                .withArgs(user1.address, investAmount, investAmount); // 首次投资1:1比例
            
            expect(await shareToken.balanceOf(user1.address)).to.equal(investAmount);
            expect(await mockFund.totalAssets()).to.equal(investAmount);
        });
        
        it("应该能进行后续投资", async function () {
            const { mockFund, usdc, shareToken, user1, user2 } = await loadFixture(deployMockFundFixture);
            
            // 第一次投资
            const firstInvestment = ethers.parseUnits("1000", 6);
            await usdc.connect(user1).approve(await mockFund.getAddress(), firstInvestment);
            await mockFund.connect(user1).invest(firstInvestment);
            
            // 第二次投资
            const secondInvestment = ethers.parseUnits("500", 6);
            await usdc.connect(user2).approve(await mockFund.getAddress(), secondInvestment);
            await mockFund.connect(user2).invest(secondInvestment);
            
            expect(await shareToken.balanceOf(user2.address)).to.equal(secondInvestment);
            expect(await mockFund.totalAssets()).to.equal(firstInvestment + secondInvestment);
        });
    });
    
    describe("赎回功能", function () {
        it("应该能赎回份额", async function () {
            const { mockFund, usdc, shareToken, user1 } = await loadFixture(deployMockFundFixture);
            
            // 进行初始投资
            const investAmount = ethers.parseUnits("1000", 6);
            await usdc.connect(user1).approve(await mockFund.getAddress(), investAmount);
            await mockFund.connect(user1).invest(investAmount);
            
            const shareBalance = await shareToken.balanceOf(user1.address);
            const redeemAmount = shareBalance / 2n; // 赎回一半
            
            await expect(mockFund.connect(user1).redeem(redeemAmount))
                .to.emit(mockFund, "Redemption");
            
            expect(await shareToken.balanceOf(user1.address)).to.equal(shareBalance - redeemAmount);
        });
        
        it("应该拒绝超过余额的赎回", async function () {
            const { mockFund, usdc, shareToken, user1 } = await loadFixture(deployMockFundFixture);
            
            // 进行初始投资
            const investAmount = ethers.parseUnits("1000", 6);
            await usdc.connect(user1).approve(await mockFund.getAddress(), investAmount);
            await mockFund.connect(user1).invest(investAmount);
            
            const shareBalance = await shareToken.balanceOf(user1.address);
            const excessiveAmount = shareBalance + ethers.parseEther("100");
            
            await expect(mockFund.connect(user1).redeem(excessiveAmount))
                .to.be.revertedWith("Insufficient shares");
        });
        
        it("应该拒绝零数量赎回", async function () {
            const { mockFund, user1 } = await loadFixture(deployMockFundFixture);
            
            await expect(mockFund.connect(user1).redeem(0))
                .to.be.revertedWith("Invalid share amount");
        });
    });
    
    describe("NAV计算", function () {
        it("应该返回正确的初始NAV", async function () {
            const { mockFund } = await loadFixture(deployMockFundFixture);
            
            const nav = await mockFund.getCurrentNAV();
            expect(nav).to.equal(ethers.parseUnits("1", 6)); // 1 USDC
        });
        
        it("应该在投资后正确计算NAV", async function () {
            const { mockFund, usdc, user1 } = await loadFixture(deployMockFundFixture);
            
            const investAmount = ethers.parseUnits("1000", 6);
            await usdc.connect(user1).approve(await mockFund.getAddress(), investAmount);
            await mockFund.connect(user1).invest(investAmount);
            
            const nav = await mockFund.getCurrentNAV();
            expect(nav).to.equal(ethers.parseUnits("1", 6)); // 应该保持1 USDC
        });
    });
    
    describe("管理功能", function () {
        it("应该能暂停和恢复合约", async function () {
            const { mockFund, usdc, user1, owner } = await loadFixture(deployMockFundFixture);
            
            // 暂停合约
            await mockFund.connect(owner).pause();
            
            const investAmount = ethers.parseUnits("1000", 6);
            await usdc.connect(user1).approve(await mockFund.getAddress(), investAmount);
            
            // 暂停时应该拒绝投资
            await expect(mockFund.connect(user1).invest(investAmount))
                .to.be.revertedWithCustomError(mockFund, "EnforcedPause");
            
            // 恢复合约
            await mockFund.connect(owner).unpause();
            
            // 恢复后应该能正常投资
            await expect(mockFund.connect(user1).invest(investAmount))
                .to.emit(mockFund, "Investment");
        });
        
        it("应该拒绝非所有者暂停合约", async function () {
            const { mockFund, user1 } = await loadFixture(deployMockFundFixture);
            
            await expect(mockFund.connect(user1).pause())
                .to.be.revertedWithCustomError(mockFund, "OwnableUnauthorizedAccount");
        });
    });
    
    describe("统计信息", function () {
        it("应该返回正确的基金统计", async function () {
            const { mockFund, usdc, user1 } = await loadFixture(deployMockFundFixture);
            
            // 投资前
            let [totalAssets, totalSupply, nav] = await mockFund.getFundStats();
            expect(totalAssets).to.equal(0);
            expect(totalSupply).to.equal(0);
            expect(nav).to.equal(ethers.parseUnits("1", 6));
            
            // 投资后
            const investAmount = ethers.parseUnits("1000", 6);
            await usdc.connect(user1).approve(await mockFund.getAddress(), investAmount);
            await mockFund.connect(user1).invest(investAmount);
            
            [totalAssets, totalSupply, nav] = await mockFund.getFundStats();
            expect(totalAssets).to.equal(investAmount);
            expect(totalSupply).to.equal(investAmount);
            expect(nav).to.equal(ethers.parseUnits("1", 6));
        });
        
        it("应该返回支持的代币列表", async function () {
            const { mockFund, weth, wbtc, owner } = await loadFixture(deployMockFundFixture);
            
            await mockFund.connect(owner).addSupportedToken(await weth.getAddress(), 5000);
            await mockFund.connect(owner).addSupportedToken(await wbtc.getAddress(), 3000);
            
            const supportedTokens = await mockFund.getSupportedTokens();
            expect(supportedTokens.length).to.equal(2);
            expect(supportedTokens).to.include(await weth.getAddress());
            expect(supportedTokens).to.include(await wbtc.getAddress());
        });
    });
});