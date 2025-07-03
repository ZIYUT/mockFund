# Mock Fund - DeFi Smart Contract and Next.js Frontend

一个去中心化基金管理系统，使用Solidity智能合约和Next.js前端构建。用户可以存入稳定币，系统会自动通过Uniswap将资金分散投资到多种代币，并获得相应的基金份额代币。

## 🏗️ 项目结构

```
mock-fund/
├── back-end/              # 智能合约和后端逻辑
│   ├── contracts/         # Solidity智能合约
│   ├── scripts/           # 部署脚本
│   ├── test/             # 合约测试
│   ├── hardhat.config.js # Hardhat配置
│   └── package.json      # 后端依赖
├── front-end/             # Next.js前端应用
│   ├── src/              # 源代码
│   │   ├── app/          # Next.js App Router
│   │   ├── components/   # React组件
│   │   ├── hooks/        # 自定义hooks
│   │   └── utils/        # 工具函数
│   └── package.json      # 前端依赖
├── vercel.json           # Vercel部署配置
└── README.md             # 项目文档
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- MetaMask 浏览器扩展

### 安装依赖

```bash
# 安装后端依赖
cd back-end
npm install

# 安装前端依赖
cd ../front-end
npm install
```

### 开发环境

1. **启动本地区块链**
   ```bash
   cd back-end
   npm run node
   ```

2. **编译智能合约**
   ```bash
   npm run compile
   ```

3. **部署到本地网络**
   ```bash
   npm run deploy:localhost
   ```

4. **启动前端开发服务器**
   ```bash
   cd ../front-end
   npm run dev
   ```

### 部署到Sepolia测试网

1. **配置环境变量**
   ```bash
   cd back-end
   cp .env.example .env
   # 编辑 .env 文件，添加你的私钥和RPC URL
   ```

2. **部署合约**
   ```bash
   npm run deploy:sepolia
   ```

### 前端部署到Vercel

项目已配置好Vercel部署，只需：

1. 将代码推送到GitHub
2. 在Vercel中导入项目
3. Vercel会自动识别配置并部署前端

## 🔧 技术栈

### 后端
- **Hardhat**: 以太坊开发环境
- **Solidity**: 智能合约语言
- **OpenZeppelin**: 安全的智能合约库
- **Chainlink**: 价格预言机和自动化
- **Uniswap V3**: DEX集成

### 前端
- **Next.js 14**: React框架
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **RainbowKit**: 钱包连接
- **Wagmi**: React hooks for Ethereum
- **Ethers.js**: 以太坊交互库

## 📋 开发计划

### 阶段1: 智能合约开发 ✅
- [x] 项目结构搭建
- [ ] 基础合约开发
- [ ] Uniswap集成
- [ ] Chainlink集成
- [ ] 安全审计

### 阶段2: 前端开发
- [ ] Web3连接
- [ ] 用户界面
- [ ] 合约交互
- [ ] 数据可视化

### 阶段3: 测试与部署
- [ ] 单元测试
- [ ] 集成测试
- [ ] Sepolia部署
- [ ] 前端部署

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License