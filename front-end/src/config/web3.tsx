'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { sepolia, hardhat } from 'viem/chains';
import { createConfig } from 'wagmi';
import { SUPPORTED_NETWORKS, NETWORK_ID } from '../contracts/addresses';

// 配置支持的链
const chains = [
  // Sepolia测试网
  sepolia,
  // 本地开发网络
  hardhat
];

// 创建wagmi配置
export const config = createConfig({
  chains,
  transports: {
    // 为每个链配置RPC
    [sepolia.id]: http(SUPPORTED_NETWORKS[NETWORK_ID].rpcUrl),
    [hardhat.id]: http(SUPPORTED_NETWORKS[31337].rpcUrl),
  },
});

// RainbowKit配置
export const rainbowConfig = {
  appName: 'Mock Fund DApp',
  projectId: '01ab2c3d4e5f6g7h8i9j0k1l2m3n4o5p', // 使用一个示例项目ID
};

// 导出支持的链
export { chains };