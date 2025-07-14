'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import WalletConnect from '@/components/WalletConnect';
import FundInvestment from '@/components/FundInvestment';
import FundRedemption from '@/components/FundRedemption';
import FundPortfolio from '@/components/FundPortfolio';
import GetTestTokens from '@/components/GetTestTokens';
import { useFundData } from '@/hooks/useFundData';

export default function Home() {
  const { isConnected } = useAccount();
  const { isInitialized, mfcData } = useFundData();
  const [activeTab, setActiveTab] = useState<'investment' | 'redemption'>('investment');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 bg-clip-text text-transparent font-serif drop-shadow-lg"
            style={{ letterSpacing: '0.04em', fontFamily: 'Georgia, Times, serif' }}
          >
            MockFund DeFi Fund
          </h1>
          <p
            className="text-xl text-gray-500 font-light tracking-wide"
            style={{ fontFamily: 'Georgia, Times, serif' }}
          >
            Decentralized Investment Fund with Real-time Chainlink Prices
          </p>
        </div>

        {/* Portfolio Real-time Prices - Moved to top */}
        {isInitialized && <FundPortfolio />}
        
        {/* Fund Overview */}
        {isInitialized && mfcData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Fund Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800">Fund NAV</h3>
                <p className="text-2xl font-bold text-blue-600">${parseFloat(mfcData.nav).toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800">MFC Value</h3>
                <p className="text-2xl font-bold text-green-600">${parseFloat(mfcData.mfcValue).toFixed(4)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800">Investment Progress</h3>
                <p className="text-2xl font-bold text-purple-600">{mfcData.progressPercentage.toFixed(1)}%</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800">Management Fee</h3>
                <p className="text-2xl font-bold text-orange-600">1%</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Wallet Connect, Get Test Tokens */}
          <div className="lg:col-span-1 space-y-6">
            <WalletConnect />
            <GetTestTokens />
          </div>

          {/* Right: Investment/Redemption Functions */}
          <div className="lg:col-span-2">
            {!isConnected ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">Start Investing</h2>
                <div className="text-center py-8">
                  <p className="text-gray-600">Please connect your wallet to start investing</p>
                </div>
              </div>
            ) : !isInitialized ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">Fund Status</h2>
                <div className="text-center py-8">
                  <p className="text-gray-600">Fund not initialized yet, please try again later</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md">
                {/* Tabs */}
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
                      Investment
                    </button>
                    <button
                      onClick={() => setActiveTab('redemption')}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'redemption'
                          ? 'border-red-500 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Redemption
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
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

        {/* Footer Information */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Contract Address: MockFund - 0x9fFB513271065CFfE4Fda7DA3E610Df629101F27</p>
          <p className="mt-2">
            <a 
              href="https://sepolia.etherscan.io/address/0x9fFB513271065CFfE4Fda7DA3E610Df629101F27" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View Contract on Etherscan
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
