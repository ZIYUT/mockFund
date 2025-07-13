'use client';

import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config, chains } from '@/config/web3';

// 导入RainbowKit样式
import '@rainbow-me/rainbowkit/styles.css';

// 创建React Query客户端
const queryClient = new QueryClient();

interface Web3ProviderProps {
  children: React.ReactNode;
}

/**
 * Web3Provider组件
 * 提供Web3连接功能，包装整个应用
 */
export default function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={{
            lightMode: lightTheme(),
            darkMode: darkTheme(),
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}