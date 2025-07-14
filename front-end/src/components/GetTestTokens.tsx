'use client';

import { useState, useEffect } from 'react';
import { useMockFund } from '@/hooks/useMockFund';

export default function GetTestTokens() {
  const {
    isConnected,
    isLoading,
    error: hookError,
    userUsdcBalance,
    getTestUsdc,
  } = useMockFund();
  
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [amount, setAmount] = useState('10000'); // Default 10000 USDC
  const [error, setError] = useState<string | null>(null);

  // Handle USDC minting
  const handleMintUSDC = async () => {
    if (!amount) {
      setError('Please enter a valid amount');
      return;
    }
    
    try {
      setError(null);
      await getTestUsdc(amount);
    } catch (error) {
      console.error('USDC minting failed:', error);
      setError(error instanceof Error ? error.message : 'USDC minting failed');
    }
  };

  // Handle quick mint 10000 USDC
  const handleQuickMint = async () => {
    try {
      setError(null);
      await getTestUsdc('10000');
    } catch (error) {
      console.error('USDC minting failed:', error);
      setError(error instanceof Error ? error.message : 'USDC minting failed');
    }
  };

  if (!mounted) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Get Test Tokens</h2>
        <div className="text-center py-8">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Get Test Tokens</h2>
      
      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Please connect your wallet first</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Balance Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Current Balance</h3>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">USDC:</span>
              <span className="text-xl font-bold text-green-600">
                {parseFloat(userUsdcBalance).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Quick Get 10000 USDC */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Quick Get</h3>
            <button
              onClick={handleQuickMint}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {isLoading ? 'Processing...' : 'Get 10,000 USDC'}
            </button>
          </div>

          {/* Custom Amount Get */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Custom Amount</h3>
            <div className="flex space-x-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter USDC amount"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                step="1"
              />
              <button
                onClick={handleMintUSDC}
                disabled={isLoading || !amount}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
              >
                {isLoading ? 'Processing...' : 'Get'}
              </button>
            </div>
          </div>

          {/* Transaction Status */}
          {isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">Processing transaction...</p>
            </div>
          )}

          {/* Error Information */}
          {(error || hookError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error || hookError}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-2">Instructions</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• These are testnet USDC tokens for testing purposes only</li>
              <li>• You can get any amount of USDC each time</li>
              <li>• Recommended to get some USDC before fund investment</li>
              <li>• Balance will update automatically, no manual refresh needed</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}