'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PORTFOLIO_CONFIG } from '../../contracts/addresses';

const NAVChart: React.FC = () => {
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
        <CardTitle>基金净值 (NAV) 构成</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 净值构成说明 */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">📊 NAV 计算方式</h4>
            <p className="text-sm text-green-700">
              基金净值 = 各代币数量 × 当前价格 + USDC 余额
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

          {/* 净值特点 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 净值特点</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 基于 Chainlink 真实价格计算</li>
              <li>• 实时反映投资组合价值</li>
              <li>• 1:1 投资赎回比例</li>
              <li>• 固定投资组合配置</li>
            </ul>
          </div>
        
          {/* 风险提示 */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">⚠️ 风险提示</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 加密货币价格波动较大</li>
              <li>• 投资有风险，请谨慎决策</li>
              <li>• 历史表现不代表未来收益</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NAVChart;