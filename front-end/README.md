# MockFund 前端应用

这是一个基于 Next.js 的 DeFi 投资基金前端应用，支持在 Sepolia 测试网上进行投资和赎回操作。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量示例文件：

```bash
cp env.example .env.local
```

编辑 `.env.local` 文件，配置以下环境变量：

```bash
# Alchemy API 密钥 - 用于访问 Sepolia 测试网
# 获取地址: https://www.alchemy.com/
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here

# CoinGecko API 密钥 - 用于获取代币价格
# 获取地址: https://www.coingecko.com/en/api
NEXT_PUBLIC_COINGECKO_API_KEY=your_coingecko_api_key_here

# CoinGecko API 基础 URL
NEXT_PUBLIC_COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🔧 环境变量说明

### 必需的环境变量

- `NEXT_PUBLIC_ALCHEMY_API_KEY`: Alchemy API 密钥，用于访问 Sepolia 测试网
- `NEXT_PUBLIC_COINGECKO_API_KEY`: CoinGecko API 密钥，用于获取代币价格

### 可选的环境变量

- `NEXT_PUBLIC_COINGECKO_BASE_URL`: CoinGecko API 基础 URL（默认: https://api.coingecko.com/api/v3）

## 🚀 部署到 Vercel

### 1. 准备部署

确保您的代码已推送到 GitHub 仓库。

### 2. 在 Vercel 中配置环境变量

在 Vercel 项目设置中添加以下环境变量：

- `NEXT_PUBLIC_ALCHEMY_API_KEY`
- `NEXT_PUBLIC_COINGECKO_API_KEY`
- `NEXT_PUBLIC_COINGECKO_BASE_URL`

### 3. 部署

Vercel 会自动检测 Next.js 项目并部署。

## 📚 更多信息

- [Next.js 文档](https://nextjs.org/docs)
- [Vercel 部署文档](https://nextjs.org/docs/app/building-your-application/deploying)
- [项目使用指南](./FRONTEND_GUIDE.md)
