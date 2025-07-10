# MockFund - DeFi 基金智能合约系统（Sepolia 测试网）

本项目是一个面向 Sepolia 测试网的去中心化基金（DeFi Fund）智能合约系统，支持多资产投资组合、份额代币发行、灵活投资赎回和自动化管理费收取。适合开发者、审计人员和高级用户深入理解和使用。

---

## 目录
- [项目概述](#项目概述)
- [合约架构](#合约架构)
- [基金资产组合构成](#基金资产组合构成)
- [净值计算与投资机制](#净值计算与投资机制)
- [赎回机制](#赎回机制)
- [管理费收取机制](#管理费收取机制)
- [费用结构](#费用结构)
- [部署与配置](#部署与配置)
- [安全特性](#安全特性)
- [开发与配置说明](#开发与配置说明)
- [常见问题与故障排除](#常见问题与故障排除)
- [许可证与贡献](#许可证与贡献)

---

## 项目概述

MockFund 是一个模拟 DeFi 基金，允许用户用 USDC 投资，获得代表基金份额的 MFC 代币。基金资产自动分配到多种主流加密资产，并支持随时赎回。合约自动收取管理费，所有操作公开透明。

**核心特性：**
- ✅ 按照部署时币价初始化基金
- ✅ 动态净值计算和MFC价值评估
- ✅ 实时投资USDC获得对应MFC数量
- ✅ 自动保存部署信息到 `deployments` 目录

---

## 合约架构

- **MockFund.sol**：主基金合约，负责投资、赎回、资产分配、管理费收取、净值计算等核心逻辑。
- **FundShareToken.sol**：MFC 份额代币，ERC20 标准，仅基金合约可铸造/销毁。
- **PriceOracle.sol**：价格预言机，聚合多种资产价格，支持本地模拟和 Chainlink。
- **MockUniswapIntegration.sol**：模拟 Uniswap 兑换，支持资产间兑换。
- **MockTokens.sol / MockUSDC.sol**：模拟主流资产和 USDC，便于本地测试。

---

## 基金资产组合构成

### 资产分配比例
- **USDC**：50%（稳定币储备，保证流动性和低波动）
- **主流代币**：50%（分散投资，提升收益潜力）
  - WBTC：12.5%
  - WETH：12.5%
  - LINK：12.5%
  - DAI：12.5%

### 资产分配逻辑
- 用户投资 USDC 后，合约自动将 USDC 按上述比例分配：
  - 50% 保留为 USDC
  - 50% 按等比例兑换为 4 种主流代币（通过 Uniswap 集成模拟）
- 资产分配比例在合约中固定：
  ```solidity
  uint256 public constant USDC_ALLOCATION = 5000; // 50%
  uint256 public constant TOKEN_ALLOCATION = 5000; // 50%
  ```

---

## 净值计算与投资机制

### 净值计算（NAV）
基金净值基于当前所有资产的市场价值计算：
```solidity
function calculateNAV() public view returns (uint256 nav) {
    // USDC余额
    uint256 usdcBalance = IERC20(getUSDCAddress()).balanceOf(address(this));
    
    // 代币价值（按当前价格计算）
    uint256 tokenValue = 0;
    for (uint256 i = 0; i < supportedTokens.length; i++) {
        address token = supportedTokens[i];
        uint256 tokenBalance = IERC20(token).balanceOf(address(this));
        if (tokenBalance > 0) {
            tokenValue += _getTokenValueInUSDC(token, tokenBalance);
        }
    }
    
    nav = usdcBalance + tokenValue;
}
```

### MFC价值计算
单个MFC的价值 = 基金净值 / 总MFC供应量
```solidity
function calculateMFCValue() public view returns (uint256 mfcValue) {
    uint256 totalSupply = shareToken.totalSupply();
    if (totalSupply == 0) return 0;
    
    uint256 nav = calculateNAV();
    mfcValue = nav / totalSupply;
}
```

### 投资机制
用户投资USDC时，根据当前MFC价值计算能获得的MFC数量：
```solidity
function invest(uint256 _usdcAmount) external {
    // 计算能获得的MFC数量（基于当前净值）
    uint256 mfcValue = calculateMFCValue();
    uint256 mfcToMint = (_usdcAmount * 10**18) / mfcValue;
    
    // 转移USDC并铸造MFC
    IERC20(getUSDCAddress()).safeTransferFrom(msg.sender, address(this), _usdcAmount);
    shareToken.mint(msg.sender, mfcToMint);
}
```

### 投资预览
用户可以预览投资USDC能获得多少MFC：
```solidity
function getInvestmentPreview(uint256 _usdcAmount) external view returns (uint256 mfcAmount) {
    uint256 mfcValue = calculateMFCValue();
    mfcAmount = (_usdcAmount * 10**18) / mfcValue;
}
```

**投资示例：**
- 投资 1000 USDC → 获得约 1000 MFC（基于当前净值）
- 投资 10000 USDC → 获得约 10000 MFC
- 实际获得数量取决于当前基金净值和MFC价值

---

## 赎回机制

### 赎回流程
1. 用户调用 `redeem(uint256 mfcAmount)`，赎回指定数量的 MFC。
2. 合约根据当前资产净值和价格预言机，计算 MFC 对应的 USDC 价值。
3. 扣除赎回管理费后，将 USDC 转账给用户。
4. 销毁用户赎回的 MFC。

#### 赎回细节
- 赎回时，合约会自动将所需资产兑换为 USDC（通过 Uniswap 集成模拟）。
- 赎回金额需大于最小赎回额（100 USDC）。
- 赎回价格基于实时资产净值和预言机价格，确保公平。

#### 示例代码
```js
// 赎回 1000 MFC
await mockFund.redeem(ethers.utils.parseEther("1000"));
```

---

## 管理费收取机制

### 管理费类型
- **管理费**：对流通中的 MFC 份额按1%费率收取，按天计提。
- **赎回管理费**：用户赎回时，按赎回金额收取1%管理费。

### 管理费参数（固定费率）
- 年化管理费率：**固定为1%**（不可更改）
  ```solidity
  uint256 public managementFeeRate = 100; // 1%
  ```
- 赎回费率：**固定为1%**（不可更改）
- 计费周期：每天自动计提一次管理费。

### 管理费收取逻辑
1. **管理费**
   - 合约每天自动计算流通 MFC 份额的 1% 费率，折算为每天应收金额。
   - 管理费以 USDC 形式从基金资产中扣除，优先使用 USDC，不足时自动卖出其他代币补足。
   - 管理费累计到合约，由所有者提取。

2. **赎回管理费**
   - 用户赎回时，自动从赎回金额中扣除 1% 作为管理费。
   - 剩余 USDC 返还用户。

---

## 费用结构
- **管理费**：1%（固定）
- **赎回费**：1%（固定）
- **最小投资**：100 USDC
- **最小赎回**：100 USDC

---

## 部署与配置

### 快速部署

1. **环境配置**
   ```bash
   # 创建 .env 文件
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
   PRIVATE_KEY=your_private_key_here
   ```

2. **增强版部署（推荐）**
   ```bash
   npx hardhat run scripts/deploy-sepolia-enhanced.js --network sepolia
   ```

3. **简化版部署（备用）**
   ```bash
   npx hardhat run scripts/deploy-sepolia-simple.js --network sepolia
   ```

### 部署信息保存
部署完成后，合约地址自动保存到 `deployments/sepolia-enhanced-deployment.json`：
```json
{
  "network": "sepolia",
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

### 测试功能
```bash
# 测试投资计算
npx hardhat run scripts/test-investment-calculation.js --network sepolia

# 获取测试代币
npx hardhat run scripts/mint-test-tokens.js --network sepolia
```

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

### 本地测试与部署
- 使用 Hardhat 进行本地测试
- 支持一键部署到 Sepolia 测试网
- 提供模拟代币和价格预言机，便于开发调试

---

## 常见问题与故障排除

### 部署问题
1. **execution reverted**：检查账户ETH余额，尝试简化版部署
2. **初始化失败**：检查代币价格设置和Uniswap集成

### 投资计算问题
1. **净值计算错误**：检查基金是否已初始化
2. **MFC价值异常**：验证价格预言机数据

### 调试命令
```bash
# 检查合约状态
npx hardhat console --network sepolia

# 查看交易详情
npx hardhat verify --network sepolia 0xCONTRACT_ADDRESS
```

---

## 许可证与贡献

本项目采用 MIT 许可证。欢迎提交 Issue 和 Pull Request 来改进项目。

---

## 更新日志

### v2.0.0 (最新)
- ✅ 添加净值计算功能
- ✅ 实现动态MFC价值评估
- ✅ 优化投资计算逻辑
- ✅ 自动保存部署信息
- ✅ 增强版部署脚本
- ✅ 完整的测试套件

### v1.0.0
- 基础基金功能
- 固定费率管理
- 简单投资赎回