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

// 价格缓存
const priceCache: { [key: string]: { price: number; timestamp: number } } = {};
const CACHE_DURATION = 30000; // 30秒缓存

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
  try {
    const { token } = await params;
    const tokenLower = token.toLowerCase();
    
    console.log(`API: Received request for token: ${token}`);
    
    // 检查是否有对应的 CoinGecko ID
    const coinGeckoId = tokenToCoinGeckoId[tokenLower];
    if (!coinGeckoId) {
      console.log(`No CoinGecko ID found for token: ${token}`);
      // 返回默认价格
      const fallbackPrices: { [key: string]: number } = {
        weth: 3000,
        wbtc: 60000,
        link: 15,
        dai: 1,
        usdc: 1,
      };
      const fallbackPrice = fallbackPrices[tokenLower] || 0;
      console.log(`API: Returning fallback price for ${token}: ${fallbackPrice}`);
      return NextResponse.json({ price: fallbackPrice });
    }

    // 检查缓存
    const cached = priceCache[tokenLower];
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`Using cached price for ${token}: ${cached.price}`);
      return NextResponse.json({ price: cached.price });
    }

    // 如果没有 API 密钥，直接返回默认价格
    if (!COINGECKO_API_KEY) {
      console.log(`No CoinGecko API key provided, using default prices for ${token}`);
      const fallbackPrices: { [key: string]: number } = {
        weth: 3000,
        wbtc: 60000,
        link: 15,
        dai: 1,
        usdc: 1,
      };
      const fallbackPrice = fallbackPrices[tokenLower] || 0;
      return NextResponse.json({ price: fallbackPrice });
    }

    console.log(`Fetching price for ${token} (${coinGeckoId}) from CoinGecko`);

    // 调用 CoinGecko API
    const response = await rateLimitedFetch(
      `${COINGECKO_BASE_URL}/simple/price?ids=${coinGeckoId}&vs_currencies=usd`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data[coinGeckoId]?.usd || 0;
    
    // 限制小数位数为 2 位
    const formattedPrice = Math.round(price * 100) / 100;

    // 缓存价格
    priceCache[tokenLower] = {
      price: formattedPrice,
      timestamp: now
    };

    console.log(`Fetched price for ${token}: ${formattedPrice}`);

    return NextResponse.json({ price: formattedPrice });
  } catch (error) {
    console.error(`Failed to fetch price for ${token}:`, error);
    
    // 如果 API 调用失败，返回默认价格
    const fallbackPrices: { [key: string]: number } = {
      weth: 3000,
      wbtc: 60000,
      link: 15,
      dai: 1,
      usdc: 1,
    };
    
    const fallbackPrice = fallbackPrices[tokenLower] || 0;
    console.log(`Using fallback price for ${token}: ${fallbackPrice}`);
    return NextResponse.json({ price: fallbackPrice });
  }
} 