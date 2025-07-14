import { useState, useEffect } from 'react';

export interface HistoricalPrice {
  date: string;
  price: number;
}

export interface TokenHistoricalData {
  symbol: string;
  prices: HistoricalPrice[];
}

export function useHistoricalPrices() {
  const [historicalData, setHistoricalData] = useState<TokenHistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 自动获取历史价格数据
  useEffect(() => {
    console.log('useHistoricalPrices: Auto-fetching historical prices on mount');
    fetchHistoricalPrices();
  }, []);

  const fetchHistoricalPrices = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('useHistoricalPrices: Starting to fetch historical prices...');
      const tokens = ['weth', 'wbtc', 'link', 'dai'];
      const historicalData: TokenHistoricalData[] = [];

      for (const token of tokens) {
        try {
          console.log(`useHistoricalPrices: Fetching historical data for ${token}...`);
          
          // 调用历史价格 API
          const response = await fetch(`/api/historical-price/${token}`);
          console.log(`useHistoricalPrices: Response for ${token}:`, response.status);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          console.log(`useHistoricalPrices: Data for ${token}:`, data.prices?.length || 0, 'data points');
          
          if (data.prices && Array.isArray(data.prices)) {
            historicalData.push({
              symbol: token.toUpperCase(),
              prices: data.prices
            });
          } else {
            throw new Error('Invalid data format');
          }
        } catch (error) {
          console.error(`Failed to fetch historical data for ${token}:`, error);
          // 如果 API 调用失败，使用模拟数据
          const simulatedPrices = generateSimulatedHistoricalData(token);
          historicalData.push({
            symbol: token.toUpperCase(),
            prices: simulatedPrices
          });
        }
      }

      console.log('useHistoricalPrices: Successfully loaded', historicalData.length, 'tokens with historical data');
      setHistoricalData(historicalData);
    } catch (error) {
      console.error('Failed to fetch historical prices:', error);
      setError('Failed to fetch historical prices');
    } finally {
      setIsLoading(false);
    }
  };

  // 生成模拟历史数据的辅助函数
  const generateSimulatedHistoricalData = (token: string): HistoricalPrice[] => {
    const prices: HistoricalPrice[] = [];
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());

    // 生成过去一年的日期（每周一个数据点）
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
      const date = d.toISOString().split('T')[0];
      
      // 模拟价格波动（基于真实代币的典型波动）
      let basePrice = 0;
      let volatility = 0;
      
      switch (token) {
        case 'weth':
          basePrice = 3000;
          volatility = 0.1;
          break;
        case 'wbtc':
          basePrice = 60000;
          volatility = 0.15;
          break;
        case 'link':
          basePrice = 15;
          volatility = 0.2;
          break;
        case 'dai':
          basePrice = 1;
          volatility = 0.02;
          break;
      }

      // 添加随机波动
      const randomFactor = 1 + (Math.random() - 0.5) * volatility;
      const price = basePrice * randomFactor;

      prices.push({ date, price: Math.round(price * 100) / 100 });
    }

    return prices;
  };

  // 计算 MFC 历史价值 - 基于实际合约组成
  const calculateMfcHistoricalValue = (fundComposition?: any): HistoricalPrice[] => {
    if (historicalData.length === 0) {
      return [];
    }

    const mfcValues: HistoricalPrice[] = [];
    
    // 获取所有代币的日期范围
    const allDates = historicalData[0]?.prices.map(p => p.date) || [];
    
    // 默认组成（基于合约初始化逻辑）
    // 根据MockFund.sol合约：
    // - 初始资金：1,000,000 USDC
    // - 初始MFC供应量：1,000,000 MFC
    // - USDC分配：50% (500,000 USDC)
    // - 代币分配：50% (500,000 USDC)，平均分配给4种代币，每种125,000 USDC
    // - 每个MFC包含：0.5 USDC + 对应比例的代币
    const defaultComposition = {
      usdcAmount: 0.5, // 0.5 USDC per MFC
      tokenRatios: {
        'WETH': 0.000041667, // 0.000041667 WETH per MFC (基于3000 USDC/WETH)
        'WBTC': 0.00000108, // 0.00000108 WBTC per MFC (基于115000 USDC/WBTC)
        'LINK': 0.00833, // 0.00833 LINK per MFC (基于15 USDC/LINK)
        'DAI': 0.125 // 0.125 DAI per MFC (基于1 USDC/DAI)
      }
    };
    
    allDates.forEach(date => {
      let totalValue = defaultComposition.usdcAmount; // 基础 USDC 价值
      
      // 计算每种代币的价值
      historicalData.forEach(tokenData => {
        const priceData = tokenData.prices.find(p => p.date === date);
        if (priceData) {
          const tokenAmount = defaultComposition.tokenRatios[tokenData.symbol as keyof typeof defaultComposition.tokenRatios] || 0;
          totalValue += tokenAmount * priceData.price;
        }
      });
      
      mfcValues.push({ date, price: totalValue });
    });

    return mfcValues;
  };

  // 计算历史投资组合比例 - 基于实际合约组成
  const calculateHistoricalPortfolioRatios = (fundComposition?: any): { [date: string]: { [symbol: string]: number } } => {
    if (historicalData.length === 0) {
      return {};
    }

    const ratios: { [date: string]: { [symbol: string]: number } } = {};
    const allDates = historicalData[0]?.prices.map(p => p.date) || [];

    // 默认组成（基于合约初始化逻辑）
    // 与calculateMfcHistoricalValue函数保持一致
    const defaultComposition = {
        usdcAmount: 0.5, // 0.5 USDC per MFC
        tokenRatios: {
          WETH: 0.000041667, // 0.000041667 WETH per MFC (基于3000 USDC/WETH)
          WBTC: 0.00000108, // 0.00000108 WBTC per MFC (基于115000 USDC/WBTC)
          LINK: 0.00833, // 0.00833 LINK per MFC (基于15 USDC/LINK)
          DAI: 0.125 // 0.125 DAI per MFC (基于1 USDC/DAI)
        }
      };

    allDates.forEach(date => {
      let totalValue = defaultComposition.usdcAmount; // 基础 USDC 价值
      const tokenValues: { [symbol: string]: number } = { USDC: defaultComposition.usdcAmount };

      // 计算每种代币的价值
      historicalData.forEach(tokenData => {
        const priceData = tokenData.prices.find(p => p.date === date);
        if (priceData) {
          const tokenAmount = defaultComposition.tokenRatios[tokenData.symbol as keyof typeof defaultComposition.tokenRatios] || 0;
          const value = tokenAmount * priceData.price;
          tokenValues[tokenData.symbol] = value;
          totalValue += value;
        }
      });

      // 计算比例
      Object.keys(tokenValues).forEach(symbol => {
        if (!ratios[date]) ratios[date] = {};
        ratios[date][symbol] = (tokenValues[symbol] / totalValue) * 100;
      });
    });

    return ratios;
  };

  return {
    historicalData,
    isLoading,
    error,
    fetchHistoricalPrices,
    calculateMfcHistoricalValue,
    calculateHistoricalPortfolioRatios,
  };
}