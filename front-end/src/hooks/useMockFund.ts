'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '@/contracts/addresses';
import MockFundABI from '@/contracts/abis/MockFund.json';

/**
 * 使用MockFund合约的hook
 * 提供与MockFund合约交互的函数
 */
export function useMockFund() {
  // 写入合约的hooks
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  // 等待交易完成的hook
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // 获取基金统计信息
  const { 
    data: fundStats, 
    refetch: refetchFundStats, 
    error: fundStatsError,
    isLoading: isFundStatsLoading 
  } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
    abi: MockFundABI,
    functionName: 'getFundStats',
    query: {
      retry: 3,
      retryDelay: 1000,
    },
  });

  // 获取当前NAV
  const { data: currentNAV, refetch: refetchCurrentNAV } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
    abi: MockFundABI,
    functionName: 'getCurrentNAV',
  });

  // 获取管理费率
  const { data: managementFeeRate, refetch: refetchManagementFeeRate } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
    abi: MockFundABI,
    functionName: 'managementFeeRate',
  });

  // 获取最后收费时间
  const { data: lastFeeCollectionTimestamp, refetch: refetchLastFeeCollection } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
    abi: MockFundABI,
    functionName: 'lastFeeCollectionTimestamp',
  });

  // 获取支持的代币列表
  const { data: supportedTokens, refetch: refetchSupportedTokens } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
    abi: MockFundABI,
    functionName: 'getSupportedTokens',
  });

  // 获取USDC地址
  const { data: usdcAddress, refetch: refetchUsdcAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
    abi: MockFundABI,
    functionName: 'getUSDCAddress',
  });

  // 获取份额代币地址
  const { data: shareTokenAddress, refetch: refetchShareTokenAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
    abi: MockFundABI,
    functionName: 'shareToken',
  });

  // 获取当前投资组合分配
  const { data: currentAllocations, refetch: refetchCurrentAllocations } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
    abi: MockFundABI,
    functionName: 'getCurrentAllocations',
  });

  // 获取代币持有量
  const { data: tokenHoldings, refetch: refetchTokenHoldings } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
    abi: MockFundABI,
    functionName: 'getTokenHoldings',
  });

  // 获取投资组合详细信息
  const { data: portfolioBreakdown, refetch: refetchPortfolioBreakdown } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
    abi: MockFundABI,
    functionName: 'getPortfolioBreakdown',
  });

  // Rebalancing functionality removed

  // 投资函数
  const invest = async (amount: string) => {
    if (!amount) return;
    
    try {
      // USDC有6位小数
      const amountInWei = parseUnits(amount, 6);
      
      await writeContract({
        address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
        abi: MockFundABI,
        functionName: 'invest',
        args: [amountInWei],
      });
      
      return { success: true };
    } catch (error) {
      console.error('投资失败:', error);
      return { success: false, error };
    }
  };

  // 赎回函数
  const redeem = async (shares: string) => {
    if (!shares) return;
    
    try {
      // 份额代币有18位小数
      const sharesInWei = parseUnits(shares, 18);
      
      await writeContract({
        address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
        abi: MockFundABI,
        functionName: 'redeem',
        args: [sharesInWei],
      });
      
      return { success: true };
    } catch (error) {
      console.error('赎回失败:', error);
      return { success: false, error };
    }
  };

  // Rebalance function removed

  // 收取管理费函数 (仅管理员)
  const collectManagementFee = async () => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
        abi: MockFundABI,
        functionName: 'collectManagementFee',
      });
      
      return { success: true };
    } catch (error) {
      console.error('收取管理费失败:', error);
      return { success: false, error };
    }
  };

  // 设置USDC代币地址 (仅管理员)
  const setUSDCToken = async (tokenAddress: string) => {
    if (!tokenAddress) return;
    
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
        abi: MockFundABI,
        functionName: 'setUSDCToken',
        args: [tokenAddress],
      });
      
      return { success: true };
    } catch (error) {
      console.error('设置USDC代币失败:', error);
      return { success: false, error };
    }
  };

  // 添加支持的代币 (仅管理员)
  const addSupportedToken = async (tokenAddress: string, allocation: number) => {
    if (!tokenAddress || allocation <= 0) return;
    
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
        abi: MockFundABI,
        functionName: 'addSupportedToken',
        args: [tokenAddress, allocation],
      });
      
      return { success: true };
    } catch (error) {
      console.error('添加支持的代币失败:', error);
      return { success: false, error };
    }
  };

  // 更新目标分配 (仅管理员)
  const updateTargetAllocation = async (tokenAddress: string, allocation: number) => {
    if (!tokenAddress || allocation <= 0) return;
    
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
        abi: MockFundABI,
        functionName: 'updateTargetAllocation',
        args: [tokenAddress, allocation],
      });
      
      return { success: true };
    } catch (error) {
      console.error('更新目标分配失败:', error);
      return { success: false, error };
    }
  };

  // 暂停/恢复基金 (仅管理员)
  const togglePause = async (isPaused: boolean) => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
        abi: MockFundABI,
        functionName: isPaused ? 'unpause' : 'pause',
      });
      
      return { success: true };
    } catch (error) {
      console.error(`${isPaused ? '恢复' : '暂停'}基金失败:`, error);
      return { success: false, error };
    }
  };

  // 刷新所有数据
  const refreshAllData = () => {
    refetchFundStats();
    refetchCurrentNAV();
    refetchManagementFeeRate();
    refetchLastFeeCollection();
    refetchSupportedTokens();
    refetchUsdcAddress();
    refetchShareTokenAddress();
    refetchCurrentAllocations();
    refetchTokenHoldings();
    refetchPortfolioBreakdown();
  };

  return {
    // 状态
    isPending,
    isConfirming,
    isConfirmed,
    error,
    transactionHash: hash,
    
    // 基础读取数据
    fundStats,
    currentNAV,
    managementFeeRate,
    lastFeeCollectionTimestamp,
    supportedTokens,
    usdcAddress,
    shareTokenAddress,
    
    // 投资组合数据
    currentAllocations,
    tokenHoldings,
    portfolioBreakdown,
    
    // 错误和加载状态
    fundStatsError,
    isFundStatsLoading,
    
    // 写入函数
    invest,
    redeem,
    collectManagementFee,
    setUSDCToken,
    addSupportedToken,
    updateTargetAllocation,
    togglePause,
    
    // 刷新数据
    refreshAllData,
  };
}