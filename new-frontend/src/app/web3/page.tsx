'use client';

import WalletConnect from '@/components/WalletConnect';
import GetTestTokens from '@/components/GetTestTokens';
import FundInvestment from '@/components/FundInvestment';
import FundRedemption from '@/components/FundRedemption';
import FundPortfolio from '@/components/FundPortfolio';

export default function Web3Page() {
  return (
    <div className="min-h-screen bg-gray-100">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">MockFund 投资平台 (Web3版)</h1>
                  <p className="text-sm text-gray-600">基于区块链的智能投资基金</p>
                </div>
                
                {/* Wallet Connect */}
                <WalletConnect />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Portfolio */}
              <div className="lg:col-span-1">
                <FundPortfolio />
              </div>
              
              {/* Right Column - Actions */}
              <div className="lg:col-span-2 space-y-8">
                {/* Get Test Tokens */}
                <GetTestTokens />
                
                {/* Investment and Redemption */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FundInvestment />
                  <FundRedemption />
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="mt-8 text-center">
              <div className="space-x-4">
                <a href="/" className="text-blue-500 hover:underline">返回主页</a>
                <a href="/basic" className="text-blue-500 hover:underline">基础功能</a>
                <a href="/simple" className="text-blue-500 hover:underline">简化测试</a>
              </div>
            </div>
          </main>
        </div>
  );
}