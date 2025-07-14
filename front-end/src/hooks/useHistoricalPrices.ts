import { useState, useEffect } from 'react';

const MFC_COMPOSITION = {
  USDC: 0.5,
  WETH: 0.00004167,
  WBTC: 0.00000108,
  LINK: 0.008,
  DAI: 0.125,
};

function getPastNDates(n: number) {
  const dates: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function useHistoricalPrices() {
  const [historicalData, setHistoricalData] = useState<any[]>([]); // [{symbol, prices: [{date, price}]}]
  const [mfcHistoricalValues, setMfcHistoricalValues] = useState<any[]>([]); // [{date, price}]
  const [historicalRatios, setHistoricalRatios] = useState<any>({}); // {date: {symbol: percent}}
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllHistoricalPrices();
    // eslint-disable-next-line
  }, []);

  async function fetchAllHistoricalPrices() {
    setIsLoading(true);
    setError(null);
    try {
      const days = 180;
      const tokens = ['weth', 'wbtc', 'link', 'dai'];
      const allData: any[] = [];
      for (const token of tokens) {
        let prices: any[] = [];
        try {
          const resp = await fetch(`/api/historical-price/${token}`);
          const data = await resp.json();
          prices = data.prices || [];
        } catch (e) {
          prices = generateSimulatedHistoricalData(token, days);
        }
        allData.push({ symbol: token.toUpperCase(), prices });
      }
      setHistoricalData(allData);
      // 计算MFC历史价值和历史占比
      const dates = getPastNDates(days);
      const mfcValues: any[] = [];
      const ratios: any = {};
      for (let i = 0; i < days; i++) {
        const date = dates[i];
        let mfcValue = MFC_COMPOSITION.USDC;
        let totalValue = MFC_COMPOSITION.USDC;
        const tokenValues: any = { USDC: MFC_COMPOSITION.USDC };
        for (const { symbol, prices } of allData) {
          const priceObj = prices[i] || prices[prices.length - 1];
          const tokenAmount = (MFC_COMPOSITION as any)[symbol];
          const value = tokenAmount * (priceObj?.price || 0);
          mfcValue += value;
          tokenValues[symbol] = value;
          totalValue += value;
        }
        mfcValues.push({ date, price: Math.round(mfcValue * 100) / 100 });
        // 计算占比
        ratios[date] = {};
        for (const k of Object.keys(tokenValues)) {
          ratios[date][k] = (tokenValues[k] / totalValue) * 100;
        }
      }
      setMfcHistoricalValues(mfcValues);
      setHistoricalRatios(ratios);
    } catch (e) {
      setError('Failed to fetch historical prices');
    } finally {
      setIsLoading(false);
    }
  }

  function generateSimulatedHistoricalData(symbol: string, days: number) {
    const prices: any[] = [];
    const today = new Date();
    let base = 1, vol = 0.05;
    if (symbol === 'weth') { base = 3000; vol = 0.1; }
    if (symbol === 'wbtc') { base = 60000; vol = 0.15; }
    if (symbol === 'link') { base = 15; vol = 0.2; }
    if (symbol === 'dai') { base = 1; vol = 0.02; }
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const random = 1 + (Math.random() - 0.5) * vol;
      prices.push({ date: d.toISOString().split('T')[0], price: Math.round(base * random * 100) / 100 });
    }
    return prices;
  }

  return {
    historicalData,
    mfcHistoricalValues,
    historicalRatios,
    isLoading,
    error,
    fetchAllHistoricalPrices,
  };
}