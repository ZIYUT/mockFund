'use client';

import { useState, useEffect } from 'react';
import { useMockFund } from '@/hooks/useMockFund';
import { useFundData } from '@/hooks/useFundData';

// Refresh Icon Component
const RefreshIcon = ({ onClick, isSpinning = false }: { onClick: () => void; isSpinning?: boolean }) => (
  <button
    onClick={onClick}
    className={`ml-2 p-1 rounded-full hover:bg-gray-200 transition-colors ${isSpinning ? 'animate-spin' : ''}`}
    title="Refresh Preview"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  </button>
);

export default function FundRedemption() {
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

  // Reset preview and approval status when amount changes
  useEffect(() => {
    setHasCalculatedPreview(false);
    setPreviewUsdc('');
    setHasMfcApproved(false);
  }, [mfcAmount]);

  // MFC Approval Handler
  const handleMfcApproval = async () => {
    if (!mfcAmount || parseFloat(mfcAmount) <= 0) {
      alert('Please enter a valid redemption amount');
      return;
    }

    // Check balance
    if (parseFloat(userMfcBalance) < parseFloat(mfcAmount)) {
      alert('Insufficient MFC balance');
      return;
    }

    try {
      await handleApproveMfc(mfcAmount);
      setHasMfcApproved(true);
    } catch (error) {
      console.error('MFC approval failed:', error);
    }
  };

  const handleRedemption = async () => {
    if (!mfcAmount || parseFloat(mfcAmount) <= 0) {
      alert('Please enter a valid redemption amount');
      return;
    }

    // Check balance
    if (parseFloat(userMfcBalance) < parseFloat(mfcAmount)) {
      alert('Insufficient MFC balance');
      return;
    }

    // Execute redemption
    await handleRedeem(mfcAmount);
    setMfcAmount('');
    setPreviewUsdc('');
    setHasMfcApproved(false); // Reset approval status
  };

  const handleQuickAmount = (percentage: number) => {
    const amount = (parseFloat(userMfcBalance) * percentage / 100).toString();
    setMfcAmount(amount);
  };

    return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Redeem MFC</h2>
        <p className="text-gray-600">Redeem MFC tokens to receive equivalent USDC</p>
      </div>
      
      {/* User Balance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">MFC Balance</h3>
          <p className="text-2xl font-bold text-green-600">
            {parseFloat(userMfcBalance).toFixed(2)}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">USDC Balance</h3>
          <p className="text-2xl font-bold text-blue-600">
            {parseFloat(userUsdcBalance).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Redemption Form */}
      <div className="space-y-4">
      <div>
          <label htmlFor="mfcAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Redemption Amount (MFC)
            </label>
            <input
              type="number"
            id="mfcAmount"
            value={mfcAmount}
            onChange={(e) => setMfcAmount(e.target.value)}
            placeholder="Enter MFC amount"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              min="0"
            step="0.01"
          />
        </div>

        {/* Quick Amount Buttons */}
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
            All
          </button>
          </div>

          {/* Redemption Preview */}
        {mfcAmount && parseFloat(mfcAmount) > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Redemption Preview</h3>
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
                <span>Redemption Amount:</span>
                <span className="font-medium">{parseFloat(mfcAmount).toFixed(2)} MFC</span>
              </div>
              <div className="flex justify-between items-center">
                <span>USDC to Receive:</span>
                <div className="flex items-center">
                  <span className="font-medium">
                    {isCalculating ? 'Calculating...' : hasCalculatedPreview ? `${parseFloat(previewUsdc || '0').toFixed(2)} USDC` : 'Click to calculate'}
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
                    ${(parseFloat(mfcAmount) * parseFloat(mfcData.mfcValue)).toFixed(2)} USD
                  </span>
                </div>
              )}
              </div>
            </div>
          )}

        {/* Approval and Redemption Buttons */}
        {!hasMfcApproved ? (
          <button
            onClick={handleMfcApproval}
            disabled={!mfcAmount || parseFloat(mfcAmount) <= 0}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            Approve MFC
          </button>
        ) : (
          <button
            onClick={handleRedemption}
            disabled={isRedeeming || !mfcAmount || parseFloat(mfcAmount) <= 0}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isRedeeming ? 'Redeeming...' : 'Confirm Redemption'}
          </button>
        )}
      </div>

      {/* Redemption Instructions */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="font-semibold text-red-800 mb-2">Redemption Instructions</h3>
        <ul className="text-sm text-red-700 space-y-1">
          <li>• First-time redemption requires MFC token approval</li>
          <li>• Minimum redemption: 100 USDC equivalent</li>
          <li>• Redemption will receive equivalent USDC</li>
          <li>• Redemption fee: 1%</li>
          <li>• MFC tokens will be burned after redemption</li>
          <li>• Redemption based on real-time price calculation</li>
        </ul>
      </div>
    </div>
  );
}