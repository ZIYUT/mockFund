# Mock Fund - DeFi Investment Fund

A decentralized investment fund smart contract with React frontend that allows users to deposit stablecoins, automatically diversifies investments across multiple tokens via Uniswap V3, and issues proportional share tokens.

一个去中心化基金管理系统，使用Solidity智能合约和Next.js前端构建。用户可以存入稳定币，系统会自动通过Uniswap将资金分散投资到多种代币，并获得相应的基金份额代币。

## 🌟 Features / 功能特性

### Smart Contract Features / 智能合约功能
- **Multi-token Investment** / **多代币投资**: Automatically swaps 50% of deposits into diversified token portfolio (WETH, WBTC, LINK) / 自动将50%的存款交换为多样化代币组合
- **Share Token System** / **份额代币系统**: ERC-20 fund share tokens representing proportional ownership / ERC-20基金份额代币代表比例所有权
- **Flexible Withdrawals** / **灵活赎回**: Partial or full redemptions with automatic token liquidation / 部分或全部赎回，自动代币清算
- **Management Fees** / **管理费**: Time-based management fee collection (2% annually) / 基于时间的管理费收取（年化2%）
- **NAV Calculation** / **NAV计算**: Real-time Net Asset Value calculation using price oracles / 使用价格预言机实时计算净资产价值
- **Uniswap Integration** / **Uniswap集成**: Automated token swapping with slippage protection / 自动代币交换，带滑点保护
- **Security** / **安全性**: ReentrancyGuard, Pausable, and Ownable security features / 重入保护、可暂停和所有权安全功能

### Frontend Features / 前端功能
- **Fund Dashboard** / **基金仪表板**: Real-time fund composition and performance metrics / 实时基金组成和性能指标
- **Investment Interface** / **投资界面**: Easy deposit and withdrawal functionality / 简单的存取款功能
- **Portfolio Visualization** / **投资组合可视化**: Interactive charts showing fund allocation and NAV history / 显示基金分配和NAV历史的交互式图表
- **Wallet Integration** / **钱包集成**: MetaMask connection with multi-network support / MetaMask连接，支持多网络
- **Real-time Data** / **实时数据**: Live updates of fund statistics and user balances / 基金统计和用户余额的实时更新

## 🏗️ Architecture / 架构

### Smart Contracts / 智能合约
- `MockFund.sol` - Main fund contract with investment/redemption logic / 主基金合约，包含投资/赎回逻辑
- `FundShareToken.sol` - ERC-20 share token representing fund ownership / ERC-20份额代币代表基金所有权
- `MockUniswapIntegration.sol` - Uniswap V3 integration for token swapping / Uniswap V3集成用于代币交换
- `PriceOracle.sol` - Price feed oracle for NAV calculations / 价格预言机用于NAV计算
- `MockTokens.sol` - Factory for deploying test tokens (WETH, WBTC, LINK, UNI) / 部署测试代币的工厂
- `MockUSDC.sol` - Test USDC stablecoin / 测试USDC稳定币

### Frontend Components / 前端组件
- React with Next.js framework / React与Next.js框架
- Wagmi for Ethereum interactions / Wagmi用于以太坊交互
- TailwindCSS for styling / TailwindCSS用于样式
- Chart.js for data visualization / Chart.js用于数据可视化
- Real-time price feeds from CoinGecko API / 来自CoinGecko API的实时价格数据

## 📁 Project Structure / 项目结构

```
mockFund/
├── back-end/              # Smart contracts and backend logic / 智能合约和后端逻辑
│   ├── contracts/         # Solidity smart contracts / Solidity智能合约
│   ├── scripts/           # Deployment scripts / 部署脚本
│   ├── test/             # Contract tests / 合约测试
│   ├── hardhat.config.js # Hardhat configuration / Hardhat配置
│   └── package.json      # Backend dependencies / 后端依赖
├── front-end/             # Next.js frontend application / Next.js前端应用
│   ├── src/              # Source code / 源代码
│   │   ├── app/          # Next.js App Router / Next.js应用路由
│   │   ├── components/   # React components / React组件
│   │   ├── hooks/        # Custom hooks / 自定义hooks
│   │   ├── contracts/    # Contract ABIs and addresses / 合约ABI和地址
│   │   └── lib/          # Utility functions / 工具函数
│   └── package.json      # Frontend dependencies / 前端依赖
└── README.md             # Project documentation / 项目文档
```

## 🚀 Installation / 安装

### Prerequisites / 前置要求
- Node.js (v18 or higher) / Node.js（v18或更高版本）
- npm or yarn / npm或yarn
- MetaMask browser extension / MetaMask浏览器扩展
- Git

### Backend Setup / 后端设置

1. Clone the repository / 克隆仓库:
```bash
git clone <repository-url>
cd mockFund
```

2. Install backend dependencies / 安装后端依赖:
```bash
cd back-end
npm install
```

3. Compile contracts / 编译合约:
```bash
npx hardhat compile
```

4. Run tests / 运行测试:
```bash
npx hardhat test
```

### Frontend Setup / 前端设置

1. Install frontend dependencies / 安装前端依赖:
```bash
cd ../front-end
npm install
```

2. Start development server / 启动开发服务器:
```bash
npm run dev
```

## 🔧 Local Development / 本地开发

### 1. Start Local Blockchain / 启动本地区块链

```bash
cd back-end
npx hardhat node
```

This starts a local Hardhat network on `http://localhost:8545` / 这将在`http://localhost:8545`启动本地Hardhat网络

### 2. Deploy Contracts / 部署合约

```bash
npx hardhat run scripts/deploy-complete.js --network localhost
```

This deploys all contracts and configures the fund with / 这将部署所有合约并配置基金:
- USDC as the base stablecoin / USDC作为基础稳定币
- WETH (20%), WBTC (20%), LINK (10%) target allocations / WETH (20%), WBTC (20%), LINK (10%)目标分配
- 2% annual management fee / 2%年度管理费

### 3. Configure MetaMask / 配置MetaMask

1. Add Hardhat network to MetaMask / 将Hardhat网络添加到MetaMask:
   - Network Name / 网络名称: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - Currency Symbol / 货币符号: ETH

2. Import test accounts using private keys from Hardhat node output / 使用Hardhat节点输出的私钥导入测试账户

### 4. Start Frontend / 启动前端

```bash
cd front-end
npm run dev
```

Access the application at `http://localhost:3000` / 在`http://localhost:3000`访问应用

## 📖 Usage / 使用方法

### For Investors / 投资者

1. **Connect Wallet** / **连接钱包**: Click "Connect Wallet" and select MetaMask / 点击"连接钱包"并选择MetaMask
2. **Get Test Tokens** / **获取测试代币**: Use the "Get Test USDC" button to mint test tokens / 使用"获取测试USDC"按钮铸造测试代币
3. **Invest** / **投资**: Enter USDC amount and click "Invest" (minimum 100 USDC) / 输入USDC金额并点击"投资"（最低100 USDC）
4. **Monitor** / **监控**: View your share balance and fund performance in real-time / 实时查看您的份额余额和基金表现
5. **Redeem** / **赎回**: Enter share amount to redeem and receive USDC back / 输入要赎回的份额金额并收回USDC

### For Fund Managers / 基金管理者

1. **Collect Fees** / **收取费用**: Use management interface to collect accrued fees / 使用管理界面收取应计费用
2. **Add Tokens** / **添加代币**: Add new supported tokens with target allocations / 添加新的支持代币及目标分配
3. **Update Allocations** / **更新分配**: Modify target portfolio allocations / 修改目标投资组合分配
4. **Pause/Unpause** / **暂停/恢复**: Emergency controls for fund operations / 基金操作的紧急控制

## 🧪 Testing / 测试

### Smart Contract Tests / 智能合约测试

```bash
cd back-end
npx hardhat test
```

Test coverage includes / 测试覆盖包括:
- Investment and redemption flows / 投资和赎回流程
- Token swapping and portfolio rebalancing / 代币交换和投资组合重新平衡
- Management fee calculations / 管理费计算
- NAV calculations / NAV计算
- Access controls and security features / 访问控制和安全功能

## 🚀 Deployment / 部署

### Testnet Deployment (Sepolia) / 测试网部署（Sepolia）

1. Configure environment variables / 配置环境变量:
```bash
cp .env.example .env
# Add your private key and Infura/Alchemy API key
# 添加您的私钥和Infura/Alchemy API密钥
```

2. Deploy to Sepolia / 部署到Sepolia:
```bash
npx hardhat run scripts/deploy-complete.js --network sepolia
```

3. Verify contracts / 验证合约:
```bash
npx hardhat run scripts/verify.js --network sepolia
```

4. Update frontend contract addresses / 更新前端合约地址 in `front-end/src/contracts/addresses.ts`

## 🔒 Security Considerations / 安全考虑

- **Reentrancy Protection** / **重入保护**: All external calls protected with ReentrancyGuard / 所有外部调用都受ReentrancyGuard保护
- **Access Controls** / **访问控制**: Owner-only functions for critical operations / 关键操作的仅所有者功能
- **Slippage Protection** / **滑点保护**: Configurable slippage tolerance for swaps / 可配置的交换滑点容忍度
- **Pausable** / **可暂停**: Emergency pause functionality / 紧急暂停功能
- **Input Validation** / **输入验证**: Comprehensive parameter validation / 全面的参数验证

## ⚠️ Known Limitations / 已知限制

- Uses mock price oracles (replace with Chainlink for production) / 使用模拟价格预言机（生产环境请替换为Chainlink）
- Simplified Uniswap integration (consider more sophisticated routing) / 简化的Uniswap集成（考虑更复杂的路由）
- Basic fee structure (could implement performance fees) / 基本费用结构（可以实施绩效费用）
- Limited to predefined token set / 限于预定义的代币集

## 🤝 Contributing / 贡献

1. Fork the repository / 分叉仓库
2. Create a feature branch / 创建功能分支
3. Make changes with tests / 进行更改并添加测试
4. Submit a pull request / 提交拉取请求

## 📄 License / 许可证

MIT License - see LICENSE file for details / MIT许可证 - 详情请参阅LICENSE文件

## 🆘 Support / 支持

For questions and support, please open an issue in the GitHub repository. / 如有问题和支持需求，请在GitHub仓库中开启issue。