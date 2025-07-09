'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { getContractAddress } from '@/contracts/addresses';
import MockFundABI from '@/contracts/abis/MockFund.json';
import MockUSDCABI from '@/contracts/abis/MockUSDC.json';

export default function FundInvestment() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [investAmount, setInvestAmount] = useState('');
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
      alert('交易成功！投资已完成。');
    }
  }, [isSuccess]);

  // 读取USDC余额
  const { data: usdcBalance, isLoading: balanceLoading, error: balanceError } = useReadContract({
    address: getContractAddress('MOCK_USDC', chainId) as `0x${string}`,
    abi: MockUSDCABI.abi,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });

  // 读取USDC授权额度
  const { data: allowance } = useReadContract({
    address: getContractAddress('MOCK_USDC', chainId) as `0x${string}`,
    abi: MockUSDCABI.abi,
    functionName: 'allowance',
    args: [address, getContractAddress('MOCK_FUND', chainId)],
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

  // 读取当前 MFC 价格
  const { data: mfcPrice } = useReadContract({
    address: getContractAddress('MOCK_FUND', chainId) as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'getCurrentMFCPrice',
    query: {
      refetchInterval: 5000,
    },
  });

  // 计算投资预览
  const investmentPreview = useMemo(() => {
    if (!investAmount || !mfcPrice || parseFloat(investAmount) === 0) {
      return { mfcAmount: '0', mfcPrice: '0' };
    }
    
    const usdcAmount = parseUnits(investAmount, 6);
    const mfcAmount = (usdcAmount * 10n**18n) / (mfcPrice as bigint);
    const mfcPriceFormatted = formatUnits(mfcPrice as bigint, 6);
    
    return {
      mfcAmount: formatUnits(mfcAmount, 18),
      mfcPrice: mfcPriceFormatted
    };
  }, [investAmount, mfcPrice]);

  const approveUSDC = async () => {
    if (!investAmount || !isConnected) return;
    
    setIsLoading(true);
    try {
      const amount = parseUnits(investAmount, 6); // USDC has 6 decimals
      await writeContract({
        address: getContractAddress('MOCK_USDC', chainId) as `0x${string}`,
        abi: MockUSDCABI.abi,
        functionName: 'approve',
        args: [getContractAddress('MOCK_FUND', chainId), amount],
      });
    } catch (error) {
      console.error('授权失败:', error);
      setIsLoading(false);
    }
  };

  const investInFund = async () => {
    if (!investAmount || !isConnected) return;
    
    // 检查最小投资金额
    const minInvestment = 10; // 10 USDC
    if (parseFloat(investAmount) < minInvestment) {
      alert(`投资金额不能低于 ${minInvestment} USDC`);
      return;
    }
    
    setIsLoading(true);
    try {
      const amount = parseUnits(investAmount, 6); // USDC has 6 decimals
      await writeContract({
        address: getContractAddress('MOCK_FUND', chainId) as `0x${string}`,
        abi: MockFundABI.abi,
        functionName: 'invest',
        args: [amount],
      });
      setInvestAmount('');
    } catch (error) {
      console.error('投资失败:', error);
      setIsLoading(false);
    }
  };

  // 防止水合错误
  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">基金投资</h2>
        <p className="text-gray-600">加载中...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">请先连接钱包以进行投资</p>
      </div>
    );
  }

  const usdcBalanceFormatted = usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0';
  const allowanceFormatted = allowance ? formatUnits(allowance as bigint, 6) : '0';
  const investAmountBigInt = investAmount ? parseUnits(investAmount, 6) : 0n;
  const needsApproval = allowance ? (allowance as bigint) < investAmountBigInt : true;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">基金投资</h2>
      
      {/* 基金统计信息 */}
      {fundStats && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">基金信息</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">总资产</p>
              <p className="font-medium">{formatUnits((fundStats as any)[0], 6)} USDC</p>
            </div>
            <div>
              <p className="text-gray-600">总份额</p>
              <p className="font-medium">{formatUnits((fundStats as any)[1], 18)} MFC</p>
            </div>
            <div>
              <p className="text-gray-600">当前净值</p>
              <p className="font-medium">{formatUnits((fundStats as any)[2], 6)} USDC</p>
            </div>
            <div>
              <p className="text-gray-600">MFC 价格</p>
              <p className="font-medium">{mfcPrice ? formatUnits(mfcPrice as bigint, 6) : '0'} USDC</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 余额信息 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">USDC 余额: {usdcBalanceFormatted}</p>
        <p className="text-sm text-gray-600">已授权额度: {allowanceFormatted}</p>
        {balanceLoading && <p className="text-sm text-blue-600">正在加载余额...</p>}
        {balanceError && <p className="text-sm text-red-600">余额加载错误: {balanceError.message}</p>}
        <p className="text-xs text-gray-500">合约地址: {getContractAddress('MOCK_USDC', chainId)}</p>
        <p className="text-xs text-gray-500">钱包地址: {address}</p>
        <p className="text-xs text-gray-500">当前网络: {chainId === 31337 ? 'Hardhat Local' : chainId === 11155111 ? 'Sepolia' : `Chain ID: ${chainId}`}</p>
      </div>
      
      {/* 投资表单 */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            投资金额 (USDC)
          </label>
          <input
            type="number"
            value={investAmount}
            onChange={(e) => setInvestAmount(e.target.value)}
            placeholder="输入投资金额（最低 10 USDC）"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="10"
            step="0.000001"
          />
          {investAmount && parseFloat(investAmount) < 10 && (
            <p className="text-red-500 text-sm mt-1">
              投资金额不能低于 10 USDC
            </p>
          )}
          
          {/* 投资预览 */}
          {investAmount && parseFloat(investAmount) >= 10 && investmentPreview.mfcAmount !== '0' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
              <h4 className="font-medium text-blue-800 mb-2">投资预览</h4>
              <div className="text-sm text-blue-700">
                <p>投资金额: {investAmount} USDC</p>
                <p>当前 MFC 价格: {investmentPreview.mfcPrice} USDC</p>
                <p className="font-semibold">将获得: {investmentPreview.mfcAmount} MFC</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          {needsApproval && investAmount && (
            <button
              onClick={approveUSDC}
              disabled={isLoading || isConfirming || !investAmount}
              className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '发送交易...' : isConfirming ? '确认中...' : '授权 USDC'}
            </button>
          )}
          
          <button
            onClick={investInFund}
            disabled={isLoading || isConfirming || !investAmount || needsApproval || (investAmount && parseFloat(investAmount) < 10)}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? '发送交易...' : isConfirming ? '确认中...' : '投资'}
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          <p>• 投资将按当前 MFC 价格购买基金份额</p>
          <p>• 基金会自动将资金投资于多种代币</p>
          <p>• 您将获得相应的 MFC 代币</p>
          <p className="text-orange-600 font-medium">• 最小投资金额：10 USDC</p>
        </div>
      </div>
    </div>
  );
}