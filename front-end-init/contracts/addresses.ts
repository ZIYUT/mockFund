// Sepolia 测试网合约地址
export const CONTRACT_ADDRESSES = {
  // 主要合约
  MockFund: "0xD1e3078E1c64D46583e39bbF2aF03e867f93fD7D",
  FundShareToken: "0xD81aeF72Ae7Ecf8cc7d1029a52e6882566c93136",
  
  // 代币合约
  MockUSDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
  MockTokens: "0x0000000000000000000000000000000000000000", // 需要部署后更新
  
  // 服务合约
  PriceOracle: "0x95900F1E3FC7e5cbBa11239DAFC5295e28C21fB5",
  MockUniswapIntegration: "0x41A7F830320aBAab995E26BEFc17Ee72BdD7d216",
  
  // 各个代币地址（从 MockTokens 合约获取）
  WBTC: "0x29f2D40B0605204364af54EC677bD022dA425d03",
  WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  LINK: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  DAI: "0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6",
};

// Sepolia 测试网 Chainlink 价格预言机地址
export const CHAINLINK_PRICE_FEEDS = {
  ETH: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD
  BTC: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", // BTC/USD
  LINK: "0xc59E3633BAAC79493d908e63626716e204A45EdF", // LINK/USD
  USDC: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E", // USDC/USD
  DAI: "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19",  // DAI/USD
};

// 投资组合配置
export const PORTFOLIO_CONFIG = {
  // 投资组合比例（基点，10000 = 100%）
  USDC: 5000,  // 50%
  WBTC: 1250,  // 12.5%
  WETH: 1250,  // 12.5%
  LINK: 1250,  // 12.5%
  DAI: 1250,   // 12.5%
  
  // 代币符号映射
  symbols: {
    WBTC: "WBTC",
    WETH: "WETH", 
    LINK: "LINK",
    DAI: "DAI",
    USDC: "USDC"
  },
  
  // 代币名称
  names: {
    WBTC: "Wrapped Bitcoin",
    WETH: "Wrapped Ether",
    LINK: "Chainlink",
    DAI: "Dai Stablecoin",
    USDC: "USD Coin"
  }
};

// 网络配置
export const NETWORK_CONFIG = {
  chainId: 11155111, // Sepolia
  chainName: "Sepolia Testnet",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "SEP",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia.infura.io/v3/YOUR-PROJECT-ID"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

// 更新地址的函数
export function updateAddresses(deploymentInfo: any) {
  CONTRACT_ADDRESSES.MockFund = deploymentInfo.contracts.MockFund;
  CONTRACT_ADDRESSES.FundShareToken = deploymentInfo.contracts.FundShareToken;
  CONTRACT_ADDRESSES.MockUSDC = deploymentInfo.contracts.MockUSDC;
  CONTRACT_ADDRESSES.MockTokens = deploymentInfo.contracts.MockTokens;
  CONTRACT_ADDRESSES.PriceOracle = deploymentInfo.contracts.PriceOracle;
  CONTRACT_ADDRESSES.MockUniswapIntegration = deploymentInfo.contracts.MockUniswapIntegration;
  
  CONTRACT_ADDRESSES.WBTC = deploymentInfo.tokens.WBTC;
  CONTRACT_ADDRESSES.WETH = deploymentInfo.tokens.WETH;
  CONTRACT_ADDRESSES.LINK = deploymentInfo.tokens.LINK;
  CONTRACT_ADDRESSES.DAI = deploymentInfo.tokens.DAI;
}