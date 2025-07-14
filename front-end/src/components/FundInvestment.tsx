'use client';

import { useState, useEffect } from 'react';
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

export default function FundInvestment() {
  const {
    handleInvest, 
    handleApproveUsdc, 
    userUsdcBalance,
    isInvesting, 
    isApproving 
  } = useMockFund();
  const { getInvestmentPreview, userMfcBalance, mfcData } = useFundData();
  
  const [usdcAmount, setUsdcAmount] = useState('');
  const [previewMfc, setPreviewMfc] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCalculatedPreview, setHasCalculatedPreview] = useState(false);

  // 手动计算投资预览
  const calculatePreview = async () => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      setPreviewMfc('');
      setHasCalculatedPreview(false);
      return;
    }

    setIsCalculating(true);
    try {
      const preview = await getInvestmentPreview(usdcAmount);
      setPreviewMfc(preview);
      setHasCalculatedPreview(true);
    } catch (error) {
      console.error('Failed to calculate preview:', error);
      setPreviewMfc('');
      setHasCalculatedPreview(false);
    } finally {
      setIsCalculating(false);
    }
  };

  // 当金额改变时，重置预览状态
  useEffect(() => {
    setHasCalculatedPreview(false);
    setPreviewMfc('');
  }, [usdcAmount]);

  // 状态：是否已经授权过
  const [hasApproved, setHasApproved] = useState(false);

  // 检查是否需要授权
  const needsApproval = () => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) return false;
    return !hasApproved; // 只要用户还没点击过授权就需要授权
  };

  // 检查是否可以投资
  const canInvest = () => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) return false;
    if (parseFloat(userUsdcBalance) < parseFloat(usdcAmount)) return false;
    return hasApproved; // 只要用户已经授权过就可以投资
  };



  // 处理授权
  const handleApproval = async () => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      alert('请输入有效的投资金额');
      return;
    }

    // 检查余额
    if (parseFloat(userUsdcBalance) < parseFloat(usdcAmount)) {
      alert('USDC余额不足');
      return;
    }

    // 执行授权
    await handleApproveUsdc(usdcAmount);
    // 授权完成后设置状态
    setHasApproved(true);
  };

  // 处理投资
  const handleInvestment = async () => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      alert('请输入有效的投资金额');
      return;
    }

    try {
      // 使用传统方式投资
      await handleInvest(usdcAmount);
      
      // 重置表单
      setUsdcAmount('');
      setPreviewMfc('');
      setHasApproved(false);
    } catch (error) {
      console.error('投资失败:', error);
    }
  };

  const handleQuickAmount = (amount: string) => {
    setUsdcAmount(amount);
  };

    return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Invest MFC</h2>
        <p className="text-gray-600">Use USDC to purchase MFC tokens and participate in fund investment</p>
      </div>

      {/* Investment Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-800">Investment Method</h3>
        <p className="text-sm text-blue-700">Traditional investment method: First approve USDC, then execute investment in two steps.</p>
      </div>
      
      {/* User Balance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">USDC Balance</h3>
          <p className="text-2xl font-bold text-blue-600">
            {parseFloat(userUsdcBalance).toFixed(2)}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">MFC Balance</h3>
          <p className="text-2xl font-bold text-green-600">
            {parseFloat(userMfcBalance).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Investment Form */}
      <div className="space-y-4">
      <div>
          <label htmlFor="usdcAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Investment Amount (USDC)
            </label>
            <input
              type="number"
            id="usdcAmount"
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(e.target.value)}
            placeholder="Enter USDC amount"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
              step="0.01"
            />
          </div>

        {/* Quick Amount Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickAmount('100')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            100 USDC
          </button>
          <button
            onClick={() => handleQuickAmount('500')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            500 USDC
          </button>
          <button
            onClick={() => handleQuickAmount('1000')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            1000 USDC
          </button>
          <button
            onClick={() => handleQuickAmount('5000')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            5000 USDC
          </button>
        </div>

        {/* Investment Preview */}
        {usdcAmount && parseFloat(usdcAmount) > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Investment Preview</h3>
              {!hasCalculatedPreview && (
                <button
                  onClick={calculatePreview}
                  disabled={isCalculating}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  {isCalculating ? 'Calculating...' : 'Calculate Preview'}
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Investment Amount:</span>
                <span className="font-medium">{parseFloat(usdcAmount).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between items-center">
                <span>MFC to Receive:</span>
                <div className="flex items-center">
                  <span className="font-medium">
                    {isCalculating ? 'Calculating...' : hasCalculatedPreview ? `${parseFloat(previewMfc || '0').toFixed(2)} MFC` : 'Click to calculate'}
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
                  <span>MFC Value:</span>
                  <span className="font-medium">
                    ${((parseFloat(previewMfc || '0') * parseFloat(mfcData.mfcValue))).toFixed(2)} USD
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Approval Step */}
        {usdcAmount && parseFloat(usdcAmount) > 0 && needsApproval() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-blue-600 text-white">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800">Approve USDC</h3>
                <p className="text-sm text-blue-600">Allow MockFund contract to use your USDC</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleApproval}
                disabled={isApproving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isApproving ? 'Approving...' : 'Approve USDC'}
              </button>
            </div>
          </div>
        )}

        {/* Investment Button */}
        {usdcAmount && parseFloat(usdcAmount) > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-green-600 text-white">
                {needsApproval() ? '2' : '1'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">Execute Investment</h3>
                <p className="text-sm text-green-600">Use USDC to purchase MFC tokens</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleInvestment}
                disabled={isInvesting || !canInvest()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isInvesting ? 'Investing...' : 'Start Investment'}
              </button>
            </div>
          </div>
        )}


      </div>

      {/* Investment Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Investment Instructions</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Minimum investment: 100 USDC</li>
          <li>• Investment will receive equivalent MFC tokens</li>
          <li>• MFC represents fund shares, redeemable anytime</li>
          <li>• Fund portfolio: 50% USDC + 50% other tokens</li>
          <li>• Management fee: 1%</li>
          <li>• First approve USDC, then execute investment</li>
        </ul>
      </div>
    </div>
  );
}
