'use client';

import { useFundData } from '@/hooks/useFundData';

export default function FundPortfolio() {
  const { fundPortfolio, tokenPrices, mfcData, isLoading } = useFundData();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">投资组合</h2>
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
      <h2 className="text-2xl font-bold mb-4">投资组合</h2>
      
      {/* 代币价格 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">实时价格</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {tokenPrices.map((token) => (
            <div key={token.symbol} className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-600">{token.symbol}</div>
              <div className="text-lg font-bold text-gray-900">
                ${(token.priceInUSD || 0).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 基金投资组合 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">基金资产分配</h3>
        <div className="space-y-3">
          {fundPortfolio.map((token) => (
            <div key={token.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {token.symbol.charAt(0)}
                </div>
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
          ))}
        </div>
      </div>

      {/* MFC供应量进度 */}
      {mfcData && (
        <div>
          <h3 className="text-lg font-semibold mb-3">MFC供应量</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>总供应量</span>
              <span className="font-medium">{parseFloat(mfcData.totalSupply).toLocaleString()} MFC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>已流通</span>
              <span className="font-medium">{parseFloat(mfcData.circulatingSupply).toLocaleString()} MFC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>可投资</span>
              <span className="font-medium">{parseFloat(mfcData.availableSupply).toLocaleString()} MFC</span>
            </div>
            
            {/* 进度条 */}
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span>投资进度</span>
                <span>{mfcData.progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${mfcData.progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* MFC价值 */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600">单个MFC价值</div>
                <div className="text-lg font-bold text-blue-800">
                  ${parseFloat(mfcData.mfcValue).toFixed(2)}
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600">基金净值</div>
                <div className="text-lg font-bold text-green-800">
                  ${parseFloat(mfcData.nav).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 