// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ChainlinkPriceOracle.sol";

/**
 * @title FixedRateUniswapIntegration
 * @dev Integration contract with fixed rates for initialization and real Chainlink prices for other operations
 */
contract FixedRateUniswapIntegration is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Chainlink price oracle
    ChainlinkPriceOracle public priceOracle;
    
    // Fixed rates for initialization (USDC per token, scaled by 1e6)
    mapping(address => uint256) public fixedRates;
    
    // Mode control
    bool public useFixedRates = false;
    
    // Predefined fixed rates (USDC per token)
    uint256 public constant USDC_PER_ETH = 3000 * 1e6;   // 3000 USDC per ETH
    uint256 public constant USDC_PER_BTC = 118000 * 1e6; // 118000 USDC per BTC
    uint256 public constant USDC_PER_LINK = 15 * 1e6;    // 15 USDC per LINK
    uint256 public constant USDC_PER_DAI = 1 * 1e6;      // 1 USDC per DAI
    
    // Slippage tolerance (default 1%)
    uint256 public slippageTolerance = 100; // 100 basis points = 1%
    
    // Events
    event TokenSwapped(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed recipient,
        uint256 rate,
        bool usedFixedRate
    );
    event FixedRateSet(address indexed token, uint256 rate);
    event FixedRateModeToggled(bool enabled);
    event PriceOracleUpdated(address indexed oldOracle, address indexed newOracle);
    
    constructor(address _initialOwner, address _priceOracle) Ownable(_initialOwner) {
        require(_priceOracle != address(0), "Invalid price oracle address");
        priceOracle = ChainlinkPriceOracle(_priceOracle);
        
        // Set default fixed rates (USDC per token, scaled by 1e6)
        // ETH: 3000 USDC/ETH
        // BTC: 118000 USDC/BTC  
        // LINK: 15 USDC/LINK
        // DAI: 1 USDC/DAI
    }
    
    /**
     * @dev Initialize fixed rates for supported tokens
     * @param _wethAddress WETH token address
     * @param _wbtcAddress WBTC token address
     * @param _linkAddress LINK token address
     * @param _daiAddress DAI token address
     */
    function initializeFixedRates(
        address _wethAddress,
        address _wbtcAddress,
        address _linkAddress,
        address _daiAddress
    ) external onlyOwner {
        require(_wethAddress != address(0), "Invalid WETH address");
        require(_wbtcAddress != address(0), "Invalid WBTC address");
        require(_linkAddress != address(0), "Invalid LINK address");
        require(_daiAddress != address(0), "Invalid DAI address");
        
        fixedRates[_wethAddress] = USDC_PER_ETH;
        fixedRates[_wbtcAddress] = USDC_PER_BTC;
        fixedRates[_linkAddress] = USDC_PER_LINK;
        fixedRates[_daiAddress] = USDC_PER_DAI;
        
        emit FixedRateSet(_wethAddress, USDC_PER_ETH);
        emit FixedRateSet(_wbtcAddress, USDC_PER_BTC);
        emit FixedRateSet(_linkAddress, USDC_PER_LINK);
        emit FixedRateSet(_daiAddress, USDC_PER_DAI);
    }
    
    /**
     * @dev Set fixed rate for a token (USDC per token)
     * @param _token Token address
     * @param _rate Rate in USDC (scaled by 1e6, e.g., 3000000000 for 3000 USDC/ETH)
     */
    function setFixedRate(address _token, uint256 _rate) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(_rate > 0, "Rate must be positive");
        fixedRates[_token] = _rate;
        emit FixedRateSet(_token, _rate);
    }
    
    /**
     * @dev Batch set fixed rates
     * @param _tokens Array of token addresses
     * @param _rates Array of rates
     */
    function batchSetFixedRates(address[] calldata _tokens, uint256[] calldata _rates) external onlyOwner {
        require(_tokens.length == _rates.length, "Arrays length mismatch");
        for (uint256 i = 0; i < _tokens.length; i++) {
            require(_tokens[i] != address(0), "Invalid token address");
            require(_rates[i] > 0, "Rate must be positive");
            fixedRates[_tokens[i]] = _rates[i];
            emit FixedRateSet(_tokens[i], _rates[i]);
        }
    }
    
    /**
     * @dev Toggle fixed rate mode
     * @param _enabled Whether to use fixed rates
     */
    function setFixedRateMode(bool _enabled) external onlyOwner {
        useFixedRates = _enabled;
        emit FixedRateModeToggled(_enabled);
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
     * @dev Get exchange rate between two tokens
     * @param _tokenIn Input token address
     * @param _tokenOut Output token address
     * @return rate Exchange rate (output tokens per input token, scaled appropriately)
     */
    function getExchangeRate(
        address _tokenIn,
        address _tokenOut
    ) public view returns (uint256 rate) {
        require(_tokenIn != address(0), "Invalid token in address");
        require(_tokenOut != address(0), "Invalid token out address");
        require(_tokenIn != _tokenOut, "Tokens must be different");
        
        if (useFixedRates) {
            // Use fixed rates
            uint256 rateIn = fixedRates[_tokenIn];
            uint256 rateOut = fixedRates[_tokenOut];
            
            require(rateIn > 0 && rateOut > 0, "Fixed rates not set");
            
            // Calculate rate: tokenIn -> tokenOut
            // If tokenIn costs more USDC, you get less tokenOut
            rate = (rateIn * 1e18) / rateOut; // Scale to 18 decimals
        } else {
            // Use Chainlink real prices
            try priceOracle.getLatestPrice(_tokenIn) returns (int256 priceIn, uint256) {
                try priceOracle.getLatestPrice(_tokenOut) returns (int256 priceOut, uint256) {
                    require(priceIn > 0 && priceOut > 0, "Invalid prices from oracle");
                    
                    // Calculate exchange rate: 1 tokenIn = ? tokenOut
                    // rate = (priceIn / priceOut) * 1e18
                    rate = (uint256(priceIn) * 1e18) / uint256(priceOut);
                    
                } catch {
                    revert("Failed to get token out price from oracle");
                }
            } catch {
                revert("Failed to get token in price from oracle");
            }
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
        amountOut = (_amountIn * rate) / 1e18;
    }
    
    /**
     * @dev Execute exact input swap
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
        
        // Get exchange rate
        uint256 rate = getExchangeRate(_tokenIn, _tokenOut);
        
        // Calculate output amount
        amountOut = (_amountIn * rate) / 1e18;
        require(amountOut > 0, "Invalid output amount");
        
        // Transfer input tokens to contract
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        
        // Mint or transfer output tokens to recipient
        _mintOrTransferToken(_tokenOut, _recipient, amountOut);
        
        emit TokenSwapped(_tokenIn, _tokenOut, _amountIn, amountOut, _recipient, rate, useFixedRates);
    }
    
    /**
     * @dev Batch swap tokens
     * @param _tokenIn Input token address
     * @param _tokensOut Array of output token addresses
     * @param _amountsIn Array of input token amounts
     * @param _recipient Recipient address
     * @param _fees Array of pool fees (ignored)
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
                // Get exchange rate
                uint256 rate = getExchangeRate(_tokenIn, _tokensOut[i]);
                amountsOut[i] = (_amountsIn[i] * rate) / 1e18;
                
                // Mint or transfer output tokens to recipient
                _mintOrTransferToken(_tokensOut[i], _recipient, amountsOut[i]);
                
                emit TokenSwapped(_tokenIn, _tokensOut[i], _amountsIn[i], amountsOut[i], _recipient, rate, useFixedRates);
            }
        }
    }
    
    /**
     * @dev Mint or transfer tokens
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
     * @dev Emergency withdraw tokens (owner only)
     * @param _token Token address
     * @param _amount Withdrawal amount
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
    
    /**
     * @dev Get fixed rate for a token
     * @param _token Token address
     * @return rate Fixed rate in USDC
     */
    function getFixedRate(address _token) external view returns (uint256 rate) {
        return fixedRates[_token];
    }
    
    /**
     * @dev Check if fixed rate mode is enabled
     * @return enabled Whether fixed rate mode is enabled
     */
    function isFixedRateMode() external view returns (bool enabled) {
        return useFixedRates;
    }
}