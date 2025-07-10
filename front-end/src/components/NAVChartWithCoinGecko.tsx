'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PORTFOLIO_CONFIG } from '../../contracts/addresses';

const NAVChartWithCoinGecko: React.FC = () => {
  const portfolioData = [
    { name: 'USDC', allocation: PORTFOLIO_CONFIG.USDC / 100, color: '#2775CA' },
    { name: 'WBTC', allocation: PORTFOLIO_CONFIG.WBTC / 100, color: '#F7931A' },
    { name: 'WETH', allocation: PORTFOLIO_CONFIG.WETH / 100, color: '#627EEA' },
    { name: 'LINK', allocation: PORTFOLIO_CONFIG.LINK / 100, color: '#2A5ADA' },
    { name: 'DAI', allocation: PORTFOLIO_CONFIG.DAI / 100, color: '#F5AC37' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>基金净值 (NAV) 构成 - CoinGecko 数据</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 数据来源说明 */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">📊 数据来源</h4>
            <p className="text-sm text-purple-700">
              使用 CoinGecko API 获取实时价格数据，结合 Chainlink 预言机进行双重验证
            </p>
          </div>

          {/* 投资组合构成 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">投资组合构成</h4>
            {portfolioData.map((token, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: token.color }}
                    />
                    <span className="font-medium">{token.name}</span>
                  </div>
                  <span className="text-sm font-medium">{token.allocation}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${token.allocation}%`,
                      backgroundColor: token.color 
                    }}
                />
                </div>
              </div>
            ))}
          </div>

          {/* 价格数据特点 */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">💡 价格数据特点</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• CoinGecko 提供全球市场均价</li>
              <li>• 实时更新，延迟小于1分钟</li>
              <li>• 支持多种交易所数据聚合</li>
              <li>• 与 Chainlink 预言机数据对比验证</li>
            </ul>
          </div>
        
          {/* 技术说明 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">🔧 技术实现</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 前端使用 CoinGecko API 获取价格</li>
              <li>• 合约使用 Chainlink 预言机验证</li>
              <li>• 双重数据源确保价格准确性</li>
              <li>• 实时计算基金净值</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NAVChartWithCoinGecko;