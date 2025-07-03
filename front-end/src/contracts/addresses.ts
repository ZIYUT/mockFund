// 合约地址配置文件
// 部署合约后，将合约地址更新到此文件
// 合约地址 - 示例地址，实际部署后需要更新
export const CONTRACT_ADDRESSES = {
  // 主要合约
  MOCK_FUND: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // 示例地址
  FUND_SHARE_TOKEN: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // 示例地址
  
  // 代币合约
  MOCK_USDC: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // 示例地址
  MOCK_WETH: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", // 示例地址
  MOCK_WBTC: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", // 示例地址
  MOCK_LINK: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", // 示例地址
  MOCK_UNI: "0x0165878A594ca255338adfa4d48449f69242Eb8F", // 示例地址
  
  // 工厂合约
  TOKEN_FACTORY: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853" // 示例地址
};

// 支持的网络配置
export const SUPPORTED_NETWORKS = {
  // Sepolia测试网
  11155111: {
    name: "Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // 公共Infura Key，仅用于演示
    blockExplorer: "https://sepolia.etherscan.io",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18
    }
  },
  // 本地开发网络 (Hardhat)
  31337: {
    name: "Hardhat",
    rpcUrl: "http://127.0.0.1:8545",
    nativeCurrency: {
      name: "Hardhat Ether",
      symbol: "ETH",
      decimals: 18
    }
  }
};