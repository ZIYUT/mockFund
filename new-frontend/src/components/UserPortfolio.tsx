'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { getContractAddress, SUPPORTED_TOKENS } from '@/contracts/addresses';
import MockFundABI from '@/contracts/abis/MockFund.json';
import FundShareTokenABI from '@/contracts/abis/FundShareToken.json';
import MockUSDCABI from '@/contracts/abis/MockUSDC.json';
import { useState, useEffect } from 'react';

export default function UserPortfolio() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 读取基金份额余额
  const { data: shareBalance } = useReadContract({
    address: getContractAddress('FUND_SHARE_TOKEN') as `0x${string}`,
    abi: FundShareTokenABI.abi,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });

  // 读取USDC余额
  const { data: usdcBalance } = useReadContract({
    address: getContractAddress('MOCK_USDC') as `0x${string}`,
    abi: MockUSDCABI.abi,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });

  // 读取当前NAV
  const { data: currentNAV } = useReadContract({
    address: getContractAddress('MOCK_FUND') as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'getCurrentNAV',
    query: {
      refetchInterval: 5000,
    },
  });

  // 读取基金统计信息
  const { data: fundStats } = useReadContract({
    address: getContractAddress('MOCK_FUND') as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'getFundStats',
    query: {
      refetchInterval: 5000,
    },
  });

  // 读取各种代币余额
  const tokenBalances = Object.entries(SUPPORTED_TOKENS).map(([symbol, token]) => {
    const { data: balance } = useReadContract({
      address: token.address as `0x${string}`,
      abi: MockUSDCABI.abi, // 所有代币都使用相同的ERC20接口
      functionName: 'balanceOf',
      args: [address],
      query: {
        enabled: !!address,
        refetchInterval: 5000,
      },
    });
    
    return {
      symbol,
      name: token.name,
      balance: balance ? formatUnits(balance as bigint, token.decimals) : '0',
      decimals: token.decimals,
    };
  });

  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">请先连接钱包查看持仓信息</p>
      </div>
    );
  }

  const shareBalanceFormatted = shareBalance ? formatUnits(shareBalance as bigint, 18) : '0';
  const usdcBalanceFormatted = usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0';
  const navFormatted = currentNAV ? formatUnits(currentNAV as bigint, 6) : '1.000000';
  
  // 计算投资价值
  const investmentValue = shareBalance && currentNAV 
    ? (parseFloat(shareBalanceFormatted) * parseFloat(navFormatted)).toFixed(6)
    : '0';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">我的持仓</h2>
      
      {/* 基金投资信息 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3 text-blue-800">基金投资</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">持有份额</p>
            <p className="text-lg font-medium">{shareBalanceFormatted}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">当前净值</p>
            <p className="text-lg font-medium">{navFormatted} USDC</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">投资价值</p>
            <p className="text-lg font-medium text-green-600">{investmentValue} USDC</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">USDC 余额</p>
            <p className="text-lg font-medium">{usdcBalanceFormatted} USDC</p>
          </div>
        </div>
      </div>

      {/* 基金整体信息 */}
      {fundStats && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3">基金概况</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">基金总资产</p>
              <p className="font-medium">{formatUnits((fundStats as any)[0], 6)} USDC</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">总发行份额</p>
              <p className="font-medium">{formatUnits((fundStats as any)[1], 18)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">基金净值</p>
              <p className="font-medium">{formatUnits((fundStats as any)[2], 6)} USDC</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 代币余额 */}
      <div>
        <h3 className="font-semibold mb-3">代币余额</h3>
        <div className="grid grid-cols-2 gap-3">
          {tokenBalances.map((token) => (
            <div key={token.symbol} className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">{token.symbol}</span>
                <span className="text-sm text-gray-600">{token.name}</span>
              </div>
              <p className="text-lg font-medium mt-1">
                {parseFloat(token.balance).toFixed(6)}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* 钱包地址 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          钱包地址: {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
      </div>
    </div>
  );
}