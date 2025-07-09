// 本文件由 scripts/sync-addresses.js 自动生成，请勿手动修改
export const CONTRACT_ADDRESSES = {
  31337: {
    MOCK_FUND: '0x0B306BF915C4d645ff596e518fAf3F9669b97016',
    FUND_SHARE_TOKEN: '0x524F04724632eED237cbA3c37272e018b3A7967e',
    PRICE_ORACLE: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
    UNISWAP_INTEGRATION: '0x9A676e781A523b5d0C0e43731313A708CB607508',
    MOCK_USDC: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    MOCK_WETH: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    MOCK_WBTC: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    MOCK_LINK: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    MOCK_UNI: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    MOCK_DAI: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    TOKEN_FACTORY: '0x0165878A594ca255338adfa4d48449f69242Eb8F'
  },
  11155111: { // Sepolia
    MOCK_FUND: '0x9FFf9baC956Ad4B0cc7274DF771842FaB209Fc26',
    FUND_SHARE_TOKEN: '0xeC2C6B5bA66F7dC1D0bBdD0Fb0807d0359F7F9aa',
    PRICE_ORACLE: '0x973872d8a7BC25561192a3E5fB4Dc7394dea5Cc3',
    UNISWAP_INTEGRATION: '0x0B4e731b9C8d565b6AECb71F6e2f47AE833FF883',
    MOCK_USDC: '0x78F2e11D378ACb3B594F2810479977fB55A8F9a6',
    MOCK_WETH: '0x4818751B4565a089C674950E6824e5CB2ea4e2C8',
    MOCK_WBTC: '0x9f9F55D6e764c621B77354C04C7eA0E5e804B4bf',
    MOCK_LINK: '0x2358c713E3b69E0611fFC3d53Eae76f3B01CE2c0',
    MOCK_UNI: '0xa7f0F050571c8E7E2EED037fa450dFd6EB80B27f',
    MOCK_DAI: '0x5AB35D51A17644623382fBc5962f6A730CcD9cb0',
    TOKEN_FACTORY: '0x499eE1bc21482CCfac2c7210F598E69B3C562C42'
  }
} as const;

export function getContractAddress(contractName: keyof typeof CONTRACT_ADDRESSES[31337], chainId: number = 11155111): string {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) throw new Error('Unsupported chain ID: ' + chainId);
  return addresses[contractName];
}

// 支持的代币列表
export const SUPPORTED_TOKENS = {
  USDC: {
    symbol: 'USDC',
    name: 'Mock USD Coin',
    decimals: 6,
    address: '0x78F2e11D378ACb3B594F2810479977fB55A8F9a6' // Sepolia 地址
  },
  WETH: {
    symbol: 'WETH',
    name: 'Mock Wrapped Ether',
    decimals: 18,
    address: '0x4818751B4565a089C674950E6824e5CB2ea4e2C8' // Sepolia 地址
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Mock Wrapped Bitcoin',
    decimals: 8,
    address: '0x9f9F55D6e764c621B77354C04C7eA0E5e804B4bf' // Sepolia 地址
  },
  LINK: {
    symbol: 'LINK',
    name: 'Mock Chainlink Token',
    decimals: 18,
    address: '0x2358c713E3b69E0611fFC3d53Eae76f3B01CE2c0' // Sepolia 地址
  },
  UNI: {
    symbol: 'UNI',
    name: 'Mock Uniswap Token',
    decimals: 18,
    address: '0xa7f0F050571c8E7E2EED037fa450dFd6EB80B27f' // Sepolia 地址
  },
  DAI: {
    symbol: 'DAI',
    name: 'Mock Dai Stablecoin',
    decimals: 18,
    address: '0x5AB35D51A17644623382fBc5962f6A730CcD9cb0' // Sepolia 地址
  }
};
