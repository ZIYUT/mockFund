const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Mock Tokens", function () {
    // 部署代币的fixture
    async function deployTokensFixture() {
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
        
        return {
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
    
    describe("TokenFactory", function () {
        it("应该正确部署所有代币", async function () {
            const { tokenFactory } = await loadFixture(deployTokensFixture);
            
            expect(await tokenFactory.isTokenDeployed("USDC")).to.be.true;
            expect(await tokenFactory.isTokenDeployed("WETH")).to.be.true;
            expect(await tokenFactory.isTokenDeployed("WBTC")).to.be.true;
            expect(await tokenFactory.isTokenDeployed("LINK")).to.be.true;
            expect(await tokenFactory.isTokenDeployed("UNI")).to.be.true;
        });
        
        it("应该返回正确的代币地址", async function () {
            const { tokenFactory, usdc, weth } = await loadFixture(deployTokensFixture);
            
            expect(await tokenFactory.getTokenAddress("USDC")).to.equal(await usdc.getAddress());
            expect(await tokenFactory.getTokenAddress("WETH")).to.equal(await weth.getAddress());
        });
        
        it("应该返回所有已部署的代币", async function () {
            const { tokenFactory } = await loadFixture(deployTokensFixture);
            
            const allTokens = await tokenFactory.getAllTokens();
            expect(allTokens.length).to.equal(5);
        });
    });
    
    describe("MockUSDC", function () {
        it("应该有正确的基本信息", async function () {
            const { usdc } = await loadFixture(deployTokensFixture);
            
            expect(await usdc.name()).to.equal("Mock USD Coin");
            expect(await usdc.symbol()).to.equal("USDC");
            expect(await usdc.decimals()).to.equal(6);
        });
        
        it("应该给部署者铸造初始供应量", async function () {
            const { usdc, owner } = await loadFixture(deployTokensFixture);
            
            const expectedSupply = ethers.parseUnits("1000000", 6); // 100万 USDC
            expect(await usdc.balanceOf(owner.address)).to.equal(expectedSupply);
        });
        
        it("所有者应该能铸造代币", async function () {
            const { usdc, owner, user1 } = await loadFixture(deployTokensFixture);
            
            const mintAmount = ethers.parseUnits("1000", 6);
            await expect(usdc.connect(owner).mint(user1.address, mintAmount))
                .to.emit(usdc, "TokensMinted")
                .withArgs(user1.address, mintAmount);
            
            expect(await usdc.balanceOf(user1.address)).to.equal(mintAmount);
        });
        
        it("非所有者不应该能铸造代币", async function () {
            const { usdc, user1, user2 } = await loadFixture(deployTokensFixture);
            
            const mintAmount = ethers.parseUnits("1000", 6);
            await expect(usdc.connect(user1).mint(user2.address, mintAmount))
                .to.be.revertedWithCustomError(usdc, "OwnableUnauthorizedAccount");
        });
        
        it("用户应该能使用faucet获取代币", async function () {
            const { usdc, user1 } = await loadFixture(deployTokensFixture);
            
            const faucetAmount = ethers.parseUnits("100", 6);
            await expect(usdc.connect(user1).faucet(faucetAmount))
                .to.emit(usdc, "TokensMinted")
                .withArgs(user1.address, faucetAmount);
            
            expect(await usdc.balanceOf(user1.address)).to.equal(faucetAmount);
        });
        
        it("应该拒绝过大的faucet请求", async function () {
            const { usdc, user1 } = await loadFixture(deployTokensFixture);
            
            const largeAmount = ethers.parseUnits("20000", 6); // 超过10,000限制
            await expect(usdc.connect(user1).faucet(largeAmount))
                .to.be.revertedWith("Amount too large");
        });
        
        it("用户应该能获取测试代币", async function () {
            const { usdc, user1 } = await loadFixture(deployTokensFixture);
            
            await expect(usdc.connect(user1).getTestTokens())
                .to.emit(usdc, "TokensMinted");
            
            const expectedAmount = ethers.parseUnits("1000", 6);
            expect(await usdc.balanceOf(user1.address)).to.equal(expectedAmount);
        });
        
        it("用户应该能销毁自己的代币", async function () {
            const { usdc, user1 } = await loadFixture(deployTokensFixture);
            
            // 先获取一些代币
            await usdc.connect(user1).getTestTokens();
            const balance = await usdc.balanceOf(user1.address);
            
            const burnAmount = balance / 2n;
            await expect(usdc.connect(user1).burn(burnAmount))
                .to.emit(usdc, "TokensBurned")
                .withArgs(user1.address, burnAmount);
            
            expect(await usdc.balanceOf(user1.address)).to.equal(balance - burnAmount);
        });
    });
    
    describe("MockWETH", function () {
        it("应该有正确的基本信息", async function () {
            const { weth } = await loadFixture(deployTokensFixture);
            
            expect(await weth.name()).to.equal("Mock Wrapped Ether");
            expect(await weth.symbol()).to.equal("WETH");
            expect(await weth.decimals()).to.equal(18);
        });
        
        it("应该给部署者铸造初始供应量", async function () {
            const { weth, owner } = await loadFixture(deployTokensFixture);
            
            const expectedSupply = ethers.parseEther("1000"); // 1000 WETH
            expect(await weth.balanceOf(owner.address)).to.equal(expectedSupply);
        });
        
        it("用户应该能获取测试代币", async function () {
            const { weth, user1 } = await loadFixture(deployTokensFixture);
            
            await expect(weth.connect(user1).getTestTokens())
                .to.emit(weth, "TokensMinted");
            
            const expectedAmount = ethers.parseEther("1"); // 1 WETH
            expect(await weth.balanceOf(user1.address)).to.equal(expectedAmount);
        });
        
        it("应该限制faucet数量", async function () {
            const { weth, user1 } = await loadFixture(deployTokensFixture);
            
            const largeAmount = ethers.parseEther("20"); // 超过10 WETH限制
            await expect(weth.connect(user1).faucet(largeAmount))
                .to.be.revertedWith("Amount too large");
        });
    });
    
    describe("MockWBTC", function () {
        it("应该有正确的基本信息", async function () {
            const { wbtc } = await loadFixture(deployTokensFixture);
            
            expect(await wbtc.name()).to.equal("Mock Wrapped Bitcoin");
            expect(await wbtc.symbol()).to.equal("WBTC");
            expect(await wbtc.decimals()).to.equal(8); // Bitcoin精度
        });
        
        it("应该给部署者铸造初始供应量", async function () {
            const { wbtc, owner } = await loadFixture(deployTokensFixture);
            
            const expectedSupply = 10 * 10**8; // 10 WBTC
            expect(await wbtc.balanceOf(owner.address)).to.equal(expectedSupply);
        });
        
        it("用户应该能获取测试代币", async function () {
            const { wbtc, user1 } = await loadFixture(deployTokensFixture);
            
            await expect(wbtc.connect(user1).getTestTokens())
                .to.emit(wbtc, "TokensMinted");
            
            const expectedAmount = 1 * 10**7; // 0.1 WBTC
            expect(await wbtc.balanceOf(user1.address)).to.equal(expectedAmount);
        });
    });
    
    describe("MockLINK", function () {
        it("应该有正确的基本信息", async function () {
            const { link } = await loadFixture(deployTokensFixture);
            
            expect(await link.name()).to.equal("Mock Chainlink Token");
            expect(await link.symbol()).to.equal("LINK");
            expect(await link.decimals()).to.equal(18);
        });
        
        it("用户应该能获取测试代币", async function () {
            const { link, user1 } = await loadFixture(deployTokensFixture);
            
            await expect(link.connect(user1).getTestTokens())
                .to.emit(link, "TokensMinted");
            
            const expectedAmount = ethers.parseEther("100"); // 100 LINK
            expect(await link.balanceOf(user1.address)).to.equal(expectedAmount);
        });
    });
    
    describe("MockUNI", function () {
        it("应该有正确的基本信息", async function () {
            const { uni } = await loadFixture(deployTokensFixture);
            
            expect(await uni.name()).to.equal("Mock Uniswap Token");
            expect(await uni.symbol()).to.equal("UNI");
            expect(await uni.decimals()).to.equal(18);
        });
        
        it("用户应该能获取测试代币", async function () {
            const { uni, user1 } = await loadFixture(deployTokensFixture);
            
            await expect(uni.connect(user1).getTestTokens())
                .to.emit(uni, "TokensMinted");
            
            const expectedAmount = ethers.parseEther("50"); // 50 UNI
            expect(await uni.balanceOf(user1.address)).to.equal(expectedAmount);
        });
    });
    
    describe("代币交互", function () {
        it("用户应该能在代币之间转账", async function () {
            const { usdc, user1, user2 } = await loadFixture(deployTokensFixture);
            
            // user1获取代币
            await usdc.connect(user1).getTestTokens();
            const transferAmount = ethers.parseUnits("100", 6);
            
            // 转账给user2
            await expect(usdc.connect(user1).transfer(user2.address, transferAmount))
                .to.emit(usdc, "Transfer")
                .withArgs(user1.address, user2.address, transferAmount);
            
            expect(await usdc.balanceOf(user2.address)).to.equal(transferAmount);
        });
        
        it("用户应该能批准和转账", async function () {
            const { usdc, user1, user2 } = await loadFixture(deployTokensFixture);
            
            await usdc.connect(user1).getTestTokens();
            const approveAmount = ethers.parseUnits("500", 6);
            const transferAmount = ethers.parseUnits("200", 6);
            
            // 批准
            await expect(usdc.connect(user1).approve(user2.address, approveAmount))
                .to.emit(usdc, "Approval")
                .withArgs(user1.address, user2.address, approveAmount);
            
            // 代理转账
            await expect(usdc.connect(user2).transferFrom(user1.address, user2.address, transferAmount))
                .to.emit(usdc, "Transfer")
                .withArgs(user1.address, user2.address, transferAmount);
            
            expect(await usdc.balanceOf(user2.address)).to.equal(transferAmount);
            expect(await usdc.allowance(user1.address, user2.address)).to.equal(approveAmount - transferAmount);
        });
    });
});