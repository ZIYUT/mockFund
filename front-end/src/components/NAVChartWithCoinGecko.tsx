'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useCoinGeckoData } from '@/hooks/useCoinGeckoPrices';
import { getPortfolioTokenIds, TOKEN_DISPLAY_NAMES } from '@/lib/coinGeckoApi';

// 投资组合代币配置
const PORTFOLIO_TOKENS = getPortfolioTokenIds();

// 基金配置
// const INITIAL_FUND_VALUE = 1.0; // 初始净值 1.0 USDC
const CASH_ALLOCATION = 0.5; // 现金配置 50%
const TOKEN_ALLOCATION = 0.1; // 每种代币配置 10%

// 净值数据点接口
interface NAVDataPoint {
  date: string;
  nav: number;
  timestamp: number;
}

const NAVChartWithCoinGecko: React.FC = () => {
  const [navData, setNavData] = useState<NAVDataPoint[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [, setInitialPrices] = useState<Record<string, number>>({});

  // 使用 CoinGecko 数据
  const {
    prices,
    historicalPrices,
    isLoading,
    hasError,
    error,
    refetchPrices,
    refetchHistorical,
  } = useCoinGeckoData(PORTFOLIO_TOKENS, 365);

  // 生成日期范围（从今年1月1日到今天）
  const generateDateRange = () => {
    const dates: Date[] = [];
    const startDate = new Date(new Date().getFullYear(), 0, 1); // 今年1月1日
    const endDate = new Date(); // 今天
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // 根据历史价格计算净值
  const calculateNAVFromHistoricalData = useCallback(() => {
    if (!historicalPrices || Object.keys(historicalPrices).length === 0) {
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);

    try {
      // 获取所有代币的历史价格数据
      const tokenHistoricalData: Record<string, Record<string, number>> = {};
      
      PORTFOLIO_TOKENS.forEach(coinId => {
        const priceHistory = historicalPrices[coinId];
        if (priceHistory && priceHistory.length > 0) {
          tokenHistoricalData[coinId] = {};
          priceHistory.forEach(([timestamp, price]) => {
            const date = new Date(timestamp).toISOString().split('T')[0];
            tokenHistoricalData[coinId][date] = price;
          });
        }
      });

      // 设置初始价格（1月1日的价格）
      const startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
      const initialPricesData: Record<string, number> = {};
      
      PORTFOLIO_TOKENS.forEach(coinId => {
        const tokenData = tokenHistoricalData[coinId];
        if (tokenData) {
          // 找到最接近1月1日的价格
          const availableDates = Object.keys(tokenData).sort();
          const closestDate = availableDates.find(date => date >= startDate) || availableDates[0];
          if (closestDate) {
            initialPricesData[coinId] = tokenData[closestDate];
          }
        }
      });
      
      setInitialPrices(initialPricesData);

      // 生成净值数据
      const dates = generateDateRange();
      const navPoints: NAVDataPoint[] = [];

      dates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        let totalValue = CASH_ALLOCATION; // 现金部分保持不变

        // 计算代币部分的价值
        PORTFOLIO_TOKENS.forEach(coinId => {
          const tokenData = tokenHistoricalData[coinId];
          const initialPrice = initialPricesData[coinId];
          
          if (tokenData && initialPrice && initialPrice > 0) {
            // 找到当天或最近的价格
            const availableDates = Object.keys(tokenData).filter(d => d <= dateStr).sort();
            const latestDate = availableDates[availableDates.length - 1];
            
            if (latestDate) {
              const currentPrice = tokenData[latestDate];
              // 计算代币数量（基于初始投资金额和初始价格）
              const tokenAmount = TOKEN_ALLOCATION / initialPrice;
              // 计算当前价值
              const currentValue = tokenAmount * currentPrice;
              totalValue += currentValue;
            }
          }
        });

        navPoints.push({
          date: dateStr,
          nav: Number(totalValue.toFixed(4)),
          timestamp: date.getTime(),
        });
      });

      setNavData(navPoints);
    } catch (err) {
      setCalculationError('计算净值数据时出错');
      console.error('NAV calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [historicalPrices]);

  // 当历史价格数据更新时重新计算净值
  useEffect(() => {
    if (historicalPrices && Object.keys(historicalPrices).length > 0) {
      calculateNAVFromHistoricalData();
    }
  }, [historicalPrices, calculateNAVFromHistoricalData]);

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium">
            {date.toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p className="text-sm text-blue-600">
            净值: {payload[0].value.toFixed(4)} USDC/MFS
          </p>
        </div>
      );
    }
    return null;
  };

  const handleRefresh = () => {
    refetchPrices();
    refetchHistorical();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载 CoinGecko 价格数据...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (hasError || calculationError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">净值图表加载失败</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            {error?.message || calculationError || '无法获取价格数据'}
          </p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>基金净值走势图 (CoinGecko 数据源)</CardTitle>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          显示从{new Date().getFullYear()}年1月1日至今的净值变化（基于 CoinGecko 真实价格数据）
        </p>
      </CardHeader>
      <CardContent>
        {isCalculating ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">计算净值数据...</span>
          </div>
        ) : navData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={navData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={formatDate}
                  interval="preserveStartEnd"
                  className="text-xs"
                />
                <YAxis 
                  domain={['dataMin - 0.01', 'dataMax + 0.01']}
                  tickFormatter={(value) => value.toFixed(3)}
                  className="text-xs"
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="nav" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#2563eb' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            暂无净值数据
          </div>
        )}
        
        {/* 基金配置说明 */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">基金配置说明</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• 数据源：CoinGecko API（真实市场价格）</p>
            <p>• 初始净值：1.0000 USDC/MFS</p>
            <p>• 现金配置：0.5 USDC (50%)</p>
            <p>• 代币配置：每种代币 0.1 USDC (各10%)</p>
            <p>• 投资代币：ETH, BTC, LINK, UNI, DAI</p>
            <p>• 更新频率：价格每次打开页面时更新</p>
          </div>
        </div>
        
        {/* 当前价格信息 */}
        {prices && Object.keys(prices).length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">当前代币价格 (USD)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {PORTFOLIO_TOKENS.map(coinId => {
                const price = prices[coinId];
                const tokenName = TOKEN_DISPLAY_NAMES[coinId] || coinId;
                
                return (
                  <div key={coinId} className="flex justify-between">
                    <span className="font-medium">{tokenName}:</span>
                    <span>${price ? price.toFixed(4) : 'N/A'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NAVChartWithCoinGecko;