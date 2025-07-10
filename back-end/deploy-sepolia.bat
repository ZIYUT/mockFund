@echo off
echo ========================================
echo    MockFund Sepolia 部署脚本
echo ========================================
echo.

echo 正在检查环境变量...
if not exist .env (
    echo 错误: 未找到 .env 文件
    echo 请按照 DEPLOY_TO_SEPOLIA.md 创建 .env 文件
    pause
    exit /b 1
)

echo 正在编译合约...
call npx hardhat compile
if errorlevel 1 (
    echo 编译失败！
    pause
    exit /b 1
)

echo.
echo 正在部署到 Sepolia...
call npx hardhat run scripts/deploy-with-real-prices.js --network sepolia
if errorlevel 1 (
    echo 部署失败！
    pause
    exit /b 1
)

echo.
echo ========================================
echo    部署完成！
echo ========================================
echo.
echo 请将输出的合约地址复制到前端配置文件中
echo 然后启动前端进行测试
echo.
pause 