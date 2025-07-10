# MockFund - DeFi 投资基金平台

基于区块链的智能投资基金平台，支持多资产投资组合、份额代币发行、灵活投资赎回和自动化管理费收取。

## 🚀 快速开始

### 部署到 Sepolia 测试网

1. **配置环境变量**
   ```bash
   # 在 back-end 目录下创建 .env 文件
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   PRIVATE_KEY=your_private_key_here
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   ```

2. **一键部署**
```bash
   # 使用部署脚本
   chmod +x deploy-to-sepolia.sh
   ./deploy-to-sepolia.sh
   
   # 或者手动部署
cd back-end
npm install
   npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

3. **同步前端地址**
```bash
   cd new-frontend
npm install
   npm run sync-addresses
```

4. **启动前端应用**
```bash
npm run dev
```

访问 `http://localhost:3000` 开始使用！

## 📋 功能特性

### 基金特性
- **多资产投资组合**: 50% USDC + 50% 主流代币 (WBTC, WETH, LINK, DAI)
- **份额代币**: 投资获得 MFC 份额代币，1:1 比例
- **灵活赎回**: 随时赎回 MFC 获得 USDC
- **自动管理费**: 每分钟 1% 管理费，仅对流通份额收取
- **固定费率**: 投资和赎回均收取 1% 费用

### 技术特性
- **智能合约**: 基于 Solidity 0.8.20
- **价格预言机**: 支持 Chainlink 和本地模拟
- **Uniswap 集成**: 模拟代币兑换功能
- **前端框架**: Next.js 15 + TypeScript + Tailwind CSS
- **Web3 集成**: Wagmi + Viem + MetaMask

## 🏗️ 项目结构

```
mockFund/
├── back-end/                 # 智能合约后端
│   ├── contracts/           # Solidity 合约
│   ├── scripts/             # 部署和测试脚本
│   ├── test/                # 合约测试
│   └── hardhat.config.js    # Hardhat 配置
├── new-frontend/            # Next.js 前端
│   ├── src/
│   │   ├── app/            # Next.js 应用路由
│   │   ├── components/     # React 组件
│   │   ├── config/         # Web3 配置
│   │   └── contracts/      # 合约 ABI 和地址
│   └── scripts/            # 前端脚本
└── DEPLOYMENT_GUIDE.md     # 详细部署指南
```

## 🔧 开发指南

### 本地开发
```bash
# 启动本地 Hardhat 节点
cd back-end
npx hardhat node

# 部署到本地网络
npx hardhat run scripts/deploy.js --network localhost

# 启动前端
cd new-frontend
npm run dev
```

### 测试
```bash
# 运行合约测试
cd back-end
npx hardhat test

# 测试 Sepolia 部署
npx hardhat run scripts/test-sepolia-deployment.js --network sepolia
```

## 📚 文档

- [部署指南](DEPLOYMENT_GUIDE.md) - 详细的 Sepolia 部署说明
- [后端文档](back-end/README.md) - 智能合约详细文档
- [故障排除](new-frontend/TROUBLESHOOTING.md) - 常见问题解决方案

## 🔒 安全说明

- 本项目仅用于学习和测试目的
- Sepolia 是测试网，代币没有实际价值
- 在生产环境使用前请进行安全审计
- 私钥请妥善保管，不要提交到代码仓库

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License