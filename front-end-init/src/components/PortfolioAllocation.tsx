'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { PORTFOLIO_CONFIG } from '../../contracts/addresses';

const PortfolioAllocation: React.FC = () => {
  const portfolioData = [
    { name: 'USDC', symbol: 'USDC', allocation: PORTFOLIO_CONFIG.USDC / 100, color: '#2775CA' },
    { name: 'Wrapped Bitcoin', symbol: 'WBTC', allocation: PORTFOLIO_CONFIG.WBTC / 100, color: '#F7931A' },
    { name: 'Wrapped Ether', symbol: 'WETH', allocation: PORTFOLIO_CONFIG.WETH / 100, color: '#627EEA' },
    { name: 'Chainlink', symbol: 'LINK', allocation: PORTFOLIO_CONFIG.LINK / 100, color: '#2A5ADA' },
    { name: 'Dai Stablecoin', symbol: 'DAI', allocation: PORTFOLIO_CONFIG.DAI / 100, color: '#F5AC37' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>投资组合分配</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {portfolioData.map((token, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: token.color }}
                  />
                  <span className="font-medium">{token.name}</span>
                  <span className="text-sm text-gray-500">({token.symbol})</span>
                </div>
                <span className="text-sm font-medium">{token.allocation}%</span>
              </div>
              <Progress value={token.allocation} className="h-2" />
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm text-gray-700 mb-2">投资策略说明</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 50% USDC 保持稳定性和流动性</li>
            <li>• 12.5% WBTC 获得比特币敞口</li>
            <li>• 12.5% WETH 获得以太坊敞口</li>
            <li>• 12.5% LINK 获得预言机生态敞口</li>
            <li>• 12.5% DAI 获得稳定币多样化</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioAllocation;