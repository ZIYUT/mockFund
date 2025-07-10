// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @dev 使用 Sepolia Chainlink 真实价格预言机获取实时价格
 */
contract PriceOracle is Ownable {
    
    // 代币地址到 Chainlink 价格预言机的映射
    mapping(address => AggregatorV3Interface) public priceFeeds;
    
    // Sepolia 测试网上的 Chainlink 价格预言机地址
    mapping(string => address) public sepoliaPriceFeeds;
    
    // 价格有效期（秒）
    uint256 public constant PRICE_VALIDITY_PERIOD = 3600; // 1小时
    
    // 事件
    event PriceFeedUpdated(address indexed token, address indexed priceFeed);
    event PriceRetrieved(address indexed token, int256 price, uint256 timestamp);
    
    constructor(address _initialOwner) Ownable(_initialOwner) {
        // 初始化 Sepolia 测试网的价格预言机地址
        _initializeSepoliaPriceFeeds();
    }
    
    /**
     * @dev 初始化 Sepolia 测试网的价格预言机地址
     */
    function _initializeSepoliaPriceFeeds() internal {
        // Sepolia 测试网上的 Chainlink 价格预言机地址
        sepoliaPriceFeeds["ETH"] = 0x694AA1769357215DE4FAC081bf1f309aDC325306; // ETH/USD
        sepoliaPriceFeeds["BTC"] = 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43; // BTC/USD
        sepoliaPriceFeeds["LINK"] = 0xc59E3633BAAC79493d908e63626716e204A45EdF; // LINK/USD
        sepoliaPriceFeeds["USDC"] = 0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E; // USDC/USD
        sepoliaPriceFeeds["DAI"] = 0x14866185B1962B63C3Ea9E03Bc1da838bab34C19;  // DAI/USD

    }
    
    /**
     * @dev 设置代币的 Chainlink 价格预言机
     * @param _token 代币地址
     * @param _priceFeed Chainlink 价格预言机地址
     */
    function setPriceFeed(address _token, address _priceFeed) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(_priceFeed != address(0), "Invalid price feed address");
        
        priceFeeds[_token] = AggregatorV3Interface(_priceFeed);
        emit PriceFeedUpdated(_token, _priceFeed);
    }
    
    /**
     * @dev 使用预定义的 Sepolia 价格预言机设置代币
     * @param _token 代币地址
     * @param _symbol 代币符号 (ETH, BTC, LINK, USDC, DAI)
     */
    function setPriceFeedBySymbol(address _token, string memory _symbol) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        
        address priceFeedAddress = sepoliaPriceFeeds[_symbol];
        require(priceFeedAddress != address(0), "Price feed not found for symbol");
        
        priceFeeds[_token] = AggregatorV3Interface(priceFeedAddress);
        emit PriceFeedUpdated(_token, priceFeedAddress);
    }
    
    /**
     * @dev 获取代币的最新价格（以 USD 计价）
     * @param _token 代币地址
     * @return price 价格（8位小数）
     * @return timestamp 价格更新时间戳
     */
    function getLatestPrice(address _token) external view returns (int256 price, uint256 timestamp) {
        AggregatorV3Interface priceFeed = priceFeeds[_token];
        require(address(priceFeed) != address(0), "Price feed not set for token");
        
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        require(answer > 0, "Invalid price data");
        require(updatedAt > 0, "Price data not available");
        require(block.timestamp - updatedAt <= PRICE_VALIDITY_PERIOD, "Price data too old");
        require(answeredInRound >= roundId, "Stale price");
        
        return (answer, updatedAt);
    }
    
    /**
     * @dev 批量获取多个代币的价格
     * @param _tokens 代币地址数组
     * @return prices 价格数组
     * @return timestamps 时间戳数组
     */
    function getMultiplePrices(address[] calldata _tokens) 
        external 
        view 
        returns (int256[] memory prices, uint256[] memory timestamps) 
    {
        uint256 length = _tokens.length;
        prices = new int256[](length);
        timestamps = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            (prices[i], timestamps[i]) = this.getLatestPrice(_tokens[i]);
        }
    }
    
    /**
     * @dev 计算代币价值（以 USDC 计价）
     * @param _token 代币地址
     * @param _amount 代币数量
     * @return usdcValue USDC价值
     */
    function calculateTokenValue(address _token, uint256 _amount) external view returns (uint256 usdcValue) {
        (int256 price, ) = this.getLatestPrice(_token);
        require(price > 0, "Invalid price");
        
        // Chainlink 价格通常是 8 位小数，转换为 6 位小数（USDC 格式）
        // 公式：(amount * price) / (10^8) = USDC价值
        return (_amount * uint256(price)) / (10 ** 8);
    }
    
    /**
     * @dev 检查价格预言机是否已设置
     * @param _token 代币地址
     * @return 是否已设置
     */
    function isPriceFeedSet(address _token) external view returns (bool) {
        return address(priceFeeds[_token]) != address(0);
    }
    
    /**
     * @dev 获取价格预言机的小数位数
     * @param _token 代币地址
     * @return 小数位数
     */
    function getPriceFeedDecimals(address _token) external view returns (uint8) {
        AggregatorV3Interface priceFeed = priceFeeds[_token];
        require(address(priceFeed) != address(0), "Price feed not set for token");
        return priceFeed.decimals();
    }
    
    /**
     * @dev 获取 Sepolia 价格预言机地址
     * @param _symbol 代币符号
     * @return 价格预言机地址
     */
    function getSepoliaPriceFeedAddress(string memory _symbol) external view returns (address) {
        return sepoliaPriceFeeds[_symbol];
    }
    
    /**
     * @dev 获取价格预言机的详细信息
     * @param _token 代币地址
     * @return priceFeedAddress 价格预言机地址
     * @return decimals 小数位数
     * @return description 描述
     * @return version 版本
     */
    function getPriceFeedInfo(address _token) external view returns (
        address priceFeedAddress,
        uint8 decimals,
        string memory description,
        uint256 version
    ) {
        AggregatorV3Interface priceFeed = priceFeeds[_token];
        require(address(priceFeed) != address(0), "Price feed not set for token");
        
        return (
            address(priceFeed),
            priceFeed.decimals(),
            priceFeed.description(),
            priceFeed.version()
        );
    }
}