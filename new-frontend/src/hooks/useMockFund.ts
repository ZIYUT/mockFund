import { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractWrite, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits, formatEther, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../../contracts/addresses';
import MockFundABI from '@/contracts/abis/MockFund.json';
import MockUSDCABI from '@/contracts/abis/MockUSDC.json';
import FundShareTokenABI from '@/contracts/abis/FundShareToken.json';

export function useMockFund() {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 读取基金状态
  const { data: isInitialized, error: initError, isLoading: initLoading } = useContractRead({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'isInitialized',
    query: {
      refetchInterval: 5000, // 每5秒刷新一次
    },
  });

  // 读取基金净值
  const { data: nav, refetch: refetchNav } = useContractRead({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'calculateNAV',
    enabled: isInitialized as boolean,
  });

  // 读取MFC价值
  const { data: mfcValue, refetch: refetchMfcValue } = useContractRead({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'calculateMFCValue',
    enabled: isInitialized as boolean,
  });

  // 读取支持的代币
  const { data: supportedTokens, refetch: refetchSupportedTokens } = useContractRead({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'getSupportedTokens',
  });

  // 读取用户MFC余额
  const { data: userMfcBalance, refetch: refetchUserMfcBalance } = useContractRead({
    address: CONTRACT_ADDRESSES.FundShareToken as `0x${string}`,
    abi: FundShareTokenABI.abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    enabled: isConnected && !!address,
  });

  // 读取用户USDC余额
  const { data: userUsdcBalance, refetch: refetchUserUsdcBalance } = useContractRead({
    address: CONTRACT_ADDRESSES.MockUSDC as `0x${string}`,
    abi: MockUSDCABI.abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    enabled: isConnected && !!address,
  });

  // 读取USDC授权额度
  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useContractRead({
    address: CONTRACT_ADDRESSES.MockUSDC as `0x${string}`,
    abi: MockUSDCABI.abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, CONTRACT_ADDRESSES.MockFund as `0x${string}`],
    enabled: isConnected && !!address,
  });

  // 投资函数
  const { data: investData, write: invest, isPending: isInvesting } = useContractWrite({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'invest',
  });

  // 赎回函数
  const { data: redeemData, write: redeem, isPending: isRedeeming } = useContractWrite({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'redeem',
  });

  // 授权USDC函数
  const { data: approveData, write: approveUsdc, isPending: isApproving } = useContractWrite({
    address: CONTRACT_ADDRESSES.MockUSDC as `0x${string}`,
    abi: MockUSDCABI.abi,
    functionName: 'approve',
  });

  // 等待交易确认
  const { isLoading: isInvestTxLoading } = useWaitForTransactionReceipt({
    hash: investData?.hash,
    onSuccess: () => {
      refetchNav();
      refetchMfcValue();
      refetchUserMfcBalance();
      refetchUserUsdcBalance();
      refetchUsdcAllowance();
    },
  });

  const { isLoading: isRedeemTxLoading } = useWaitForTransactionReceipt({
    hash: redeemData?.hash,
    onSuccess: () => {
      refetchNav();
      refetchMfcValue();
      refetchUserMfcBalance();
      refetchUserUsdcBalance();
    },
  });

  const { isLoading: isApproveTxLoading } = useWaitForTransactionReceipt({
    hash: approveData?.hash,
    onSuccess: () => {
      refetchUsdcAllowance();
    },
  });

  // 投资函数
  const handleInvest = async (usdcAmount: string) => {
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const amountInWei = parseUnits(usdcAmount, 6); // USDC有6位小数

      // 检查USDC余额
      if (!userUsdcBalance || userUsdcBalance < amountInWei) {
        setError('USDC余额不足');
        return;
      }

      // 检查授权额度
      if (!usdcAllowance || usdcAllowance < amountInWei) {
        setError('需要先授权USDC');
        return;
      }

      // 执行投资
      invest({ args: [amountInWei] });

    } catch (err) {
      setError(err instanceof Error ? err.message : '投资失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 赎回函数
  const handleRedeem = async (mfcAmount: string) => {
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const amountInWei = parseEther(mfcAmount); // MFC有18位小数

      // 检查MFC余额
      if (!userMfcBalance || userMfcBalance < amountInWei) {
        setError('MFC余额不足');
        return;
      }

      // 执行赎回
      redeem({ args: [amountInWei] });

    } catch (err) {
      setError(err instanceof Error ? err.message : '赎回失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 授权USDC函数
  const handleApproveUsdc = async (amount: string) => {
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const amountInWei = parseUnits(amount, 6); // USDC有6位小数

      // 执行授权
      approveUsdc({ args: [CONTRACT_ADDRESSES.MockFund as `0x${string}`, amountInWei] });

    } catch (err) {
      setError(err instanceof Error ? err.message : '授权失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取测试USDC
  const getTestUsdc = async (amount: string = "1000") => {
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const amountInWei = parseUnits(amount, 6);
      
      // 这里需要调用MockUSDC的mint函数，但需要部署者权限
      // 在实际应用中，可能需要通过水龙头或其他方式获取测试代币
      setError('请联系管理员获取测试USDC');

    } catch (err) {
      setError(err instanceof Error ? err.message : '获取测试USDC失败');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // 状态
    isConnected,
    address,
    isLoading: isLoading || isInvesting || isRedeeming || isApproving || isInvestTxLoading || isRedeemTxLoading || isApproveTxLoading,
    error,
    
    // 基金数据
    isInitialized: isInitialized as boolean,
    nav: nav ? formatUnits(nav, 6) : '0',
    mfcValue: mfcValue ? formatUnits(mfcValue, 6) : '0',
    supportedTokens: supportedTokens as string[] || [],
    
    // 用户余额
    userMfcBalance: userMfcBalance ? formatEther(userMfcBalance) : '0',
    userUsdcBalance: userUsdcBalance ? formatUnits(userUsdcBalance, 6) : '0',
    usdcAllowance: usdcAllowance ? formatUnits(usdcAllowance, 6) : '0',
    
    // 操作函数
    handleInvest,
    handleRedeem,
    handleApproveUsdc,
    getTestUsdc,
    
    // 刷新函数
    refetchNav,
    refetchMfcValue,
    refetchUserMfcBalance,
    refetchUserUsdcBalance,
    refetchUsdcAllowance,
    refetchSupportedTokens,
  };
} 