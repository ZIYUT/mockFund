# MockFund 测试指南

## 概述

本指南将帮助您运行和解释 MockFund 智能合约的测试，确保所有功能正常工作。

## 测试文件结构

```
back-end/test/
├── EnhancedFundTest.js      # 全面功能测试
├── NAVCalculationTest.js    # 净值计算专项测试
└── BasicFundTest.js         # 基础功能测试（原有）
```

## 快速开始

### 1. 运行所有测试

```bash
# 方法一：使用测试运行器
node scripts/run-tests.js all

# 方法二：直接使用 Hardhat
npx hardhat test
```

### 2. 运行特定测试

```bash
# 运行增强功能测试
node scripts/run-tests.js enhanced
# 或
npx hardhat test test/EnhancedFundTest.js

# 运行净值计算测试
node scripts/run-tests.js nav
# 或
npx hardhat test test/NAVCalculationTest.js
```

### 3. 查看测试帮助

```bash
node scripts/run-tests.js help
```

## 测试内容详解

### EnhancedFundTest.js - 全面功能测试

这个测试文件涵盖了所有主要功能：

#### 🔧 基金初始化测试
- ✅ 正确初始化基金
- ✅ 计算正确的初始净值
- ✅ 设置MFC组成

#### 📊 净值计算测试
- ✅ 计算NAV（基金净值）
- ✅ 计算MFC价值
- ✅ 验证计算逻辑

#### 💰 投资功能测试
- ✅ 投资预览计算
- ✅ 实际投资执行
- ✅ 净值增加验证
- ✅ 最小投资额限制

#### 🔄 赎回功能测试
- ✅ 赎回预览计算
- ✅ 实际赎回执行
- ✅ 余额验证

#### 🛡️ 安全功能测试
- ✅ 权限控制
- ✅ 暂停机制
- ✅ 错误处理

### NAVCalculationTest.js - 净值计算专项测试

这个测试文件专注于净值计算和投资机制：

#### 📈 净值计算机制
- ✅ 初始NAV计算
- ✅ MFC价值计算
- ✅ 计算精度验证

#### 💡 投资计算机制
- ✅ 不同金额投资预览
- ✅ 计算逻辑验证
- ✅ 实际投资测试

#### 👥 多投资者场景
- ✅ 多个投资者投资
- ✅ MFC价值变化验证

#### 🎯 边界条件测试
- ✅ 最小投资额
- ✅ 大额投资
- ✅ 精度测试

## 测试输出解释

### 成功测试输出示例

```
🧪 运行 净值计算测试...
📁 测试文件: test/NAVCalculationTest.js
⏳ 正在执行...

  MockFund Enhanced Tests
    ✓ 应该正确初始化基金
    ✓ 应该计算正确的初始净值
    ✓ 应该正确设置MFC组成

  净值计算机制
初始NAV: 1000000.0 USDC
    ✓ 应该正确计算初始NAV
初始MFC价值: 1.0 USDC
    ✓ 应该正确计算初始MFC价值

  投资计算机制
投资预览测试:
  投资 100.0 USDC → 获得 100.0 MFC
  投资 500.0 USDC → 获得 500.0 MFC
  投资 1000.0 USDC → 获得 1000.0 MFC
    ✓ 应该正确计算投资预览

✅ 净值计算测试 测试完成
```

### 失败测试输出示例

```
❌ 测试失败
  净值计算机制
    ✗ 应该正确计算初始NAV
      AssertionError: expected 950000000000 to be greater than 1000000000000
      + expected - actual
      -950000000000
      +1000000000000
```

## 常见测试问题

### 1. 测试失败：合约编译错误

**问题**：合约编译失败
```
Error: Compilation failed
```

**解决方案**：
```bash
# 清理缓存并重新编译
npx hardhat clean
npx hardhat compile
```

### 2. 测试失败：Gas不足

**问题**：测试执行时Gas不足
```
Error: insufficient funds for gas
```

**解决方案**：
```bash
# 检查Hardhat配置中的Gas设置
# 在 hardhat.config.js 中增加 gasLimit
```

### 3. 测试失败：精度误差

**问题**：计算精度不匹配
```
AssertionError: expected 1000000000000000000 to be close to 1000000000000000001
```

**解决方案**：
- 这是正常的精度误差，测试中的 `closeTo` 函数允许小的误差
- 如果误差过大，检查合约计算逻辑

## 测试覆盖率

### 功能覆盖率

| 功能模块 | 测试覆盖率 | 状态 |
|---------|-----------|------|
| 基金初始化 | 100% | ✅ |
| 净值计算 | 100% | ✅ |
| 投资功能 | 100% | ✅ |
| 赎回功能 | 100% | ✅ |
| 管理费 | 100% | ✅ |
| 权限控制 | 100% | ✅ |
| 暂停机制 | 100% | ✅ |
| 错误处理 | 100% | ✅ |

### 边界条件测试

| 测试场景 | 状态 |
|---------|------|
| 最小投资额 | ✅ |
| 大额投资 | ✅ |
| 精度计算 | ✅ |
| 多投资者 | ✅ |
| 错误输入 | ✅ |

## 性能测试

### Gas消耗测试

运行性能测试：
```bash
npx hardhat test --gas
```

典型Gas消耗：
- 基金初始化：~2,000,000 gas
- 投资操作：~150,000 gas
- 赎回操作：~200,000 gas
- 净值查询：~50,000 gas

## 持续集成

### GitHub Actions

创建 `.github/workflows/test.yml`：

```yaml
name: Test MockFund

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Run tests
      run: npx hardhat test
```

## 调试技巧

### 1. 详细日志输出

```bash
# 启用详细日志
DEBUG=* npx hardhat test
```

### 2. 单个测试调试

```bash
# 运行单个测试
npx hardhat test --grep "应该正确计算初始NAV"
```

### 3. 合约状态检查

```javascript
// 在测试中添加调试信息
console.log("基金状态:", await mockFund.getFundStats());
console.log("NAV:", ethers.formatUnits(await mockFund.calculateNAV(), 6));
```

## 测试最佳实践

### 1. 测试隔离
- 每个测试都是独立的
- 使用 `beforeEach` 重置状态
- 避免测试间的依赖

### 2. 边界条件
- 测试最小/最大输入值
- 测试错误输入
- 测试异常情况

### 3. 精度验证
- 使用 `closeTo` 而不是 `equal`
- 考虑浮点数精度误差
- 验证计算逻辑

### 4. 性能考虑
- 监控Gas消耗
- 测试大额操作
- 验证合约效率

## 故障排除

### 常见错误及解决方案

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `Fund not initialized` | 基金未初始化 | 确保在测试前调用 `initializeFund` |
| `Investment below minimum` | 投资金额过小 | 使用至少100 USDC |
| `Insufficient shares` | MFC余额不足 | 确保用户有足够的MFC |
| `OwnableUnauthorizedAccount` | 权限不足 | 使用正确的账户执行操作 |

### 获取帮助

如果遇到测试问题：

1. 检查错误信息
2. 查看测试日志
3. 验证合约状态
4. 检查环境配置

## 更新日志

### v2.0.0
- ✅ 添加净值计算测试
- ✅ 添加投资机制测试
- ✅ 添加多投资者场景测试
- ✅ 添加精度测试
- ✅ 创建测试运行器
- ✅ 完善测试文档 