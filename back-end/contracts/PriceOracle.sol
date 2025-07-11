// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @dev Use Sepolia Chainlink real price oracles to get real-time prices
 */
contract PriceOracle is Ownable {
    
    // Mapping from token address to Chainlink price oracle
    mapping(address => AggregatorV3Interface) public priceFeeds;
    
    // Chainlink price oracle addresses on Sepolia testnet
    mapping(string => address) public sepoliaPriceFeeds;
    
    // Price validity period (seconds)
    uint256 public constant PRICE_VALIDITY_PERIOD = 3600; // 1 hour
    
    // Events
    event PriceFeedUpdated(address indexed token, address indexed priceFeed);
    event PriceRetrieved(address indexed token, int256 price, uint256 timestamp);
    
    constructor(address _initialOwner) Ownable(_initialOwner) {
        // Initialize Sepolia testnet price oracle addresses
        _initializeSepoliaPriceFeeds();
    }
    
    /**
     * @dev Initialize Sepolia testnet price oracle addresses
     */
    function _initializeSepoliaPriceFeeds() internal {
        // Chainlink price oracle addresses on Sepolia testnet
        sepoliaPriceFeeds["ETH"] = 0x694AA1769357215DE4FAC081bf1f309aDC325306; // ETH/USD
        sepoliaPriceFeeds["BTC"] = 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43; // BTC/USD
        sepoliaPriceFeeds["LINK"] = 0xc59E3633BAAC79493d908e63626716e204A45EdF; // LINK/USD
        sepoliaPriceFeeds["USDC"] = 0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E; // USDC/USD
        sepoliaPriceFeeds["DAI"] = 0x14866185B1962B63C3Ea9E03Bc1da838bab34C19;  // DAI/USD

    }
    
    /**
     * @dev Set Chainlink price oracle for token
     * @param _token Token address
     * @param _priceFeed Chainlink price oracle address
     */
    function setPriceFeed(address _token, address _priceFeed) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(_priceFeed != address(0), "Invalid price feed address");
        
        priceFeeds[_token] = AggregatorV3Interface(_priceFeed);
        emit PriceFeedUpdated(_token, _priceFeed);
    }
    
    /**
     * @dev Set token using predefined Sepolia price oracle
     * @param _token Token address
     * @param _symbol Token symbol (ETH, BTC, LINK, USDC, DAI)
     */
    function setPriceFeedBySymbol(address _token, string memory _symbol) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        
        address priceFeedAddress = sepoliaPriceFeeds[_symbol];
        require(priceFeedAddress != address(0), "Price feed not found for symbol");
        
        priceFeeds[_token] = AggregatorV3Interface(priceFeedAddress);
        emit PriceFeedUpdated(_token, priceFeedAddress);
    }
    
    /**
     * @dev Get latest price of token (in USD)
     * @param _token Token address
     * @return price Price (8 decimals)
     * @return timestamp Price update timestamp
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
     * @dev Batch get prices of multiple tokens
     * @param _tokens Array of token addresses
     * @return prices Array of prices
     * @return timestamps Array of timestamps
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
     * @dev Calculate token value (in USDC)
     * @param _token Token address
     * @param _amount Token amount
     * @return usdcValue USDC value
     */
    function calculateTokenValue(address _token, uint256 _amount) external view returns (uint256 usdcValue) {
        (int256 price, ) = this.getLatestPrice(_token);
        require(price > 0, "Invalid price");
        
        // Chainlink price is usually 8 decimals, convert to 6 decimals (USDC format)
        // Formula: (amount * price) / (10^8) = USDC value
        return (_amount * uint256(price)) / (10 ** 8);
    }
    
    /**
     * @dev Check if price oracle is set
     * @param _token Token address
     * @return Whether it is set
     */
    function isPriceFeedSet(address _token) external view returns (bool) {
        return address(priceFeeds[_token]) != address(0);
    }
    
    /**
     * @dev Get decimal places of price oracle
     * @param _token Token address
     * @return Decimal places
     */
    function getPriceFeedDecimals(address _token) external view returns (uint8) {
        AggregatorV3Interface priceFeed = priceFeeds[_token];
        require(address(priceFeed) != address(0), "Price feed not set for token");
        return priceFeed.decimals();
    }
    
    /**
     * @dev Get Sepolia price oracle address
     * @param _symbol Token symbol
     * @return Price oracle address
     */
    function getSepoliaPriceFeedAddress(string memory _symbol) external view returns (address) {
        return sepoliaPriceFeeds[_symbol];
    }
    
    /**
     * @dev Get detailed information of price oracle
     * @param _token Token address
     * @return priceFeedAddress Price oracle address
     * @return decimals Decimal places
     * @return description Description
     * @return version Version
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