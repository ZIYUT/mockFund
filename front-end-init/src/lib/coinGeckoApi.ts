/**
 * CoinGecko API 集成
 * 提供免费的加密货币价格数据
 * 支持环境变量配置和数据缓存
 */

import { cacheManager } from './cacheManager';

// 从环境变量获取配置
const COINGECKO_BASE_URL = process.env.NEXT_PUBLIC_COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
const API_RATE_LIMIT_MS = parseInt(process.env.NEXT_PUBLIC_API_RATE_LIMIT_MS || '1000');

// API 调用限流
let lastApiCall = 0;

/**
 * API 调用限流函数
 */
async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  
  if (timeSinceLastCall < API_RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, API_RATE_LIMIT_MS - timeSinceLastCall));
  }
  
  lastApiCall = Date.now();
  
  // 添加 API 密钥（如果配置了）
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {})
  };
  
  if (COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = COINGECKO_API_KEY;
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}

// 支持的代币列表 - 直接使用 CoinGecko ID
export const SUPPORTED_TOKENS = {
  ETHEREUM: 'ethereum',
  BITCOIN: 'bitcoin', 
  CHAINLINK: 'chainlink',
  UNISWAP: 'uniswap',
  DAI: 'dai',
  USDC: 'usd-coin',
} as const;

// 代币显示名称映射
export const TOKEN_DISPLAY_NAMES = {
  [SUPPORTED_TOKENS.ETHEREUM]: 'ETH',
  [SUPPORTED_TOKENS.BITCOIN]: 'BTC',
  [SUPPORTED_TOKENS.CHAINLINK]: 'LINK',
  [SUPPORTED_TOKENS.UNISWAP]: 'UNI',
  [SUPPORTED_TOKENS.DAI]: 'DAI',
  [SUPPORTED_TOKENS.USDC]: 'USDC',
} as const;

// 代币颜色配置
export const TOKEN_COLORS = {
  [SUPPORTED_TOKENS.ETHEREUM]: '#627EEA',
  [SUPPORTED_TOKENS.BITCOIN]: '#F7931A',
  [SUPPORTED_TOKENS.CHAINLINK]: '#375BD2',
  [SUPPORTED_TOKENS.UNISWAP]: '#FF007A',
  [SUPPORTED_TOKENS.DAI]: '#F5AC37',
  [SUPPORTED_TOKENS.USDC]: '#2775CA',
} as const;

// 价格数据接口
export interface CoinGeckoPriceData {
  id: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  last_updated: string;
}

// 历史价格数据接口
export interface CoinGeckoHistoricalData {
  prices: [number, number][]; // [timestamp, price]
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

/**
 * 获取多个代币的当前价格（带缓存）
 */
export async function getCurrentPrices(coinIds: string[]): Promise<Record<string, number>> {
  try {
    if (coinIds.length === 0) {
      console.warn('No coin IDs provided');
      return {};
    }
    
    // 检查缓存
    const cachedData = cacheManager.getCachedPrices(coinIds);
    if (cachedData) {
      console.log('Using cached price data');
      return cachedData;
    }
    
    console.log('Fetching fresh price data from CoinGecko');
    const response = await rateLimitedFetch(
      `${COINGECKO_BASE_URL}/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true`
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 直接返回 CoinGecko 数据
    const result: Record<string, number> = {};
    coinIds.forEach(coinId => {
      if (data[coinId]) {
        result[coinId] = data[coinId].usd;
      }
    });
    
    // 缓存结果
    cacheManager.setCachedPrices(coinIds, result);
    
    return result;
  } catch (error) {
    console.error('Failed to fetch prices from CoinGecko:', error);
    
    // 尝试返回缓存的数据（即使过期）
    const cachedData = cacheManager.getCachedPrices(coinIds);
    if (cachedData) {
      console.warn('Using expired cached data due to API error');
      return cachedData;
    }
    
    return {};
  }
}

/**
 * 获取单个代币的历史价格数据（带缓存）
 */
export async function getHistoricalPrices(
  coinId: string,
  days: number = 365
): Promise<[number, number][]> {
  try {
    // 检查缓存
    const cachedData = cacheManager.getCachedHistoricalPrices(coinId, days);
    if (cachedData) {
      console.log(`Using cached historical data for ${coinId}`);
      return cachedData;
    }
    
    console.log(`Fetching fresh historical data for ${coinId}`);
    const response = await rateLimitedFetch(
      `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data: CoinGeckoHistoricalData = await response.json();
    
    // 缓存结果
    cacheManager.setCachedHistoricalPrices(coinId, days, data.prices);
    
    return data.prices;
  } catch (error) {
    console.error('Failed to fetch historical prices from CoinGecko:', error);
    
    // 尝试返回缓存的数据（即使过期）
    const cachedData = cacheManager.getCachedHistoricalPrices(coinId, days);
    if (cachedData) {
      console.warn(`Using expired cached historical data for ${coinId} due to API error`);
      return cachedData;
    }
    
    return [];
  }
}

/**
 * 获取多个代币的历史价格数据（带缓存）
 */
export async function getBatchHistoricalPrices(
  coinIds: string[],
  days: number = 365
): Promise<Record<string, [number, number][]>> {
  // 检查缓存
  const cachedData = cacheManager.getCachedBatchHistoricalPrices(coinIds, days);
  if (cachedData) {
    console.log('Using cached batch historical data');
    return cachedData;
  }
  
  console.log('Fetching fresh batch historical data');
  const result: Record<string, [number, number][]> = {};
  
  // 并行获取所有代币的历史数据
  const promises = coinIds.map(async (coinId) => {
    const prices = await getHistoricalPrices(coinId, days);
    return { coinId, prices };
  });
  
  try {
    const results = await Promise.all(promises);
    results.forEach(({ coinId, prices }) => {
      result[coinId] = prices;
    });
    
    // 缓存结果
    cacheManager.setCachedBatchHistoricalPrices(coinIds, days, result);
  } catch (error) {
    console.error('Failed to fetch batch historical prices:', error);
    
    // 尝试返回缓存的数据（即使过期）
    const cachedData = cacheManager.getCachedBatchHistoricalPrices(coinIds, days);
    if (cachedData) {
      console.warn('Using expired cached batch historical data due to API error');
      return cachedData;
    }
  }
  
  return result;
}

/**
 * 获取所有支持的代币 ID 列表
 */
export function getAllSupportedTokenIds(): string[] {
  return Object.values(SUPPORTED_TOKENS);
}

/**
 * 获取投资组合代币 ID 列表（不包括 USDC）
 */
export function getPortfolioTokenIds(): string[] {
  return [
    SUPPORTED_TOKENS.ETHEREUM,
    SUPPORTED_TOKENS.BITCOIN,
    SUPPORTED_TOKENS.CHAINLINK,
    SUPPORTED_TOKENS.UNISWAP,
    SUPPORTED_TOKENS.DAI,
  ];
}

/**
 * 检查代币是否支持
 */
export function isTokenSupported(coinId: string): boolean {
  return Object.values(SUPPORTED_TOKENS).includes(coinId as any);
}

/**
 * 格式化价格数据为合约兼容格式
 * CoinGecko 返回的是 USD 价格，需要转换为 8 位小数的整数格式
 */
export function formatPriceForContract(price: number): bigint {
  // CoinGecko 价格是 USD，转换为 8 位小数的整数
  return BigInt(Math.round(price * 100000000));
}

/**
 * 从合约格式转换为显示格式
 */
export function formatPriceFromContract(price: bigint): number {
  return Number(price) / 100000000;
}