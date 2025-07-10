# 新合约版本部署指南

本文档说明如何部署新版本的合约，使用 `ChainlinkPriceOracle` 和 `UniswapIntegration`。

## 🆕 新合约特性

### ChainlinkPriceOracle
- ✅ 使用 Chainlink 真实价格预言机
- ✅ 支持动态设置价格预言机
- ✅ 符号到代币地址的映射
- ✅ 价格过时检查
- ✅ 批量价格获取

### UniswapIntegration
- ✅ 基于 Chainlink 真实价格计算交换比率
- ✅ 价格缓存机制（5分钟）
- ✅ 滑点保护功能（默认1%）
- ✅ 更接近真实 Uniswap 的体验
- ✅ 缓存管理和清除功能

## 🚀 部署步骤

### 1. 环境准备

确保已安装依赖：
```bash
cd back-end
npm install
```

检查环境变量：
```bash
# .env 文件
PRIVATE_KEY=你的私钥
SEPOLIA_RPC_URL=你的Sepolia RPC URL
ETHERSCAN_API_KEY=你的Etherscan API Key
```

### 2. 编译合约

```bash
npx hardhat compile
```

### 3. 部署到 Sepolia

使用新的部署脚本：
```bash
npx hardhat run scripts/deploy-sepolia-new.js --network sepolia
```

### 4. 部署流程

部署脚本会自动执行以下步骤：

1. **部署 MockUSDC** - 稳定币代币
2. **部署 MockTokensFactory** - 代币工厂
3. **部署所有代币** - WETH, WBTC, LINK, DAI
4. **部署 ChainlinkPriceOracle** - 价格预言机
5. **配置 Chainlink 价格预言机** - 设置 Sepolia 测试网地址
6. **部署 UniswapIntegration** - 交换集成合约
7. **部署 MockFund** - 基金主合约
8. **配置基金投资组合** - 添加支持的代币
9. **设置 USDC 代币地址** - 配置投资货币
10. **预存代币** - 为交换合约提供流动性
11. **初始化基金** - 建立初始投资组合
12. **验证结果** - 检查部署和初始化状态

## 📊 部署验证

部署完成后，脚本会输出：

- 所有合约地址
- 基金净值 (NAV)
- 单个 MFC 价值
- 投资示例

## 🔧 合约验证

部署后验证合约：
```bash
# 验证 ChainlinkPriceOracle
npx hardhat verify --network sepolia <ChainlinkPriceOracle地址> <部署者地址>

# 验证 UniswapIntegration
npx hardhat verify --network sepolia <UniswapIntegration地址> <部署者地址> <ChainlinkPriceOracle地址>

# 验证 MockFund
npx hardhat verify --network sepolia <MockFund地址> "Mock Fund Shares" "MFC" <部署者地址> 100 <ChainlinkPriceOracle地址> <UniswapIntegration地址>
```

## 🧪 运行测试

测试新合约功能：
```bash
npx hardhat test test/NewContractsTest.js
```

测试包括：
- ChainlinkPriceOracle 功能测试
- UniswapIntegration 功能测试
- MockFund 集成测试
- 价格缓存测试
- 滑点保护测试

## 📝 部署记录

部署信息会自动保存到：
```
deployments/sepolia-new.json
```

包含：
- 网络信息
- 部署者地址
- 时间戳
- 所有合约地址
- 基金信息
- 部署备注

## 🔄 前端集成

### 更新地址配置

部署完成后，更新前端地址配置：

1. 编辑 `new-frontend/src/contracts/addresses.ts`
2. 填入实际的合约地址
3. 重启前端应用

### 地址配置格式

```typescript
export const CONTRACT_ADDRESSES = {
  MockUSDC: "0x...",
  MockWETH: "0x...",
  MockWBTC: "0x...",
  MockLINK: "0x...",
  MockDAI: "0x...",
  ChainlinkPriceOracle: "0x...",
  UniswapIntegration: "0x...",
  MockFund: "0x...",
  FundShareToken: "0x..."
};
```

## 🆚 与旧版本对比

| 功能 | 旧版本 | 新版本 |
|------|--------|--------|
| 价格预言机 | PriceOracle | ChainlinkPriceOracle |
| 交换集成 | MockUniswapIntegration | UniswapIntegration |
| 价格来源 | 模拟价格 | Chainlink 真实价格 |
| 价格缓存 | 无 | 5分钟缓存 |
| 滑点保护 | 无 | 1% 默认滑点 |
| 价格过时检查 | 无 | 支持 |
| 批量操作 | 有限 | 完整支持 |

## 🎯 新功能使用

### 价格缓存管理

```javascript
// 更新缓存
await uniswapIntegration.updateCachedRate(tokenIn, tokenOut);

// 批量更新缓存
await uniswapIntegration.batchUpdateCachedRates(tokensIn, tokensOut);

// 检查缓存状态
const [rate, timestamp, isStale] = await uniswapIntegration.getCacheInfo(tokenIn, tokenOut);

// 清除缓存
await uniswapIntegration.clearCache(tokenIn, tokenOut);
```

### 滑点保护

```javascript
// 设置滑点容忍度（基点）
await uniswapIntegration.setSlippageTolerance(200); // 2%

// 获取当前滑点容忍度
const tolerance = await uniswapIntegration.slippageTolerance();
```

### 价格预言机管理

```javascript
// 设置单个价格预言机
await chainlinkPriceOracle.setPriceFeed(token, priceFeed, symbol);

// 批量设置价格预言机
await chainlinkPriceOracle.batchSetPriceFeeds(tokens, priceFeeds, symbols);

// 检查价格是否过时
const isStale = await chainlinkPriceOracle.isPriceStale(token, maxAge);
```

## 🚨 注意事项

1. **Gas 费用** - 新合约功能更多，部署和操作可能需要更多 gas
2. **价格预言机** - 确保 Sepolia 测试网上的 Chainlink 价格预言机正常工作
3. **缓存机制** - 价格缓存可以提高性能，但需要注意缓存过期时间
4. **滑点保护** - 默认 1% 滑点保护，可根据需要调整
5. **合约验证** - 部署后及时验证合约，便于用户查看源码

## 📞 故障排除

### 常见问题

1. **价格预言机调用失败**
   - 检查 Sepolia 网络连接
   - 确认价格预言机地址正确
   - 检查价格预言机是否正常工作

2. **缓存更新失败**
   - 检查价格预言机配置
   - 确认代币地址正确
   - 检查网络连接

3. **滑点保护触发**
   - 调整滑点容忍度
   - 检查价格波动
   - 考虑使用缓存价格

### 调试命令

```bash
# 检查合约状态
npx hardhat console --network sepolia

# 查看部署日志
npx hardhat run scripts/deploy-sepolia-new.js --network sepolia --verbose

# 运行特定测试
npx hardhat test test/NewContractsTest.js --grep "价格缓存测试"
```

## 📚 相关文档

- [合约文档](./contracts/README.md)
- [测试指南](./test/README.md)
- [前端集成](./../new-frontend/README.md)
- [部署记录管理](./DEPLOYMENT_RECORDING.md) 