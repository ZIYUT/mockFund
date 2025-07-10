@echo off
chcp 65001 >nul
echo 🚀 MockFund 一键部署脚本
echo ==========================

REM 检查环境变量
if "%PRIVATE_KEY%"=="" (
    echo ❌ 错误：请设置 PRIVATE_KEY 环境变量
    echo    例如：set PRIVATE_KEY=your_private_key_here
    pause
    exit /b 1
)

if "%SEPOLIA_RPC_URL%"=="" (
    echo ❌ 错误：请设置 SEPOLIA_RPC_URL 环境变量
    echo    例如：set SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
    pause
    exit /b 1
)

echo ✅ 环境变量检查通过
echo 📡 网络：Sepolia 测试网
echo 🔑 部署账户：%PRIVATE_KEY:~0,10%...
echo.

REM 检查依赖
echo 📦 检查依赖...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未找到 npm，请先安装 npm
    pause
    exit /b 1
)

echo ✅ 依赖检查通过

REM 安装依赖
echo 📦 安装依赖...
call npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

echo ✅ 依赖安装完成

REM 编译合约
echo 🔨 编译合约...
call npx hardhat compile
if errorlevel 1 (
    echo ❌ 合约编译失败
    pause
    exit /b 1
)

echo ✅ 合约编译完成

REM 执行部署
echo 🚀 开始部署到 Sepolia 测试网...
echo ⏳ 这可能需要几分钟时间，请耐心等待...
echo.

call npx hardhat run scripts/deploy-sepolia-enhanced.js --network sepolia

if errorlevel 1 (
    echo.
    echo ❌ 部署失败！
    echo ==========================
    echo 💡 建议：
    echo 1. 检查账户是否有足够的 ETH 支付 gas 费用
    echo 2. 检查网络连接是否正常
    echo 3. 尝试使用简化版部署脚本：
    echo    npx hardhat run scripts/deploy-sepolia-simple.js --network sepolia
    echo.
    echo 🔍 查看详细错误信息：
    echo    npx hardhat run scripts/deploy-sepolia-enhanced.js --network sepolia --verbose
    pause
    exit /b 1
) else (
    echo.
    echo 🎉 部署成功！
    echo ==========================
    echo 📁 部署信息已保存到：deployments/sepolia-enhanced-deployment.json
    echo.
    echo 📋 下一步：
    echo 1. 查看部署信息文件获取合约地址
    echo 2. 运行测试脚本验证功能
    echo 3. 更新前端配置文件
    echo 4. 开始测试投资和赎回功能
    echo.
    echo 🧪 运行测试：
    echo    npx hardhat run scripts/test-investment-calculation.js --network sepolia
    echo.
    echo 💰 获取测试代币：
    echo    npx hardhat run scripts/mint-test-tokens.js --network sepolia
)

pause 