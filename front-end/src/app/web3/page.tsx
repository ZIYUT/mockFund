'use client';

import Link from 'next/link';
import ConnectionInfo from '@/components/ConnectionInfo';
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
                  <h1 className="text-2xl font-bold text-gray-900">MockFund Investment Platform</h1>
                  <p className="text-sm text-gray-600">Blockchain-based Smart Investment Fund</p>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Top Section - Portfolio Real-time Prices */}
            <div className="mb-8">
              <FundPortfolio />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Connection Info */}
              <div className="lg:col-span-1">
                <ConnectionInfo />
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
                <Link href="/" className="text-blue-500 hover:underline">Back to Home</Link>
                <Link href="/basic" className="text-blue-500 hover:underline">Basic Features</Link>
                <Link href="/simple" className="text-blue-500 hover:underline">Simple Test</Link>
              </div>
            </div>
          </main>
        </div>
  );
}