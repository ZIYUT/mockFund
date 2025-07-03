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
  const { data: fundStats, refetch: refetchFundStats } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
    abi: MockFundABI,
    functionName: 'getFundStats',
  });

  // 获取当前NAV
  const { data: currentNAV, refetch: refetchCurrentNAV } = useReadContract({
    address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
    abi: MockFundABI,
    functionName: 'getCurrentNAV',
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

  // 重新平衡函数 (仅管理员)
  const rebalance = async () => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.MOCK_FUND as `0x${string}`,
        abi: MockFundABI,
        functionName: 'rebalance',
      });
      
      return { success: true };
    } catch (error) {
      console.error('重新平衡失败:', error);
      return { success: false, error };
    }
  };

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
    refetchSupportedTokens();
    refetchUsdcAddress();
    refetchShareTokenAddress();
  };

  return {
    // 状态
    isPending,
    isConfirming,
    isConfirmed,
    error,
    transactionHash: hash,
    
    // 读取数据
    fundStats,
    currentNAV,
    supportedTokens,
    usdcAddress,
    shareTokenAddress,
    
    // 写入函数
    invest,
    redeem,
    rebalance,
    collectManagementFee,
    setUSDCToken,
    addSupportedToken,
    updateTargetAllocation,
    togglePause,
    
    // 刷新数据
    refreshAllData,
  };
}