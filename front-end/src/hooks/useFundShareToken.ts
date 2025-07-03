'use client';

import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/contracts/addresses';
import FundShareTokenABI from '@/contracts/abis/FundShareToken.json';

/**
 * 使用FundShareToken合约的hook
 * 提供与基金份额代币交互的函数
 */
export function useFundShareToken() {
  // 获取用户份额余额
  const getBalance = async (address: string) => {
    if (!address || !CONTRACT_ADDRESSES.FUND_SHARE_TOKEN) return null;
    
    try {
      const data = await useReadContract.queryKey({
        address: CONTRACT_ADDRESSES.FUND_SHARE_TOKEN as `0x${string}`,
        abi: FundShareTokenABI,
        functionName: 'balanceOf',
        args: [address],
      });
      
      return data;
    } catch (error) {
      console.error('获取份额余额失败:', error);
      return null;
    }
  };

  // 获取总供应量
  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.FUND_SHARE_TOKEN as `0x${string}`,
    abi: FundShareTokenABI,
    functionName: 'totalSupply',
  });

  // 获取代币名称
  const { data: name } = useReadContract({
    address: CONTRACT_ADDRESSES.FUND_SHARE_TOKEN as `0x${string}`,
    abi: FundShareTokenABI,
    functionName: 'name',
  });

  // 获取代币符号
  const { data: symbol } = useReadContract({
    address: CONTRACT_ADDRESSES.FUND_SHARE_TOKEN as `0x${string}`,
    abi: FundShareTokenABI,
    functionName: 'symbol',
  });

  // 获取代币精度
  const { data: decimals } = useReadContract({
    address: CONTRACT_ADDRESSES.FUND_SHARE_TOKEN as `0x${string}`,
    abi: FundShareTokenABI,
    functionName: 'decimals',
  });

  return {
    // 读取数据
    totalSupply,
    name,
    symbol,
    decimals,
    
    // 读取函数
    getBalance,
    
    // 刷新数据
    refetchTotalSupply,
  };
}