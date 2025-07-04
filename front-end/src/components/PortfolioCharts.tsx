'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useCoinGeckoData } from '@/hooks/useCoinGeckoPrices';
import { 
  SUPPORTED_TOKENS, 
  TOKEN_DISPLAY_NAMES, 
  TOKEN_COLORS,
  getPortfolioTokenIds 
} from '@/lib/coinGeckoApi';

// 投资组合代币配置（不包括 USDC）
const PORTFOLIO_TOKENS = getPortfolioTokenIds();

// 基金配置
const INITIAL_FUND_VALUE = 1.0;
const CASH_ALLOCATION = 0.5; // USDC 50%
const TOKEN_ALLOCATION = 0.1; // 每种代币 10%

// 投资组合配置数据点接口
interface AllocationDataPoint {
  date: string;
  timestamp: number;
  ETH: number;
  BTC: number;
  LINK: number;
  UNI: number;
  DAI: number;
}

// 当前投资组合数据接口
interface CurrentAllocation {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

const PortfolioCharts: React.FC = () => {
  const [allocationData, setAllocationData] = useState<AllocationDataPoint[]>([]);
  const [currentAllocation, setCurrentAllocation] = useState<CurrentAllocation[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [initialPrices, setInitialPrices] = useState<Record<string, number>>({});

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
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    const endDate = new Date();
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // 计算投资组合配置数据
  const calculateAllocationData = () => {
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
          const availableDates = Object.keys(tokenData).sort();
          const closestDate = availableDates.find(date => date >= startDate) || availableDates[0];
          if (closestDate) {
            initialPricesData[coinId] = tokenData[closestDate];
          }
        }
      });
      
      setInitialPrices(initialPricesData);

      // 生成配置数据
      const dates = generateDateRange();
      const allocationPoints: AllocationDataPoint[] = [];

      dates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        let totalPortfolioValue = CASH_ALLOCATION; // USDC 部分
        const tokenValues: Record<string, number> = {};

        // 计算每种代币的当前价值
        PORTFOLIO_TOKENS.forEach(coinId => {
          const tokenData = tokenHistoricalData[coinId];
          const initialPrice = initialPricesData[coinId];
          
          if (tokenData && initialPrice && initialPrice > 0) {
            const availableDates = Object.keys(tokenData).filter(d => d <= dateStr).sort();
            const latestDate = availableDates[availableDates.length - 1];
            
            if (latestDate) {
              const currentPrice = tokenData[latestDate];
              const tokenAmount = TOKEN_ALLOCATION / initialPrice;
              const currentValue = tokenAmount * currentPrice;
              tokenValues[coinId] = currentValue;
              totalPortfolioValue += currentValue;
            }
          }
        });

        // 计算每种代币的占比（百分比）
        const allocationPoint: AllocationDataPoint = {
          date: dateStr,
          timestamp: date.getTime(),
          ETH: totalPortfolioValue > 0 ? (tokenValues[SUPPORTED_TOKENS.ETHEREUM] || 0) / totalPortfolioValue * 100 : 0,
          BTC: totalPortfolioValue > 0 ? (tokenValues[SUPPORTED_TOKENS.BITCOIN] || 0) / totalPortfolioValue * 100 : 0,
          LINK: totalPortfolioValue > 0 ? (tokenValues[SUPPORTED_TOKENS.CHAINLINK] || 0) / totalPortfolioValue * 100 : 0,
          UNI: totalPortfolioValue > 0 ? (tokenValues[SUPPORTED_TOKENS.UNISWAP] || 0) / totalPortfolioValue * 100 : 0,
          DAI: totalPortfolioValue > 0 ? (tokenValues[SUPPORTED_TOKENS.DAI] || 0) / totalPortfolioValue * 100 : 0,
        };

        allocationPoints.push(allocationPoint);
      });

      setAllocationData(allocationPoints);

      // 计算当前投资组合配置
      if (allocationPoints.length > 0) {
        const latestAllocation = allocationPoints[allocationPoints.length - 1];
        const currentAllocations: CurrentAllocation[] = [
          {
            name: 'USDC',
            value: CASH_ALLOCATION,
            percentage: 100 - latestAllocation.ETH - latestAllocation.BTC - latestAllocation.LINK - latestAllocation.UNI - latestAllocation.DAI,
            color: '#6B7280',
          },
          {
            name: TOKEN_DISPLAY_NAMES[SUPPORTED_TOKENS.ETHEREUM],
            value: latestAllocation.ETH / 100,
            percentage: latestAllocation.ETH,
            color: TOKEN_COLORS[SUPPORTED_TOKENS.ETHEREUM],
          },
          {
            name: TOKEN_DISPLAY_NAMES[SUPPORTED_TOKENS.BITCOIN],
            value: latestAllocation.BTC / 100,
            percentage: latestAllocation.BTC,
            color: TOKEN_COLORS[SUPPORTED_TOKENS.BITCOIN],
          },
          {
            name: TOKEN_DISPLAY_NAMES[SUPPORTED_TOKENS.CHAINLINK],
            value: latestAllocation.LINK / 100,
            percentage: latestAllocation.LINK,
            color: TOKEN_COLORS[SUPPORTED_TOKENS.CHAINLINK],
          },
          {
            name: TOKEN_DISPLAY_NAMES[SUPPORTED_TOKENS.UNISWAP],
            value: latestAllocation.UNI / 100,
            percentage: latestAllocation.UNI,
            color: TOKEN_COLORS[SUPPORTED_TOKENS.UNISWAP],
          },
          {
            name: TOKEN_DISPLAY_NAMES[SUPPORTED_TOKENS.DAI],
            value: latestAllocation.DAI / 100,
            percentage: latestAllocation.DAI,
            color: TOKEN_COLORS[SUPPORTED_TOKENS.DAI],
          },
        ];

        setCurrentAllocation(currentAllocations);
      }
    } catch (err) {
      setCalculationError('计算投资组合配置数据时出错');
      console.error('Portfolio allocation calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  // 当历史价格数据更新时重新计算配置
  useEffect(() => {
    if (historicalPrices && Object.keys(historicalPrices).length > 0) {
      calculateAllocationData();
    }
  }, [historicalPrices]);

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 自定义Tooltip for 配置趋势图
  const AllocationTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium mb-2">
            {date.toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value.toFixed(2)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // 自定义Tooltip for 饼状图
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-sm" style={{ color: data.color }}>
            占比: {data.percentage.toFixed(2)}%
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
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              加载投资组合数据...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (hasError || calculationError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">投资组合图表加载失败</CardTitle>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 投资组合配置趋势图 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>投资组合配置趋势图</CardTitle>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            显示各代币在投资组合中的占比随时间变化（不包括USDC）
          </p>
        </CardHeader>
        <CardContent>
          {isCalculating ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">计算配置数据...</span>
            </div>
          ) : allocationData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={allocationData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={formatDate}
                    interval="preserveStartEnd"
                    className="text-xs"
                  />
                  <YAxis 
                    domain={[0, 'dataMax + 5']}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    className="text-xs"
                  />
                  <Tooltip content={<AllocationTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="ETH" 
                    stroke={TOKEN_COLORS[SUPPORTED_TOKENS.ETHEREUM]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="BTC" 
                    stroke={TOKEN_COLORS[SUPPORTED_TOKENS.BITCOIN]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="LINK" 
                    stroke={TOKEN_COLORS[SUPPORTED_TOKENS.CHAINLINK]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="UNI" 
                    stroke={TOKEN_COLORS[SUPPORTED_TOKENS.UNISWAP]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="DAI" 
                    stroke={TOKEN_COLORS[SUPPORTED_TOKENS.DAI]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              暂无配置数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* 当前投资组合饼状图 */}
      <Card>
        <CardHeader>
          <CardTitle>当前投资组合配置</CardTitle>
          <p className="text-sm text-gray-600">
            显示当前投资组合中各资产的占比（包括USDC）
          </p>
        </CardHeader>
        <CardContent>
          {isCalculating ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">计算配置数据...</span>
            </div>
          ) : currentAllocation.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* 饼状图 */}
              <div className="h-64 w-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={currentAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="percentage"
                    >
                      {currentAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* 图例 */}
              <div className="flex-1">
                <h4 className="text-sm font-medium mb-3">资产配置详情</h4>
                <div className="space-y-2">
                  {currentAllocation.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {item.percentage.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              暂无配置数据
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioCharts;