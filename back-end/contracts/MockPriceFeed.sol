// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title MockPriceFeed
 * @dev Mock price feed for testing purposes
 */
contract MockPriceFeed is AggregatorV3Interface {
    int256 private _price;
    uint8 private _decimals;
    string private _description;
    uint256 private _version;
    
    constructor(
        int256 initialPrice,
        uint8 decimalsValue,
        string memory descriptionValue
    ) {
        _price = initialPrice;
        _decimals = decimalsValue;
        _description = descriptionValue;
        _version = 1;
    }
    
    function decimals() external view override returns (uint8) {
        return _decimals;
    }
    
    function description() external view override returns (string memory) {
        return _description;
    }
    
    function version() external view override returns (uint256) {
        return _version;
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
        return (
            _roundId,
            _price,
            block.timestamp,
            block.timestamp,
            _roundId
        );
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
            1,
            _price,
            block.timestamp,
            block.timestamp,
            1
        );
    }
    
    // Admin function to update price
    function updatePrice(int256 newPrice) external {
        _price = newPrice;
    }
}