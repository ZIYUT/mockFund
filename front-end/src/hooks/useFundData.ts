import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatEther, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES, PORTFOLIO_CONFIG } from '../../contracts/addresses';
import MockFundABI from '../contracts/abis/MockFund.json';
import MockUSDCABI from '../contracts/abis/MockUSDC.json';
import FundShareTokenABI from '../contracts/abis/FundShareToken.json';

export interface TokenPrice {
  symbol: string;
  name: string;
  price: number;
  priceInUSD: number;
  decimals: number;
}

export interface FundPortfolio {
  token: string;
  symbol: string;
  name: string;
  balance: string;
  balanceInUSD: number;
  percentage: number;
  decimals: number;
}

export interface MFCData {
  totalSupply: string;
  circulatingSupply: string;
  availableSupply: string;
  progressPercentage: number;
  mfcValue: string;
  nav: string;
}

export function useFundData() {
  const { address, isConnected } = useAccount();
  const [tokenPrices, setTokenPrices] = useState<TokenPrice[]>([]);
  const [fundPortfolio, setFundPortfolio] = useState<FundPortfolio[]>([]);
  const [mfcData, setMfcData] = useState<MFCData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 读取基金状态
  const { data: isInitialized } = useReadContract({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'isInitialized',
    query: {
      refetchInterval: 5000,
    },
  });

  // 读取基金净值
  const { data: nav, refetch: refetchNav } = useReadContract({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'calculateNAV',
    query: {
      enabled: isInitialized as boolean,
      refetchInterval: 10000,
    },
  });

  // 读取MFC价值
  const { data: mfcValue, refetch: refetchMfcValue } = useReadContract({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'calculateMFCValue',
    query: {
      enabled: isInitialized as boolean,
      refetchInterval: 10000,
    },
  });

  // 读取总供应量
  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.FundShareToken as `0x${string}`,
    abi: FundShareTokenABI.abi,
    functionName: 'totalSupply',
    query: {
      refetchInterval: 10000,
    },
  });

  // 读取流通供应量
  const { data: circulatingSupply, refetch: refetchCirculatingSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'getCirculatingSupply',
    query: {
      enabled: isInitialized as boolean,
      refetchInterval: 10000,
    },
  });

  // 读取基金代币余额
  const { data: fundBalances, refetch: refetchFundBalances } = useReadContract({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'getFundTokenBalances',
    query: {
      enabled: isInitialized as boolean,
      refetchInterval: 15000,
    },
  });

  // 读取用户余额
  const { data: userMfcBalance, refetch: refetchUserMfcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.FundShareToken as `0x${string}`,
    abi: FundShareTokenABI.abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 10000,
    },
  });

  const { data: userUsdcBalance, refetch: refetchUserUsdcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.MockUSDC as `0x${string}`,
    abi: MockUSDCABI.abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 10000,
    },
  });

  // 获取代币价格
  const fetchTokenPrices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tokens = [
        { symbol: 'WETH', address: CONTRACT_ADDRESSES.WETH, decimals: 18 },
        { symbol: 'WBTC', address: CONTRACT_ADDRESSES.WBTC, decimals: 8 },
        { symbol: 'LINK', address: CONTRACT_ADDRESSES.LINK, decimals: 18 },
        { symbol: 'DAI', address: CONTRACT_ADDRESSES.DAI, decimals: 18 },
        { symbol: 'USDC', address: CONTRACT_ADDRESSES.MockUSDC, decimals: 6 },
      ];

      const prices: TokenPrice[] = [];

      for (const token of tokens) {
        try {
          const priceInUSD = await fetch(`/api/price/${token.symbol.toLowerCase()}`)
            .then(res => res.json())
            .then(data => data.price)
            .catch(() => 0);

          prices.push({
            symbol: token.symbol,
            name: PORTFOLIO_CONFIG.names[token.symbol as keyof typeof PORTFOLIO_CONFIG.names],
            price: priceInUSD || 0,
            priceInUSD: priceInUSD || 0,
            decimals: token.decimals,
          });
        } catch (error) {
          console.error(`Failed to fetch price for ${token.symbol}:`, error);
          // 使用默认价格
          const defaultPrices: { [key: string]: number } = {
            WETH: 3000,
            WBTC: 60000,
            LINK: 15,
            DAI: 1,
            USDC: 1,
          };
          prices.push({
            symbol: token.symbol,
            name: PORTFOLIO_CONFIG.names[token.symbol as keyof typeof PORTFOLIO_CONFIG.names],
            price: defaultPrices[token.symbol] || 0,
            priceInUSD: defaultPrices[token.symbol] || 0,
            decimals: token.decimals,
          });
        }
      }

      setTokenPrices(prices);
    } catch (error) {
      console.error('Failed to fetch token prices:', error);
      setError('Failed to fetch token prices');
    } finally {
      setIsLoading(false);
    }
  };

  // 设置30秒定时刷新价格
  useEffect(() => {
    if (isInitialized) {
      fetchTokenPrices(); // 初始加载
      
      const interval = setInterval(() => {
        fetchTokenPrices();
      }, 30000); // 30秒刷新一次

      return () => clearInterval(interval);
    }
  }, [isInitialized]);

  // 计算基金投资组合
  const calculateFundPortfolio = useCallback(() => {
    if (!fundBalances || !tokenPrices.length || !nav) return;

    const portfolio: FundPortfolio[] = [];
    const totalValue = parseFloat(formatUnits(nav, 6));

    for (let i = 0; i < fundBalances.tokens.length; i++) {
      const tokenAddress = fundBalances.tokens[i];
      const balance = fundBalances.balances[i];
      const decimals = fundBalances.decimals[i];

      let symbol = 'Unknown';
      if (tokenAddress === CONTRACT_ADDRESSES.MockUSDC) symbol = 'USDC';
      else if (tokenAddress === CONTRACT_ADDRESSES.WETH) symbol = 'WETH';
      else if (tokenAddress === CONTRACT_ADDRESSES.WBTC) symbol = 'WBTC';
      else if (tokenAddress === CONTRACT_ADDRESSES.LINK) symbol = 'LINK';
      else if (tokenAddress === CONTRACT_ADDRESSES.DAI) symbol = 'DAI';

      const tokenPrice = tokenPrices.find(p => p.symbol === symbol);
      const balanceInUSD = tokenPrice ? parseFloat(formatUnits(balance, decimals)) * (tokenPrice.priceInUSD || 0) : 0;
      const percentage = totalValue > 0 ? (balanceInUSD / totalValue) * 100 : 0;

      portfolio.push({
        token: tokenAddress,
        symbol,
        name: PORTFOLIO_CONFIG.names[symbol as keyof typeof PORTFOLIO_CONFIG.names],
        balance: formatUnits(balance, decimals),
        balanceInUSD,
        percentage,
        decimals,
      });
    }

    setFundPortfolio(portfolio);
  }, [fundBalances, tokenPrices, nav]);

  // 计算MFC数据
  const calculateMFCData = useCallback(() => {
    if (!totalSupply || !circulatingSupply || !mfcValue || !nav) return;

    const total = parseFloat(formatEther(totalSupply));
    const circulating = parseFloat(formatEther(circulatingSupply));
    const available = total - circulating;
    const progressPercentage = total > 0 ? (circulating / total) * 100 : 0;

    setMfcData({
      totalSupply: formatEther(totalSupply),
      circulatingSupply: formatEther(circulatingSupply),
      availableSupply: available.toString(),
      progressPercentage,
      mfcValue: formatUnits(mfcValue, 6),
      nav: formatUnits(nav, 6),
    });
  }, [totalSupply, circulatingSupply, mfcValue, nav]);

  // 获取投资预览
  const getInvestmentPreview = async (usdcAmount: string) => {
    if (!isInitialized) return '0';

    try {
      const preview = await fetch(`/api/investment-preview?amount=${usdcAmount}`)
        .then(res => res.json())
        .then(data => data.mfcAmount)
        .catch(() => {
          // 如果API不可用，使用本地计算
          const mfcValueNum = parseFloat(formatUnits(mfcValue || 0n, 6));
          return mfcValueNum > 0 ? (parseFloat(usdcAmount) / mfcValueNum).toString() : '0';
        });

      return preview;
    } catch (error) {
      console.error('Failed to get investment preview:', error);
      return '0';
    }
  };

  // 获取赎回预览
  const getRedemptionPreview = async (mfcAmount: string) => {
    if (!isInitialized) return '0';

    try {
      const preview = await fetch(`/api/redemption-preview?amount=${mfcAmount}`)
        .then(res => res.json())
        .then(data => data.usdcAmount)
        .catch(() => {
          // 如果API不可用，使用本地计算
          const mfcValueNum = parseFloat(formatUnits(mfcValue || 0n, 6));
          return (parseFloat(mfcAmount) * mfcValueNum).toString();
        });

      return preview;
    } catch (error) {
      console.error('Failed to get redemption preview:', error);
      return '0';
    }
  };

  // 刷新所有数据
  const refreshData = () => {
    refetchNav();
    refetchMfcValue();
    refetchTotalSupply();
    refetchCirculatingSupply();
    refetchFundBalances();
    refetchUserMfcBalance();
    refetchUserUsdcBalance();
    fetchTokenPrices();
  };

  // 初始化数据
  useEffect(() => {
    if (isInitialized) {
      fetchTokenPrices();
    }
  }, [isInitialized]);

  // 计算投资组合
  useEffect(() => {
    calculateFundPortfolio();
  }, [fundBalances, tokenPrices, nav, calculateFundPortfolio]);

  // 计算MFC数据
  useEffect(() => {
    calculateMFCData();
  }, [totalSupply, circulatingSupply, mfcValue, nav, calculateMFCData]);

  return {
    // 状态
    isInitialized,
    isLoading,
    error,
    
    // 数据
    tokenPrices,
    fundPortfolio,
    mfcData,
    userMfcBalance: userMfcBalance ? formatEther(userMfcBalance) : '0',
    userUsdcBalance: userUsdcBalance ? formatUnits(userUsdcBalance, 6) : '0',
    
    // 函数
    getInvestmentPreview,
    getRedemptionPreview,
    refreshData,
  };
}