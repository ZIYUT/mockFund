'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentPrices, getBatchHistoricalPrices, formatPriceForContract } from '@/lib/coinGeckoApi';

/**
 * 使用 CoinGecko API 获取代币价格的 hook
 */
export function useCoinGeckoPrices(coinIds: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 获取当前价格
  const fetchPrices = useCallback(async () => {
    if (!coinIds || coinIds.length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const priceData = await getCurrentPrices(coinIds);
      setPrices(priceData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('获取价格数据失败'));
      console.error('Failed to fetch prices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [coinIds]);

  // 初始加载
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchPrices,
  };
}

/**
 * 使用 CoinGecko API 获取历史价格数据的 hook
 */
export function useCoinGeckoHistoricalPrices(coinIds: string[], days: number = 365) {
  const [historicalPrices, setHistoricalPrices] = useState<Record<string, [number, number][]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistoricalPrices = useCallback(async () => {
    if (!coinIds || coinIds.length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const historicalData = await getBatchHistoricalPrices(coinIds, days);
      setHistoricalPrices(historicalData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('获取历史价格数据失败'));
      console.error('Failed to fetch historical prices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [coinIds, days]);

  useEffect(() => {
    fetchHistoricalPrices();
  }, [fetchHistoricalPrices]);

  return {
    historicalPrices,
    isLoading,
    error,
    refetch: fetchHistoricalPrices,
  };
}

/**
 * 组合 hook：同时获取当前价格和历史价格
 */
export function useCoinGeckoData(coinIds: string[], historicalDays: number = 365) {
  const currentPrices = useCoinGeckoPrices(coinIds);
  const historicalPrices = useCoinGeckoHistoricalPrices(coinIds, historicalDays);

  return {
    // 当前价格
    prices: currentPrices.prices,
    isPricesLoading: currentPrices.isLoading,
    pricesError: currentPrices.error,
    lastUpdated: currentPrices.lastUpdated,
    refetchPrices: currentPrices.refetch,
    
    // 历史价格
    historicalPrices: historicalPrices.historicalPrices,
    isHistoricalLoading: historicalPrices.isLoading,
    historicalError: historicalPrices.error,
    refetchHistorical: historicalPrices.refetch,
    
    // 综合状态
    isLoading: currentPrices.isLoading || historicalPrices.isLoading,
    hasError: !!(currentPrices.error || historicalPrices.error),
    error: currentPrices.error || historicalPrices.error,
  };
}