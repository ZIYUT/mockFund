# MockFund - DeFi 投资基金平台

基于区块链的智能投资基金平台，支持多资产投资组合、份额代币发行、灵活投资赎回和自动化管理费收取。

## 🚀 快速开始

### 部署到 Sepolia 测试网 (推荐)

**Windows 用户 - 一键部署:**
```bash
# 双击运行批处理文件
deploy-sepolia.bat
```

**手动部署:**

1. **环境准备**
   ```bash
   cd back-end
   cp .env.example .env
   # 编辑 .env 文件，填入:
   # SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   # PRIVATE_KEY=0xyour_private_key_here
   ```

2. **获取测试资源**
   - Sepolia ETH: [Sepolia Faucet](https://sepoliafaucet.com/)
   - 测试代币: [Chainlink Faucet](https://faucets.chain.link/sepolia)

3. **部署和测试**
   ```bash
   npm install
   npm run compile
   npm run deploy:sepolia    # 部署合约
   npm run test:sepolia      # 运行测试
   ```

4. **启动前端**
   ```bash
   cd ../new-frontend
   npm install
   npm run sync-addresses
   npm run dev
   ```

访问 `http://localhost:3000` 开始使用！

### 本地开发

```bash
# 启动本地节点
cd back-end
npm run node

# 部署到本地 (新终端)
npm run test:local

# 启动前端
cd ../new-frontend
npm run dev
```

## 📋 功能特性

### 基金特性
- **多资产投资组合**: 50% USDC (保留) + 50% 主流代币 (WBTC 12.5%, WETH 12.5%, LINK 12.5%, DAI 12.5%)
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

### Sepolia 测试网
- [Sepolia 快速开始](back-end/SEPOLIA_QUICKSTART.md) - 快速部署指南
- [Sepolia 详细指南](back-end/SEPOLIA_DEPLOYMENT_GUIDE.md) - 完整部署说明
- [一键部署脚本](deploy-sepolia.bat) - Windows 批处理脚本

### 开发文档
- [部署指南](DEPLOYMENT_GUIDE.md) - 通用部署说明
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