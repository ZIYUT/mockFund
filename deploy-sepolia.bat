@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    MockFund Sepolia 部署脚本
echo ========================================
echo.

:: 检查是否在正确的目录
if not exist "back-end\package.json" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    echo 当前目录应包含 back-end 文件夹
    pause
    exit /b 1
)

:: 进入back-end目录
cd back-end

:: 检查.env文件
if not exist ".env" (
    echo ⚠️  警告: .env 文件不存在
    echo 正在复制 .env.example 到 .env...
    copy ".env.example" ".env" >nul
    echo.
    echo ✅ 已创建 .env 文件
    echo 📝 请编辑 .env 文件，填入以下信息:
    echo    - SEPOLIA_RPC_URL (Infura或Alchemy的RPC URL)
    echo    - PRIVATE_KEY (您的私钥，以0x开头)
    echo    - ETHERSCAN_API_KEY (可选，用于合约验证)
    echo.
    echo 💡 获取测试ETH: https://sepoliafaucet.com/
    echo 💡 获取测试代币: https://faucets.chain.link/sepolia
    echo.
    pause
    echo 请配置完 .env 文件后重新运行此脚本
    pause
    exit /b 1
)

echo 🔍 检查环境配置...
echo.

:: 检查Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Node.js
    echo 请安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 已安装

:: 检查npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 npm
    pause
    exit /b 1
)

echo ✅ npm 已安装

:: 安装依赖
echo.
echo 📦 安装依赖包...
npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

echo ✅ 依赖安装完成

:: 编译合约
echo.
echo 🔨 编译智能合约...
npm run compile
if errorlevel 1 (
    echo ❌ 合约编译失败
    pause
    exit /b 1
)

echo ✅ 合约编译完成

:: 部署到Sepolia
echo.
echo 🚀 部署到 Sepolia 测试网...
echo 这可能需要几分钟时间，请耐心等待...
echo.
npm run deploy:sepolia
if errorlevel 1 (
    echo ❌ 部署失败
    echo.
    echo 💡 常见问题解决方案:
    echo    1. 检查 .env 文件中的 SEPOLIA_RPC_URL 是否正确
    echo    2. 检查 PRIVATE_KEY 是否以 0x 开头
    echo    3. 确保账户有足够的 Sepolia ETH (至少 0.1 ETH)
    echo    4. 检查网络连接是否正常
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ 部署成功完成！
echo.

:: 询问是否运行测试
set /p "run_test=是否运行功能测试? (y/n): "
if /i "%run_test%"=="y" (
    echo.
    echo 🧪 运行功能测试...
    echo 这将测试投资、赎回和管理费功能...
    echo.
    npm run test:sepolia
    if errorlevel 1 (
        echo ⚠️  测试过程中出现错误
        echo 这可能是因为账户代币余额不足
        echo 请从水龙头获取测试代币: https://faucets.chain.link/sepolia
    ) else (
        echo ✅ 所有测试通过！
    )
)

echo.
echo 🎉 操作完成！
echo.
echo 📁 生成的文件:
if exist "sepolia-deployment.json" (
    echo    ✅ sepolia-deployment.json - 部署信息
)
if exist "sepolia-test-results.json" (
    echo    ✅ sepolia-test-results.json - 测试结果
)

echo.
echo 📋 下一步操作:
echo    1. 查看 sepolia-deployment.json 获取合约地址
echo    2. 在 Sepolia 区块浏览器查看合约: https://sepolia.etherscan.io/
echo    3. 获取测试代币进行更多测试: https://faucets.chain.link/sepolia
echo.
echo 📚 更多信息请查看:
echo    - SEPOLIA_DEPLOYMENT_GUIDE.md - 详细部署指南
echo    - SEPOLIA_QUICKSTART.md - 快速开始指南
echo.
pause