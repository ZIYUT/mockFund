'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useCoinGeckoData } from '@/hooks/useCoinGeckoPrices';
import { getPortfolioTokenIds, getCurrentPrices, getBatchHistoricalPrices } from '@/lib/coinGeckoApi';
import { cacheManager } from '@/lib/cacheManager';

const PORTFOLIO_TOKENS = getPortfolioTokenIds();

export default function CoinGeckoDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isDebugging, setIsDebugging] = useState(false);
  const [rawApiData, setRawApiData] = useState<any>({});

  const {
    prices,
    historicalPrices,
    isLoading,
    hasError,
    error,
    refetchPrices,
    refetchHistorical,
  } = useCoinGeckoData(PORTFOLIO_TOKENS, 365);

  const runDebugCheck = async () => {
    setIsDebugging(true);
    const debug: any = {
      timestamp: new Date().toISOString(),
      environment: {
        baseUrl: process.env.NEXT_PUBLIC_COINGECKO_BASE_URL,
        hasApiKey: !!process.env.NEXT_PUBLIC_COINGECKO_API_KEY,
        cacheSettings: {
          priceCacheDuration: process.env.NEXT_PUBLIC_CACHE_DURATION_MINUTES,
          historicalCacheDuration: process.env.NEXT_PUBLIC_HISTORICAL_CACHE_DURATION_MINUTES,
          rateLimitMs: process.env.NEXT_PUBLIC_API_RATE_LIMIT_MS,
        }
      },
      tokens: PORTFOLIO_TOKENS,
      hookData: {
        prices,
        historicalPricesKeys: Object.keys(historicalPrices || {}),
        isLoading,
        hasError,
        error: error?.message,
      },
      cache: cacheManager.getStats(),
    };

    try {
      // 直接测试 API 调用
      console.log('Testing direct API calls...');
      
      // 测试当前价格
      const directPrices = await getCurrentPrices(PORTFOLIO_TOKENS);
      debug.directApiCalls = {
        prices: directPrices,
        pricesCount: Object.keys(directPrices).length,
      };

      // 测试历史价格（只获取最近7天以减少调用时间）
      const directHistorical = await getBatchHistoricalPrices(PORTFOLIO_TOKENS, 7);
      debug.directApiCalls.historical = {
        keys: Object.keys(directHistorical),
        sampleData: Object.entries(directHistorical).reduce((acc, [key, value]) => {
          acc[key] = {
            dataPoints: value.length,
            firstPoint: value[0],
            lastPoint: value[value.length - 1],
          };
          return acc;
        }, {} as any),
      };

      setRawApiData({
        prices: directPrices,
        historical: directHistorical,
      });

    } catch (err) {
      debug.directApiError = {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      };
    }

    setDebugInfo(debug);
    setIsDebugging(false);
  };

  useEffect(() => {
    // 自动运行一次调试检查
    runDebugCheck();
  }, []);

  const clearCache = () => {
    cacheManager.clear();
    runDebugCheck();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            CoinGecko API 调试信息
          </CardTitle>
          <div className="space-x-2">
            <Button onClick={clearCache} variant="outline" size="sm">
              清空缓存
            </Button>
            <Button onClick={runDebugCheck} variant="outline" size="sm" disabled={isDebugging}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isDebugging ? 'animate-spin' : ''}`} />
              重新检查
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 环境配置 */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium mb-2">环境配置</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>API Base URL:</span>
              <span className="font-mono text-xs">{debugInfo.environment?.baseUrl || 'undefined'}</span>
            </div>
            <div className="flex justify-between">
              <span>API Key 配置:</span>
              <span className={debugInfo.environment?.hasApiKey ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.environment?.hasApiKey ? '已配置' : '未配置'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>价格缓存时长:</span>
              <span>{debugInfo.environment?.cacheSettings?.priceCacheDuration || 5} 分钟</span>
            </div>
            <div className="flex justify-between">
              <span>历史缓存时长:</span>
              <span>{debugInfo.environment?.cacheSettings?.historicalCacheDuration || 60} 分钟</span>
            </div>
          </div>
        </div>

        {/* Hook 状态 */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium mb-2">Hook 状态</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>加载状态:</span>
              <span className={isLoading ? 'text-yellow-600' : 'text-green-600'}>
                {isLoading ? '加载中' : '已完成'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>错误状态:</span>
              <span className={hasError ? 'text-red-600' : 'text-green-600'}>
                {hasError ? '有错误' : '正常'}
              </span>
            </div>
            {error && (
              <div className="text-red-600 text-xs mt-1">
                错误信息: {error.message}
              </div>
            )}
            <div className="flex justify-between">
              <span>当前价格数据:</span>
              <span>{Object.keys(prices || {}).length} 个代币</span>
            </div>
            <div className="flex justify-between">
              <span>历史价格数据:</span>
              <span>{Object.keys(historicalPrices || {}).length} 个代币</span>
            </div>
          </div>
        </div>

        {/* 缓存状态 */}
        <div className="bg-yellow-50 p-3 rounded-lg">
          <h4 className="font-medium mb-2">缓存状态</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>缓存项数量:</span>
              <span>{debugInfo.cache?.size || 0}</span>
            </div>
            {debugInfo.cache?.keys && debugInfo.cache.keys.length > 0 && (
              <div className="mt-2">
                <span className="font-medium">缓存键:</span>
                <div className="max-h-20 overflow-y-auto mt-1">
                  {debugInfo.cache.keys.map((key: string, index: number) => (
                    <div key={index} className="text-xs font-mono bg-white p-1 rounded mb-1">
                      {key}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 直接 API 调用结果 */}
        {debugInfo.directApiCalls && (
          <div className="bg-green-50 p-3 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              直接 API 调用结果
            </h4>
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium">当前价格:</span>
                <div className="ml-4 space-y-1">
                  {Object.entries(debugInfo.directApiCalls.prices || {}).map(([token, price]) => (
                    <div key={token} className="flex justify-between">
                      <span>{token}:</span>
                      <span>${typeof price === 'number' ? price.toFixed(4) : 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <span className="font-medium">历史价格样本 (最近7天):</span>
                <div className="ml-4 space-y-1">
                  {Object.entries(debugInfo.directApiCalls.historical?.sampleData || {}).map(([token, data]: [string, any]) => (
                    <div key={token} className="text-xs">
                      <span className="font-medium">{token}:</span> {data.dataPoints} 个数据点
                      {data.firstPoint && (
                        <div className="ml-2">
                          首个: {new Date(data.firstPoint[0]).toLocaleDateString()} - ${data.firstPoint[1].toFixed(4)}
                        </div>
                      )}
                      {data.lastPoint && (
                        <div className="ml-2">
                          最新: {new Date(data.lastPoint[0]).toLocaleDateString()} - ${data.lastPoint[1].toFixed(4)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API 错误信息 */}
        {debugInfo.directApiError && (
          <div className="bg-red-50 p-3 rounded-lg">
            <h4 className="font-medium mb-2 text-red-600">API 调用错误</h4>
            <div className="text-sm text-red-600">
              <p>{debugInfo.directApiError.message}</p>
              {debugInfo.directApiError.stack && (
                <pre className="text-xs mt-2 bg-red-100 p-2 rounded overflow-x-auto">
                  {debugInfo.directApiError.stack}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* 原始数据预览 */}
        {Object.keys(rawApiData).length > 0 && (
          <details className="bg-gray-50 p-3 rounded-lg">
            <summary className="font-medium cursor-pointer">原始 API 数据预览</summary>
            <pre className="text-xs mt-2 bg-white p-2 rounded overflow-x-auto max-h-40">
              {JSON.stringify(rawApiData, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}