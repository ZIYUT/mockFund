'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { getContractAddress } from '@/contracts/addresses';
import MockFundABI from '@/contracts/abis/MockFund.json';
import FundShareTokenABI from '@/contracts/abis/FundShareToken.json';

export default function FundRedemption() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [redeemAmount, setRedeemAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { writeContract, data: hash } = useWriteContract();
  
  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // 交易确认后重置加载状态
  useEffect(() => {
    if (isSuccess) {
      setIsLoading(false);
      alert('交易成功！赎回已完成。');
    }
  }, [isSuccess]);

  // 读取基金份额余额
  const { data: shareBalance } = useReadContract({
    address: getContractAddress('FUND_SHARE_TOKEN', chainId) as `0x${string}`,
    abi: FundShareTokenABI.abi,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });

  // 读取基金统计信息
  const { data: fundStats } = useReadContract({
    address: getContractAddress('MOCK_FUND', chainId) as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'getFundStats',
    query: {
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

  // 读取当前 MFC 价格
  const { data: mfcPrice } = useReadContract({
    address: getContractAddress('MOCK_FUND', chainId) as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'getCurrentMFCPrice',
    query: {
      refetchInterval: 5000,
    },
  });

  // 计算赎回预览
  const redemptionPreview = useMemo(() => {
    if (!redeemAmount || !mfcPrice || parseFloat(redeemAmount) === 0) {
      return { usdcAmount: '0', mfcPrice: '0' };
    }
    
    const mfcAmount = parseUnits(redeemAmount, 18);
    const usdcAmount = (mfcAmount * (mfcPrice as bigint)) / 10n**18n;
    const mfcPriceFormatted = formatUnits(mfcPrice as bigint, 6);
    
    return {
      usdcAmount: formatUnits(usdcAmount, 6),
      mfcPrice: mfcPriceFormatted
    };
  }, [redeemAmount, mfcPrice]);

  const redeemShares = async () => {
    if (!redeemAmount || !isConnected) return;
    
    // 检查最小赎回金额（基于净值计算）
    const minRedemptionUSDC = 10; // 10 USDC
    const navValue = currentNAV ? parseFloat(formatUnits(currentNAV as bigint, 6)) : 1;
    const minRedemptionShares = minRedemptionUSDC / navValue;
    
    if (parseFloat(redeemAmount) < minRedemptionShares) {
      alert(`赎回金额不能低于 ${minRedemptionUSDC} USDC（约 ${minRedemptionShares.toFixed(6)} 份额）`);
      return;
    }
    
    setIsLoading(true);
    try {
      const amount = parseUnits(redeemAmount, 18); // Share tokens have 18 decimals
      await writeContract({
        address: getContractAddress('MOCK_FUND', chainId) as `0x${string}`,
        abi: MockFundABI.abi,
        functionName: 'redeem',
        args: [amount],
      });
      setRedeemAmount('');
    } catch (error) {
      console.error('赎回失败:', error);
      setIsLoading(false);
    }
  };

  const redeemAll = () => {
    if (shareBalance) {
      setRedeemAmount(formatUnits(shareBalance as bigint, 18));
    }
  };

  // 防止水合错误
  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">基金赎回</h2>
        <p className="text-gray-600">加载中...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">请先连接钱包以进行赎回</p>
      </div>
    );
  }

  const shareBalanceFormatted = shareBalance ? formatUnits(shareBalance as bigint, 18) : '0';
  const navFormatted = currentNAV ? formatUnits(currentNAV as bigint, 6) : '1.000000';
  
  // 计算预期赎回金额
  const expectedRedemption = redeemAmount && currentNAV 
    ? (parseFloat(redeemAmount) * parseFloat(navFormatted)).toFixed(6)
    : '0';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">基金赎回</h2>
      
      {/* 基金统计信息 */}
      {fundStats && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">基金信息</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">总资产</p>
              <p className="font-medium">{formatUnits((fundStats as any)[0], 6)} USDC</p>
            </div>
            <div>
              <p className="text-gray-600">总份额</p>
              <p className="font-medium">{formatUnits((fundStats as any)[1], 18)}</p>
            </div>
            <div>
              <p className="text-gray-600">当前净值</p>
              <p className="font-medium">{navFormatted} USDC</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 持仓信息 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">持有份额: {shareBalanceFormatted}</p>
        <p className="text-sm text-gray-600">当前净值: {navFormatted} USDC</p>
        {redeemAmount && (
          <p className="text-sm text-green-600">预期赎回: {expectedRedemption} USDC</p>
        )}
      </div>
      
      {/* 余额信息 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">MFC 余额: {shareBalance ? formatUnits(shareBalance as bigint, 18) : '0'}</p>
        <p className="text-sm text-gray-600">当前 MFC 价格: {mfcPrice ? formatUnits(mfcPrice as bigint, 6) : '0'} USDC</p>
      </div>
      
      {/* 赎回表单 */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            赎回数量 (MFC)
          </label>
          <input
            type="number"
            value={redeemAmount}
            onChange={(e) => setRedeemAmount(e.target.value)}
            placeholder="输入赎回数量（最低 10 MFC）"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="10"
            step="0.000000000000000001"
          />
        </div>
        
        <button
          onClick={redeemShares}
          disabled={isLoading || isConfirming || !redeemAmount || (redeemAmount && parseFloat(redeemAmount) < 10)}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {isLoading ? '发送交易...' : isConfirming ? '确认中...' : '赎回 MFC'}
        </button>
        
        <div className="text-sm text-gray-600">
          <p>• 赎回将按当前 MFC 价格计算</p>
          <p>• 基金会自动将代币组合按比例赎回</p>
          <p>• 您将获得相应的 USDC</p>
          <p className="text-orange-600 font-medium">• 最小赎回数量：10 MFC</p>
        </div>
        
        {redeemAmount && parseFloat(redeemAmount) < 10 && (
          <p className="text-red-500 text-sm mt-1">
            赎回金额不能低于 10 MFC
          </p>
        )}
        
        {/* 赎回预览 */}
        {redeemAmount && parseFloat(redeemAmount) >= 10 && redemptionPreview.usdcAmount !== '0' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
            <h4 className="font-medium text-green-800 mb-2">赎回预览</h4>
            <div className="text-sm text-green-700">
              <p>赎回 MFC: {redeemAmount}</p>
              <p>当前 MFC 价格: {redemptionPreview.mfcPrice} USDC</p>
              <p className="font-semibold">将获得: {redemptionPreview.usdcAmount} USDC</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}