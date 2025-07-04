// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPriceFeed
 * @dev Mock implementation of Chainlink AggregatorV3Interface for local development
 */
contract MockPriceFeed is AggregatorV3Interface, Ownable {
    
    struct RoundData {
        int256 answer;
        uint256 timestamp;
        uint80 roundId;
    }
    
    // Current round data
    RoundData private currentRound;
    
    // Contract metadata
    uint8 private _decimals;
    string private _description;
    uint256 private _version;
    
    // Events
    event PriceUpdated(int256 newPrice, uint256 timestamp, uint80 roundId);
    
    constructor(
        int256 _initialPrice,
        uint8 _priceDecimals,
        string memory _desc
    ) Ownable(msg.sender) {
        require(_initialPrice > 0, "Initial price must be positive");
        
        _decimals = _priceDecimals;
        _description = _desc;
        _version = 1;
        
        currentRound = RoundData({
            answer: _initialPrice,
            timestamp: block.timestamp,
            roundId: 1
        });
        
        emit PriceUpdated(_initialPrice, block.timestamp, 1);
    }
    
    /**
     * @dev Update the price (only owner can call this)
     * @param _newPrice New price to set
     */
    function updatePrice(int256 _newPrice) public onlyOwner {
        require(_newPrice > 0, "Price must be positive");
        
        currentRound.roundId += 1;
        currentRound.answer = _newPrice;
        currentRound.timestamp = block.timestamp;
        
        emit PriceUpdated(_newPrice, block.timestamp, currentRound.roundId);
    }
    
    /**
     * @dev Simulate price volatility by updating price with a percentage change
     * @param _percentageChange Percentage change in basis points (e.g., 500 = 5% increase, -300 = 3% decrease)
     */
    function simulatePriceChange(int256 _percentageChange) external onlyOwner {
        require(_percentageChange >= -9000, "Price change too negative"); // Max 90% decrease
        require(_percentageChange <= 10000, "Price change too positive"); // Max 100% increase
        
        int256 newPrice = currentRound.answer + (currentRound.answer * _percentageChange / 10000);
        require(newPrice > 0, "Resulting price must be positive");
        
        updatePrice(newPrice);
    }
    
    // AggregatorV3Interface implementation
    
    function decimals() external view override returns (uint8) {
        return _decimals;
    }
    
    function description() external view override returns (string memory) {
        return _description;
    }
    
    function version() external view override returns (uint256) {
        return _version;
    }
    
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            currentRound.roundId,
            currentRound.answer,
            currentRound.timestamp,
            currentRound.timestamp,
            currentRound.roundId
        );
    }
    
    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        // For simplicity, always return current round data
        // In a real implementation, you'd store historical data
        require(_roundId <= currentRound.roundId, "Round not available");
        
        return (
            currentRound.roundId,
            currentRound.answer,
            currentRound.timestamp,
            currentRound.timestamp,
            currentRound.roundId
        );
    }
    
    // Additional utility functions
    
    /**
     * @dev Get current price without full round data
     */
    function getCurrentPrice() external view returns (int256) {
        return currentRound.answer;
    }
    
    /**
     * @dev Get last update timestamp
     */
    function getLastUpdateTime() external view returns (uint256) {
        return currentRound.timestamp;
    }
    
    /**
     * @dev Check if price is fresh (updated within last hour)
     */
    function isPriceFresh() external view returns (bool) {
        return (block.timestamp - currentRound.timestamp) <= 3600; // 1 hour
    }
    
    /**
     * @dev Batch update multiple prices (for testing scenarios)
     * @param _prices Array of new prices
     * @param _intervals Array of time intervals between updates (in seconds)
     */
    function batchUpdatePrices(int256[] calldata _prices, uint256[] calldata _intervals) external onlyOwner {
        require(_prices.length == _intervals.length, "Arrays length mismatch");
        require(_prices.length > 0, "Empty arrays");
        
        uint256 currentTime = block.timestamp;
        
        for (uint256 i = 0; i < _prices.length; i++) {
            require(_prices[i] > 0, "Price must be positive");
            
            currentRound.roundId += 1;
            currentRound.answer = _prices[i];
            currentRound.timestamp = currentTime + _intervals[i];
            
            emit PriceUpdated(_prices[i], currentRound.timestamp, currentRound.roundId);
            
            currentTime = currentRound.timestamp;
        }
    }
}