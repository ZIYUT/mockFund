'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { sepolia, hardhat } from 'viem/chains';
import { SUPPORTED_NETWORKS, NETWORK_ID } from '../contracts/addresses';

// 配置支持的链
const chains = [sepolia, hardhat] as const;

// 使用getDefaultConfig创建配置
export const config = getDefaultConfig({
  appName: 'Mock Fund DApp',
  projectId: 'mock-fund-dapp-local', // 本地开发可以使用任意字符串
  chains,
  transports: {
    // 为每个链配置RPC
    [sepolia.id]: http(SUPPORTED_NETWORKS[NETWORK_ID].rpcUrl),
    [hardhat.id]: http(SUPPORTED_NETWORKS[31337].rpcUrl),
  },
  ssr: true, // 启用服务端渲染支持
});

// 导出支持的链
export { chains };