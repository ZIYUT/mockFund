'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTokenPrices } from '@/hooks/usePriceOracle';
import { CONTRACT_ADDRESSES } from '@/contracts/addresses';
import { formatUnits } from 'viem';

// 基金初始配置
// const INITIAL_NAV = 1.0; // 1 USDC
const CASH_ALLOCATION = 0.5; // 0.5 USDC 保持现金
const TOKEN_ALLOCATION = 0.1; // 每种代币 0.1 USDC

// 支持的代币地址（除了USDC）
const PORTFOLIO_TOKENS = [
  CONTRACT_ADDRESSES.MOCK_WETH,
  CONTRACT_ADDRESSES.MOCK_WBTC,
  CONTRACT_ADDRESSES.MOCK_LINK,
  CONTRACT_ADDRESSES.MOCK_UNI,
  CONTRACT_ADDRESSES.MOCK_DAI,
];

// 代币名称映射
// const TOKEN_NAMES: { [key: string]: string } = {
//   [CONTRACT_ADDRESSES.MOCK_WETH]: 'WETH',
//   [CONTRACT_ADDRESSES.MOCK_WBTC]: 'WBTC',
//   [CONTRACT_ADDRESSES.MOCK_LINK]: 'LINK',
//   [CONTRACT_ADDRESSES.MOCK_UNI]: 'UNI',
//   [CONTRACT_ADDRESSES.MOCK_DAI]: 'DAI',
// };

interface NAVDataPoint {
  date: string;
  nav: number;
  timestamp: number;
}

interface TokenPriceHistory {
  [tokenAddress: string]: {
    [date: string]: number;
  };
}

export const NAVChart: React.FC = () => {
  const [navData, setNavData] = useState<NAVDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setInitialPrices] = useState<{ [key: string]: number }>({});
  
  // 获取当前代币价格
  const { prices, isLoading: isPricesLoading, error: pricesError, refetch } = useTokenPrices(PORTFOLIO_TOKENS);

  // 生成从今年1月1日到今天的日期数组
  const generateDateRange = () => {
    const dates: Date[] = [];
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1); // 今年1月1日
    const endDate = new Date(); // 今天
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // 模拟历史价格数据（实际项目中应该从API获取）
  const generateMockPriceHistory = (currentPrices: { [key: string]: bigint }) => {
    const dates = generateDateRange();
    const priceHistory: TokenPriceHistory = {};
    
    PORTFOLIO_TOKENS.forEach(tokenAddress => {
      priceHistory[tokenAddress] = {};
      const currentPrice = currentPrices[tokenAddress] ? Number(formatUnits(currentPrices[tokenAddress], 8)) : 1;
      
      dates.forEach((date, index) => {
        const dateStr = date.toISOString().split('T')[0];
        // 模拟价格波动：基于正弦波和随机波动
        const daysSinceStart = index;
        const volatility = 0.02; // 2% 日波动率
        const trend = Math.sin(daysSinceStart * 0.02) * 0.1; // 长期趋势
        const randomFactor = (Math.random() - 0.5) * volatility;
        const priceMultiplier = 1 + trend + randomFactor;
        
        priceHistory[tokenAddress][dateStr] = currentPrice * priceMultiplier;
      });
    });
    
    return priceHistory;
  };

  // 计算特定日期的净值
  const calculateNAV = (date: string, priceHistory: TokenPriceHistory, initialPrices: { [key: string]: number }) => {
    let totalValue = CASH_ALLOCATION; // 现金部分保持不变
    
    PORTFOLIO_TOKENS.forEach(tokenAddress => {
      const currentPrice = priceHistory[tokenAddress]?.[date] || 0;
      const initialPrice = initialPrices[tokenAddress] || 1;
      
      if (initialPrice > 0) {
        // 计算代币数量（基于初始投资金额和初始价格）
        const tokenAmount = TOKEN_ALLOCATION / initialPrice;
        // 计算当前价值
        const currentValue = tokenAmount * currentPrice;
        totalValue += currentValue;
      }
    });
    
    return totalValue;
  };

  // 生成净值数据
  const generateNAVData = () => {
    if (!prices || Object.keys(prices).length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 设置初始价格（1月1日的价格，这里使用当前价格作为基准）
      const currentPricesFormatted: { [key: string]: number } = {};
      PORTFOLIO_TOKENS.forEach(tokenAddress => {
        if (prices[tokenAddress]) {
          currentPricesFormatted[tokenAddress] = Number(formatUnits(prices[tokenAddress], 8));
        }
      });
      
      setInitialPrices(currentPricesFormatted);
      
      // 生成模拟价格历史
      const priceHistory = generateMockPriceHistory(prices);
      
      // 生成净值数据
      const dates = generateDateRange();
      const navPoints: NAVDataPoint[] = dates.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const nav = calculateNAV(dateStr, priceHistory, currentPricesFormatted);
        
        return {
          date: dateStr,
          nav: Number(nav.toFixed(4)),
          timestamp: date.getTime(),
        };
      });
      
      setNavData(navPoints);
    } catch (err) {
      setError('生成净值数据时出错');
      console.error('NAV calculation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 当价格数据更新时重新生成净值数据
  useEffect(() => {
    if (prices && Object.keys(prices).length > 0) {
      generateNAVData();
    }
  }, [prices, generateNAVData]);

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
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
    refetch();
  };

  if (isPricesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载净值图表...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (pricesError || error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">净值图表加载失败</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            {pricesError?.message || error || '无法获取价格数据'}
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
          <CardTitle>基金净值走势图</CardTitle>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          显示从{new Date().getFullYear()}年1月1日至今的净值变化（USDC/MFS）
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">生成净值数据...</span>
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
            <p>• 初始净值：1.0000 USDC/MFS</p>
            <p>• 现金配置：0.5 USDC (50%)</p>
            <p>• 代币配置：每种代币 0.1 USDC (各10%)</p>
            <p>• 投资代币：WETH, WBTC, LINK, UNI, DAI</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NAVChart;