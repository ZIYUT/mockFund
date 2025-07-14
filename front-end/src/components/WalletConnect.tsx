'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected, metaMask } from 'wagmi/connectors';

export default function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = (connector: any) => {
    connect({ connector });
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">钱包连接</h2>
      
      {isConnected ? (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">已连接</h3>
            <p className="text-sm text-green-700 font-mono break-all">{address}</p>
          </div>
          
          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold"
          >
            断开连接
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">未连接</h3>
            <p className="text-sm text-yellow-700">请选择钱包进行连接</p>
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
              {isPending ? '连接中...' : '连接 MetaMask'}
            </button>
            
            <button
              onClick={() => handleConnect(injected())}
              disabled={isPending}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isPending ? '连接中...' : '连接其他钱包'}
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>• 请确保您的钱包已连接到 Sepolia 测试网</p>
            <p>• 需要 Sepolia ETH 用于支付交易费用</p>
            <p>• 可以从 <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Sepolia Faucet</a> 获取测试币</p>
          </div>
        </div>
      )}
    </div>
  );
}