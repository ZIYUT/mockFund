'use client';

import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/contracts/addresses';
import FundShareTokenArtifact from '@/contracts/abis/FundShareToken.json';

// 从artifact中提取ABI
const FundShareTokenABI = FundShareTokenArtifact.abi as any[];

/**
 * 使用FundShareToken合约的hook
 * 提供与基金份额代币交互的函数
 */
export function useFundShareToken() {
  // 获取用户份额余额（带重试机制）
  const getBalance = async (address: string, retries = 3) => {
    if (!address || !CONTRACT_ADDRESSES.FUND_SHARE_TOKEN) return null;
    
    for (let i = 0; i < retries; i++) {
      try {
        // 使用 wagmi 的 readContract 函数
        const { readContract } = await import('wagmi/actions');
        const { config } = await import('@/config/web3');
        
        const data = await readContract(config, {
          address: CONTRACT_ADDRESSES.FUND_SHARE_TOKEN as `0x${string}`,
          abi: FundShareTokenABI,
          functionName: 'balanceOf',
          args: [address],
        });
        
        return data;
      } catch (error) {
        console.warn(`获取份额余额失败 (尝试 ${i + 1}/${retries}):`, error);
        
        // 如果是最后一次尝试，返回 null
        if (i === retries - 1) {
          console.error('获取份额余额最终失败:', error);
          return null;
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    return null;
  };

  // 获取总供应量
  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.FUND_SHARE_TOKEN as `0x${string}`,
    abi: FundShareTokenABI,
    functionName: 'totalSupply',
    query: {
      refetchInterval: 300000, // 5分钟轮询一次
    },
  });

  // 获取代币名称
  const { data: name } = useReadContract({
    address: CONTRACT_ADDRESSES.FUND_SHARE_TOKEN as `0x${string}`,
    abi: FundShareTokenABI,
    functionName: 'name',
    query: {
      refetchInterval: false, // 代币名称不会变化，禁用轮询
    },
  });

  // 获取代币符号
  const { data: symbol } = useReadContract({
    address: CONTRACT_ADDRESSES.FUND_SHARE_TOKEN as `0x${string}`,
    abi: FundShareTokenABI,
    functionName: 'symbol',
    query: {
      refetchInterval: false, // 代币符号不会变化，禁用轮询
    },
  });

  // 获取代币精度
  const { data: decimals } = useReadContract({
    address: CONTRACT_ADDRESSES.FUND_SHARE_TOKEN as `0x${string}`,
    abi: FundShareTokenABI,
    functionName: 'decimals',
    query: {
      refetchInterval: false, // 代币精度不会变化，禁用轮询
    },
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