import { createConfig, http } from 'wagmi';
import { hardhat, sepolia } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';

// 定义本地Hardhat网络
const hardhatLocal = {
  ...hardhat,
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
};

// 创建wagmi配置
export const config = createConfig({
  chains: [sepolia, hardhatLocal],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/lK6-zMgLZpagSlTIbSg5G331IBJrfCQL'),
    [hardhatLocal.id]: http('http://127.0.0.1:8545'),
  },
  ssr: true,
});

// 导出链配置
export { hardhatLocal, sepolia };

// 获取当前网络配置
export function getCurrentNetwork() {
  if (typeof window !== 'undefined') {
    // 客户端环境
    return sepolia; // 默认使用 Sepolia
  }
  return sepolia;
}

// 网络信息
export const NETWORK_INFO = {
  [sepolia.id]: {
    name: 'Sepolia Testnet',
    explorer: 'https://sepolia.etherscan.io',
    faucet: 'https://sepoliafaucet.com/',
  },
  [hardhatLocal.id]: {
    name: 'Hardhat Local',
    explorer: 'http://localhost:8545',
    faucet: null,
  },
};