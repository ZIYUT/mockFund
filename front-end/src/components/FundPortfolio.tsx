'use client';

import { useState, useEffect } from 'react';
import { useFundData } from '@/hooks/useFundData';
import { useHistoricalPrices } from '@/hooks/useHistoricalPrices';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import TokenLogo from './TokenLogo';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, CartesianGrid, Area } from 'recharts';

export default function FundPortfolio() {
  const { fundPortfolio, tokenPrices, mfcData, isLoading, refreshData } = useFundData();
  const { 
    historicalData, //: any[]
    mfcHistoricalValues, //: any[]
    historicalRatios, //: any
    isLoading: historicalLoading, 
    fetchAllHistoricalPrices 
  } = useHistoricalPrices() as any;
  const [hasLoaded, setHasLoaded] = useState(false);

  // Combined refresh function
  const handleRefresh = () => {
    refreshData();
    fetchAllHistoricalPrices();
  };

  // Calculate real portfolio data based on actual token balances and prices
  const getRealPortfolioData = () => {
    if (!fundPortfolio.length || !tokenPrices.length) {
      return [
        { name: 'USDC', value: 50, color: '#2775CA' },
        { name: 'WBTC', value: 12.5, color: '#F7931A' },
        { name: 'WETH', value: 12.5, color: '#627EEA' },
        { name: 'LINK', value: 12.5, color: '#2A5ADA' },
        { name: 'DAI', value: 12.5, color: '#F5AC37' },
      ];
    }

    const result = fundPortfolio.map((token) => {
      const colorMap: { [key: string]: string } = {
        'USDC': '#2775CA',
        'WBTC': '#F7931A',
        'WETH': '#627EEA',
        'LINK': '#2A5ADA',
        'DAI': '#F5AC37',
      };

      return {
        name: token.symbol,
        value: token.percentage,
        color: colorMap[token.symbol] || '#666666',
      };
    });

    return result;
  };

  const portfolioData = getRealPortfolioData();
  
  // 只有在历史数据加载完成且不为空时才计算
  // const mfcHistoricalValues = historicalData.length > 0 ? calculateMfcHistoricalValue() : [];
  // const historicalRatios = historicalData.length > 0 ? calculateHistoricalPortfolioRatios() : {};

  // 调试日志 - 检查数据状态
  console.log('FundPortfolio Debug:', {
    historicalDataLength: historicalData.length,
    mfcHistoricalValuesLength: mfcHistoricalValues.length,
    historicalRatiosKeys: Object.keys(historicalRatios).length,
    historicalLoading,
    hasLoaded
  });
  
  if (historicalData.length > 0) {
    console.log('Historical data available:', historicalData.map((d: any) => ({ symbol: d.symbol, pricesLength: d.prices?.length || 0 })));
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Portfolio</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Portfolio</h2>
        <button
          onClick={handleRefresh}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh data"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      {/* Real-time Prices */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Real-time Prices</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {tokenPrices.length > 0 ? (
            tokenPrices.map((token) => (
              <div key={token.symbol} className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-gray-600">{token.symbol}</div>
                <div className="text-lg font-bold text-gray-900">
                  ${(token.priceInUSD || 0).toFixed(2)}
                </div>
              </div>
            ))
          ) : (
            // 显示默认价格
            [
              { symbol: 'USDC', priceInUSD: 1 },
              { symbol: 'WETH', priceInUSD: 3000 },
              { symbol: 'WBTC', priceInUSD: 60000 },
              { symbol: 'LINK', priceInUSD: 15 },
              { symbol: 'DAI', priceInUSD: 1 },
            ].map((token) => (
              <div key={token.symbol} className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-gray-600">{token.symbol}</div>
                <div className="text-lg font-bold text-gray-900">
                  ${token.priceInUSD.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MFC Historical Value Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">MFC Historical Value (Past 180 Days)</h3>
        <Card>
          <CardHeader>
            <CardTitle>MFC Value Trend (USDC/MFC)</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={mfcHistoricalValues}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip 
                    formatter={(value: number) => [`Price: ${value.toFixed(2)} USDC/MFC`]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="priceArea" 
                    fill="#FF6B6B" 
                    fillOpacity={0.2}
                    stroke="none" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#FF6B6B" 
                    strokeWidth={3} 
                    dot={false}
                    name="MFC Value"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> This chart shows the historical MFC value based on past 180 days' token prices. 
                It represents the theoretical value of 1 MFC token over time, calculated using historical price data 
                for the underlying assets (0.5 USDC + 0.00004167 WETH + 0.00000108 WBTC + 0.008 LINK + 0.125 DAI). 
                This is for reference purposes only and does not predict future performance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Charts */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Portfolio Charts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Current Portfolio Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  {/* Simplified pie chart display */}
                  <div className="w-full h-full rounded-full border-8 border-gray-200 relative overflow-hidden">
                    {portfolioData.map((item, index) => {
                      const startAngle = portfolioData
                        .slice(0, index)
                        .reduce((sum, d: any) => sum + (d.value / 100) * 360, 0);
                      const endAngle = startAngle + (item.value / 100) * 360;
                      
                      return (
                        <div
                          key={item.name}
                          className="absolute inset-0"
                          style={{
                            background: `conic-gradient(from ${startAngle}deg, ${item.color} 0deg, ${item.color} ${endAngle - startAngle}deg, transparent ${endAngle - startAngle}deg)`
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="mt-6 space-y-2">
                {portfolioData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">{item.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fund Asset Allocation */}
          <Card>
            <CardHeader>
              <CardTitle>Each MFC contains...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fundPortfolio.length > 0 ? (
                  fundPortfolio.map((token) => (
                    <div key={token.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <TokenLogo symbol={token.symbol} size={32} />
                        <div>
                          <div className="font-medium">{token.name}</div>
                          <div className="text-sm text-gray-600">
                            {(() => {
                              const balance = parseFloat(token.balance);
                              // 为WETH和WBTC显示更多小数位数，避免显示0
                              if (token.symbol === 'WETH' || token.symbol === 'WBTC') {
                                return balance.toFixed(8);
                              } else if (token.symbol === 'LINK') {
                                return balance.toFixed(3);
                              } else {
                                return balance.toLocaleString();
                              }
                            })()} {token.symbol}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${token.balanceInUSD.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">{token.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))
                ) : (
                  // 显示默认资产分配
                  [
                    { symbol: 'USDC', name: 'USD Coin', balance: '1000000', balanceInUSD: 1000000, percentage: 50 },
                    { symbol: 'WETH', name: 'Wrapped Ether', balance: '100', balanceInUSD: 300000, percentage: 15 },
                    { symbol: 'WBTC', name: 'Wrapped Bitcoin', balance: '5', balanceInUSD: 300000, percentage: 15 },
                    { symbol: 'LINK', name: 'Chainlink', balance: '20000', balanceInUSD: 300000, percentage: 15 },
                    { symbol: 'DAI', name: 'Dai Stablecoin', balance: '300000', balanceInUSD: 300000, percentage: 15 },
                  ].map((token) => (
                    <div key={token.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <TokenLogo symbol={token.symbol} size={32} />
                        <div>
                          <div className="font-medium">{token.name}</div>
                          <div className="text-sm text-gray-600">
                            {parseFloat(token.balance).toLocaleString()} {token.symbol}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${token.balanceInUSD.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">{token.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historical Portfolio Ratios - moved below MFC chart */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Historical Portfolio Ratios (Past 180 Days)</h3>
        <Card>
          <CardContent className="pt-6">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={Object.keys(historicalRatios).map(date => ({ date, ...historicalRatios[date] }))}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 22]} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                  <Legend />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="WBTC" stroke="#F7931A" strokeWidth={3} dot={false} name="WBTC" />
                  <Line type="monotone" dataKey="WETH" stroke="#627EEA" strokeWidth={3} dot={false} name="WETH" />
                  <Line type="monotone" dataKey="LINK" stroke="#00D4AA" strokeWidth={3} dot={false} name="LINK" />
                  <Line type="monotone" dataKey="DAI" stroke="#F5AC37" strokeWidth={3} dot={false} name="DAI" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['WBTC', 'WETH', 'LINK', 'DAI'].map((token, index) => (
                <div key={token} className="flex items-center space-x-1">
                  <div 
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: ['#F7931A', '#627EEA', '#00D4AA', '#F5AC37'][index] }}
                  />
                  <span className="text-xs">{token}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> This chart shows how portfolio ratios have changed over the past 180 days 
                based on historical token price movements. The lines represent the percentage allocation 
                of each token in the portfolio over time. This is calculated using the current portfolio composition 
                applied to historical price data for reference purposes only and does not predict future performance.
                The different starting percentages reflect the current actual portfolio allocation, which may differ 
                from the theoretical 12.5% equal distribution due to market price movements over time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* MFC Supply Progress */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Mock Found Coin (MFC) Supply</h3>
        <div className="space-y-4">
          {mfcData ? (
            <>
              <div className="flex justify-between text-sm">
                <span>Total Supply</span>
                <span className="font-medium">{parseFloat(mfcData.totalSupply).toLocaleString()} MFC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Circulating</span>
                <span className="font-medium">{parseFloat(mfcData.circulatingSupply).toLocaleString()} MFC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Available</span>
                <span className="font-medium">{parseFloat(mfcData.availableSupply).toLocaleString()} MFC</span>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Investment Progress</span>
                  <span>{mfcData.progressPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${mfcData.progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* MFC Value */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600">MFC Value</div>
                  <div className="text-lg font-bold text-blue-800">
                    ${parseFloat(mfcData.mfcValue).toFixed(2)}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600">Fund NAV</div>
                  <div className="text-lg font-bold text-green-800">
                    ${parseFloat(mfcData.nav).toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          ) : (
            // 显示默认 MFC 数据
            <>
              <div className="flex justify-between text-sm">
                <span>Total Supply</span>
                <span className="font-medium">1,000,000 MFC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Circulating</span>
                <span className="font-medium">500,000 MFC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Available</span>
                <span className="font-medium">500,000 MFC</span>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Investment Progress</span>
                  <span>50.0%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: '50%' }}
                  ></div>
                </div>
              </div>

              {/* MFC Value */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600">MFC Value</div>
                  <div className="text-lg font-bold text-blue-800">
                    $1.02
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600">Fund NAV</div>
                  <div className="text-lg font-bold text-green-800">
                    $2,200,000
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}