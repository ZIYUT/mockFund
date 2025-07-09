'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatUnits } from 'viem';
import { useMockFund } from '@/hooks/useMockFund';
// import { usePriceOracle } from '@/hooks/usePriceOracle';

// 代币颜色配置
const TOKEN_COLORS: { [key: string]: string } = {
  USDC: 'bg-green-500',
  WBTC: 'bg-orange-500', 
  WETH: 'bg-blue-500',
  LINK: 'bg-purple-500',
  DAI: 'bg-yellow-500',
  UNI: 'bg-pink-500'
};

// 代币描述
const TOKEN_DESCRIPTIONS: { [key: string]: string } = {
  USDC: '稳定币基础资产',
  WBTC: '比特币敞口',
  WETH: '以太坊敞口', 
  LINK: '预言机代币',
  DAI: '去中心化稳定币',
  UNI: 'DEX治理代币'
};

interface AllocationItemProps {
  symbol: string;
  targetAllocation: number;
  currentAllocation: number;
  color: string;
  description: string;
  currentValue: number;
  totalValue: number;
}

const AllocationItem: React.FC<AllocationItemProps> = ({
  symbol,
  targetAllocation,
  currentAllocation,
  color,
  description,
  currentValue,
  totalValue
}) => {

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${color}`}></div>
          <span className="font-medium">{symbol}</span>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {currentAllocation.toFixed(1)}% / {targetAllocation.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            ${currentValue.toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="space-y-1">
        <Progress 
          value={currentAllocation} 
          className="h-2" 
          max={Math.max(targetAllocation, currentAllocation)}
        />
        <div className="text-xs text-gray-600">{description}</div>
      </div>
    </div>
  );
};

export const PortfolioAllocation: React.FC = () => {
  const {
    supportedTokens,
    targetAllocations,
    currentAllocations,
    // tokenHoldings,
    portfolioBreakdown,
    // refreshAllData,
    isLoading,
  } = useMockFund();
  
  const [allocationData, setAllocationData] = useState<Array<{
    symbol: string;
    targetAllocation: number;
    currentAllocation: number;
    currentValue: number;
    color: string;
    description: string;
  }>>([]);
  const [totalValue, setTotalValue] = useState(0);
  
  useEffect(() => {
    if (supportedTokens && targetAllocations && currentAllocations && portfolioBreakdown) {
      const data = supportedTokens.map((token, index) => {
        const targetAllocation = Number(targetAllocations[index]) / 100;
        const currentAllocation = Number(currentAllocations[index]) / 100;
        const valueInUSD = portfolioBreakdown[index]?.valueInUSD || 0n;
        const currentValue = parseFloat(formatUnits(valueInUSD, 6));
        
        return {
          symbol: token.symbol,
          targetAllocation: targetAllocation * 100,
          currentAllocation: currentAllocation * 100,
          currentValue,
          color: TOKEN_COLORS[token.symbol] || 'bg-gray-500',
          description: TOKEN_DESCRIPTIONS[token.symbol] || '代币资产'
        };
      });
      
      const total = data.reduce((sum, item) => sum + item.currentValue, 0);
      setAllocationData(data);
      setTotalValue(total);
    }
  }, [supportedTokens, targetAllocations, currentAllocations, portfolioBreakdown]);
  
  // 再平衡功能已移除
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>投资组合配置</span>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-sm">
              总价值: ${totalValue.toLocaleString()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 投资组合说明 */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">📊 投资组合说明</h4>
          <p className="text-sm text-blue-700">
            本基金采用多元化投资策略，投资于多种加密资产，以实现风险分散和收益优化。
            代币买入后将保持原始配置，不进行再平衡调整。
          </p>
        </div>

        {/* 投资组合分配 */}
        <div className="space-y-4">
          {allocationData.map((item) => (
            <AllocationItem
              key={item.symbol}
              symbol={item.symbol}
              targetAllocation={item.targetAllocation}
              currentAllocation={item.currentAllocation}
              color={item.color}
              description={item.description}
              currentValue={item.currentValue}
              totalValue={totalValue}

            />
          ))}
        </div>



        {/* 投资策略说明 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">🎯 投资策略</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>实时价格:</strong> 通过 Chainlink 预言机获取准确的代币价格</p>
            <p><strong>自动交换:</strong> 使用 Uniswap 进行代币间的自动转换</p>
            <p><strong>买入持有:</strong> 代币买入后保持原始配置，不进行再平衡</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioAllocation;