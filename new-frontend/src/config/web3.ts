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
});

// 导出链配置
export { hardhatLocal, sepolia };