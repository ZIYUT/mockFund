'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '@/contracts/addresses';
import MockUSDCABI from '@/contracts/abis/MockUSDC.json';

/**
 * 使用MockUSDC合约的hook
 * 提供与MockUSDC代币交互的函数
 */
export function useMockUSDC() {
  // 写入合约的hooks
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  // 等待交易完成的hook
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // 获取余额
  const getBalance = async (address: string) => {
    if (!address) return null;
    
    try {
      const data = await useReadContract.queryKey({
        address: CONTRACT_ADDRESSES.MOCK_USDC as `0x${string}`,
        abi: MockUSDCABI,
        functionName: 'balanceOf',
        args: [address],
      });
      
      return data;
    } catch (error) {
      console.error('获取USDC余额失败:', error);
      return null;
    }
  };

  // 批准支出
  const approve = async (spender: string, amount: string) => {
    if (!spender || !amount) return;
    
    try {
      // USDC有6位小数
      const amountInWei = parseUnits(amount, 6);
      
      await writeContract({
        address: CONTRACT_ADDRESSES.MOCK_USDC as `0x${string}`,
        abi: MockUSDCABI,
        functionName: 'approve',
        args: [spender, amountInWei],
      });
      
      return { success: true };
    } catch (error) {
      console.error('批准USDC支出失败:', error);
      return { success: false, error };
    }
  };

  // 获取测试代币
  const getTestTokens = async () => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.MOCK_USDC as `0x${string}`,
        abi: MockUSDCABI,
        functionName: 'getTestTokens',
      });
      
      return { success: true };
    } catch (error) {
      console.error('获取测试USDC失败:', error);
      return { success: false, error };
    }
  };

  // 从水龙头获取代币
  const faucet = async (amount: string) => {
    if (!amount) return;
    
    try {
      // USDC有6位小数
      const amountInWei = parseUnits(amount, 6);
      
      await writeContract({
        address: CONTRACT_ADDRESSES.MOCK_USDC as `0x${string}`,
        abi: MockUSDCABI,
        functionName: 'faucet',
        args: [amountInWei],
      });
      
      return { success: true };
    } catch (error) {
      console.error('从水龙头获取USDC失败:', error);
      return { success: false, error };
    }
  };

  // 铸造代币 (仅管理员)
  const mint = async (to: string, amount: string) => {
    if (!to || !amount) return;
    
    try {
      // USDC有6位小数
      const amountInWei = parseUnits(amount, 6);
      
      await writeContract({
        address: CONTRACT_ADDRESSES.MOCK_USDC as `0x${string}`,
        abi: MockUSDCABI,
        functionName: 'mint',
        args: [to, amountInWei],
      });
      
      return { success: true };
    } catch (error) {
      console.error('铸造USDC失败:', error);
      return { success: false, error };
    }
  };

  return {
    // 状态
    isPending,
    isConfirming,
    isConfirmed,
    error,
    transactionHash: hash,
    
    // 读取函数
    getBalance,
    
    // 写入函数
    approve,
    getTestTokens,
    faucet,
    mint,
  };
}