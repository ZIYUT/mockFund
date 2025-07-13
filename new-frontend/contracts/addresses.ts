// Sepolia 测试网合约地址
export const CONTRACT_ADDRESSES = {
  // 主要合约
  MockFund: "0x9fFB513271065CFfE4Fda7DA3E610Df629101F27",
  FundShareToken: "0xD3eC59d9B6bE6A97D47D5349ba7792c0b0C3594f",
  
  // 代币合约
  MockUSDC: "0xA51E19C25DBb5B1F41cE70bDdA89A65284e8EfF1",
  
  // 服务合约
  ChainlinkPriceOracle: "0x95900F1E3FC7e5cbBa11239DAFC5295e28C21fB5",
  UniswapIntegration: "0x41A7F830320aBAab995E26BEFc17Ee72BdD7d216",
  
  // 各个代币地址
  WBTC: "0xfd3f3e529BD01F290eEb89155Cb45EE8a479e37a",
  WETH: "0xF7f9AD8dC553395e0dE1a019563DeA173401EE77",
  LINK: "0xACB4654f9C0ff26830C55d49ec62f2Cf05503cc3",
  DAI: "0x0908A7CD457d594526c8304ef6c66E538073A421",
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
  rpcUrls: ["https://eth-sepolia.g.alchemy.com/v2/lK6-zMgLZpagSlTIbSg5G331IBJrfCQL"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

// 更新地址的函数
export function updateAddresses(deploymentInfo: any) {
  CONTRACT_ADDRESSES.MockFund = deploymentInfo.contracts.MockFund;
  CONTRACT_ADDRESSES.FundShareToken = deploymentInfo.contracts.FundShareToken;
  CONTRACT_ADDRESSES.MockUSDC = deploymentInfo.contracts.MockUSDC;
  CONTRACT_ADDRESSES.ChainlinkPriceOracle = deploymentInfo.contracts.ChainlinkPriceOracle;
  CONTRACT_ADDRESSES.UniswapIntegration = deploymentInfo.contracts.UniswapIntegration;
  
  CONTRACT_ADDRESSES.WBTC = deploymentInfo.tokens.WBTC;
  CONTRACT_ADDRESSES.WETH = deploymentInfo.tokens.WETH;
  CONTRACT_ADDRESSES.LINK = deploymentInfo.tokens.LINK;
  CONTRACT_ADDRESSES.DAI = deploymentInfo.tokens.DAI;
}