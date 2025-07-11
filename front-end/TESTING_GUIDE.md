# Mock Fund DApp 本地测试指南

## 🚀 快速开始

### 1. 确保服务正在运行

**后端 - Hardhat 本地节点:**
```bash
cd back-end
npx hardhat node
```
- 应该看到账户列表和私钥
- 监听端口: http://127.0.0.1:8545

**前端 - Next.js 开发服务器:**
```bash
cd front-end
npm run dev
```
- 访问地址: http://localhost:3000
- 测试页面: http://localhost:3000/test

### 2. 钱包配置

#### 方法一：使用 Hardhat 提供的测试账户
1. 打开 MetaMask 或其他钱包
2. 添加自定义网络:
   - **网络名称**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **链ID**: 31337
   - **货币符号**: ETH

3. 导入测试账户（使用 Hardhat 提供的私钥）:
   - 第一个账户私钥: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - 第二个账户私钥: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

#### 方法二：使用现有钱包
1. 确保钱包连接到 Hardhat 本地网络 (Chain ID: 31337)
2. 如果没有测试 ETH，可以从 Hardhat 账户转账

### 3. 获取测试代币

1. 连接钱包到 DApp
2. 点击 "获取测试USDC" 按钮
3. 确认交易
4. 等待交易确认（本地网络通常很快）

### 4. 故障排除

#### 问题：余额显示为 0 或无法获取

**检查清单:**
- [ ] Hardhat 节点是否正在运行？
- [ ] 钱包是否连接到正确的网络 (Chain ID: 31337)？
- [ ] 合约是否已部署？运行 `npm run deploy` 重新部署
- [ ] 前端配置是否正确？检查 `src/contracts/addresses.ts`

**调试步骤:**
1. 访问测试页面: http://localhost:3000/test
2. 检查连接状态和合约信息
3. 查看浏览器控制台的错误信息
4. 检查网络请求是否成功

#### 问题：交易确认超时

**可能原因:**
- 网络拥堵（本地网络不太可能）
- Gas 费用不足
- 合约地址错误

**解决方案:**
1. 检查钱包中的待处理交易
2. 取消卡住的交易并重试
3. 重启 Hardhat 节点和前端服务器

#### 问题：合约连接失败

**检查步骤:**
1. 确认合约地址正确
2. 检查 ABI 文件是否最新
3. 验证网络配置

### 5. 测试流程

1. **连接钱包** → 确保显示正确的地址和网络
2. **获取测试代币** → USDC 余额应该增加
3. **投资基金** → 输入金额并确认交易
4. **查看份额** → 应该显示 MFS 代币余额
5. **赎回操作** → 测试赎回功能

### 6. 重要提示

⚠️ **仅用于本地测试**
- 这些是测试网络和测试代币
- 不要在主网使用这些合约
- 私钥是公开的，不要发送真实资金

🔄 **重置环境**
如果遇到问题，可以重置整个环境:
```bash
# 停止所有服务
# 重启 Hardhat 节点
cd back-end
npx hardhat node

# 重新部署合约
npm run deploy

# 重启前端
cd ../front-end
npm run dev
```

### 7. 技术细节

**合约地址 (本地部署):**
- Mock USDC: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Mock Fund: `0x8A791620dd6260079BF849Dc5567aDC3F2FdC318`
- Fund Share Token: `0x8aCd85898458400f7Db866d53FCFF6f0D49741FF`

**网络配置:**
- Chain ID: 31337
- RPC URL: http://127.0.0.1:8545
- Block Explorer: 无（本地网络）

如果仍有问题，请检查浏览器控制台的详细错误信息。