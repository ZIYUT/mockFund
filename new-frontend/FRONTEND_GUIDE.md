# MockFund 前端使用指南

## 🚀 快速开始

### 1. 启动前端
```bash
cd new-frontend
npm run dev
```

前端将在 http://localhost:3000 启动

### 2. 连接钱包
1. 确保您的钱包（如 MetaMask）已安装
2. 切换到 Sepolia 测试网
3. 点击"连接 MetaMask"按钮
4. 授权连接

### 3. 获取测试代币
由于您需要 USDC 进行投资，请联系管理员获取测试 USDC：

```bash
# 管理员可以使用以下命令为您铸造测试 USDC
cd back-end
npx hardhat run scripts/mint-test-usdc.js --network sepolia <您的钱包地址> [数量]
```

例如：
```bash
npx hardhat run scripts/mint-test-usdc.js --network sepolia 0x1234... 1000
```

## 💰 投资流程

### 1. 授权 USDC
- 在投资前，需要先授权基金合约使用您的 USDC
- 输入授权金额（建议 1000 USDC）
- 点击"授权 USDC"按钮
- 在钱包中确认交易

### 2. 投资 USDC
- 输入投资金额（最小 100 USDC）
- 查看预期获得的 MFC 数量
- 点击"确认投资"按钮
- 在钱包中确认交易

### 3. 查看投资结果
- 投资成功后，您将获得相应的 MFC 代币
- 可以在"赎回"标签页查看您的 MFC 余额

## 🔄 赎回流程

### 1. 赎回 MFC
- 切换到"赎回"标签页
- 输入要赎回的 MFC 数量
- 查看赎回预览（包括 1% 赎回费）
- 点击"确认赎回"按钮
- 在钱包中确认交易

### 2. 查看赎回结果
- 赎回成功后，您将收到相应的 USDC
- 赎回的 MFC 将被销毁

## 📊 基金信息

### 基金概览
- **基金净值**: 基金总资产价值
- **MFC价值**: 单个 MFC 的 USDC 价值
- **投资组合**: 50% USDC + 50% 其他代币
- **管理费率**: 1%

### 支持的代币
- WBTC (Wrapped Bitcoin)
- WETH (Wrapped Ether)
- LINK (Chainlink)
- DAI (Dai Stablecoin)

## 🔧 故障排除

### 常见问题

1. **钱包连接失败**
   - 确保钱包已安装并解锁
   - 确保连接到 Sepolia 测试网
   - 检查浏览器控制台是否有错误

2. **交易失败**
   - 确保有足够的 Sepolia ETH 支付 gas 费
   - 检查 USDC 余额是否充足
   - 检查授权额度是否足够

3. **余额不更新**
   - 等待交易确认（通常需要 10-30 秒）
   - 刷新页面或等待自动更新

### 获取测试币

1. **Sepolia ETH**: 从 [Sepolia Faucet](https://sepoliafaucet.com/) 获取
2. **测试 USDC**: 联系管理员铸造

## 📱 合约地址

- **MockFund**: 0x92053436b6D0758EcFb765C86a71b2dC4228DEa0
- **FundShareToken**: 0xA7b9E425e9D2A5c9E484B45c15bc44F4b9fB2842
- **MockUSDC**: 0x3664cB1F94442d995f9Ae62062CB26f5A77F58CB

## 🔗 有用链接

- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [合约验证页面](https://sepolia.etherscan.io/address/0x92053436b6D0758EcFb765C86a71b2dC4228DEa0#code)

## 🎯 测试建议

1. **小额测试**: 先用小额 USDC 测试投资和赎回功能
2. **检查余额**: 每次操作后检查钱包中的代币余额
3. **查看交易**: 在 Etherscan 上查看交易详情
4. **记录操作**: 记录每次操作的结果，便于调试

## 📞 技术支持

如果遇到问题，请：
1. 检查浏览器控制台错误信息
2. 查看交易哈希和状态
3. 联系管理员获取帮助 