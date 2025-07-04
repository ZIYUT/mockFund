'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/contracts/addresses';
import PriceOracleArtifact from '@/contracts/abis/PriceOracle.json';

// 从artifact中提取ABI
const PriceOracleABI = PriceOracleArtifact.abi;

/**
 * 使用PriceOracle合约的hook
 * 提供与价格预言机交互的函数
 */
export function usePriceOracle() {
  // 写入合约的hooks
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  // 等待交易完成的hook
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // 获取代币价格
  const getTokenPrice = (tokenAddress: string) => {
    const { data: price, refetch, error: priceError, isLoading } = useReadContract({
      address: CONTRACT_ADDRESSES.PRICE_ORACLE as `0x${string}`,
      abi: PriceOracleABI,
      functionName: 'getLatestPrice',
      args: [tokenAddress],
      query: {
        enabled: !!tokenAddress,
        retry: 3,
        retryDelay: 1000,
      },
    });

    return { price, refetch, error: priceError, isLoading };
  };

  // 获取代币小数位数
  const getTokenDecimals = (tokenAddress: string) => {
    const { data: decimals, refetch, error: decimalsError, isLoading } = useReadContract({
      address: CONTRACT_ADDRESSES.PRICE_ORACLE as `0x${string}`,
      abi: PriceOracleABI,
      functionName: 'getTokenDecimals',
      args: [tokenAddress],
      query: {
        enabled: !!tokenAddress,
      },
    });

    return { decimals, refetch, error: decimalsError, isLoading };
  };

  // 批量获取代币价格
  const getBatchPrices = (tokenAddresses: string[]) => {
    const { data: pricesData, refetch, error: pricesError, isLoading } = useReadContract({
      address: CONTRACT_ADDRESSES.PRICE_ORACLE as `0x${string}`,
      abi: PriceOracleABI,
      functionName: 'getMultiplePrices',
      args: [tokenAddresses],
      query: {
        enabled: tokenAddresses && tokenAddresses.length > 0,
        retry: 3,
        retryDelay: 1000,
      },
    });

    // getMultiplePrices 返回 [prices[], timestamps[]]，我们只需要价格数组
    const prices = pricesData ? pricesData[0] : undefined;
    
    return { prices, refetch, error: pricesError, isLoading };
  };

  // 计算代币价值（以USDC计价）
  const calculateTokenValue = (tokenAddress: string, amount: bigint) => {
    const { data: value, refetch, error: valueError, isLoading } = useReadContract({
      address: CONTRACT_ADDRESSES.PRICE_ORACLE as `0x${string}`,
      abi: PriceOracleABI,
      functionName: 'calculateTokenValue',
      args: [tokenAddress, amount],
      query: {
        enabled: !!tokenAddress && !!amount,
      },
    });

    return { value, refetch, error: valueError, isLoading };
  };

  // 检查价格源是否设置
  const isPriceFeedSet = (tokenAddress: string) => {
    const { data: isSet, refetch, error: isSetError, isLoading } = useReadContract({
      address: CONTRACT_ADDRESSES.PRICE_ORACLE as `0x${string}`,
      abi: PriceOracleABI,
      functionName: 'isPriceFeedSet',
      args: [tokenAddress],
      query: {
        enabled: !!tokenAddress,
      },
    });

    return { isSet, refetch, error: isSetError, isLoading };
  };

  // 设置价格源（仅管理员）
  const setPriceFeed = async (tokenAddress: string, priceFeedAddress: string) => {
    if (!tokenAddress || !priceFeedAddress) return;
    
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.PRICE_ORACLE as `0x${string}`,
        abi: PriceOracleABI,
        functionName: 'setPriceFeed',
        args: [tokenAddress, priceFeedAddress],
      });
      
      return { success: true };
    } catch (error) {
      console.error('设置价格源失败:', error);
      return { success: false, error };
    }
  };

  // 移除价格源（仅管理员）
  const removePriceFeed = async (tokenAddress: string) => {
    if (!tokenAddress) return;
    
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.PRICE_ORACLE as `0x${string}`,
        abi: PriceOracleABI,
        functionName: 'removePriceFeed',
        args: [tokenAddress],
      });
      
      return { success: true };
    } catch (error) {
      console.error('移除价格源失败:', error);
      return { success: false, error };
    }
  };

  // 批量设置价格源（仅管理员）
  const setBatchPriceFeeds = async (tokenAddresses: string[], priceFeedAddresses: string[]) => {
    if (!tokenAddresses || !priceFeedAddresses || tokenAddresses.length !== priceFeedAddresses.length) {
      return { success: false, error: '参数无效' };
    }
    
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.PRICE_ORACLE as `0x${string}`,
        abi: PriceOracleABI,
        functionName: 'setBatchPriceFeeds',
        args: [tokenAddresses, priceFeedAddresses],
      });
      
      return { success: true };
    } catch (error) {
      console.error('批量设置价格源失败:', error);
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
    getTokenPrice,
    getTokenDecimals,
    getBatchPrices,
    calculateTokenValue,
    isPriceFeedSet,
    
    // 写入函数（仅管理员）
    setPriceFeed,
    removePriceFeed,
    setBatchPriceFeeds,
  };
}

/**
 * 获取多个代币实时价格的hook
 */
export function useTokenPrices(tokenAddresses: string[]) {
  const { getBatchPrices } = usePriceOracle();
  
  const { prices, refetch, error, isLoading } = getBatchPrices(tokenAddresses);
  
  // 格式化价格数据
  const formattedPrices = tokenAddresses.reduce((acc, address, index) => {
    if (prices && Array.isArray(prices) && prices[index]) {
      acc[address] = prices[index];
    }
    return acc;
  }, {} as Record<string, bigint>);
  
  return {
    prices: formattedPrices,
    rawPrices: prices,
    refetch,
    error,
    isLoading,
  };
}

/**
 * 获取单个代币价格的hook
 */
export function useTokenPrice(tokenAddress: string) {
  const { getTokenPrice } = usePriceOracle();
  
  return getTokenPrice(tokenAddress);
}