'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '@/contracts/addresses';
import MockUSDCABI from '@/contracts/abis/MockUSDC.json';

export default function BalanceChecker() {
  const { address, isConnected, chain } = useAccount();

  // 直接使用 useReadContract 读取余额
  const { 
    data: balance, 
    error, 
    isLoading, 
    refetch 
  } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_USDC as `0x${string}`,
    abi: MockUSDCABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CONTRACT_ADDRESSES.MOCK_USDC,
      refetchInterval: 3000, // 每3秒自动刷新
    },
  });

  // 读取代币信息进行连接测试
  const { data: tokenName } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_USDC as `0x${string}`,
    abi: MockUSDCABI,
    functionName: 'name',
  });

  const { data: tokenSymbol } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_USDC as `0x${string}`,
    abi: MockUSDCABI,
    functionName: 'symbol',
  });

  const { data: decimals } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_USDC as `0x${string}`,
    abi: MockUSDCABI,
    functionName: 'decimals',
  });

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">请先连接钱包以查看余额</p>
      </div>
    );
  }

  if (chain?.id !== 31337) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">
          ⚠️ 请切换到 Hardhat 本地网络 (Chain ID: 31337)
        </p>
        <p className="text-red-600 text-sm mt-1">
          当前网络: {chain?.name} (ID: {chain?.id})
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 合约连接状态 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📡 合约连接状态</h3>
        <div className="space-y-1 text-sm">
          <p><strong>代币名称:</strong> {tokenName || '加载中...'}</p>
          <p><strong>代币符号:</strong> {tokenSymbol || '加载中...'}</p>
          <p><strong>小数位数:</strong> {decimals?.toString() || '加载中...'}</p>
          <p><strong>合约地址:</strong> {CONTRACT_ADDRESSES.MOCK_USDC}</p>
        </div>
      </div>

      {/* 余额信息 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">💰 余额信息</h3>
        
        {isLoading && (
          <p className="text-green-700">🔄 正在加载余额...</p>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
            <p className="text-red-700 font-medium">❌ 读取余额失败:</p>
            <p className="text-red-600 text-sm">{error.message}</p>
          </div>
        )}
        
        {balance !== undefined && (
          <div className="space-y-2">
            <p className="text-lg font-medium text-green-800">
              余额: {formatUnits(balance as bigint, 6)} USDC
            </p>
            <p className="text-sm text-green-600">
              原始数据: {balance.toString()}
            </p>
            <p className="text-xs text-green-500">
              自动刷新: 每3秒 | 钱包地址: {address}
            </p>
          </div>
        )}
        
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="mt-3 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? '刷新中...' : '手动刷新'}
        </button>
      </div>

      {/* 调试信息 */}
      <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <summary className="cursor-pointer font-medium text-gray-700">
          🔧 调试信息 (点击展开)
        </summary>
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <p><strong>钱包地址:</strong> {address}</p>
          <p><strong>网络ID:</strong> {chain?.id}</p>
          <p><strong>网络名称:</strong> {chain?.name}</p>
          <p><strong>余额状态:</strong> {isLoading ? '加载中' : '已加载'}</p>
          <p><strong>错误状态:</strong> {error ? '有错误' : '正常'}</p>
          <p><strong>合约启用:</strong> {!!address && !!CONTRACT_ADDRESSES.MOCK_USDC ? '是' : '否'}</p>
        </div>
      </details>
    </div>
  );
}