# Sepolia 部署指南

## 准备工作

### 1. 环境变量配置
在 `back-end` 目录下创建 `.env` 文件：

```bash
# Sepolia Testnet Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Optional: Gas reporting
REPORT_GAS=true
```

### 2. 获取测试币
- 从 [Sepolia Faucet](https://sepoliafaucet.com/) 获取测试 ETH
- 确保账户有足够的 ETH 支付部署费用

## 部署步骤

### 1. 编译合约
```bash
cd back-end
npx hardhat compile
```

### 2. 部署到 Sepolia
```bash
npx hardhat run scripts/deploy-with-real-prices.js --network sepolia
```

### 3. 验证部署结果
部署完成后，脚本会输出：
- 所有合约地址
- 基金统计信息
- 前端配置代码

## 前端集成

### 1. 更新合约地址
将部署脚本输出的合约地址复制到 `new-frontend/src/contracts/addresses.ts`：

```typescript
export const CONTRACT_ADDRESSES = {
  11155111: { // Sepolia
    MOCK_FUND: "部署的MockFund地址",
    FUND_SHARE_TOKEN: "部署的FundShareToken地址",
    PRICE_ORACLE: "部署的PriceOracle地址",
    MOCK_UNISWAP_INTEGRATION: "部署的MockUniswapIntegration地址",
    MOCK_USDC: "部署的MockUSDC地址",
    MOCK_WETH: "部署的MockWETH地址",
    MOCK_WBTC: "部署的MockWBTC地址",
    MOCK_LINK: "部署的MockLINK地址",
    MOCK_DAI: "部署的MockDAI地址"
  }
};
```

### 2. 更新代币配置
更新 `SUPPORTED_TOKENS` 配置：

```typescript
export const SUPPORTED_TOKENS = {
  USDC: {
    symbol: 'USDC',
    name: 'Mock USD Coin',
    decimals: 6,
    address: '部署的MockUSDC地址'
  },
  WETH: {
    symbol: 'WETH',
    name: 'Mock Wrapped Ether',
    decimals: 18,
    address: '部署的MockWETH地址'
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Mock Wrapped Bitcoin',
    decimals: 8,
    address: '部署的MockWBTC地址'
  },
  LINK: {
    symbol: 'LINK',
    name: 'Mock Chainlink Token',
    decimals: 18,
    address: '部署的MockLINK地址'
  },
  DAI: {
    symbol: 'DAI',
    name: 'Mock Dai Stablecoin',
    decimals: 18,
    address: '部署的MockDAI地址'
  }
};
```

### 3. 启动前端
```bash
cd new-frontend
npm install
npm run dev
```

## 测试功能

### 1. 连接钱包
- 确保钱包连接到 Sepolia 网络
- 连接 MetaMask 或其他 Web3 钱包

### 2. 获取测试代币
- 使用前端的 "Get Test Tokens" 功能
- 或者直接调用合约的 `mint` 函数

### 3. 测试投资功能
- 批准 USDC 给基金合约
- 输入投资金额
- 点击投资按钮

### 4. 测试赎回功能
- 查看 MFC 余额
- 输入赎回数量
- 点击赎回按钮

### 5. 查看基金信息
- 基金净值 (NAV)
- MFC 价值
- 投资组合分配
- 管理费信息

## 合约验证

### 1. 在 Etherscan 验证合约
```bash
npx hardhat verify --network sepolia 合约地址 构造函数参数
```

### 2. 验证示例
```bash
# 验证 MockUSDC
npx hardhat verify --network sepolia 0x... 部署者地址

# 验证 MockFund
npx hardhat verify --network sepolia 0x... "MockFund Coin" "MFC" 部署者地址 100 价格预言机地址 Uniswap集成地址
```

## 监控和调试

### 1. 查看部署信息
部署信息保存在 `back-end/deployments/sepolia-real-prices.json`

### 2. 监控交易
- 在 [Sepolia Etherscan](https://sepolia.etherscan.io/) 查看交易
- 监控合约事件和状态变化

### 3. 常见问题
- **Gas 费用不足**: 确保账户有足够的 ETH
- **网络连接问题**: 检查 RPC URL 配置
- **合约调用失败**: 检查合约地址和 ABI 是否正确

## 安全注意事项

1. **私钥安全**: 不要将私钥提交到代码仓库
2. **测试网络**: 这是测试网络，不要使用真实资金
3. **合约权限**: 部署者是合约所有者，拥有管理权限
4. **价格预言机**: 使用 Sepolia 的真实价格预言机地址

## 下一步

1. 测试所有功能正常工作
2. 监控基金表现
3. 收集用户反馈
4. 优化用户体验
5. 准备主网部署 