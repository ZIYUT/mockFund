# MockFund 部署指南

## 概述

本指南将帮助您将 MockFund 智能合约部署到 Sepolia 测试网，并实现按照当时币价初始化基金的功能。

## 功能特性

- ✅ 按照部署时的币价初始化基金
- ✅ 发行100万USDC的MFC（保留50%USDC + 50%其他代币）
- ✅ 动态计算投资USDC能获得的MFC数量
- ✅ 实时净值计算和价格更新
- ✅ 自动保存部署信息到 `deployments` 目录

## 部署前准备

### 1. 环境配置

创建 `.env` 文件并配置以下环境变量：

```bash
# Sepolia 测试网配置
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=your_private_key_here

# 可选：Etherscan API Key（用于合约验证）
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

### 2. 获取测试网ETH

在 Sepolia 测试网上需要一些 ETH 来支付 gas 费用：
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Faucet](https://sepoliafaucet.com/)

### 3. 安装依赖

```bash
npm install
```

## 部署步骤

### 方法一：增强版部署（推荐）

使用增强版部署脚本，按照当时币价初始化基金：

```bash
npx hardhat run scripts/deploy-sepolia-enhanced.js --network sepolia
```

**特点：**
- 按照部署时的币价购买代币
- 自动计算MFC价值
- 完整的初始化流程
- 详细的验证和测试

### 方法二：简化版部署

如果增强版部署失败，可以使用简化版：

```bash
npx hardhat run scripts/deploy-sepolia-simple.js --network sepolia
```

**特点：**
- 跳过代币交换步骤
- 直接铸造代币给基金
- 避免初始化失败

## 部署信息

部署完成后，合约地址将保存在 `deployments/sepolia-enhanced-deployment.json` 文件中：

```json
{
  "network": "sepolia",
  "deployer": "0x...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "contracts": {
    "MockUSDC": "0x...",
    "MockFund": "0x...",
    "FundShareToken": "0x...",
    "PriceOracle": "0x...",
    "MockUniswapIntegration": "0x..."
  },
  "fundInfo": {
    "initialNAV": "1000000.0",
    "initialMFCValue": "1.0",
    "totalSupply": "1000000.0",
    "isInitialized": true
  }
}
```

## 测试功能

### 1. 投资计算测试

测试不同USDC投资金额能获得多少MFC：

```bash
npx hardhat run scripts/test-investment-calculation.js --network sepolia
```

### 2. 获取测试代币

如果需要测试代币：

```bash
npx hardhat run scripts/mint-test-tokens.js --network sepolia
```

## 投资示例

部署完成后，投资者可以：

1. **投资 1000 USDC** → 获得约 1000 MFC（基于当前净值）
2. **投资 10000 USDC** → 获得约 10000 MFC
3. **赎回 MFC** → 获得对应的USDC价值

## 合约验证

部署后验证合约（可选）：

```bash
npx hardhat verify --network sepolia 0xCONTRACT_ADDRESS "参数1" "参数2" ...
```

## 前端集成

部署完成后，更新前端配置文件：

1. 复制 `deployments/sepolia-enhanced-deployment.json` 中的合约地址
2. 更新前端配置文件中的地址
3. 测试前端功能

## 故障排除

### 常见问题

1. **部署失败：execution reverted**
   - 检查账户是否有足够的ETH
   - 尝试使用简化版部署脚本

2. **初始化失败**
   - 检查代币价格设置
   - 确保Uniswap集成有足够代币

3. **投资计算错误**
   - 检查基金是否已初始化
   - 验证净值计算逻辑

### 调试命令

```bash
# 检查合约状态
npx hardhat console --network sepolia

# 查看交易详情
npx hardhat verify --network sepolia 0xCONTRACT_ADDRESS
```

## 安全注意事项

1. **私钥安全**：不要在代码中硬编码私钥
2. **测试网**：Sepolia是测试网，不要使用真实资金
3. **合约验证**：部署后及时验证合约代码
4. **权限管理**：注意合约的权限设置

## 支持

如果遇到问题，请检查：
1. 网络连接是否正常
2. 账户余额是否充足
3. 环境变量是否正确配置
4. 合约代码是否有语法错误 