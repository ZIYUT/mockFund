# Chainlink 真实价格集成

## 🎯 概述

本项目现在支持使用 **Chainlink 真实价格预言机** 来获取实时代币价格，实现真实的汇率兑换。

## 🔗 Chainlink 集成架构

### 1. ChainlinkPriceOracle.sol
- **功能**: 连接 Chainlink 价格预言机
- **特性**: 
  - 支持多个代币的价格获取
  - 价格缓存和验证
  - 批量价格查询
  - 价格过时检查

### 2. RealUniswapIntegration.sol
- **功能**: 使用真实价格进行代币交换
- **特性**:
  - 基于 Chainlink 价格计算汇率
  - 价格缓存（5分钟）
  - 滑点保护
  - 自动汇率更新

## 📊 Sepolia 测试网价格预言机地址

```javascript
const SEPOLIA_PRICE_FEEDS = {
    // ETH/USD
    ETH: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    // BTC/USD  
    BTC: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
    // LINK/USD
    LINK: "0xc59E3633BAAC79493d908e63626716e204A45EdF",
    // USDC/USD
    USDC: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E",
    // DAI/USD
    DAI: "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19"
};
```

## 🚀 部署步骤

### 1. 测试 Chainlink 连接
```bash
cd back-end
npx hardhat run scripts/test-chainlink-prices.js --network sepolia
```

### 2. 部署完整系统
```bash
npx hardhat run scripts/deploy-with-chainlink.js --network sepolia
```

## 🔧 核心功能

### 1. 真实价格获取
```solidity
// 获取单个代币价格
function getLatestPrice(address _token) external view returns (int256 price, uint256 timestamp)

// 批量获取价格
function getMultiplePrices(address[] calldata _tokens) external view returns (int256[] memory prices, uint256[] memory timestamps)

// 通过符号获取价格
function getLatestPriceBySymbol(string memory _symbol) external view returns (int256 price, uint256 timestamp)
```

### 2. 汇率计算
```solidity
// 计算真实汇率
function calculateRealExchangeRate(address _tokenIn, address _tokenOut) public view returns (uint256 rate)

// 获取交换报价
function getQuote(address _tokenIn, address _tokenOut, uint256 _amountIn, uint24 _fee) external view returns (uint256 amountOut)
```

### 3. 价格缓存
```solidity
// 更新缓存汇率
function updateCachedRate(address _tokenIn, address _tokenOut) external

// 获取缓存信息
function getCacheInfo(address _tokenIn, address _tokenOut) external view returns (uint256 cachedRate, uint256 timestamp, bool isStale)
```

## 💡 使用示例

### 1. 设置价格预言机
```javascript
// 部署 ChainlinkPriceOracle
const ChainlinkPriceOracle = await ethers.getContractFactory("ChainlinkPriceOracle");
const priceOracle = await ChainlinkPriceOracle.deploy(deployer.address);

// 配置价格预言机
await priceOracle.setPriceFeed(
    wethAddress,
    "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD
    "ETH"
);
```

### 2. 获取真实价格
```javascript
// 获取 ETH 价格
const [ethPrice, timestamp] = await priceOracle.getLatestPrice(wethAddress);
console.log("ETH price:", ethers.formatUnits(ethPrice, 8)); // $2,500.00

// 获取 BTC 价格
const [btcPrice, btcTimestamp] = await priceOracle.getLatestPrice(wbtcAddress);
console.log("BTC price:", ethers.formatUnits(btcPrice, 8)); // $45,000.00
```

### 3. 计算真实汇率
```javascript
// 计算 USDC/ETH 汇率
const rate = await realUniswapIntegration.calculateRealExchangeRate(usdcAddress, wethAddress);
console.log("USDC/ETH rate:", rate / 10000); // 0.0004 (1 USDC = 0.0004 ETH)

// 获取交换报价
const quote = await realUniswapIntegration.getQuote(usdcAddress, wethAddress, ethers.parseUnits("1000", 6), 3000);
console.log("1000 USDC =", ethers.formatUnits(quote, 18), "ETH");
```

## 🔒 安全特性

### 1. 价格验证
- 检查价格是否为正数
- 验证时间戳有效性
- 防止价格过时

### 2. 滑点保护
- 默认 1% 滑点容忍度
- 可配置滑点参数
- 交易失败保护

### 3. 缓存机制
- 5分钟价格缓存
- 减少 Chainlink 调用
- 降低 Gas 费用

## 📈 性能优化

### 1. 批量操作
```solidity
// 批量设置价格预言机
function batchSetPriceFeeds(address[] calldata _tokens, address[] calldata _priceFeeds, string[] calldata _symbols)

// 批量更新缓存
function batchUpdateCachedRates(address[] calldata _tokensIn, address[] calldata _tokensOut)
```

### 2. 缓存策略
- 优先使用缓存价格
- 自动更新过期缓存
- 手动缓存清理

## 🧪 测试功能

### 1. 价格获取测试
```bash
# 测试 Chainlink 价格获取
npx hardhat run scripts/test-chainlink-prices.js --network sepolia
```

### 2. 汇率计算测试
```bash
# 测试真实汇率计算
npx hardhat run scripts/test-sepolia-deployment.js --network sepolia
```

## 🔄 与模拟版本的区别

| 特性 | 模拟版本 | Chainlink 版本 |
|------|----------|----------------|
| 价格来源 | 预设固定价格 | Chainlink 实时价格 |
| 汇率计算 | 手动设置 | 自动计算 |
| 价格更新 | 手动更新 | 实时更新 |
| Gas 费用 | 低 | 中等 |
| 准确性 | 低 | 高 |
| 可靠性 | 高 | 高 |

## 📝 注意事项

### 1. 网络要求
- 需要连接到 Sepolia 测试网
- 确保有足够的 ETH 支付 Gas 费用
- 检查 Chainlink 价格预言机状态

### 2. 价格延迟
- Chainlink 价格有轻微延迟
- 建议使用缓存机制
- 监控价格更新频率

### 3. 错误处理
- 价格获取失败时的回退机制
- 网络连接问题的处理
- 价格异常的保护

## 🎯 下一步

1. **测试真实价格获取**
2. **验证汇率计算准确性**
3. **监控价格更新性能**
4. **优化缓存策略**
5. **准备主网部署**

---

**版本**: v2.0.0 (Chainlink 集成版)  
**最后更新**: 2024年12月  
**状态**: 准备就绪 