'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { getContractAddress, SUPPORTED_TOKENS } from '@/contracts/addresses';
import MockUSDCABI from '@/contracts/abis/MockUSDC.json';
import MockTokensABI from '@/contracts/abis/MockTokens.json';

export default function GetTestTokens() {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { writeContract, data: hash } = useWriteContract();
  
  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const getUSDCTokens = async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      await writeContract({
        address: getContractAddress('MOCK_USDC') as `0x${string}`,
        abi: MockUSDCABI.abi,
        functionName: 'getTestTokens',
        args: [],
      });
    } catch (error) {
      console.error('获取USDC失败:', error);
      setIsLoading(false);
    }
  };

  const getOtherTokens = async (tokenSymbol: string) => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      const tokenAddress = SUPPORTED_TOKENS[tokenSymbol as keyof typeof SUPPORTED_TOKENS]?.address;
      if (!tokenAddress) return;

      await writeContract({
        address: tokenAddress as `0x${string}`,
        abi: MockTokensABI.abi || [
          {
            "inputs": [],
            "name": "getTestTokens",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: 'getTestTokens',
        args: [],
      });
    } catch (error) {
      console.error(`获取${tokenSymbol}失败:`, error);
      setIsLoading(false);
    }
  };

  // 交易确认后重置加载状态
  useEffect(() => {
    if (isSuccess) {
      setIsLoading(false);
      alert('交易成功！代币已发送到您的钱包。');
    }
  }, [isSuccess]);

  // 防止水合错误
  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">获取测试代币</h2>
        <p className="text-gray-600">加载中...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">请先连接钱包以获取测试代币</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">获取测试代币</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={getUSDCTokens}
            disabled={isLoading || isConfirming}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? '发送交易...' : isConfirming ? '确认中...' : '获取 USDC'}
          </button>
          
          {Object.entries(SUPPORTED_TOKENS).filter(([symbol]) => symbol !== 'USDC').map(([symbol, token]) => (
            <button
              key={symbol}
              onClick={() => getOtherTokens(symbol)}
              disabled={isLoading || isConfirming}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '发送交易...' : isConfirming ? '确认中...' : `获取 ${symbol}`}
            </button>
          ))}
        </div>
        
        <div className="text-sm text-gray-600">
          <p>• USDC: 获取 1000 个测试USDC</p>
          <p>• 其他代币: 获取相应数量的测试代币</p>
          <p>• 每次点击都会向您的钱包发送测试代币</p>
        </div>
      </div>
    </div>
  );
}