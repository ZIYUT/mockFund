'use client';

import { useAccount, useContractRead } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../../contracts/addresses';
import MockFundABI from '@/contracts/abis/MockFund.json';

export default function DebugInfo() {
  const { address, isConnected, chainId } = useAccount();

  // 测试合约调用
  const { data: isInitialized, error: initError, isLoading: initLoading } = useContractRead({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'isInitialized',
    query: {
      refetchInterval: 5000,
    },
  });

  // 测试其他函数
  const { data: nav, error: navError } = useContractRead({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'calculateNAV',
    enabled: isInitialized as boolean,
  });

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">调试信息</h3>
      
      <div className="space-y-2">
        <p>钱包连接: {isConnected ? '已连接' : '未连接'}</p>
        <p>钱包地址: {address || '无'}</p>
        <p>网络ID: {chainId} {chainId === 11155111 ? '✓ Sepolia' : '✗ 错误网络'}</p>
        <p>MockFund合约: {CONTRACT_ADDRESSES.MockFund}</p>
        
        <div className="mt-4">
          <h4 className="font-semibold">合约调用测试:</h4>
          <p>isInitialized加载中: {initLoading ? '是' : '否'}</p>
          <p>isInitialized结果: {isInitialized ? '已初始化' : '未初始化'}</p>
          <p>isInitialized错误: {initError ? initError.message : '无'}</p>
          
          <p>NAV结果: {nav ? nav.toString() : '无'}</p>
          <p>NAV错误: {navError ? navError.message : '无'}</p>
        </div>
      </div>
    </div>
  );
} 