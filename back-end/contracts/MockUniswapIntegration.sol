// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PriceOracle.sol";

/**
 * @title MockUniswapIntegration
 * @dev Sepolia测试网模拟 Uniswap 集成，基于真实价格计算交换比率
 */
contract MockUniswapIntegration is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // 模拟交换比率（基点）
    mapping(address => mapping(address => uint256)) public exchangeRates;
    
    // 价格预言机引用
    PriceOracle public priceOracle;
    
    // 默认交换比率（1:1）
    uint256 public constant DEFAULT_RATE = 10000; // 100% in basis points
    uint256 public constant BASIS_POINTS = 10000;
    
    // 事件
    event TokenSwapped(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed recipient
    );
    event ExchangeRateSet(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 rate
    );
    event PriceOracleUpdated(address indexed oldOracle, address indexed newOracle);
    
    constructor(address _initialOwner, address _priceOracle) Ownable(_initialOwner) {
        require(_priceOracle != address(0), "Invalid price oracle address");
        priceOracle = PriceOracle(_priceOracle);
    }
    
    /**
     * @dev 设置价格预言机
     * @param _priceOracle 新的价格预言机地址
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid price oracle address");
        address oldOracle = address(priceOracle);
        priceOracle = PriceOracle(_priceOracle);
        emit PriceOracleUpdated(oldOracle, _priceOracle);
    }
    
    /**
     * @dev 基于真实价格计算并设置交换比率
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     */
    function calculateAndSetExchangeRate(address _tokenIn, address _tokenOut) external onlyOwner {
        require(_tokenIn != address(0), "Invalid token in address");
        require(_tokenOut != address(0), "Invalid token out address");
        require(_tokenIn != _tokenOut, "Tokens must be different");
        
        try priceOracle.getLatestPrice(_tokenIn) returns (int256 priceIn, uint256) {
            try priceOracle.getLatestPrice(_tokenOut) returns (int256 priceOut, uint256) {
                require(priceIn > 0 && priceOut > 0, "Invalid prices");
                
                // 计算交换比率：1 tokenIn = ? tokenOut
                // rate = (priceIn / priceOut) * 10000
                uint256 rate = uint256(priceIn * 10000) / uint256(priceOut);
                
                exchangeRates[_tokenIn][_tokenOut] = rate;
                emit ExchangeRateSet(_tokenIn, _tokenOut, rate);
                
            } catch {
                revert("Failed to get token out price");
            }
        } catch {
            revert("Failed to get token in price");
        }
    }
    
    /**
     * @dev 批量计算并设置交换比率
     * @param _tokensIn 输入代币地址数组
     * @param _tokensOut 输出代币地址数组
     */
    function batchCalculateAndSetExchangeRates(
        address[] calldata _tokensIn,
        address[] calldata _tokensOut
    ) external onlyOwner {
        require(_tokensIn.length == _tokensOut.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < _tokensIn.length; i++) {
            this.calculateAndSetExchangeRate(_tokensIn[i], _tokensOut[i]);
        }
    }
    
    /**
     * @dev 手动设置交换比率
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     * @param _rate 交换比率（基点，10000 = 100%）
     */
    function setExchangeRate(
        address _tokenIn,
        address _tokenOut,
        uint256 _rate
    ) external onlyOwner {
        require(_rate > 0, "Rate must be positive");
        exchangeRates[_tokenIn][_tokenOut] = _rate;
        emit ExchangeRateSet(_tokenIn, _tokenOut, _rate);
    }
    
    /**
     * @dev 批量设置交换比率
     * @param _tokensIn 输入代币地址数组
     * @param _tokensOut 输出代币地址数组
     * @param _rates 交换比率数组
     */
    function batchSetExchangeRates(
        address[] calldata _tokensIn,
        address[] calldata _tokensOut,
        uint256[] calldata _rates
    ) external onlyOwner {
        require(_tokensIn.length == _tokensOut.length, "Arrays length mismatch");
        require(_tokensIn.length == _rates.length, "Rates array length mismatch");
        
        for (uint256 i = 0; i < _tokensIn.length; i++) {
            require(_rates[i] > 0, "Rate must be positive");
            exchangeRates[_tokensIn[i]][_tokensOut[i]] = _rates[i];
            emit ExchangeRateSet(_tokensIn[i], _tokensOut[i], _rates[i]);
        }
    }
    
    /**
     * @dev 获取交换比率
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     * @return rate 交换比率
     */
    function getExchangeRate(
        address _tokenIn,
        address _tokenOut
    ) public view returns (uint256 rate) {
        rate = exchangeRates[_tokenIn][_tokenOut];
        if (rate == 0) {
            rate = DEFAULT_RATE; // 默认 1:1 交换
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
        amountOut = (_amountIn * rate) / BASIS_POINTS;
    }
    
    /**
     * @dev 执行精确输入交换
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
        
        // 计算输出数量
        uint256 rate = getExchangeRate(_tokenIn, _tokenOut);
        amountOut = (_amountIn * rate) / BASIS_POINTS;
        
        // 转移输入代币到合约
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        
        // 模拟铸造输出代币给接收者
        _mintOrTransferToken(_tokenOut, _recipient, amountOut);
        
        emit TokenSwapped(_tokenIn, _tokenOut, _amountIn, amountOut, _recipient);
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
                // 计算输出数量
                uint256 rate = getExchangeRate(_tokenIn, _tokensOut[i]);
                amountsOut[i] = (_amountsIn[i] * rate) / BASIS_POINTS;
                
                // 模拟铸造输出代币给接收者
                _mintOrTransferToken(_tokensOut[i], _recipient, amountsOut[i]);
                
                emit TokenSwapped(_tokenIn, _tokensOut[i], _amountsIn[i], amountsOut[i], _recipient);
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
            revert("Insufficient token balance for mock swap");
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
     * @dev 为测试目的预存代币
     * @param _token 代币地址
     * @param _amount 数量
     */
    function depositToken(address _token, uint256 _amount) external {
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
    }
    
    /**
     * @dev 批量预存代币
     * @param _tokens 代币地址数组
     * @param _amounts 数量数组
     */
    function batchDepositTokens(address[] calldata _tokens, uint256[] calldata _amounts) external {
        require(_tokens.length == _amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < _tokens.length; i++) {
            IERC20(_tokens[i]).safeTransferFrom(msg.sender, address(this), _amounts[i]);
        }
    }
    
    /**
     * @dev 紧急提取代币（仅限所有者）
     * @param _token 代币地址
     * @param _amount 提取数量
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
    
    /**
     * @dev 获取合约中代币余额
     * @param _token 代币地址
     * @return balance 余额
     */
    function getTokenBalance(address _token) external view returns (uint256 balance) {
        return IERC20(_token).balanceOf(address(this));
    }
    
    /**
     * @dev 获取多个代币的余额
     * @param _tokens 代币地址数组
     * @return balances 余额数组
     */
    function getMultipleTokenBalances(address[] calldata _tokens) external view returns (uint256[] memory balances) {
        balances = new uint256[](_tokens.length);
        for (uint256 i = 0; i < _tokens.length; i++) {
            balances[i] = IERC20(_tokens[i]).balanceOf(address(this));
        }
    }
}