'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { metaMask } from 'wagmi/connectors';
import { useState, useEffect } from 'react';

export default function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect({ connector: metaMask() });
    } catch (err) {
      console.error('连接钱包失败:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  // 防止水合错误，在客户端挂载前显示加载状态
  if (!mounted) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">加载中...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          已连接: {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          断开连接
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleConnect}
        disabled={isPending || isConnecting}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending || isConnecting ? '连接中...' : '连接钱包'}
      </button>
      {error && (
        <p className="text-xs text-red-500 max-w-xs">
          连接失败: {error.message}
        </p>
      )}
    </div>
  );
}