'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useMockFund } from '@/hooks/useMockFund';
import { useFundData } from '@/hooks/useFundData';

// 刷新图标组件
const RefreshIcon = ({ onClick, isSpinning = false }: { onClick: () => void; isSpinning?: boolean }) => (
  <button
    onClick={onClick}
    className={`ml-2 p-1 rounded-full hover:bg-gray-200 transition-colors ${isSpinning ? 'animate-spin' : ''}`}
    title="刷新预览"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  </button>
);

export default function FundRedemption() {
  const { isConnected } = useAccount();
  const { handleRedeem, handleApproveMfc, userMfcBalance, isRedeeming } = useMockFund();
  const { getRedemptionPreview, userUsdcBalance, mfcData } = useFundData();
  
  const [mfcAmount, setMfcAmount] = useState('');
  const [previewUsdc, setPreviewUsdc] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCalculatedPreview, setHasCalculatedPreview] = useState(false);
  const [hasMfcApproved, setHasMfcApproved] = useState(false);

  // 手动计算赎回预览
  const calculatePreview = async () => {
    if (!mfcAmount || parseFloat(mfcAmount) <= 0) {
      setPreviewUsdc('');
      setHasCalculatedPreview(false);
      return;
    }

    setIsCalculating(true);
    try {
      const preview = await getRedemptionPreview(mfcAmount);
      setPreviewUsdc(preview);
      setHasCalculatedPreview(true);
    } catch (error) {
      console.error('Failed to calculate preview:', error);
      setPreviewUsdc('');
      setHasCalculatedPreview(false);
    } finally {
      setIsCalculating(false);
    }
  };

  // 当金额改变时，重置预览状态和授权状态
  useEffect(() => {
    setHasCalculatedPreview(false);
    setPreviewUsdc('');
    setHasMfcApproved(false);
  }, [mfcAmount]);

  // MFC授权处理函数
  const handleMfcApproval = async () => {
    if (!mfcAmount || parseFloat(mfcAmount) <= 0) {
      alert('请输入有效的赎回数量');
      return;
    }

    // 检查余额
    if (parseFloat(userMfcBalance) < parseFloat(mfcAmount)) {
      alert('MFC余额不足');
      return;
    }

    try {
      await handleApproveMfc(mfcAmount);
      setHasMfcApproved(true);
    } catch (error) {
      console.error('MFC授权失败:', error);
    }
  };

  const handleRedemption = async () => {
    if (!mfcAmount || parseFloat(mfcAmount) <= 0) {
      alert('请输入有效的赎回数量');
      return;
    }

    // 检查余额
    if (parseFloat(userMfcBalance) < parseFloat(mfcAmount)) {
      alert('MFC余额不足');
      return;
    }

    // 执行赎回
    await handleRedeem(mfcAmount);
    setMfcAmount('');
    setPreviewUsdc('');
    setHasMfcApproved(false); // 重置授权状态
  };

  const handleQuickAmount = (percentage: number) => {
    const amount = (parseFloat(userMfcBalance) * percentage / 100).toString();
    setMfcAmount(amount);
  };

    return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">赎回MFC</h2>
        <p className="text-gray-600">赎回MFC代币，获得等值的USDC</p>
      </div>
      
      {/* 用户余额 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">MFC余额</h3>
          <p className="text-2xl font-bold text-green-600">
            {parseFloat(userMfcBalance).toFixed(2)}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">USDC余额</h3>
          <p className="text-2xl font-bold text-blue-600">
            {parseFloat(userUsdcBalance).toFixed(2)}
          </p>
        </div>
      </div>

      {/* 赎回表单 */}
      <div className="space-y-4">
      <div>
          <label htmlFor="mfcAmount" className="block text-sm font-medium text-gray-700 mb-2">
              赎回数量 (MFC)
            </label>
            <input
              type="number"
            id="mfcAmount"
            value={mfcAmount}
            onChange={(e) => setMfcAmount(e.target.value)}
            placeholder="输入MFC数量"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              min="0"
            step="0.01"
          />
        </div>

        {/* 快速金额按钮 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickAmount(25)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            25%
          </button>
          <button
            onClick={() => handleQuickAmount(50)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            50%
          </button>
          <button
            onClick={() => handleQuickAmount(75)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            75%
          </button>
          <button
            onClick={() => handleQuickAmount(100)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            全部
          </button>
          </div>

          {/* 赎回预览 */}
        {mfcAmount && parseFloat(mfcAmount) > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">赎回预览</h3>
              {!hasCalculatedPreview && (
                <button
                  onClick={calculatePreview}
                  disabled={isCalculating}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  {isCalculating ? '计算中...' : '计算预览'}
                </button>
              )}
            </div>
            <div className="space-y-2">
                <div className="flex justify-between">
                <span>赎回数量:</span>
                <span className="font-medium">{parseFloat(mfcAmount).toFixed(2)} MFC</span>
              </div>
              <div className="flex justify-between items-center">
                <span>将获得USDC:</span>
                <div className="flex items-center">
                  <span className="font-medium">
                    {isCalculating ? '计算中...' : hasCalculatedPreview ? `${parseFloat(previewUsdc || '0').toFixed(2)} USDC` : '点击计算预览'}
                  </span>
                  {hasCalculatedPreview && (
                    <RefreshIcon 
                      onClick={calculatePreview} 
                      isSpinning={isCalculating}
                    />
                  )}
                </div>
              </div>
              {mfcData && hasCalculatedPreview && (
                <div className="flex justify-between">
                  <span>MFC价值:</span>
                  <span className="font-medium">
                    ${(parseFloat(mfcAmount) * parseFloat(mfcData.mfcValue)).toFixed(2)} USD
                  </span>
                </div>
              )}
              </div>
            </div>
          )}

        {/* 授权和赎回按钮 */}
        {!hasMfcApproved ? (
          <button
            onClick={handleMfcApproval}
            disabled={!mfcAmount || parseFloat(mfcAmount) <= 0}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            授权MFC
          </button>
        ) : (
          <button
            onClick={handleRedemption}
            disabled={isRedeeming || !mfcAmount || parseFloat(mfcAmount) <= 0}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isRedeeming ? '赎回中...' : '确认赎回'}
          </button>
        )}
      </div>

      {/* 赎回说明 */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="font-semibold text-red-800 mb-2">赎回说明</h3>
        <ul className="text-sm text-red-700 space-y-1">
          <li>• 首次赎回需要先授权MFC代币</li>
          <li>• 最小赎回金额: 100 USDC等值</li>
          <li>• 赎回将获得等值的USDC</li>
          <li>• 赎回手续费: 1%</li>
          <li>• 赎回后MFC将被销毁</li>
          <li>• 赎回基于实时价格计算</li>
        </ul>
      </div>
    </div>
  );
}