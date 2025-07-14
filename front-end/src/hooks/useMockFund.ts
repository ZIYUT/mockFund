import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits, formatEther, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../../contracts/addresses';
import MockFundABI from '../contracts/abis/MockFund.json';
import MockUSDCABI from '../contracts/abis/MockUSDC.json';
import FundShareTokenABI from '../contracts/abis/FundShareToken.json';


export function useMockFund() {
  const { address, isConnected } = useAccount();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 读取基金状态
  const { data: isInitialized, error: initError, isLoading: initLoading, refetch: refetchInitialized } = useReadContract({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'isInitialized',
    query: {
      refetchInterval: 5000, // 每5秒刷新一次
    },
  });

  // 读取基金净值
  const { data: nav, refetch: refetchNav } = useReadContract({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'calculateNAV',
    query: {
      enabled: isInitialized as boolean,
    },
  });

  // 读取MFC价值
  const { data: mfcValue, refetch: refetchMfcValue } = useReadContract({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'calculateMFCValue',
    query: {
      enabled: isInitialized as boolean,
    },
  });

  // 读取支持的代币
  const { data: supportedTokens, refetch: refetchSupportedTokens } = useReadContract({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'getSupportedTokens',
  });

  // 读取用户MFC余额
  const { data: userMfcBalance, refetch: refetchUserMfcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.FundShareToken as `0x${string}`,
    abi: FundShareTokenABI.abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected && !!address,
    },
  });

  // 读取用户USDC余额
  const { data: userUsdcBalance, refetch: refetchUserUsdcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.MockUSDC as `0x${string}`,
    abi: MockUSDCABI.abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected && !!address,
    },
  });

  // 读取USDC授权额度
  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.MockUSDC as `0x${string}`,
    abi: MockUSDCABI.abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, CONTRACT_ADDRESSES.MockFund as `0x${string}`],
    query: {
      enabled: isConnected && !!address,
    },
  });

  // 投资函数
  const { data: investData, writeContract: invest, isPending: isInvesting } = useWriteContract();



  // 赎回函数
  const { data: redeemData, writeContract: redeem, isPending: isRedeeming } = useWriteContract();

  // 授权USDC函数
  const { data: approveData, writeContract: approveUsdc, isPending: isApproving } = useWriteContract();

  // 授权MFC函数
  const { data: approveMfcData, writeContract: approveMfc, isPending: isApprovingMfc } = useWriteContract();

  // 铸造测试USDC函数
  const { data: mintData, writeContract: mintUSDC, isPending: isMinting } = useWriteContract();

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
      console.log('Authorization transaction confirmed, refreshing allowance...');
      refetchUsdcAllowance();
      // 延迟再次刷新，确保数据更新
      setTimeout(() => {
        refetchUsdcAllowance();
      }, 2000);
    },
  });

  const { isLoading: isApproveMfcTxLoading } = useWaitForTransactionReceipt({
    hash: approveMfcData?.hash,
    onSuccess: () => {
      console.log('MFC authorization transaction confirmed');
      // 可以在这里添加刷新MFC授权额度的逻辑
    },
  });



  // 投资函数（传统方式）
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

      // 执行投资（不再检查授权额度）
      invest({
        address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
        abi: MockFundABI.abi,
        functionName: 'invest',
        args: [amountInWei],
      });

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

      // 检查最小赎回金额（100 USDC等值）
      const minRedeemAmount = parseEther('100'); // 假设1 MFC = 1 USDC
      if (amountInWei < minRedeemAmount) {
        setError('最小赎回金额为100 MFC');
        return;
      }

      // 执行赎回
      redeem({
        address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
        abi: MockFundABI.abi,
        functionName: 'redeem',
        args: [amountInWei],
      });

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
      approveUsdc({
        address: CONTRACT_ADDRESSES.MockUSDC as `0x${string}`,
        abi: MockUSDCABI.abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.MockFund as `0x${string}`, amountInWei],
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : '授权失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 授权MFC函数
  const handleApproveMfc = async (amount: string) => {
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const amountInWei = parseEther(amount); // MFC有18位小数

      // 授权MFC给基金合约
      approveMfc({
        address: CONTRACT_ADDRESSES.FundShareToken as `0x${string}`,
        abi: FundShareTokenABI.abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.MockFund as `0x${string}`, amountInWei],
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : '授权MFC失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 等待铸造交易确认
  const { isLoading: isMintTxLoading } = useWaitForTransactionReceipt({
    hash: mintData?.hash,
    onSuccess: () => {
      refetchUserUsdcBalance();
    },
  });

  // 获取测试USDC（自定义金额）
  const getTestUsdc = async (amount: string = "1000") => {
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const amountInWei = parseUnits(amount, 6); // USDC有6位小数
      
      // 执行铸造
      mintUSDC({
        address: CONTRACT_ADDRESSES.MockUSDC as `0x${string}`,
        abi: MockUSDCABI.abi,
        functionName: 'mint',
        args: [address as `0x${string}`, amountInWei],
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : '获取测试USDC失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 快速获取测试USDC（1000 USDC）
  const getQuickTestUsdc = async () => {
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // 执行快速获取
      mintUSDC({
        address: CONTRACT_ADDRESSES.MockUSDC as `0x${string}`,
        abi: MockUSDCABI.abi,
        functionName: 'getTestTokens',
        args: [],
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : '获取测试USDC失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取大量测试USDC（1,000,000 USDC）
  const getLargeTestUsdc = async () => {
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // 执行获取大量USDC
      mintUSDC({
        address: CONTRACT_ADDRESSES.MockUSDC as `0x${string}`,
        abi: MockUSDCABI.abi,
        functionName: 'getLargeAmount',
        args: [],
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : '获取测试USDC失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取投资预览
  const getInvestmentPreview = async (usdcAmount: string) => {
    if (!isInitialized) return null;

    try {
      const amountInWei = parseUnits(usdcAmount, 6);
      const response = await fetch(`/api/preview/invest?amount=${usdcAmount}`);
      const data = await response.json();
      return data.mfcAmount;
    } catch (err) {
      console.error('获取投资预览失败:', err);
      return null;
    }
  };

  // 获取赎回预览
  const getRedemptionPreview = async (mfcAmount: string) => {
    if (!isInitialized) return null;

    try {
      const response = await fetch(`/api/preview/redeem?amount=${mfcAmount}`);
      const data = await response.json();
      return data.usdcAmount;
    } catch (err) {
      console.error('获取赎回预览失败:', err);
      return null;
    }
  };

  return {
    // 钱包状态
    isConnected,
    address,
    
    // 状态
    isInitialized: isInitialized as boolean,
    isLoading: isLoading || isInvesting || isRedeeming || isApproving || isApprovingMfc || isMinting || isInvestTxLoading || isRedeemTxLoading || isApproveTxLoading || isApproveMfcTxLoading || isMintTxLoading,
    error,
    initError,
    initLoading,

    // 数据
    nav: nav ? formatUnits(nav, 6) : '0',
    mfcValue: mfcValue ? formatUnits(mfcValue, 6) : '0',
    supportedTokens,
    userMfcBalance: userMfcBalance ? formatEther(userMfcBalance) : '0',
    userUsdcBalance: userUsdcBalance ? formatUnits(userUsdcBalance, 6) : '0',
    
    // 函数
    handleInvest,
    handleRedeem,
    handleApproveUsdc,
    handleApproveMfc,
    getTestUsdc,
    getQuickTestUsdc,
    getLargeTestUsdc,
    getInvestmentPreview,
    getRedemptionPreview,
    
    // 刷新函数
    refetchNav,
    refetchMfcValue,
    refetchUserMfcBalance,
    refetchUserUsdcBalance,
    refetchUsdcAllowance,
    refetchSupportedTokens,
  };
}