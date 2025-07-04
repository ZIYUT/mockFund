// 合约地址配置文件
// 部署合约后，将合约地址更新到此文件
// 合约地址 - Sepolia 测试网已部署地址
export const CONTRACT_ADDRESSES = {
  // 主要合约 - 本地 Hardhat 网络地址
  MOCK_FUND: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82", // Hardhat 本地部署地址
  FUND_SHARE_TOKEN: "0x32467b43BFa67273FC7dDda0999Ee9A12F2AaA08", // Hardhat 本地部署地址
  
  // 新增合约 - 增强功能
  PRICE_ORACLE: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // 价格预言机合约
  UNISWAP_INTEGRATION: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e", // Uniswap 集成合约
  
  // 代币合约 - 本地 Hardhat 网络地址
  MOCK_USDC: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Hardhat 本地部署地址
  MOCK_WETH: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // Hardhat 本地部署地址
  MOCK_WBTC: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Hardhat 本地部署地址
  MOCK_LINK: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", // Hardhat 本地部署地址
  MOCK_UNI: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", // Hardhat 本地部署地址
  MOCK_DAI: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", // Hardhat 本地部署地址
  
  // 工厂合约 - 本地 Hardhat 网络地址
  TOKEN_FACTORY: "0x0165878A594ca255338adfa4d48449f69242Eb8F" // Hardhat 本地部署地址
};

// 当前使用的网络ID (Hardhat 本地网络)
export const NETWORK_ID = 31337;

// 支持的网络配置
export const SUPPORTED_NETWORKS = {
  [NETWORK_ID]: {
    name: 'Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    chainId: NETWORK_ID,
    blockExplorer: 'https://sepolia.etherscan.io',
  },
  31337: {
    name: 'Hardhat',
    rpcUrl: 'http://127.0.0.1:8545',
    chainId: 31337,
    blockExplorer: 'http://localhost:8545',
  },
};