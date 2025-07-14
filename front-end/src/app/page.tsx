'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import WalletConnect from '@/components/WalletConnect';
import FundInvestment from '@/components/FundInvestment';
import FundRedemption from '@/components/FundRedemption';
import FundPortfolio from '@/components/FundPortfolio';
import DebugInfo from '@/components/DebugInfo';
import GetTestTokens from '@/components/GetTestTokens';
import { useFundData } from '@/hooks/useFundData';

export default function Home() {
  const { isConnected } = useAccount();
  const { isInitialized, mfcData } = useFundData();
  const [activeTab, setActiveTab] = useState<'investment' | 'redemption'>('investment');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">MockFund DeFi 基金</h1>
          <p className="text-lg text-gray-600">基于 Chainlink 真实价格的去中心化投资基金</p>
        </div>

        {/* 调试信息 */}
        <DebugInfo />
        
        {/* 基金概览 */}
        {isInitialized && mfcData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">基金概览</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800">基金净值</h3>
                <p className="text-2xl font-bold text-blue-600">${parseFloat(mfcData.nav).toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800">MFC价值</h3>
                <p className="text-2xl font-bold text-green-600">${parseFloat(mfcData.mfcValue).toFixed(4)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800">投资进度</h3>
                <p className="text-2xl font-bold text-purple-600">{mfcData.progressPercentage.toFixed(1)}%</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800">管理费率</h3>
                <p className="text-2xl font-bold text-orange-600">1%</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：钱包连接、获取测试代币和投资组合 */}
          <div className="lg:col-span-1 space-y-6">
            <WalletConnect />
            <GetTestTokens />
            {isInitialized && <FundPortfolio />}
          </div>

          {/* 右侧：投资/赎回功能 */}
          <div className="lg:col-span-2">
            {!isConnected ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">开始投资</h2>
                <div className="text-center py-8">
                  <p className="text-gray-600">请先连接钱包以开始投资</p>
                </div>
              </div>
            ) : !isInitialized ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">基金状态</h2>
                <div className="text-center py-8">
                  <p className="text-gray-600">基金尚未初始化，请稍后再试</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md">
                {/* 标签页 */}
                <div className="border-b border-gray-200">
                  <nav className="flex">
                    <button
                      onClick={() => setActiveTab('investment')}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'investment'
                          ? 'border-green-500 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      投资
                    </button>
                    <button
                      onClick={() => setActiveTab('redemption')}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'redemption'
                          ? 'border-red-500 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      赎回
                    </button>
                  </nav>
                </div>

                {/* 标签页内容 */}
                <div className="p-6">
                  {activeTab === 'investment' ? (
                    <FundInvestment />
                  ) : (
                    <FundRedemption />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部信息 */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>合约地址: MockFund - 0x9fFB513271065CFfE4Fda7DA3E610Df629101F27</p>
          <p className="mt-2">
            <a 
              href="https://sepolia.etherscan.io/address/0x9fFB513271065CFfE4Fda7DA3E610Df629101F27" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              在 Etherscan 上查看合约
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
