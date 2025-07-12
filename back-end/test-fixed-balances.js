const { ethers } = require('hardhat');

async function main() {
  console.log('=== 测试修复后的代币余额计算 ===\n');

  // 获取签名者
  const [deployer] = await ethers.getSigners();
  console.log('部署者地址:', deployer.address);

  // 部署MockUSDC
  const MockUSDC = await ethers.getContractFactory('MockUSDC');
  const usdc = await MockUSDC.deploy(deployer.address);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log('MockUSDC 部署地址:', usdcAddress);
  
  // 给部署者获取足够的USDC (使用faucet多次获取)
  const faucetAmount = ethers.parseUnits('10000', 6); // 10K USDC per faucet
  for (let i = 0; i < 200; i++) { // 获取200次，总共2M USDC
    await usdc.faucet(faucetAmount);
  }
  const balance = await usdc.balanceOf(deployer.address);
  console.log('部署者USDC余额:', ethers.formatUnits(balance, 6));

  // 部署模拟代币
  console.log('\n部署模拟代币...');
  const MockWETH = await ethers.getContractFactory('MockWETH');
  const weth = await MockWETH.deploy(deployer.address);
  await weth.waitForDeployment();
  console.log('MockWETH 部署地址:', await weth.getAddress());

  const MockWBTC = await ethers.getContractFactory('MockWBTC');
  const wbtc = await MockWBTC.deploy(deployer.address);
  await wbtc.waitForDeployment();
  console.log('MockWBTC 部署地址:', await wbtc.getAddress());

  const MockLINK = await ethers.getContractFactory('MockLINK');
  const link = await MockLINK.deploy(deployer.address);
  await link.waitForDeployment();
  console.log('MockLINK 部署地址:', await link.getAddress());

  const MockDAI = await ethers.getContractFactory('MockDAI');
  const dai = await MockDAI.deploy(deployer.address);
  await dai.waitForDeployment();
  console.log('MockDAI 部署地址:', await dai.getAddress());

  // 部署ChainlinkPriceOracle (用于实时价格)
  const ChainlinkPriceOracle = await ethers.getContractFactory('ChainlinkPriceOracle');
  const priceOracle = await ChainlinkPriceOracle.deploy(deployer.address);
  await priceOracle.waitForDeployment();
  console.log('ChainlinkPriceOracle 部署地址:', await priceOracle.getAddress());

  // 部署FixedRateUniswapIntegration
  const FixedRateUniswapIntegration = await ethers.getContractFactory('FixedRateUniswapIntegration');
  const uniswapIntegration = await FixedRateUniswapIntegration.deploy(
    deployer.address, // _initialOwner
    await priceOracle.getAddress() // _priceOracle
  );
  await uniswapIntegration.waitForDeployment();
  console.log('FixedRateUniswapIntegration 部署地址:', await uniswapIntegration.getAddress());

  // 设置固定汇率
  const rates = {
    'WETH': ethers.parseUnits('3000', 6), // $3000 per WETH
    'WBTC': ethers.parseUnits('115000', 6), // $115000 per WBTC  
    'LINK': ethers.parseUnits('15', 6), // $15 per LINK
    'DAI': ethers.parseUnits('1', 6), // $1 per DAI
    'USDC': ethers.parseUnits('1', 6) // $1 per USDC
  };

  const tokens = {
    WETH: await weth.getAddress(),
    WBTC: await wbtc.getAddress(), 
    LINK: await link.getAddress(),
    DAI: await dai.getAddress(),
    USDC: usdcAddress
  };

  for (const [symbol, rate] of Object.entries(rates)) {
    await uniswapIntegration.setFixedRate(tokens[symbol], rate);
    console.log(`${symbol} 固定汇率设置为: $${ethers.formatUnits(rate, 6)}`);
  }

  // 启用固定汇率模式
  await uniswapIntegration.setFixedRateMode(true);
  console.log('固定汇率模式已启用');

  // 给FixedRateUniswapIntegration合约设置为代币的所有者，以便它能够铸造代币
  console.log('\n设置代币所有权...');
  await weth.transferOwnership(await uniswapIntegration.getAddress());
  await wbtc.transferOwnership(await uniswapIntegration.getAddress());
  await link.transferOwnership(await uniswapIntegration.getAddress());
  await dai.transferOwnership(await uniswapIntegration.getAddress());
  console.log('代币所有权已转移给FixedRateUniswapIntegration');

  // 部署FixedRateMockFund
  const FixedRateMockFund = await ethers.getContractFactory('FixedRateMockFund');
  const fund = await FixedRateMockFund.deploy(
    'Mock Fund Coin',
    'MFC',
    deployer.address,
    100, // 1% management fee
    await priceOracle.getAddress(),
    await uniswapIntegration.getAddress()
  );
  await fund.waitForDeployment();
  console.log('FixedRateMockFund 部署地址:', await fund.getAddress());

  // 配置基金
  await fund.setUSDCToken(tokens.USDC);
  console.log('USDC代币设置完成');
  
  // 添加支持的代币
  await fund.addSupportedToken(tokens.WETH, 2500); // 25%
  await fund.addSupportedToken(tokens.WBTC, 2500); // 25%
  await fund.addSupportedToken(tokens.LINK, 2500); // 25%
  await fund.addSupportedToken(tokens.DAI, 2500); // 25%
  console.log('支持的代币添加完成');

  // 初始化基金
  const fundInitUSDC = ethers.parseUnits('1000000', 6); // 1M USDC
  // 授权基金合约使用USDC
  await usdc.approve(await fund.getAddress(), fundInitUSDC);
  console.log('USDC授权完成');
  
  await fund.initializeFund(fundInitUSDC);
  console.log('基金初始化完成，初始USDC:', ethers.formatUnits(fundInitUSDC, 6));

  // 调试：检查固定汇率和计算过程
  console.log('\n=== 调试：检查固定汇率和计算过程 ===');
  
  // 检查固定汇率
  const wethRate = await uniswapIntegration.getFixedRate(tokens.WETH);
  const wbtcRate = await uniswapIntegration.getFixedRate(tokens.WBTC);
  const linkRate = await uniswapIntegration.getFixedRate(tokens.LINK);
  const daiRate = await uniswapIntegration.getFixedRate(tokens.DAI);
  
  console.log(`WETH 固定汇率: ${ethers.formatUnits(wethRate, 6)} USDC per WETH`);
  console.log(`WBTC 固定汇率: ${ethers.formatUnits(wbtcRate, 6)} USDC per WBTC`);
  console.log(`LINK 固定汇率: ${ethers.formatUnits(linkRate, 6)} USDC per LINK`);
  console.log(`DAI 固定汇率: ${ethers.formatUnits(daiRate, 6)} USDC per DAI`);
  
  // 手动计算预期的代币数量
   const perTokenUSDC = ethers.parseUnits('125000', 6); // 125,000 USDC
  console.log(`每个代币分配的USDC: ${ethers.formatUnits(perTokenUSDC, 6)} USDC`);
  
  const expectedWETH = (perTokenUSDC * ethers.parseUnits('1', 18)) / wethRate;
  const expectedWBTC = (perTokenUSDC * ethers.parseUnits('1', 8)) / wbtcRate;
  const expectedLINK = (perTokenUSDC * ethers.parseUnits('1', 18)) / linkRate;
  const expectedDAI = (perTokenUSDC * ethers.parseUnits('1', 18)) / daiRate;
  
  console.log(`预期购买 WETH: ${ethers.formatUnits(expectedWETH, 18)}`);
   console.log(`预期购买 WBTC: ${ethers.formatUnits(expectedWBTC, 8)}`);
   console.log(`预期购买 LINK: ${ethers.formatUnits(expectedLINK, 18)}`);
   console.log(`预期购买 DAI: ${ethers.formatUnits(expectedDAI, 18)}`);
   
   // 检查交换汇率
   const usdcToWethRate = await uniswapIntegration.getExchangeRate(tokens.USDC, tokens.WETH);
   const usdcToWbtcRate = await uniswapIntegration.getExchangeRate(tokens.USDC, tokens.WBTC);
   const usdcToLinkRate = await uniswapIntegration.getExchangeRate(tokens.USDC, tokens.LINK);
   const usdcToDaiRate = await uniswapIntegration.getExchangeRate(tokens.USDC, tokens.DAI);
   
   console.log(`USDC->WETH 交换汇率: ${ethers.formatUnits(usdcToWethRate, 18)}`);
   console.log(`USDC->WBTC 交换汇率: ${ethers.formatUnits(usdcToWbtcRate, 18)}`);
   console.log(`USDC->LINK 交换汇率: ${ethers.formatUnits(usdcToLinkRate, 18)}`);
   console.log(`USDC->DAI 交换汇率: ${ethers.formatUnits(usdcToDaiRate, 18)}`);
  
  console.log('\n=== 调试：检查实际购买的代币数量 ===')
  for (const [symbol, address] of Object.entries(tokens)) {
    if (symbol !== 'USDC') {
      const tokenContract = await ethers.getContractAt('IERC20', address);
      const balance = await tokenContract.balanceOf(await fund.getAddress());
      const decimals = symbol === 'WBTC' ? 8 : 18;
      console.log(`${symbol} 实际购买数量: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
      
      // 调试：检查mfcTokenRatio的值
      const mfcTokenRatio = await fund.mfcTokenRatio(address);
      console.log(`${symbol} mfcTokenRatio: ${mfcTokenRatio.toString()}`);
      console.log(`${symbol} mfcTokenRatio (formatted): ${ethers.formatUnits(mfcTokenRatio, 18)}`);
    }
  }

  // 验证基金状态
  const isInitialized = await fund.isInitialized();
  console.log('\n=== 基金状态验证 ===');
  console.log('基金已初始化:', isInitialized);

  // 获取基金组成
  console.log('\n=== 基金组成验证 ===');
  const composition = await fund.getMFCComposition();
  
  for (let i = 0; i < composition.tokens.length; i++) {
    const tokenAddress = composition.tokens[i];
    const ratio = composition.ratios[i];
    
    // 找到对应的代币符号
    let symbol = 'UNKNOWN';
    for (const [sym, addr] of Object.entries(tokens)) {
      if (addr.toLowerCase() === tokenAddress.toLowerCase()) {
        symbol = sym;
        break;
      }
    }
    
    console.log(`${symbol}: ${ethers.formatUnits(ratio, 18)} (每个MFC包含的代币数量)`);
  }

  // 获取基金余额
  console.log('\n=== 基金余额验证 ===');
  const balances = await fund.getFundTokenBalances();
  
  for (let i = 0; i < balances.tokens.length; i++) {
    const tokenAddress = balances.tokens[i];
    const balance = balances.balances[i];
    const decimals = balances.decimals[i]; // 使用合约返回的正确小数位数
    
    // 找到对应的代币符号
    let symbol = 'UNKNOWN';
    for (const [sym, addr] of Object.entries(tokens)) {
      if (addr.toLowerCase() === tokenAddress.toLowerCase()) {
        symbol = sym;
        break;
      }
    }
    
    console.log(`${symbol} 余额: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
  }

  // 计算预期余额
  console.log('\n=== 预期余额对比 ===');
  const tokenAllocation = 125000; // $125,000 per token
  
  const expectedBalances = {
    'WETH': tokenAllocation / 3000, // 125000 / 3000 = ~41.67 WETH
    'WBTC': tokenAllocation / 115000, // 125000 / 115000 = ~1.087 WBTC
    'LINK': tokenAllocation / 15, // 125000 / 15 = ~8333.33 LINK
    'DAI': tokenAllocation / 1 // 125000 / 1 = 125000 DAI
  };
  
  for (const [symbol, expected] of Object.entries(expectedBalances)) {
    console.log(`${symbol} 预期余额: ${expected.toFixed(6)} ${symbol}`);
  }

  console.log('\n测试完成！');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });