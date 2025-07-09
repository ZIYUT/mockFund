# 故障排除指南

## 按钮无法点击问题

如果您遇到按钮无法点击或钱包无法交互的问题，请按以下步骤排查：

### 1. 检查浏览器控制台

1. 打开浏览器开发者工具 (F12)
2. 查看 Console 标签页是否有错误信息
3. 查看 Network 标签页是否有请求失败

### 2. 检查 MetaMask 钱包

1. 确保已安装 MetaMask 浏览器扩展
2. 确保 MetaMask 已解锁
3. 检查网络设置：
   - 网络名称: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - 货币符号: ETH

### 3. 测试基础功能

访问以下测试页面验证基础功能：
- `/simple` - 简化测试页面
- `/test` - 基础交互测试

### 4. 常见解决方案

#### 方案 1: 刷新页面
- 硬刷新页面 (Ctrl + F5)
- 清除浏览器缓存

#### 方案 2: 重启开发服务器
```bash
# 停止服务器 (Ctrl + C)
# 然后重新启动
npm run dev
```

#### 方案 3: 检查 Hardhat 网络
确保后端 Hardhat 网络正在运行：
```bash
cd ../back-end
npx hardhat node
```

#### 方案 4: 重新部署合约
如果合约地址不正确：
```bash
cd ../back-end
npx hardhat run scripts/deploy-complete.js --network localhost
```

### 5. 浏览器兼容性

推荐使用以下浏览器：
- Chrome (推荐)
- Firefox
- Edge

避免使用：
- Safari (Web3 支持有限)
- 移动端浏览器

### 6. 网络配置

确保 MetaMask 网络配置正确：
```
网络名称: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
货币符号: ETH
区块浏览器 URL: (留空)
```

### 7. 如果问题仍然存在

1. 检查是否有防火墙阻止本地连接
2. 尝试使用不同的端口
3. 检查是否有其他应用占用 8545 端口
4. 重启计算机

### 8. 调试信息

如果需要更多帮助，请提供以下信息：
- 浏览器版本
- MetaMask 版本
- 控制台错误信息
- 网络配置截图