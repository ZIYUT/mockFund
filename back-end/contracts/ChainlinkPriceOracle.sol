// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title ChainlinkPriceOracle
 * @dev 使用 Chainlink 真实价格预言机获取代币价格
 */
contract ChainlinkPriceOracle is Ownable {
    
    // 代币地址到 Chainlink 价格预言机的映射
    mapping(address => address) public priceFeeds;
    
    // 代币符号到代币地址的映射
    mapping(string => address) public tokenBySymbol;
    
    // 事件
    event PriceFeedSet(address indexed token, address indexed priceFeed, string symbol);
    event PriceUpdated(address indexed token, int256 price, uint256 timestamp);
    
    constructor(address _initialOwner) Ownable(_initialOwner) {}
    
    /**
     * @dev 设置代币的价格预言机
     * @param _token 代币地址
     * @param _priceFeed Chainlink 价格预言机地址
     * @param _symbol 代币符号
     */
    function setPriceFeed(
        address _token,
        address _priceFeed,
        string memory _symbol
    ) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(_priceFeed != address(0), "Invalid price feed address");
        
        priceFeeds[_token] = _priceFeed;
        tokenBySymbol[_symbol] = _token;
        
        emit PriceFeedSet(_token, _priceFeed, _symbol);
    }
    
    /**
     * @dev 批量设置价格预言机
     * @param _tokens 代币地址数组
     * @param _priceFeeds 价格预言机地址数组
     * @param _symbols 代币符号数组
     */
    function batchSetPriceFeeds(
        address[] calldata _tokens,
        address[] calldata _priceFeeds,
        string[] calldata _symbols
    ) external onlyOwner {
        require(_tokens.length == _priceFeeds.length, "Arrays length mismatch");
        require(_tokens.length == _symbols.length, "Symbols array length mismatch");
        
        for (uint256 i = 0; i < _tokens.length; i++) {
            this.setPriceFeed(_tokens[i], _priceFeeds[i], _symbols[i]);
        }
    }
    
    /**
     * @dev 获取代币的最新价格
     * @param _token 代币地址
     * @return price 价格（8位小数）
     * @return timestamp 时间戳
     */
    function getLatestPrice(address _token) external view returns (int256 price, uint256 timestamp) {
        address priceFeed = priceFeeds[_token];
        require(priceFeed != address(0), "Price feed not found for token");
        
        AggregatorV3Interface aggregator = AggregatorV3Interface(priceFeed);
        (, price, , timestamp, ) = aggregator.latestRoundData();
        
        require(price > 0, "Invalid price");
        require(timestamp > 0, "Invalid timestamp");
        // emit PriceUpdated(_token, price, timestamp); // 不能在view函数中emit
    }
    
    /**
     * @dev 通过符号获取代币价格
     * @param _symbol 代币符号
     * @return price 价格
     * @return timestamp 时间戳
     */
    function getLatestPriceBySymbol(string memory _symbol) external view returns (int256 price, uint256 timestamp) {
        address token = tokenBySymbol[_symbol];
        require(token != address(0), "Token not found for symbol");
        
        return this.getLatestPrice(token);
    }
    
    /**
     * @dev 获取价格预言机信息
     * @param _token 代币地址
     * @return priceFeed 价格预言机地址
     * @return decimals 小数位数
     * @return description 描述
     */
    function getPriceFeedInfo(address _token) external view returns (
        address priceFeed,
        uint8 decimals,
        string memory description
    ) {
        priceFeed = priceFeeds[_token];
        require(priceFeed != address(0), "Price feed not found");
        
        AggregatorV3Interface aggregator = AggregatorV3Interface(priceFeed);
        decimals = aggregator.decimals();
        description = aggregator.description();
    }
    
    /**
     * @dev 检查价格是否过时
     * @param _token 代币地址
     * @param _maxAge 最大年龄（秒）
     * @return isStale 是否过时
     */
    function isPriceStale(address _token, uint256 _maxAge) external view returns (bool isStale) {
        address priceFeed = priceFeeds[_token];
        require(priceFeed != address(0), "Price feed not found");
        
        AggregatorV3Interface aggregator = AggregatorV3Interface(priceFeed);
        (, , , uint256 timestamp, ) = aggregator.latestRoundData();
        
        isStale = (block.timestamp - timestamp) > _maxAge;
    }
    
    /**
     * @dev 获取多个代币的价格
     * @param _tokens 代币地址数组
     * @return prices 价格数组
     * @return timestamps 时间戳数组
     */
    function getMultiplePrices(address[] calldata _tokens) external view returns (
        int256[] memory prices,
        uint256[] memory timestamps
    ) {
        prices = new int256[](_tokens.length);
        timestamps = new uint256[](_tokens.length);
        
        for (uint256 i = 0; i < _tokens.length; i++) {
            (prices[i], timestamps[i]) = this.getLatestPrice(_tokens[i]);
        }
    }
} 