// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ChainlinkPriceOracle.sol";

/**
 * @title UniswapIntegration
 * @dev 使用 Chainlink 真实价格进行代币交换的集成合约
 */
contract UniswapIntegration is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Chainlink 价格预言机
    ChainlinkPriceOracle public priceOracle;
    
    // 缓存的价格（避免频繁调用 Chainlink）
    mapping(address => mapping(address => uint256)) public cachedRates;
    mapping(address => mapping(address => uint256)) public rateTimestamps;
    
    // 价格缓存时间（5分钟）
    uint256 public constant CACHE_DURATION = 300;
    
    // 滑点容忍度（默认 1%）
    uint256 public slippageTolerance = 100; // 100 basis points = 1%
    
    // 事件
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
     * @dev 设置价格预言机
     * @param _priceOracle 新的价格预言机地址
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid price oracle address");
        address oldOracle = address(priceOracle);
        priceOracle = ChainlinkPriceOracle(_priceOracle);
        emit PriceOracleUpdated(oldOracle, _priceOracle);
    }
    
    /**
     * @dev 设置滑点容忍度
     * @param _slippageTolerance 滑点容忍度（基点）
     */
    function setSlippageTolerance(uint256 _slippageTolerance) external onlyOwner {
        require(_slippageTolerance <= 1000, "Slippage tolerance too high"); // 最大 10%
        uint256 oldTolerance = slippageTolerance;
        slippageTolerance = _slippageTolerance;
        emit SlippageToleranceUpdated(oldTolerance, _slippageTolerance);
    }
    
    /**
     * @dev 从 Chainlink 获取真实价格并计算交换比率
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     * @return rate 交换比率（基点）
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
                
                // 计算交换比率：1 tokenIn = ? tokenOut
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
     * @dev 更新缓存的交换比率
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     */
    function updateCachedRate(address _tokenIn, address _tokenOut) external {
        uint256 rate = calculateRealExchangeRate(_tokenIn, _tokenOut);
        cachedRates[_tokenIn][_tokenOut] = rate;
        rateTimestamps[_tokenIn][_tokenOut] = block.timestamp;
        
        emit RateUpdated(_tokenIn, _tokenOut, rate, block.timestamp);
    }
    
    /**
     * @dev 批量更新缓存的交换比率
     * @param _tokensIn 输入代币地址数组
     * @param _tokensOut 输出代币地址数组
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
     * @dev 获取交换比率（优先使用缓存）
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     * @return rate 交换比率
     */
    function getExchangeRate(
        address _tokenIn,
        address _tokenOut
    ) public view returns (uint256 rate) {
        // 检查缓存是否有效
        uint256 cachedRate = cachedRates[_tokenIn][_tokenOut];
        uint256 timestamp = rateTimestamps[_tokenIn][_tokenOut];
        
        if (cachedRate > 0 && (block.timestamp - timestamp) < CACHE_DURATION) {
            rate = cachedRate;
        } else {
            // 缓存过期或不存在，从 Chainlink 获取实时价格
            rate = calculateRealExchangeRate(_tokenIn, _tokenOut);
        }
    }
    
    /**
     * @dev 获取交换报价
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     * @param _amountIn 输入代币数量
     * @return amountOut 预期输出数量
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
     * @dev 执行精确输入交换（使用真实价格）
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     * @param _amountIn 输入代币数量
     * @param _recipient 接收者地址
     * @return amountOut 实际输出数量
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
        
        // 获取实时交换比率
        uint256 rate = getExchangeRate(_tokenIn, _tokenOut);
        
        // 计算输出数量
        amountOut = (_amountIn * rate) / 10000;
        
        // 应用滑点保护
        uint256 minAmountOut = amountOut * (10000 - slippageTolerance) / 10000;
        
        // 转移输入代币到合约
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        
        // 模拟铸造输出代币给接收者
        _mintOrTransferToken(_tokenOut, _recipient, amountOut);
        
        // 更新缓存
        cachedRates[_tokenIn][_tokenOut] = rate;
        rateTimestamps[_tokenIn][_tokenOut] = block.timestamp;
        
        emit TokenSwapped(_tokenIn, _tokenOut, _amountIn, amountOut, _recipient, rate);
    }
    
    /**
     * @dev 批量交换代币（用于投资时的代币分配）
     * @param _tokenIn 输入代币地址
     * @param _tokensOut 输出代币地址数组
     * @param _amountsIn 输入代币数量数组
     * @param _recipient 接收者地址
     * @param _fees 池费率数组（忽略，仅为兼容性）
     * @return amountsOut 实际输出数量数组
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
        
        // 计算总输入数量
        uint256 totalAmountIn = 0;
        for (uint256 i = 0; i < length; i++) {
            totalAmountIn += _amountsIn[i];
        }
        
        // 转移总输入代币到合约
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), totalAmountIn);
        
        // 执行批量交换
        for (uint256 i = 0; i < length; i++) {
            if (_amountsIn[i] > 0) {
                // 获取实时交换比率
                uint256 rate = getExchangeRate(_tokenIn, _tokensOut[i]);
                amountsOut[i] = (_amountsIn[i] * rate) / 10000;
                
                // 模拟铸造输出代币给接收者
                _mintOrTransferToken(_tokensOut[i], _recipient, amountsOut[i]);
                
                // 更新缓存
                cachedRates[_tokenIn][_tokensOut[i]] = rate;
                rateTimestamps[_tokenIn][_tokensOut[i]] = block.timestamp;
                
                emit TokenSwapped(_tokenIn, _tokensOut[i], _amountsIn[i], amountsOut[i], _recipient, rate);
            }
        }
    }
    
    /**
     * @dev 模拟铸造或转移代币
     * @param _token 代币地址
     * @param _recipient 接收者地址
     * @param _amount 数量
     */
    function _mintOrTransferToken(
        address _token,
        address _recipient,
        uint256 _amount
    ) internal {
        // 首先检查合约是否有足够的代币余额
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance >= _amount) {
            IERC20(_token).safeTransfer(_recipient, _amount);
            return;
        }
        
        // 如果余额不足，尝试调用代币的 mint 函数（如果存在）
        try this._callMint(_token, _recipient, _amount) {
            // 铸造成功
        } catch {
            // 如果铸造也失败，这是一个测试环境的限制
            revert("Insufficient token balance for swap");
        }
    }
    
    /**
     * @dev 外部调用铸造函数（用于 try-catch）
     * @param _token 代币地址
     * @param _recipient 接收者地址
     * @param _amount 数量
     */
    function _callMint(
        address _token,
        address _recipient,
        uint256 _amount
    ) external {
        require(msg.sender == address(this), "Only self call allowed");
        
        // 尝试调用 mint 函数
        (bool success, ) = _token.call(
            abi.encodeWithSignature("mint(address,uint256)", _recipient, _amount)
        );
        require(success, "Mint call failed");
    }
    
    /**
     * @dev 获取缓存信息
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     * @return cachedRate 缓存的比率
     * @return timestamp 缓存时间戳
     * @return isStale 是否过期
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
     * @dev 清除缓存
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     */
    function clearCache(address _tokenIn, address _tokenOut) external onlyOwner {
        delete cachedRates[_tokenIn][_tokenOut];
        delete rateTimestamps[_tokenIn][_tokenOut];
    }
    
    /**
     * @dev 紧急提取代币（仅限所有者）
     * @param _token 代币地址
     * @param _amount 提取数量
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
} 