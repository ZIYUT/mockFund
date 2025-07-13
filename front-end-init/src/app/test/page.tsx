'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import ConnectButton from '@/components/ui/ConnectButton';
import { CONTRACT_ADDRESSES } from '@/contracts/addresses';
import MockUSDCArtifact from '@/contracts/abis/MockUSDC.json';

// 从artifact中提取ABI
const MockUSDCABI = MockUSDCArtifact.abi as any[];
import { useMockUSDC } from '@/hooks/useMockUSDC';

export default function TestPage() {
  const { address, isConnected, chain } = useAccount();
  const mockUSDC = useMockUSDC();
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 直接读取USDC余额
  const { data: usdcBalance, error: balanceError, refetch, isLoading: isBalanceLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_USDC as `0x${string}`,
    abi: MockUSDCABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CONTRACT_ADDRESSES.MOCK_USDC,
      refetchInterval: 5000, // 每5秒自动刷新
    },
  });

  // 读取合约名称和符号进行连接测试
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

  useEffect(() => {
    if (usdcBalance) {
      setBalance(formatUnits(usdcBalance as bigint, 6));
    }
  }, [usdcBalance]);

  const handleGetTestTokens = async () => {
    if (!isConnected || !address) {
      setMessage('请先连接钱包');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const result = await mockUSDC.getTestTokens();
      if (result?.success) {
        setMessage('获取测试代币成功！等待交易确认...');
        // 等待交易确认后刷新余额
        setTimeout(() => {
          refetch();
        }, 3000);
      } else {
        setMessage('获取测试代币失败');
      }
    } catch (error) {
      console.error('获取测试代币失败:', error);
      setMessage(`获取测试代币失败: ${error.message || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">合约连接测试</h1>
        
        {/* 连接状态 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">连接状态</h2>
          <div className="space-y-2">
            <p><strong>连接状态:</strong> {isConnected ? '✅ 已连接' : '❌ 未连接'}</p>
            <p><strong>钱包地址:</strong> {address || 'N/A'}</p>
            <p><strong>网络:</strong> {chain?.name || 'N/A'} (ID: {chain?.id || 'N/A'})</p>
            <p><strong>USDC合约地址:</strong> {CONTRACT_ADDRESSES.MOCK_USDC}</p>
            <p><strong>代币名称:</strong> {tokenName || '加载中...'}</p>
            <p><strong>代币符号:</strong> {tokenSymbol || '加载中...'}</p>
          </div>
          <div className="mt-4">
            <ConnectButton />
          </div>
        </div>

        {/* 余额信息 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">余额信息</h2>
          <div className="space-y-2">
            <p><strong>余额状态:</strong> {isBalanceLoading ? '🔄 加载中...' : '✅ 已加载'}</p>
            <p><strong>原始余额数据:</strong> {usdcBalance ? usdcBalance.toString() : 'null'}</p>
            <p><strong>格式化余额:</strong> {balance} USDC</p>
            <p><strong>自动刷新:</strong> 每5秒</p>
            {balanceError && (
              <div className="bg-red-50 p-3 rounded">
                <p className="text-red-500"><strong>❌ 余额读取错误:</strong></p>
                <p className="text-red-500 text-sm">{balanceError.message}</p>
                <p className="text-red-500 text-sm">错误详情: {JSON.stringify(balanceError, null, 2)}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isBalanceLoading}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isBalanceLoading ? '刷新中...' : '手动刷新余额'}
          </button>
        </div>

        {/* 操作区域 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">操作</h2>
          <button
            onClick={handleGetTestTokens}
            disabled={!isConnected || isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '处理中...' : '获取测试USDC'}
          </button>
        </div>

        {/* 消息显示 */}
        {message && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">消息</h2>
            <p className={message.includes('失败') ? 'text-red-500' : 'text-green-500'}>
              {message}
            </p>
          </div>
        )}

        {/* 交易状态 */}
        {mockUSDC.transactionHash && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">交易状态</h2>
            <div className="space-y-2">
              <p><strong>交易哈希:</strong> {mockUSDC.transactionHash}</p>
              <p><strong>待处理:</strong> {mockUSDC.isPending ? '是' : '否'}</p>
              <p><strong>确认中:</strong> {mockUSDC.isConfirming ? '是' : '否'}</p>
              <p><strong>已确认:</strong> {mockUSDC.isConfirmed ? '是' : '否'}</p>
              {mockUSDC.error && (
                <p className="text-red-500"><strong>错误:</strong> {mockUSDC.error.message}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}