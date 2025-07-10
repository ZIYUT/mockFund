# Mock Fund - Sepolia 测试网版本

这是一个专为 Sepolia 测试网设计的 DeFi 基金智能合约系统。该系统实现了固定比例资产组合的投资基金，支持 USDC 投资和赎回。

## 项目概述

Mock Fund 是一个模拟的 DeFi 基金，具有以下特点：

- **固定资产组合**: 50% USDC + 50% 其他代币（WBTC、WETH、LINK、UNI、DAI）
- **1:1 投资比例**: 1 USDC = 1 MFC（基金份额代币）
- **模拟价格预言机**: 使用 MockPriceFeed 提供实时价格数据
- **模拟 Uniswap 集成**: 使用 MockUniswapIntegration 进行代币交换
- **管理费机制**: 支持年化管理费收取

## 合约架构

### 核心合约

1. **MockFund.sol** - 主基金合约
   - 管理投资和赎回逻辑
   - 维护固定资产组合
   - 处理管理费收取

2. **FundShareToken.sol** - 基金份额代币 (MFC)
   - ERC20 代币，代表基金份额
   - 仅基金合约可以铸造和销毁

3. **PriceOracle.sol** - 价格预言机
   - 聚合多个 MockPriceFeed 的价格数据
   - 提供代币价值计算功能

### 模拟合约

4. **MockPriceFeed.sol** - 模拟价格预言机
   - 提供可配置的代币价格
   - 支持价格波动模拟

5. **MockUniswapIntegration.sol** - 模拟 Uniswap 集成
   - 模拟代币交换功能
   - 支持可配置的交换比率

6. **MockTokens.sol** - 模拟代币集合
   - MockWETH, MockWBTC, MockLINK, MockUNI, MockDAI
   - 每个代币都有 faucet 功能

7. **MockUSDC.sol** - 模拟 USDC
   - 6位小数精度的稳定币
   - 支持批量铸造和 faucet

## 快速开始

### 环境要求

- Node.js 16+
- npm 或 yarn
- Hardhat

### 安装依赖

```bash
cd back-end
npm install
```

### 环境配置

创建 `.env` 文件：

```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 编译合约

```bash
npm run compile
```

### 部署到 Sepolia 测试网

```bash
npm run deploy:sepolia
```

### 获取测试代币

```bash
npm run mint-tokens
```

## 使用指南

### 1. 投资

用户可以通过以下方式投资：

```javascript
// 投资 1000 USDC
await mockFund.invest(ethers.utils.parseUnits("1000", 6));
```

### 2. 赎回

用户可以通过以下方式赎回：

```javascript
// 赎回 1000 MFC
await mockFund.redeem(ethers.utils.parseEther("1000"));
```

### 3. 获取测试代币

```javascript
// 获取 USDC
await mockUSDC.getTestTokens();

// 获取其他代币
await mockWETH.getTestTokens();
await mockWBTC.getTestTokens();
await mockLINK.getTestTokens();
await mockUNI.getTestTokens();
await mockDAI.getTestTokens();
```

### 4. 查看基金状态

```javascript
// 获取基金统计
const [totalSupply, initialSupply, isInitialized] = await mockFund.getFundStats();

// 获取支持的代币
const supportedTokens = await mockFund.getSupportedTokens();

// 获取 MFC 组成
const [tokens, ratios, usdcAmount] = await mockFund.getMFCComposition();
```

## 测试

运行测试套件：

   ```bash
npm test
```

## 合约验证

部署后验证合约：

   ```bash
npm run verify:sepolia
   ```
   
## 资产分配

基金采用固定比例分配：

- **50% USDC**: 保持稳定币储备
- **50% 其他代币**: 平均分配给 5 种代币
  - 10% WBTC
  - 10% WETH  
  - 10% LINK
  - 10% UNI
  - 10% DAI

## 费用结构

- **管理费**: 年化 2%（可配置）
- **赎回费**: 0.5%（可配置）
- **最小投资**: 10 USDC
- **最小赎回**: 10 USDC

## 安全特性

- 重入攻击防护
- 暂停机制
- 权限控制
- 滑点保护
- 价格有效性检查

## 开发说明

### 添加新代币

1. 在 `MockTokens.sol` 中添加新的代币合约
2. 在部署脚本中部署新代币
3. 在 `MockFund.sol` 中添加代币支持
4. 更新价格预言机配置

### 修改资产分配

编辑 `MockFund.sol` 中的常量：

```solidity
uint256 public constant USDC_ALLOCATION = 5000; // 50%
uint256 public constant TOKEN_ALLOCATION = 5000; // 50%
```

### 调整费用

```solidity
managementFeeRate = 200; // 2%
redemptionFeeRate = 50;  // 0.5%
```

## 故障排除

### 常见问题

1. **Gas 费用过高**
   - 检查 Sepolia 网络状态
   - 调整 hardhat.config.js 中的 gasPrice

2. **交易失败**
   - 确保账户有足够的 ETH 支付 gas
   - 检查代币余额是否充足

3. **价格数据错误**
   - 验证 MockPriceFeed 配置
   - 检查价格预言机设置

### 调试脚本

```bash
npm run debug-investment
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请通过 GitHub Issues 联系我们。