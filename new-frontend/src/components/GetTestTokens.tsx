'use client';

import { useState } from 'react';
import { useMockFund } from '@/hooks/useMockFund';
import { parseUnits } from 'viem';

export default function GetTestTokens() {
  const {
    isConnected,
    address,
    isLoading,
    error: hookError,
    userUsdcBalance,
    mintUSDC,
    getTestUsdc,
  } = useMockFund();
  
  const [amount, setAmount] = useState('10000'); // 默认10000 USDC
  const [error, setError] = useState<string | null>(null);

  // 处理铸造USDC
  const handleMintUSDC = async () => {
    if (!amount) {
      setError('请输入有效金额');
      return;
    }
    
    try {
      setError(null);
      await getTestUsdc(amount);
    } catch (error) {
      console.error('铸造USDC失败:', error);
      setError(error instanceof Error ? error.message : '铸造USDC失败');
    }
  };

  // 处理快速获取10000 USDC
  const handleQuickMint = async () => {
    try {
      setError(null);
      await getTestUsdc('10000');
    } catch (error) {
      console.error('铸造USDC失败:', error);
      setError(error instanceof Error ? error.message : '铸造USDC失败');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">获取测试代币</h2>
      
      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-600">请先连接钱包</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 当前余额显示 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">当前余额</h3>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">USDC:</span>
              <span className="text-xl font-bold text-green-600">
                {parseFloat(userUsdcBalance).toLocaleString()}
              </span>
            </div>
          </div>

          {/* 快速获取10000 USDC */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">快速获取</h3>
            <button
              onClick={handleQuickMint}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {isLoading ? '处理中...' : '获取 10,000 USDC'}
            </button>
          </div>

          {/* 自定义数量获取 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">自定义数量</h3>
            <div className="flex space-x-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="输入USDC数量"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                step="1"
              />
              <button
                onClick={handleMintUSDC}
                disabled={isLoading || !amount}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
              >
                {isLoading ? '处理中...' : '获取'}
              </button>
            </div>
          </div>

          {/* 交易状态 */}
          {isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">正在处理交易...</p>
            </div>
          )}

          {/* 错误信息 */}
          {(error || hookError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error || hookError}</p>
            </div>
          )}

          {/* 说明 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-2">说明</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 这是测试网络的USDC代币，仅用于测试</li>
              <li>• 每次可以获取任意数量的USDC</li>
              <li>• 建议先获取一些USDC再进行基金投资</li>
              <li>• 余额会自动更新，无需手动刷新</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}