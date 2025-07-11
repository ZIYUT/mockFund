'use client';

import { useState } from 'react';
import { useMockFund } from '@/hooks/useMockFund';
import { parseEther } from 'viem';

export default function FundRedemption() {
  const {
    isConnected,
    address,
    isLoading,
    error,
    isInitialized,
    nav,
    mfcValue,
    userMfcBalance,
    handleRedeem,
  } = useMockFund();

  const [redemptionAmount, setRedemptionAmount] = useState('');

  const handleRedemptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redemptionAmount) return;
    await handleRedeem(redemptionAmount);
  };

  const calculateUsdcToReceive = () => {
    if (!redemptionAmount || !mfcValue || mfcValue === '0') return '0';
    try {
      const mfcAmount = parseFloat(redemptionAmount);
      const mfcValueNum = parseFloat(mfcValue);
      const usdcToReceive = mfcAmount * mfcValueNum;
      return usdcToReceive.toFixed(2);
    } catch {
      return '0';
    }
  };

  const calculateRedemptionFee = () => {
    const usdcToReceive = calculateUsdcToReceive();
    if (usdcToReceive === '0') return '0';
    const fee = parseFloat(usdcToReceive) * 0.01; // 1% 赎回费
    return fee.toFixed(2);
  };

  const calculateNetAmount = () => {
    const usdcToReceive = parseFloat(calculateUsdcToReceive());
    const fee = parseFloat(calculateRedemptionFee());
    return (usdcToReceive - fee).toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">基金赎回</h2>
        <div className="text-center py-8">
          <p className="text-gray-600">请先连接钱包</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">基金赎回</h2>
        <div className="text-center py-8">
          <p className="text-gray-600">基金尚未初始化</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">基金赎回</h2>
      
      {/* 基金信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">基金净值</h3>
          <p className="text-2xl font-bold text-blue-600">${parseFloat(nav).toLocaleString()}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">MFC价值</h3>
          <p className="text-2xl font-bold text-green-600">${parseFloat(mfcValue).toFixed(4)}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-800">您的MFC余额</h3>
          <p className="text-2xl font-bold text-purple-600">{parseFloat(userMfcBalance).toLocaleString()}</p>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* 赎回表单 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">赎回MFC</h3>
        <form onSubmit={handleRedemptionSubmit} className="space-y-4">
          <div>
            <label htmlFor="redemptionAmount" className="block text-sm font-medium text-gray-700 mb-2">
              赎回数量 (MFC)
            </label>
            <input
              id="redemptionAmount"
              type="number"
              value={redemptionAmount}
              onChange={(e) => setRedemptionAmount(e.target.value)}
              placeholder="输入赎回数量"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.000001"
              max={userMfcBalance}
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              最大可赎回: {parseFloat(userMfcBalance).toFixed(6)} MFC
            </p>
          </div>

          {/* 赎回预览 */}
          {redemptionAmount && parseFloat(redemptionAmount) > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">赎回预览</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-yellow-700">赎回价值:</span>
                  <span className="font-semibold">${calculateUsdcToReceive()} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-700">赎回费用 (1%):</span>
                  <span className="font-semibold text-red-600">-${calculateRedemptionFee()} USDC</span>
                </div>
                <div className="border-t border-yellow-200 pt-2">
                  <div className="flex justify-between">
                    <span className="text-yellow-800 font-semibold">实际到账:</span>
                    <span className="font-bold text-green-600">${calculateNetAmount()} USDC</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !redemptionAmount || parseFloat(redemptionAmount) <= 0}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isLoading ? '赎回中...' : '确认赎回'}
          </button>
        </form>
      </div>

      {/* 赎回说明 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-2">赎回说明</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 赎回将按当前MFC价值计算</li>
          <li>• 赎回费用为1%，从赎回金额中扣除</li>
          <li>• 最小赎回金额为10 USDC等值</li>
          <li>• 赎回后MFC将被销毁</li>
        </ul>
      </div>

      {/* 钱包信息 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">钱包地址</h3>
        <p className="text-sm text-gray-600 font-mono break-all">{address}</p>
      </div>
    </div>
  );
}