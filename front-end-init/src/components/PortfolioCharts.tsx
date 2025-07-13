'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PORTFOLIO_CONFIG } from '../../contracts/addresses';

const PortfolioCharts: React.FC = () => {
  const portfolioData = [
    { name: 'USDC', value: PORTFOLIO_CONFIG.USDC, color: '#2775CA' },
    { name: 'WBTC', value: PORTFOLIO_CONFIG.WBTC, color: '#F7931A' },
    { name: 'WETH', value: PORTFOLIO_CONFIG.WETH, color: '#627EEA' },
    { name: 'LINK', value: PORTFOLIO_CONFIG.LINK, color: '#2A5ADA' },
    { name: 'DAI', value: PORTFOLIO_CONFIG.DAI, color: '#F5AC37' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 饼图 */}
      <Card>
        <CardHeader>
          <CardTitle>投资组合分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              {/* 简化的饼图显示 */}
              <div className="w-full h-full rounded-full border-8 border-gray-200 relative overflow-hidden">
                {portfolioData.map((item, index) => {
                  const startAngle = portfolioData
                    .slice(0, index)
                    .reduce((sum, d) => sum + (d.value / 100) * 360, 0);
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
          
          {/* 图例 */}
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
                <span className="text-sm font-medium">{item.value / 100}%</span>
            </div>
            ))}
            </div>
        </CardContent>
      </Card>

      {/* 柱状图 */}
      <Card>
        <CardHeader>
          <CardTitle>资产配置比例</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolioData.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-gray-500">{item.value / 100}%</span>
            </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${item.value / 100}%`,
                      backgroundColor: item.color 
                    }}
                  />
                </div>
              </div>
            ))}
            </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-sm text-blue-900 mb-2">投资组合特点</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• 50% 稳定币配置，降低波动风险</li>
              <li>• 25% 主流加密货币，获得增长潜力</li>
              <li>• 25% 生态代币，分散投资风险</li>
              <li>• 基于 Chainlink 真实价格进行交易</li>
            </ul>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioCharts;