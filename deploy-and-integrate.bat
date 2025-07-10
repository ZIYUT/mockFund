@echo off
echo ========================================
echo    MockFund 一键部署和集成脚本
echo ========================================
echo.

echo 步骤 1: 检查环境变量...
cd back-end
if not exist .env (
    echo 错误: 未找到 .env 文件
    echo 请按照 DEPLOY_TO_SEPOLIA.md 创建 .env 文件
    pause
    exit /b 1
)

echo 步骤 2: 编译合约...
call npx hardhat compile
if errorlevel 1 (
    echo 编译失败！
    pause
    exit /b 1
)

echo.
echo 步骤 3: 部署到 Sepolia...
call npx hardhat run scripts/deploy-with-real-prices.js --network sepolia
if errorlevel 1 (
    echo 部署失败！
    pause
    exit /b 1
)

echo.
echo 步骤 4: 同步地址到前端...
cd ..
cd new-frontend
call node scripts/sync-sepolia-addresses.js
if errorlevel 1 (
    echo 地址同步失败！
    pause
    exit /b 1
)

echo.
echo 步骤 5: 安装前端依赖...
call npm install
if errorlevel 1 (
    echo 依赖安装失败！
    pause
    exit /b 1
)

echo.
echo ========================================
echo    部署和集成完成！
echo ========================================
echo.
echo 🎉 所有步骤已完成！
echo.
echo 📋 下一步操作：
echo 1. 启动前端: npm run dev
echo 2. 连接 MetaMask 到 Sepolia 网络
echo 3. 获取测试代币
echo 4. 测试投资和赎回功能
echo.
echo 📖 详细说明请查看：
echo - back-end/DEPLOY_TO_SEPOLIA.md
echo - new-frontend/README.md
echo.
pause 