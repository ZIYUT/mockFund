'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
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
  const { isConnected } = useAccount();
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
        <h2 className="text-2xl font-bold mb-2">投资MFC</h2>
        <p className="text-gray-600">使用USDC购买MFC代币，参与基金投资</p>
      </div>

      {/* 投资说明 */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-800">投资方式</h3>
        <p className="text-sm text-blue-700">使用传统投资方式：需要先授权USDC，然后执行投资，共两步操作。</p>
      </div>
      
      {/* 用户余额 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">USDC余额</h3>
          <p className="text-2xl font-bold text-blue-600">
            {parseFloat(userUsdcBalance).toFixed(2)}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">MFC余额</h3>
          <p className="text-2xl font-bold text-green-600">
            {parseFloat(userMfcBalance).toFixed(2)}
          </p>
        </div>
      </div>

      {/* 投资表单 */}
      <div className="space-y-4">
      <div>
          <label htmlFor="usdcAmount" className="block text-sm font-medium text-gray-700 mb-2">
              投资金额 (USDC)
            </label>
            <input
              type="number"
            id="usdcAmount"
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(e.target.value)}
            placeholder="输入USDC数量"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
              step="0.01"
            />
          </div>

        {/* 快速金额按钮 */}
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

        {/* 投资预览 */}
        {usdcAmount && parseFloat(usdcAmount) > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">投资预览</h3>
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
                <span>投资金额:</span>
                <span className="font-medium">{parseFloat(usdcAmount).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between items-center">
                <span>将获得MFC:</span>
                <div className="flex items-center">
                  <span className="font-medium">
                    {isCalculating ? '计算中...' : hasCalculatedPreview ? `${parseFloat(previewMfc || '0').toFixed(2)} MFC` : '点击计算预览'}
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
                    ${((parseFloat(previewMfc || '0') * parseFloat(mfcData.mfcValue))).toFixed(2)} USD
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 授权步骤 */}
        {usdcAmount && parseFloat(usdcAmount) > 0 && needsApproval() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-blue-600 text-white">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800">授权USDC</h3>
                <p className="text-sm text-blue-600">允许MockFund合约使用您的USDC</p>
                <div className="mt-2 text-sm text-blue-700">
                  <span>已授权金额: </span>
                  <span className="font-medium">{hasApproved ? '是' : '否'}</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleApproval}
                disabled={isApproving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isApproving ? '授权中...' : '授权USDC'}
              </button>
            </div>
          </div>
        )}

        {/* 投资按钮 */}
        {usdcAmount && parseFloat(usdcAmount) > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-green-600 text-white">
                {needsApproval() ? '2' : '1'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">执行投资</h3>
                <p className="text-sm text-green-600">使用USDC购买MFC代币</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleInvestment}
                disabled={isInvesting || !canInvest()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isInvesting ? '投资中...' : '开始投资'}
              </button>
            </div>
          </div>
        )}

        {/* 调试信息 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">调试信息</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <div>投资方式: 传统</div>
            <div>已点击授权: {hasApproved ? '是' : '否'}</div>
            <div>需要授权: {needsApproval() ? '是' : '否'}</div>
            <div>可以投资: {canInvest() ? '是' : '否'}</div>
            <div>投资金额: {usdcAmount || '0'} USDC</div>
            <div>USDC余额: {parseFloat(userUsdcBalance).toFixed(2)} USDC</div>
          </div>
        </div>
      </div>

      {/* 投资说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">投资说明</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 最小投资金额: 100 USDC</li>
          <li>• 投资将获得等值的MFC代币</li>
          <li>• MFC代表基金份额，可随时赎回</li>
          <li>• 基金投资组合: 50% USDC + 50% 其他代币</li>
          <li>• 管理费率: 1%</li>
          <li>• 需要先授权USDC，然后执行投资</li>
        </ul>
      </div>
    </div>
  );
}
