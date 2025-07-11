'use client';

import { useState } from 'react';
import { useMockFund } from '@/hooks/useMockFund';
import { parseUnits } from 'viem';

export default function FundInvestment() {
  const {
    isConnected,
    address,
    isLoading,
    error,
    isInitialized,
    nav,
    mfcValue,
    userUsdcBalance,
    usdcAllowance,
    handleInvest,
    handleApproveUsdc,
  } = useMockFund();

  const [investmentAmount, setInvestmentAmount] = useState('');
  const [approvalAmount, setApprovalAmount] = useState('1000');

  const handleInvestmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investmentAmount) return;
    await handleInvest(investmentAmount);
  };

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalAmount) return;
    await handleApproveUsdc(approvalAmount);
  };

  const calculateMfcToReceive = () => {
    if (!investmentAmount || !mfcValue || mfcValue === '0') return '0';
    try {
      const usdcAmount = parseFloat(investmentAmount);
      const mfcValueNum = parseFloat(mfcValue);
      const mfcToReceive = usdcAmount / mfcValueNum;
      return mfcToReceive.toFixed(6);
    } catch {
      return '0';
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">基金投资</h2>
        <div className="text-center py-8">
          <p className="text-gray-600">请先连接钱包</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">基金投资</h2>
        <div className="text-center py-8">
          <p className="text-gray-600">基金尚未初始化</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">基金投资</h2>
      
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
          <h3 className="font-semibold text-purple-800">您的USDC余额</h3>
          <p className="text-2xl font-bold text-purple-600">{parseFloat(userUsdcBalance).toLocaleString()}</p>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* USDC授权 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">USDC授权</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            当前授权额度: {parseFloat(usdcAllowance).toLocaleString()} USDC
          </p>
          <form onSubmit={handleApprovalSubmit} className="flex gap-2">
            <input
              type="number"
              value={approvalAmount}
              onChange={(e) => setApprovalAmount(e.target.value)}
              placeholder="授权金额"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '授权中...' : '授权USDC'}
            </button>
          </form>
        </div>
      </div>

      {/* 投资表单 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">投资USDC</h3>
        <form onSubmit={handleInvestmentSubmit} className="space-y-4">
          <div>
            <label htmlFor="investmentAmount" className="block text-sm font-medium text-gray-700 mb-2">
              投资金额 (USDC)
            </label>
            <input
              id="investmentAmount"
              type="number"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              placeholder="输入投资金额"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="100"
              step="0.01"
              required
            />
            <p className="text-sm text-gray-500 mt-1">最小投资金额: 100 USDC</p>
          </div>

          {/* 预期获得的MFC */}
          {investmentAmount && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">预期获得的MFC</h4>
              <p className="text-2xl font-bold text-green-600">
                {calculateMfcToReceive()} MFC
              </p>
              <p className="text-sm text-green-600 mt-1">
                价值: ${investmentAmount} USDC
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !investmentAmount}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isLoading ? '投资中...' : '确认投资'}
          </button>
        </form>
      </div>

      {/* 钱包信息 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">钱包地址</h3>
        <p className="text-sm text-gray-600 font-mono break-all">{address}</p>
      </div>
    </div>
  );
}