'use client';

import React, { useEffect, useState } from 'react';
import { useCoinGeckoData } from '@/hooks/useCoinGeckoPrices';
import { getPortfolioTokenIds, TOKEN_DISPLAY_NAMES } from '@/lib/coinGeckoApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 投资组合代币配置
const PORTFOLIO_TOKENS = getPortfolioTokenIds();

interface TokenStatus {
  tokenName: string;
  hasCurrentPrice: boolean;
  hasHistoricalData: boolean;
  currentPriceValue: number | null;
  historicalDataPoints: number;
  error: string | null;
}

const DebugTokenData: React.FC = () => {
  const { prices, historicalPrices, isLoading, hasError, error } = useCoinGeckoData(PORTFOLIO_TOKENS);
  const [tokenStatuses, setTokenStatuses] = useState<Record<string, TokenStatus>>({});

  useEffect(() => {
    if (!isLoading) {
      const statuses: Record<string, TokenStatus> = {};

      for (const coinId of PORTFOLIO_TOKENS) {
        const tokenName = TOKEN_DISPLAY_NAMES[coinId] || coinId;
        
        const hasCurrentPrice = prices && prices[coinId] !== undefined;
        const hasHistoricalData = historicalPrices && historicalPrices[coinId] && historicalPrices[coinId].length > 0;
        
        statuses[coinId] = {
          tokenName,
          hasCurrentPrice,
          hasHistoricalData,
          currentPriceValue: hasCurrentPrice ? prices[coinId] : null,
          historicalDataPoints: hasHistoricalData ? historicalPrices[coinId].length : 0,
          error: hasError ? (error?.message || '数据获取失败') : null,
        };
      }

      setTokenStatuses(statuses);
    }
  }, [prices, historicalPrices, isLoading, hasError, error]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>正在检查代币数据...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>请查看浏览器控制台获取详细信息</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>代币数据调试信息</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(tokenStatuses).map(([coinId, status]) => (
            <div key={coinId} className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{status.tokenName}</h4>
                <span className={`px-2 py-1 rounded text-xs ${
                  status.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {status.error ? '失败' : '成功'}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>代币ID:</strong> {coinId}</p>
                <p><strong>当前价格:</strong> {status.hasCurrentPrice ? `$${status.currentPriceValue?.toFixed(4)}` : '无数据'}</p>
                <p><strong>历史数据点:</strong> {status.historicalDataPoints}</p>
                {status.error && (
                  <p className="text-red-600"><strong>错误:</strong> {status.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DebugTokenData;