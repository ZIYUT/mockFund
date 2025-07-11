// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title ChainlinkPriceOracle
 * @dev Uses Chainlink real price oracles to get token prices
 */
contract ChainlinkPriceOracle is Ownable {
    
    // Mapping from token address to Chainlink price oracle
    mapping(address => address) public priceFeeds;
    
    // Mapping from token symbol to token address
    mapping(string => address) public tokenBySymbol;
    
    // Events
    event PriceFeedSet(address indexed token, address indexed priceFeed, string symbol);
    event PriceUpdated(address indexed token, int256 price, uint256 timestamp);
    
    constructor(address _initialOwner) Ownable(_initialOwner) {}
    
    /**
     * @dev Set price oracle for a token
     * @param _token Token address
     * @param _priceFeed Chainlink price oracle address
     * @param _symbol Token symbol
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
     * @dev Batch set price oracles
     * @param _tokens Array of token addresses
     * @param _priceFeeds Array of price oracle addresses
     * @param _symbols Array of token symbols
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
     * @dev Get latest price of a token
     * @param _token Token address
     * @return price Price (8 decimals)
     * @return timestamp Timestamp
     */
    function getLatestPrice(address _token) external view returns (int256 price, uint256 timestamp) {
        address priceFeed = priceFeeds[_token];
        require(priceFeed != address(0), "Price feed not found for token");
        
        AggregatorV3Interface aggregator = AggregatorV3Interface(priceFeed);
        (, price, , timestamp, ) = aggregator.latestRoundData();
        
        require(price > 0, "Invalid price");
        require(timestamp > 0, "Invalid timestamp");
        // emit PriceUpdated(_token, price, timestamp); // Cannot emit in view function
    }
    
    /**
     * @dev Get token price by symbol
     * @param _symbol Token symbol
     * @return price Price
     * @return timestamp Timestamp
     */
    function getLatestPriceBySymbol(string memory _symbol) external view returns (int256 price, uint256 timestamp) {
        address token = tokenBySymbol[_symbol];
        require(token != address(0), "Token not found for symbol");
        
        return this.getLatestPrice(token);
    }
    
    /**
     * @dev Get price oracle information
     * @param _token Token address
     * @return priceFeed Price oracle address
     * @return decimals Decimal places
     * @return description Description
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
     * @dev Check if price is stale
     * @param _token Token address
     * @param _maxAge Maximum age (seconds)
     * @return isStale Whether price is stale
     */
    function isPriceStale(address _token, uint256 _maxAge) external view returns (bool isStale) {
        address priceFeed = priceFeeds[_token];
        require(priceFeed != address(0), "Price feed not found");
        
        AggregatorV3Interface aggregator = AggregatorV3Interface(priceFeed);
        (, , , uint256 timestamp, ) = aggregator.latestRoundData();
        
        isStale = (block.timestamp - timestamp) > _maxAge;
    }
    
    /**
     * @dev Get prices of multiple tokens
     * @param _tokens Array of token addresses
     * @return prices Array of prices
     * @return timestamps Array of timestamps
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