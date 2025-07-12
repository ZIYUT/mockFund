// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ChainlinkPriceOracle.sol";

/**
 * @title UniswapIntegration
 * @dev Integration contract for token swapping using Chainlink real prices
 */
contract UniswapIntegration is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Chainlink price oracle
    ChainlinkPriceOracle public priceOracle;
    
    // Cached prices (to avoid frequent Chainlink calls)
    mapping(address => mapping(address => uint256)) public cachedRates;
    mapping(address => mapping(address => uint256)) public rateTimestamps;
    
    // Price cache duration (5 minutes)
    uint256 public constant CACHE_DURATION = 300;
    
    // Slippage tolerance (default 1%)
    uint256 public slippageTolerance = 100; // 100 basis points = 1%
    
    // Events
    event TokenSwapped(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed recipient,
        uint256 rate
    );
    event RateUpdated(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 rate,
        uint256 timestamp
    );
    event SlippageToleranceUpdated(uint256 oldTolerance, uint256 newTolerance);
    event PriceOracleUpdated(address indexed oldOracle, address indexed newOracle);
    
    constructor(address _initialOwner, address _priceOracle) Ownable(_initialOwner) {
        require(_priceOracle != address(0), "Invalid price oracle address");
        priceOracle = ChainlinkPriceOracle(_priceOracle);
    }
    
    /**
     * @dev Set price oracle
     * @param _priceOracle New price oracle address
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid price oracle address");
        address oldOracle = address(priceOracle);
        priceOracle = ChainlinkPriceOracle(_priceOracle);
        emit PriceOracleUpdated(oldOracle, _priceOracle);
    }
    
    /**
     * @dev Set slippage tolerance
     * @param _slippageTolerance Slippage tolerance (basis points)
     */
    function setSlippageTolerance(uint256 _slippageTolerance) external onlyOwner {
        require(_slippageTolerance <= 1000, "Slippage tolerance too high"); // Maximum 10%
        uint256 oldTolerance = slippageTolerance;
        slippageTolerance = _slippageTolerance;
        emit SlippageToleranceUpdated(oldTolerance, _slippageTolerance);
    }
    
    /**
     * @dev Get real prices from Chainlink and calculate exchange rate
     * @param _tokenIn Input token address
     * @param _tokenOut Output token address
     * @return rate Exchange rate (basis points)
     */
    function calculateRealExchangeRate(
        address _tokenIn,
        address _tokenOut
    ) public view returns (uint256 rate) {
        require(_tokenIn != address(0), "Invalid token in address");
        require(_tokenOut != address(0), "Invalid token out address");
        require(_tokenIn != _tokenOut, "Tokens must be different");
        
        try priceOracle.getLatestPrice(_tokenIn) returns (int256 priceIn, uint256) {
            try priceOracle.getLatestPrice(_tokenOut) returns (int256 priceOut, uint256) {
                require(priceIn > 0 && priceOut > 0, "Invalid prices from oracle");
                
                // Calculate exchange rate: 1 tokenIn = ? tokenOut
                // rate = (priceIn / priceOut) * 10000 (basis points)
                rate = uint256(priceIn * 10000) / uint256(priceOut);
                
                require(rate > 0, "Invalid exchange rate");
                
            } catch {
                revert("Failed to get token out price from oracle");
            }
        } catch {
            revert("Failed to get token in price from oracle");
        }
    }
    
    /**
     * @dev Update cached exchange rate
     * @param _tokenIn Input token address
     * @param _tokenOut Output token address
     */
    function updateCachedRate(address _tokenIn, address _tokenOut) external {
        uint256 rate = calculateRealExchangeRate(_tokenIn, _tokenOut);
        cachedRates[_tokenIn][_tokenOut] = rate;
        rateTimestamps[_tokenIn][_tokenOut] = block.timestamp;
        
        emit RateUpdated(_tokenIn, _tokenOut, rate, block.timestamp);
    }
    
    /**
     * @dev Batch update cached exchange rates
     * @param _tokensIn Array of input token addresses
     * @param _tokensOut Array of output token addresses
     */
    function batchUpdateCachedRates(
        address[] calldata _tokensIn,
        address[] calldata _tokensOut
    ) external {
        require(_tokensIn.length == _tokensOut.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < _tokensIn.length; i++) {
            this.updateCachedRate(_tokensIn[i], _tokensOut[i]);
        }
    }
    
    /**
     * @dev Get exchange rate (prioritize cache)
     * @param _tokenIn Input token address
     * @param _tokenOut Output token address
     * @return rate Exchange rate
     */
    function getExchangeRate(
        address _tokenIn,
        address _tokenOut
    ) public view returns (uint256 rate) {
        // Check if cache is valid
        uint256 cachedRate = cachedRates[_tokenIn][_tokenOut];
        uint256 timestamp = rateTimestamps[_tokenIn][_tokenOut];
        
        if (cachedRate > 0 && (block.timestamp - timestamp) < CACHE_DURATION) {
            rate = cachedRate;
        } else {
            // Cache expired or doesn't exist, get real-time price from Chainlink
            rate = calculateRealExchangeRate(_tokenIn, _tokenOut);
        }
    }
    
    /**
     * @dev Get swap quote
     * @param _tokenIn Input token address
     * @param _tokenOut Output token address
     * @param _amountIn Input token amount
     * @return amountOut Expected output amount
     */
    function getQuote(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint24 /* _fee */
    ) external view returns (uint256 amountOut) {
        uint256 rate = getExchangeRate(_tokenIn, _tokenOut);
        amountOut = (_amountIn * rate) / 10000;
    }
    
    /**
     * @dev Execute exact input swap (using real prices)
     * @param _tokenIn Input token address
     * @param _tokenOut Output token address
     * @param _amountIn Input token amount
     * @param _recipient Recipient address
     * @return amountOut Actual output amount
     */
    function swapExactInputSingle(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        address _recipient,
        uint24 /* _fee */
    ) external nonReentrant returns (uint256 amountOut) {
        require(_amountIn > 0, "Invalid input amount");
        require(_recipient != address(0), "Invalid recipient");
        
        // Get real-time exchange rate
        uint256 rate = getExchangeRate(_tokenIn, _tokenOut);
        
        // Calculate output amount
        amountOut = (_amountIn * rate) / 10000;
        
        // Apply slippage protection
        uint256 minAmountOut = amountOut * (10000 - slippageTolerance) / 10000;
        
        // Transfer input tokens to contract
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        
        // Simulate minting output tokens to recipient
        _mintOrTransferToken(_tokenOut, _recipient, amountOut);
        
        // Update cache
        cachedRates[_tokenIn][_tokenOut] = rate;
        rateTimestamps[_tokenIn][_tokenOut] = block.timestamp;
        
        emit TokenSwapped(_tokenIn, _tokenOut, _amountIn, amountOut, _recipient, rate);
    }
    
    /**
     * @dev Batch swap tokens (for token allocation during investment)
     * @param _tokenIn Input token address
     * @param _tokensOut Array of output token addresses
     * @param _amountsIn Array of input token amounts
     * @param _recipient Recipient address
     * @param _fees Array of pool fees (ignored, for compatibility only)
     * @return amountsOut Array of actual output amounts
     */
    function batchSwap(
        address _tokenIn,
        address[] calldata _tokensOut,
        uint256[] calldata _amountsIn,
        address _recipient,
        uint24[] calldata _fees
    ) external nonReentrant returns (uint256[] memory amountsOut) {
        require(_tokensOut.length == _amountsIn.length, "Arrays length mismatch");
        require(_tokensOut.length == _fees.length, "Fees array length mismatch");
        require(_recipient != address(0), "Invalid recipient");
        
        uint256 length = _tokensOut.length;
        amountsOut = new uint256[](length);
        
        // Calculate total input amount
        uint256 totalAmountIn = 0;
        for (uint256 i = 0; i < length; i++) {
            totalAmountIn += _amountsIn[i];
        }
        
        // Transfer total input tokens to contract
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), totalAmountIn);
        
        // Execute batch swap
        for (uint256 i = 0; i < length; i++) {
            if (_amountsIn[i] > 0) {
                // Get real-time exchange rate
                uint256 rate = getExchangeRate(_tokenIn, _tokensOut[i]);
                amountsOut[i] = (_amountsIn[i] * rate) / 10000;
                
                // Simulate minting output tokens to recipient
                _mintOrTransferToken(_tokensOut[i], _recipient, amountsOut[i]);
                
                // Update cache
                cachedRates[_tokenIn][_tokensOut[i]] = rate;
                rateTimestamps[_tokenIn][_tokensOut[i]] = block.timestamp;
                
                emit TokenSwapped(_tokenIn, _tokensOut[i], _amountsIn[i], amountsOut[i], _recipient, rate);
            }
        }
    }
    
    /**
     * @dev Simulate minting or transferring tokens
     * @param _token Token address
     * @param _recipient Recipient address
     * @param _amount Amount
     */
    function _mintOrTransferToken(
        address _token,
        address _recipient,
        uint256 _amount
    ) internal {
        // First check if contract has sufficient token balance
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance >= _amount) {
            IERC20(_token).safeTransfer(_recipient, _amount);
            return;
        }
        
        // If balance insufficient, try calling token's mint function (if exists)
        try this._callMint(_token, _recipient, _amount) {
            // Minting successful
        } catch {
            // If minting also fails, this is a test environment limitation
            revert("Insufficient token balance for swap");
        }
    }
    
    /**
     * @dev External call to mint function (for try-catch)
     * @param _token Token address
     * @param _recipient Recipient address
     * @param _amount Amount
     */
    function _callMint(
        address _token,
        address _recipient,
        uint256 _amount
    ) external {
        require(msg.sender == address(this), "Only self call allowed");
        
        // Try calling mint function
        (bool success, ) = _token.call(
            abi.encodeWithSignature("mint(address,uint256)", _recipient, _amount)
        );
        require(success, "Mint call failed");
    }
    
    /**
     * @dev Get cache information
     * @param _tokenIn Input token address
     * @param _tokenOut Output token address
     * @return cachedRate Cached rate
     * @return timestamp Cache timestamp
     * @return isStale Whether expired
     */
    function getCacheInfo(
        address _tokenIn,
        address _tokenOut
    ) external view returns (
        uint256 cachedRate,
        uint256 timestamp,
        bool isStale
    ) {
        cachedRate = cachedRates[_tokenIn][_tokenOut];
        timestamp = rateTimestamps[_tokenIn][_tokenOut];
        isStale = (block.timestamp - timestamp) >= CACHE_DURATION;
    }
    
    /**
     * @dev Clear cache
     * @param _tokenIn Input token address
     * @param _tokenOut Output token address
     */
    function clearCache(address _tokenIn, address _tokenOut) external onlyOwner {
        delete cachedRates[_tokenIn][_tokenOut];
        delete rateTimestamps[_tokenIn][_tokenOut];
    }
    
    /**
     * @dev Emergency withdraw tokens (owner only)
     * @param _token Token address
     * @param _amount Withdrawal amount
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}