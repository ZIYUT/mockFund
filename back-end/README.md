# MockFund - DeFi 基金智能合约系统（Sepolia 测试网）

本项目是一个面向 Sepolia 测试网的去中心化基金（DeFi Fund）智能合约系统，支持多资产投资组合、份额代币发行、灵活投资赎回和自动化管理费收取。适合开发者、审计人员和高级用户深入理解和使用。

---

## 目录
- [项目概述](#项目概述)
- [合约架构](#合约架构)
- [基金资产组合构成](#基金资产组合构成)
- [份额发行与投资方式](#份额发行与投资方式)
- [赎回机制](#赎回机制)
- [管理费收取机制](#管理费收取机制)
- [费用结构](#费用结构)
- [安全特性](#安全特性)
- [开发与配置说明](#开发与配置说明)
- [常见问题与故障排除](#常见问题与故障排除)
- [许可证与贡献](#许可证与贡献)

---

## 项目概述

MockFund 是一个模拟 DeFi 基金，允许用户用 USDC 投资，获得代表基金份额的 MFC 代币。基金资产自动分配到多种主流加密资产，并支持随时赎回。合约自动收取管理费，所有操作公开透明。

---

## 合约架构

- **MockFund.sol**：主基金合约，负责投资、赎回、资产分配、管理费收取等核心逻辑。
- **FundShareToken.sol**：MFC 份额代币，ERC20 标准，仅基金合约可铸造/销毁。
- **PriceOracle.sol**：价格预言机，聚合多种资产价格，支持本地模拟和 Chainlink。
- **MockUniswapIntegration.sol**：模拟 Uniswap 兑换，支持资产间兑换。
- **MockTokens.sol / MockUSDC.sol**：模拟主流资产和 USDC，便于本地测试。

---

## 基金资产组合构成

### 资产分配比例
- **USDC**：50%（稳定币储备，保证流动性和低波动）
- **主流代币**：50%（分散投资，提升收益潜力）
  - WBTC：10%
  - WETH：10%
  - LINK：10%
  - UNI：10%
  - DAI：10%

### 资产分配逻辑
- 用户投资 USDC 后，合约自动将 USDC 按上述比例分配：
  - 50% 保留为 USDC
  - 50% 按等比例兑换为 5 种主流代币（通过 Uniswap 集成模拟）
- 资产分配比例可在合约常量中调整：
  ```solidity
  uint256 public constant USDC_ALLOCATION = 5000; // 50%
  uint256 public constant TOKEN_ALLOCATION = 5000; // 50%
  ```
- 支持的代币可扩展，需在 MockTokens.sol 和部署脚本中注册。

### 资产再平衡
- 合约支持手动或自动再平衡，确保实际资产分布与目标比例一致。
- 再平衡可由所有者发起，或定期自动执行（可选）。

---

## 份额发行与投资方式

### 份额代币（MFC）
- **MFC**（MockFund Coin）为 ERC20 代币，代表用户在基金中的份额。
- 仅基金合约可铸造和销毁 MFC。
- 1 USDC 投资 = 1 MFC 份额（初始发行比例，实际可根据资产净值调整）。

### 投资流程
1. 用户调用 `invest(uint256 usdcAmount)`，用 USDC 投资。
2. 合约校验投资金额（最小 10 USDC），并转入基金。
3. 合约按比例分配资产，并铸造等额 MFC 给用户。
4. 用户可随时查询持有的 MFC 余额。

#### 示例代码
```js
// 投资 1000 USDC
await mockFund.invest(ethers.utils.parseUnits("1000", 6));
```

### 发行与初始配置
- 部署时由所有者初始化基金，设置支持的代币、价格预言机、Uniswap 集成等。
- 初始可预铸部分 MFC 作为流动性或激励。

---

## 赎回机制

### 赎回流程
1. 用户调用 `redeem(uint256 mfcAmount)`，赎回指定数量的 MFC。
2. 合约根据当前资产净值和价格预言机，计算 MFC 对应的 USDC 价值。
3. 扣除赎回管理费后，将 USDC 转账给用户。
4. 销毁用户赎回的 MFC。

#### 赎回细节
- 赎回时，合约会自动将所需资产兑换为 USDC（通过 Uniswap 集成模拟）。
- 赎回金额需大于最小赎回额（10 USDC）。
- 赎回价格基于实时资产净值和预言机价格，确保公平。

#### 示例代码
```js
// 赎回 1000 MFC
await mockFund.redeem(ethers.utils.parseEther("1000"));
```

---

## 管理费收取机制

### 管理费类型
- **年化管理费**：对流通中的 MFC 份额按年化费率收取，按分钟计提。
- **赎回管理费**：用户赎回时，按赎回金额收取一定比例的管理费。

### 管理费参数
- 年化管理费率（默认 2%，可配置）：
  ```solidity
  uint256 public managementFeeRate = 200; // 2%（以 basis points 计，10000 = 100%）
  ```
- 赎回费率（默认 0.5%，可配置）：
  ```solidity
  uint256 public redemptionFeeRate = 50; // 0.5%
  ```
- 计费周期：每分钟自动计提一次年化管理费。

### 管理费收取逻辑
1. **年化管理费**
   - 合约每分钟自动计算流通 MFC 份额的 2% 年化费率，折算为每分钟应收金额。
   - 管理费以 USDC 形式从基金资产中扣除，优先使用 USDC，不足时自动卖出其他代币补足。
   - 管理费累计到合约，由所有者提取。
   - 相关事件：`ManagementFeeCollected(uint256 amount, uint256 timestamp, uint256 totalFees)`

2. **赎回管理费**
   - 用户赎回时，自动从赎回金额中扣除 0.5% 作为管理费。
   - 剩余 USDC 返还用户。

#### 管理费收取示例
```solidity
function _collectManagementFee() internal {
    if (block.timestamp < lastFeeCollection + MANAGEMENT_FEE_INTERVAL) return;
    uint256 circulatingSupply = getCirculatingSupply();
    uint256 feeAmount = (circulatingSupply * managementFeeRate) / BASIS_POINTS;
    // ...
    // 从USDC余额或卖出代币收取管理费
    // 累计管理费
    totalManagementFeesCollected += feeAmount;
    lastFeeCollection = block.timestamp;
    emit ManagementFeeCollected(feeAmount, block.timestamp, totalManagementFeesCollected);
}
```

---

## 费用结构
- **年化管理费**：2%（可配置）
- **赎回费**：0.5%（可配置）
- **最小投资**：10 USDC
- **最小赎回**：10 USDC

---

## 安全特性
- **重入攻击防护**：使用 OpenZeppelin ReentrancyGuard
- **暂停机制**：所有者可紧急暂停合约
- **权限控制**：onlyOwner 修饰符保护关键操作
- **滑点保护**：兑换时可设置最大滑点
- **价格有效性检查**：预言机价格需在有效期内

---

## 开发与配置说明

### 添加新代币
1. 在 `MockTokens.sol` 添加新代币合约
2. 在部署脚本注册新代币
3. 在 `MockFund.sol` 添加支持
4. 更新价格预言机配置

### 修改资产分配比例
编辑 `MockFund.sol` 常量：
```solidity
uint256 public constant USDC_ALLOCATION = 5000; // 50%
uint256 public constant TOKEN_ALLOCATION = 5000; // 50%
```

### 调整费用参数
```solidity
managementFeeRate = 200; // 2%
redemptionFeeRate = 50;   // 0.5%
```

### 本地测试与部署
- 使用 Hardhat 进行本地测试
- 支持一键部署到 Sepolia 测试网
- 提供模拟代币和价格预言机，便于开发调试

---

## 常见问题与故障排除

1. **Gas 费用过高**
   - 检查 Sepolia 网络状态
   - 调整 hardhat.config.js 中的 gasPrice
2. **交易失败**
   - 确保账户有足够 ETH 支付 gas
   - 检查代币余额是否充足
3. **价格数据错误**
   - 验证 MockPriceFeed 配置
   - 检查价格预言机设置

### 调试脚本
```bash
npm run debug-investment
```

---

## 许可证与贡献

- MIT License
- 欢迎提交 Issue 和 Pull Request
- 有问题请通过 GitHub Issues 联系