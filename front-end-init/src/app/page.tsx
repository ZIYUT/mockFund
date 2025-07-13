'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import ConnectButton from '@/components/ui/ConnectButton';
import BalanceChecker from '@/components/BalanceChecker';
import { useMockFund } from '@/hooks/useMockFund';
import { useMockUSDC } from '@/hooks/useMockUSDC';
import { useFundShareToken } from '@/hooks/useFundShareToken';
import { testCoinGeckoConnection } from '@/lib/testCoinGeckoApi';
import { CONTRACT_ADDRESSES } from '@/contracts/addresses';
import PortfolioAllocation from '@/components/PortfolioAllocation';
import NAVChartWithCoinGecko from '@/components/NAVChartWithCoinGecko';
import PortfolioCharts from '@/components/PortfolioCharts';
// 暂时移除调试组件的导入以避免CoinGecko API错误
// import DebugTokenData from '@/components/DebugTokenData';
// import CacheStatus from '@/components/CacheStatus';
// import CoinGeckoDebug from '@/components/CoinGeckoDebug';

export default function Home() {
  // 获取当前连接的账户
  const { address, isConnected } = useAccount();
  
  // 使用合约hooks
  const mockFund = useMockFund();
  const mockUSDC = useMockUSDC();
  const fundShareToken = useFundShareToken();
  
  // 从mockFund中获取基金统计信息
  const { fundStats, fundStatsError, isFundStatsLoading, managementFeeRate, lastFeeCollectionTimestamp } = mockFund;

  // 状态管理
  const [investAmount, setInvestAmount] = useState('');
  const [redeemShares, setRedeemShares] = useState('');
  const [, setUsdcBalance] = useState('0');
  const [shareBalance, setShareBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  
  // 监听交易状态
  useEffect(() => {
    if (mockFund.isConfirmed && isLoading) {
      setMessage({ type: 'success', content: '交易确认成功！' });
      setIsLoading(false);
      loadUserData();
    }
    if (mockFund.error && isLoading) {
      setMessage({ type: 'error', content: `交易失败: ${mockFund.error.message}` });
      setIsLoading(false);
    }
  }, [mockFund.isConfirmed, mockFund.error, isLoading]);
  const [isMounted, setIsMounted] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const [fundDataError, setFundDataError] = useState(false);
  const [isLoadingFundData, setIsLoadingFundData] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<Record<string, unknown> | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  // 移除数据源切换，只使用 CoinGecko

  // 客户端挂载检查
  useEffect(() => {
    setIsMounted(true);
    setIsClientReady(true);
  }, []);

  // 加载用户数据
  const loadUserData = useCallback(async () => {
    if (!address) return;
    
    setIsLoadingFundData(true);
    setFundDataError(false);
    
    try {
      console.log('开始加载用户数据，地址:', address);
      
      // 获取USDC余额
      console.log('正在获取USDC余额...');
      const usdcBalanceData = await mockUSDC.getBalance(address);
      console.log('USDC余额数据:', usdcBalanceData);
      
      if (usdcBalanceData !== null && usdcBalanceData !== undefined) {
        const formattedBalance = formatUnits(usdcBalanceData, 6);
        console.log('格式化后的USDC余额:', formattedBalance);
        setUsdcBalance(formattedBalance);
      } else {
        console.log('USDC余额为空，设置为0');
        setUsdcBalance('0');
      }
      
      // 获取份额余额
      console.log('正在获取份额余额...');
      const shareBalanceData = await fundShareToken.getBalance(address);
      console.log('份额余额数据:', shareBalanceData);
      
      if (shareBalanceData !== null && shareBalanceData !== undefined) {
        const formattedShareBalance = formatUnits(shareBalanceData, 18);
        console.log('格式化后的份额余额:', formattedShareBalance);
        setShareBalance(formattedShareBalance);
      } else {
        console.log('份额余额为空，设置为0');
        setShareBalance('0');
      }
      
      // 刷新基金数据
      console.log('刷新基金数据...');
      mockFund.refreshAllData();
      
      console.log('用户数据加载完成');
    } catch (error) {
      console.error('加载用户数据失败:', error);
      setFundDataError(true);
      setMessage({ 
        type: 'error', 
        content: `加载数据失败: ${(error as Error).message || '网络连接不稳定，请稍后重试'}` 
      });
    } finally {
      setIsLoadingFundData(false);
    }
  }, [address]); // 移除hook对象依赖，避免无限循环

  // 加载用户数据
  useEffect(() => {
    if (isConnected && address) {
      loadUserData();
    }
  }, [isConnected, address]); // 移除loadUserData依赖，避免无限循环

  // 监听交易确认状态，仅在交易确认后刷新数据
  useEffect(() => {
    if (mockFund.isConfirmed || mockUSDC.isConfirmed) {
      console.log('交易已确认，刷新用户数据');
      if (isConnected && address) {
        loadUserData();
      }
    }
  }, [mockFund.isConfirmed, mockUSDC.isConfirmed, isConnected, address]); // 移除loadUserData依赖

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
      
      setMessage({ type: 'info', content: '批准成功，正在执行投资...' });
      
      // 执行投资
      const investResult = await mockFund.invest(investAmount);
      
      if (investResult?.success) {
        setMessage({ type: 'info', content: '投资交易已提交，等待确认...' });
        setInvestAmount('');
      } else {
        throw new Error('投资失败');
      }
    } catch (error) {
      console.error('投资操作失败:', error);
      setMessage({ type: 'error', content: `投资失败: ${(error as Error).message || '未知错误'}` });
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
        setMessage({ type: 'info', content: '赎回交易已提交，等待确认...' });
        setRedeemShares('');
      } else {
        throw new Error('赎回失败');
      }
    } catch (error) {
      console.error('赎回操作失败:', error);
      setMessage({ type: 'error', content: `赎回失败: ${(error as Error).message || '未知错误'}` });
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
      console.log('开始获取测试代币...');
      const result = await mockUSDC.getTestTokens();
      console.log('获取测试代币结果:', result);
      
      if (result?.success) {
        setMessage({ type: 'success', content: '获取测试代币交易已提交，等待确认...' });
        
        // 简化交易处理 - 直接等待一段时间后刷新余额
         setMessage({ type: 'success', content: '交易已提交，正在等待确认...' });
         
         // 等待区块链处理交易（本地网络通常很快）
         await new Promise(resolve => setTimeout(resolve, 3000));
         
         setMessage({ type: 'success', content: '正在刷新余额...' });
         
         // 重新加载数据
         await loadUserData();
         
         setMessage({ type: 'success', content: '操作完成！如果余额未更新，请手动刷新页面。' });
      } else {
        throw new Error('获取测试代币失败');
      }
    } catch (error) {
      console.error('获取测试代币失败:', error);
      setMessage({ type: 'error', content: `获取测试代币失败: ${(error as Error).message || '未知错误'}` });
    } finally {
      setIsLoading(false);
    }
  };

  // 测试 CoinGecko API 连接
  const handleTestCoinGeckoApi = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);
    setMessage({ type: '', content: '' });
    
    try {
      const result = await testCoinGeckoConnection();
      setApiTestResult(result);
      
      if (result.success) {
        setMessage({ type: 'success', content: 'CoinGecko API 连接测试成功！' });
      } else {
        setMessage({ type: 'error', content: `CoinGecko API 连接测试失败: ${result.error}` });
      }
    } catch (error) {
      console.error('API 测试失败:', error);
      setMessage({ type: 'error', content: `API 测试失败: ${(error as Error).message || '未知错误'}` });
    } finally {
      setIsTestingApi(false);
    }
  };

  // 格式化基金统计数据
  const formatFundStats = () => {
    if (!mockFund.fundStats) return null;
    
    // 合约的 getFundStats 只返回 3 个值: (totalAssets, totalSupply, currentNAV)
    const [totalAssets, totalShares, nav] = mockFund.fundStats;
    
    // 避免水合错误，使用固定格式的时间字符串
    const formatTimestamp = (timestamp: bigint | undefined) => {
      if (!timestamp) return 'N/A';
      if (!isMounted) return 'N/A'; // 在挂载前返回固定值
      try {
        return new Date(Number(timestamp) * 1000).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch {
        return 'N/A';
      }
    };
    
    return {
      totalAssets: formatUnits(totalAssets, 6),
      totalShares: formatUnits(totalShares, 18),
      nav: formatUnits(nav, 6),
      managementFeeRate: managementFeeRate ? (Number(managementFeeRate) / 100).toFixed(2) : 'N/A',
      lastFeeCollectionTimestamp: formatTimestamp(lastFeeCollectionTimestamp),
    };
  };

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

        {/* 用户信息和余额检查 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">我的账户</h2>
          
          {!isMounted ? (
            <p className="text-gray-500 dark:text-gray-400">加载中...</p>
          ) : (
            <div className="space-y-4">
              {/* 基本账户信息 */}
              {isConnected && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">钱包地址</p>
                    <p className="font-mono text-sm truncate">{address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">基金份额</p>
                    <p className="font-medium">{shareBalance} {fundShareToken.symbol || 'MFS'}</p>
                  </div>
                </div>
              )}
              
              {/* 余额检查组件 */}
              <BalanceChecker />
              
              {/* 操作按钮 */}
              {isConnected && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleGetTestTokens}
                    disabled={!isClientReady || isLoading || !isConnected}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    获取测试USDC
                  </button>
                  <button
                    onClick={handleTestCoinGeckoApi}
                    disabled={!isClientReady || isTestingApi}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    {isTestingApi ? '测试中...' : '测试 CoinGecko API'}
                  </button>
                </div>
              )}
              
              {!isConnected && (
                <p className="text-gray-500 dark:text-gray-400">请连接钱包查看账户信息</p>
              )}
            </div>
          )}
        </div>

        {/* 基金信息部分已暂时移除 */}

        {/* 投资组合配置 */}
        <div className="mb-6">
          <PortfolioAllocation />
        </div>

        {/* 净值图表 */}
        <div className="mb-6">
          <NAVChartWithCoinGecko />
        </div>

        {/* 投资组合图表 */}
        <div className="mb-6">
          <PortfolioCharts />
        </div>

        {/* API 测试结果 */}
        {apiTestResult && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">CoinGecko API 测试结果</h2>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(apiTestResult, null, 2)}
              </pre>
            </div>
          </div>
        )}

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
                    disabled={!isClientReady || !isConnected || isLoading}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <button
                onClick={handleInvest}
                disabled={!isClientReady || !isConnected || !investAmount || isLoading}
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
                    disabled={!isClientReady || !isConnected || isLoading}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <button
                onClick={handleRedeem}
                disabled={!isClientReady || !isConnected || !redeemShares || isLoading}
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
