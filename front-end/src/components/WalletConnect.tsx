'use client';

import { useAccount, useConnect, useDisconnect, useContractRead } from 'wagmi';
import { injected, metaMask } from 'wagmi/connectors';
import { CONTRACT_ADDRESSES } from '../../contracts/addresses';
import MockFundABI from '@/contracts/abis/MockFund.json';
import { useState, useEffect } from 'react';

export default function WalletConnect() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Test contract calls
  const { data: isInitialized, error: initError, isLoading: initLoading } = useContractRead({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'isInitialized',
    query: {
      refetchInterval: 5000,
    },
  });

  // Test other functions
  const { data: nav, error: navError } = useContractRead({
    address: CONTRACT_ADDRESSES.MockFund as `0x${string}`,
    abi: MockFundABI.abi,
    functionName: 'calculateNAV',
    enabled: isInitialized as boolean,
  });

  const handleConnect = (connector: unknown) => {
    connect({ connector });
  };

  const handleDisconnect = () => {
    disconnect();
  };

  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Wallet Connection</h2>
        <div className="text-center py-8">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Wallet Connection</h2>
      
      {isConnected ? (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Connected</h3>
            <p className="text-sm text-green-700 font-mono break-all">{address}</p>
          </div>
          
          {/* Debug Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Connection Details</h4>
            <div className="space-y-2 text-sm">
              <p>Wallet Status: {isConnected ? 'Connected' : 'Not Connected'}</p>
              <p>Wallet Address: {address || 'None'}</p>
              <p>Network ID: {chainId} {chainId === 11155111 ? '✓ Sepolia' : '✗ Wrong Network'}</p>
              <p>MockFund Contract: {CONTRACT_ADDRESSES.MockFund}</p>
            </div>
            
            <div className="mt-4">
              <h5 className="font-semibold text-gray-700">Contract Test Results:</h5>
              <div className="space-y-1 text-sm">
                <p>isInitialized Loading: {initLoading ? 'Yes' : 'No'}</p>
                <p>isInitialized Result: {isInitialized ? 'Initialized' : 'Not Initialized'}</p>
                <p>isInitialized Error: {initError ? initError.message : 'None'}</p>
                <p>NAV Result: {nav ? nav.toString() : 'None'}</p>
                <p>NAV Error: {navError ? navError.message : 'None'}</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Not Connected</h3>
            <p className="text-sm text-yellow-700">Please select a wallet to connect</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => handleConnect(metaMask())}
              disabled={isPending}
              className="w-full px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.49 4.27c-.32-.73-.84-1.31-1.47-1.69L12.05.5c-.73-.32-1.54-.32-2.27 0L3.98 2.58c-.63.38-1.15.96-1.47 1.69L.5 12c-.32.73-.32 1.54 0 2.27l1.01 7.73c.32.73.84 1.31 1.47 1.69l5.8 2.08c.73.32 1.54.32 2.27 0l5.8-2.08c.63-.38 1.15-.96 1.47-1.69l1.01-7.73c.32-.73.32-1.54 0-2.27L21.49 4.27zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
              </svg>
              {isPending ? 'Connecting...' : 'Connect MetaMask'}
            </button>
            
            <button
              onClick={() => handleConnect(injected())}
              disabled={isPending}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isPending ? 'Connecting...' : 'Connect Other Wallet'}
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>• Please ensure your wallet is connected to Sepolia testnet</p>
            <p>• Need Sepolia ETH for transaction fees</p>
            <p>• Get test tokens from <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Sepolia Faucet</a></p>
          </div>
        </div>
      )}
    </div>
  );
}