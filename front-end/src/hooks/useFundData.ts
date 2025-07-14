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
      console.log('fetchTokenPrices: Starting to fetch prices...');
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
          console.log(`fetchTokenPrices: Fetching price for ${token.symbol}...`);
          const response = await fetch(`/api/price/${token.symbol.toLowerCase()}`);
          console.log(`fetchTokenPrices: Response for ${token.symbol}:`, response.status);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          console.log(`fetchTokenPrices: Data for ${token.symbol}:`, data);
          
          const priceInUSD = data.price || 0;

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

      console.log('fetchTokenPrices: Final prices array:', prices);
      setTokenPrices(prices);
    } catch (error) {
      console.error('Failed to fetch token prices:', error);
      setError('Failed to fetch token prices');
    } finally {
      setIsLoading(false);
    }
  };

  // 只在初始化时加载一次价格数据
  useEffect(() => {
    console.log('useFundData: isInitialized changed to', isInitialized);
    if (isInitialized) {
      console.log('useFundData: Fetching token prices...');
      fetchTokenPrices(); // 初始加载
    }
  }, [isInitialized]);

  // 计算基金投资组合 - 基于实际合约数据和动态价格
  const calculateFundPortfolio = useCallback(() => {
    console.log('calculateFundPortfolio called with:', {
      fundBalances: !!fundBalances,
      tokenPricesLength: tokenPrices.length,
      mfcValue: !!mfcValue
    });
    
    if (!fundBalances || !tokenPrices.length) {
      console.log('calculateFundPortfolio: Missing required data, using default portfolio');
      // 使用默认价格（基于合约固定汇率）
      const usdcPrice = tokenPrices.find(p => p.symbol === 'USDC')?.priceInUSD || 1;
      const wethPrice = tokenPrices.find(p => p.symbol === 'WETH')?.priceInUSD || 3000; // 修正：3000 USDC per WETH
      const wbtcPrice = tokenPrices.find(p => p.symbol === 'WBTC')?.priceInUSD || 115000; // 修正：115000 USDC per WBTC
      const linkPrice = tokenPrices.find(p => p.symbol === 'LINK')?.priceInUSD || 15; // 修正：15 USDC per LINK
      const daiPrice = tokenPrices.find(p => p.symbol === 'DAI')?.priceInUSD || 1;
      
      // 计算MFC当前价值（如果有的话）
      const currentMfcValue = mfcValue ? parseFloat(formatUnits(mfcValue, 6)) : 2.0; // 默认2.0 USDC/MFC
      
      // 固定的MFC组合数据（每个MFC包含的代币数量）
        // 使用预设的固定值，不从合约读取
        const fixedUsdcAmount = 0.5; // 0.5 USDC per MFC
        const fixedWethAmount = 0.000041667; // 0.000041667 WETH per MFC (基于3000 USDC/WETH)
        const fixedWbtcAmount = 0.00000108; // 0.00000108 WBTC per MFC (基于115000 USDC/WBTC)
        const fixedLinkAmount = 0.00833; // 0.00833 LINK per MFC (基于15 USDC/LINK)
        const fixedDaiAmount = 0.125; // 0.125 DAI per MFC (基于1 USDC/DAI)
      
      // 计算每种代币的USD价值
      const usdcValue = fixedUsdcAmount * usdcPrice;
      const wethValue = fixedWethAmount * wethPrice;
      const wbtcValue = fixedWbtcAmount * wbtcPrice;
      const linkValue = fixedLinkAmount * linkPrice;
      const daiValue = fixedDaiAmount * daiPrice;
      
      const totalValue = usdcValue + wethValue + wbtcValue + linkValue + daiValue;
      
      const defaultPortfolio: FundPortfolio[] = [
        {
          token: CONTRACT_ADDRESSES.MockUSDC,
          symbol: 'USDC',
          name: 'USD Coin',
          balance: fixedUsdcAmount.toString(),
          balanceInUSD: usdcValue,
          percentage: (usdcValue / totalValue) * 100,
          decimals: 6,
        },
        {
          token: CONTRACT_ADDRESSES.WETH,
          symbol: 'WETH',
          name: 'Wrapped Ether',
          balance: fixedWethAmount.toString(),
          balanceInUSD: wethValue,
          percentage: (wethValue / totalValue) * 100,
          decimals: 18,
        },
        {
          token: CONTRACT_ADDRESSES.WBTC,
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin',
          balance: fixedWbtcAmount.toString(),
          balanceInUSD: wbtcValue,
          percentage: (wbtcValue / totalValue) * 100,
          decimals: 8,
        },
        {
          token: CONTRACT_ADDRESSES.LINK,
          symbol: 'LINK',
          name: 'Chainlink',
          balance: fixedLinkAmount.toString(),
          balanceInUSD: linkValue,
          percentage: (linkValue / totalValue) * 100,
          decimals: 18,
        },
        {
          token: CONTRACT_ADDRESSES.DAI,
          symbol: 'DAI',
          name: 'Dai Stablecoin',
          balance: fixedDaiAmount.toString(),
          balanceInUSD: daiValue,
          percentage: (daiValue / totalValue) * 100,
          decimals: 18,
        },
      ];
      setFundPortfolio(defaultPortfolio);
      return;
    }

    const portfolio: FundPortfolio[] = [];
    let totalValue = 0;
    
    // 首先计算总价值
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
      totalValue += balanceInUSD;
    }
    
    console.log('calculateFundPortfolio: Total portfolio value:', totalValue);

    // 然后计算每个代币的百分比
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

      console.log(`Token ${symbol}: balance=${formatUnits(balance, decimals)}, price=${tokenPrice?.priceInUSD}, balanceInUSD=${balanceInUSD}, percentage=${percentage}`);

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

    console.log('calculateFundPortfolio: Setting portfolio:', portfolio);
    setFundPortfolio(portfolio);
  }, [fundBalances, tokenPrices, nav]);

  // 计算MFC数据
  const calculateMFCData = useCallback(() => {
    if (!totalSupply || !circulatingSupply || !mfcValue || !nav) {
      console.log('calculateMFCData: Missing required data, using default MFC data');
      // 使用默认 MFC 数据
      setMfcData({
        totalSupply: '1000000',
        circulatingSupply: '500000',
        availableSupply: '500000',
        progressPercentage: 50,
        mfcValue: '1.02',
        nav: '2200000',
      });
      return;
    }

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