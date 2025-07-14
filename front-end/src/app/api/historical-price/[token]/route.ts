import { NextRequest, NextResponse } from 'next/server';

// CoinGecko API 配置
const COINGECKO_BASE_URL = process.env.NEXT_PUBLIC_COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

// 代币映射到 CoinGecko ID
const tokenToCoinGeckoId: { [key: string]: string } = {
  weth: 'ethereum',
  wbtc: 'bitcoin',
  link: 'chainlink',
  dai: 'dai',
  usdc: 'usd-coin',
};

// API 调用限流
let lastApiCall = 0;
const API_RATE_LIMIT_MS = 1000; // 1秒间隔

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  
  if (timeSinceLastCall < API_RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, API_RATE_LIMIT_MS - timeSinceLastCall));
  }
  
  lastApiCall = Date.now();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = COINGECKO_API_KEY;
  }
  
  return fetch(url, { headers });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  let token: string;
  let tokenLower: string;
  
  try {
    const { token: tokenParam } = await params;
    token = tokenParam;
    tokenLower = token.toLowerCase();
    
    console.log(`Historical API: Received request for token: ${token}`);
    
    // 检查是否有对应的 CoinGecko ID
    const coinGeckoId = tokenToCoinGeckoId[tokenLower];
    if (!coinGeckoId) {
      console.log(`No CoinGecko ID found for token: ${token}`);
      return NextResponse.json({ error: 'Token not supported' }, { status: 400 });
    }

    // 如果没有 API 密钥，返回模拟数据
    if (!COINGECKO_API_KEY) {
      console.log(`No CoinGecko API key provided, using simulated data for ${token}`);
      const simulatedData = generateSimulatedHistoricalData(tokenLower);
      return NextResponse.json({ prices: simulatedData });
    }

    console.log(`Fetching historical price for ${token} (${coinGeckoId}) from CoinGecko`);

    // 计算日期范围（过去一年）
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
    
    const from = Math.floor(startDate.getTime() / 1000);
    const to = Math.floor(endDate.getTime() / 1000);

    // 调用 CoinGecko API 获取历史价格
    const response = await rateLimitedFetch(
      `${COINGECKO_BASE_URL}/coins/${coinGeckoId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const prices = data.prices || [];
    
    // 转换数据格式
    const historicalPrices = prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toISOString().split('T')[0],
      price: Math.round(price * 100) / 100 // 限制小数位数为 2 位
    }));

    console.log(`Fetched ${historicalPrices.length} historical prices for ${token}`);

    return NextResponse.json({ prices: historicalPrices });
  } catch (error) {
    console.error(`Failed to fetch historical price for ${token}:`, error);
    
    // 如果 API 调用失败，返回模拟数据
    const simulatedData = generateSimulatedHistoricalData(tokenLower);
    console.log(`Using simulated data for ${token}: ${simulatedData.length} data points`);
    return NextResponse.json({ prices: simulatedData });
  }
}

// 生成模拟历史数据
function generateSimulatedHistoricalData(token: string) {
  const prices: { date: string; price: number }[] = [];
  const endDate = new Date();
  const startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());

  // 生成过去一年的日期（每周一个数据点）
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
    const date = d.toISOString().split('T')[0];
    
    // 模拟价格波动（基于真实代币的典型波动）
    let basePrice = 0;
    let volatility = 0;
    
    switch (token) {
      case 'weth':
        basePrice = 3000;
        volatility = 0.1;
        break;
      case 'wbtc':
        basePrice = 60000;
        volatility = 0.15;
        break;
      case 'link':
        basePrice = 15;
        volatility = 0.2;
        break;
      case 'dai':
        basePrice = 1;
        volatility = 0.02;
        break;
      case 'usdc':
        basePrice = 1;
        volatility = 0.001;
        break;
    }

    // 添加随机波动
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    const price = basePrice * randomFactor;

    prices.push({ date, price: Math.round(price * 100) / 100 });
  }

  return prices;
} 