'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import ConnectButton from '@/components/ui/ConnectButton';
import { useMockFund } from '@/hooks/useMockFund';
import { useMockUSDC } from '@/hooks/useMockUSDC';
import { useFundShareToken } from '@/hooks/useFundShareToken';
import { CONTRACT_ADDRESSES } from '@/contracts/addresses';

export default function Home() {
  // 获取当前连接的账户
  const { address, isConnected } = useAccount();
  
  // 使用合约hooks
  const mockFund = useMockFund();
  const mockUSDC = useMockUSDC();
  const fundShareToken = useFundShareToken();
  
  // 状态管理
  const [investAmount, setInvestAmount] = useState('');
  const [redeemShares, setRedeemShares] = useState('');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [shareBalance, setShareBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });

  // 加载用户数据
  useEffect(() => {
    if (isConnected && address) {
      loadUserData();
    }
  }, [isConnected, address, mockFund.isConfirmed, mockUSDC.isConfirmed]);

  // 加载用户数据
  const loadUserData = async () => {
    if (!address) return;
    
    try {
      // 获取USDC余额
      const usdcBalanceData = await mockUSDC.getBalance(address);
      if (usdcBalanceData) {
        setUsdcBalance(formatUnits(usdcBalanceData, 6));
      }
      
      // 获取份额余额
      const shareBalanceData = await fundShareToken.getBalance(address);
      if (shareBalanceData) {
        setShareBalance(formatUnits(shareBalanceData, 18));
      }
      
      // 刷新基金数据
      mockFund.refreshAllData();
    } catch (error) {
      console.error('加载用户数据失败:', error);
    }
  };

  // 投资
  const handleInvest = async () => {
    if (!isConnected || !address || !investAmount) {
      setMessage({ type: 'error', content: '请连接钱包并输入投资金额' });
      return;
    }
    
    setIsLoading(true);
    setMessage({ type: '', content: '' });
    
    try {
      // 先批准USDC支出
      const approveResult = await mockUSDC.approve(
        CONTRACT_ADDRESSES.MOCK_FUND,
        investAmount
      );
      
      if (!approveResult?.success) {
        throw new Error('批准USDC支出失败');
      }
      
      // 等待批准交易确认
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 执行投资
      const investResult = await mockFund.invest(investAmount);
      
      if (investResult?.success) {
        setMessage({ type: 'success', content: '投资成功！' });
        setInvestAmount('');
        // 重新加载数据
        await loadUserData();
      } else {
        throw new Error('投资失败');
      }
    } catch (error) {
      console.error('投资操作失败:', error);
      setMessage({ type: 'error', content: `投资失败: ${error.message || '未知错误'}` });
    } finally {
      setIsLoading(false);
    }
  };

  // 赎回
  const handleRedeem = async () => {
    if (!isConnected || !address || !redeemShares) {
      setMessage({ type: 'error', content: '请连接钱包并输入赎回份额' });
      return;
    }
    
    setIsLoading(true);
    setMessage({ type: '', content: '' });
    
    try {
      const redeemResult = await mockFund.redeem(redeemShares);
      
      if (redeemResult?.success) {
        setMessage({ type: 'success', content: '赎回成功！' });
        setRedeemShares('');
        // 重新加载数据
        await loadUserData();
      } else {
        throw new Error('赎回失败');
      }
    } catch (error) {
      console.error('赎回操作失败:', error);
      setMessage({ type: 'error', content: `赎回失败: ${error.message || '未知错误'}` });
    } finally {
      setIsLoading(false);
    }
  };

  // 获取测试代币
  const handleGetTestTokens = async () => {
    if (!isConnected || !address) {
      setMessage({ type: 'error', content: '请先连接钱包' });
      return;
    }
    
    setIsLoading(true);
    setMessage({ type: '', content: '' });
    
    try {
      const result = await mockUSDC.getTestTokens();
      
      if (result?.success) {
        setMessage({ type: 'success', content: '获取测试代币成功！' });
        // 重新加载数据
        await loadUserData();
      } else {
        throw new Error('获取测试代币失败');
      }
    } catch (error) {
      console.error('获取测试代币失败:', error);
      setMessage({ type: 'error', content: `获取测试代币失败: ${error.message || '未知错误'}` });
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化基金统计数据
  const formatFundStats = () => {
    if (!mockFund.fundStats) return null;
    
    const [totalAssets, totalShares, nav, managementFeeRate, lastFeeCollectionTimestamp] = mockFund.fundStats;
    
    return {
      totalAssets: formatUnits(totalAssets, 6),
      totalShares: formatUnits(totalShares, 18),
      nav: formatUnits(nav, 6),
      managementFeeRate: Number(managementFeeRate) / 100,
      lastFeeCollectionTimestamp: new Date(Number(lastFeeCollectionTimestamp) * 1000).toLocaleString(),
    };
  };

  const fundStats = formatFundStats();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 导航栏 */}
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mock Fund DApp</h1>
            </div>
            <div className="flex items-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 消息提示 */}
        {message.content && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
            message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
            'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {message.content}
          </div>
        )}

        {/* 用户信息 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">我的账户</h2>
          
          {isConnected ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">钱包地址</p>
                <p className="font-mono text-sm truncate">{address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">USDC余额</p>
                <p className="font-medium">{usdcBalance} USDC</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">基金份额</p>
                <p className="font-medium">{shareBalance} {fundShareToken.symbol || 'MFS'}</p>
              </div>
              <div>
                <button
                  onClick={handleGetTestTokens}
                  disabled={isLoading || !isConnected}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  获取测试USDC
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">请连接钱包查看账户信息</p>
          )}
        </div>

        {/* 基金信息 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">基金信息</h2>
          
          {fundStats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">总资产</p>
                <p className="font-medium">{fundStats.totalAssets} USDC</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">总份额</p>
                <p className="font-medium">{fundStats.totalShares} {fundShareToken.symbol || 'MFS'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">当前NAV</p>
                <p className="font-medium">{fundStats.nav} USDC</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">管理费率</p>
                <p className="font-medium">{fundStats.managementFeeRate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">最后收费时间</p>
                <p className="font-medium">{fundStats.lastFeeCollectionTimestamp}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">加载基金信息中...</p>
          )}
        </div>

        {/* 操作区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 投资 */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">投资</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="investAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  投资金额 (USDC)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="investAmount"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    placeholder="输入投资金额"
                    disabled={!isConnected || isLoading}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <button
                onClick={handleInvest}
                disabled={!isConnected || !investAmount || isLoading}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '处理中...' : '投资'}
              </button>
            </div>
          </div>

          {/* 赎回 */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">赎回</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="redeemShares" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  赎回份额 ({fundShareToken.symbol || 'MFS'})
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="redeemShares"
                    value={redeemShares}
                    onChange={(e) => setRedeemShares(e.target.value)}
                    placeholder="输入赎回份额"
                    disabled={!isConnected || isLoading}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <button
                onClick={handleRedeem}
                disabled={!isConnected || !redeemShares || isLoading}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '处理中...' : '赎回'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white dark:bg-gray-800 shadow-inner mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Mock Fund DApp - 基于区块链的模拟基金应用
          </p>
        </div>
      </footer>
    </div>
  );
}
