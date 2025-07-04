// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Uniswap V3 接口
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    function exactOutputSingle(ExactOutputSingleParams calldata params)
        external
        payable
        returns (uint256 amountIn);
}

// Uniswap V3 Quoter 接口
interface IQuoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

/**
 * @title UniswapIntegration
 * @dev 集成 Uniswap V3 进行代币交换
 */
contract UniswapIntegration is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Uniswap V3 合约地址
    ISwapRouter public immutable swapRouter;
    IQuoter public immutable quoter;
    
    // 默认交易费率（0.3%）
    uint24 public constant DEFAULT_POOL_FEE = 3000;
    
    // 滑点保护（基点）
    uint256 public slippageTolerance = 300; // 3%
    uint256 public constant BASIS_POINTS = 10000;
    
    // 交易截止时间（秒）
    uint256 public constant DEADLINE_BUFFER = 300; // 5分钟
    
    // 事件
    event TokenSwapped(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed recipient
    );
    event SlippageToleranceUpdated(uint256 oldTolerance, uint256 newTolerance);
    
    constructor(
        address _swapRouter,
        address _quoter,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_swapRouter != address(0), "Invalid swap router address");
        require(_quoter != address(0), "Invalid quoter address");
        
        swapRouter = ISwapRouter(_swapRouter);
        quoter = IQuoter(_quoter);
    }
    
    /**
     * @dev 设置滑点容忍度
     * @param _slippageTolerance 新的滑点容忍度（基点）
     */
    function setSlippageTolerance(uint256 _slippageTolerance) external onlyOwner {
        require(_slippageTolerance <= 1000, "Slippage tolerance too high"); // 最大10%
        
        uint256 oldTolerance = slippageTolerance;
        slippageTolerance = _slippageTolerance;
        
        emit SlippageToleranceUpdated(oldTolerance, _slippageTolerance);
    }
    
    /**
     * @dev 获取交换报价
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     * @param _amountIn 输入代币数量
     * @param _fee 池费率
     * @return amountOut 预期输出数量
     */
    function getQuote(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint24 _fee
    ) external returns (uint256 amountOut) {
        return quoter.quoteExactInputSingle(
            _tokenIn,
            _tokenOut,
            _fee,
            _amountIn,
            0
        );
    }
    
    /**
     * @dev 执行精确输入交换
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     * @param _amountIn 输入代币数量
     * @param _recipient 接收者地址
     * @param _fee 池费率
     * @return amountOut 实际输出数量
     */
    function swapExactInputSingle(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        address _recipient,
        uint24 _fee
    ) external nonReentrant returns (uint256 amountOut) {
        require(_amountIn > 0, "Invalid input amount");
        require(_recipient != address(0), "Invalid recipient");
        
        // 获取报价以计算最小输出
        uint256 quotedAmountOut = this.getQuote(_tokenIn, _tokenOut, _amountIn, _fee);
        uint256 amountOutMinimum = (quotedAmountOut * (BASIS_POINTS - slippageTolerance)) / BASIS_POINTS;
        
        // 转移输入代币到合约
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        
        // 批准 Uniswap 路由器
        IERC20(_tokenIn).forceApprove(address(swapRouter), _amountIn);
        
        // 执行交换
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: _tokenIn,
            tokenOut: _tokenOut,
            fee: _fee,
            recipient: _recipient,
            deadline: block.timestamp + DEADLINE_BUFFER,
            amountIn: _amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = swapRouter.exactInputSingle(params);
        
        emit TokenSwapped(_tokenIn, _tokenOut, _amountIn, amountOut, _recipient);
    }
    
    /**
     * @dev 执行精确输出交换
     * @param _tokenIn 输入代币地址
     * @param _tokenOut 输出代币地址
     * @param _amountOut 期望输出数量
     * @param _amountInMaximum 最大输入数量
     * @param _recipient 接收者地址
     * @param _fee 池费率
     * @return amountIn 实际输入数量
     */
    function swapExactOutputSingle(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountOut,
        uint256 _amountInMaximum,
        address _recipient,
        uint24 _fee
    ) external nonReentrant returns (uint256 amountIn) {
        require(_amountOut > 0, "Invalid output amount");
        require(_amountInMaximum > 0, "Invalid maximum input amount");
        require(_recipient != address(0), "Invalid recipient");
        
        // 转移最大输入代币到合约
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountInMaximum);
        
        // 批准 Uniswap 路由器
        IERC20(_tokenIn).forceApprove(address(swapRouter), _amountInMaximum);
        
        // 执行交换
        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter.ExactOutputSingleParams({
            tokenIn: _tokenIn,
            tokenOut: _tokenOut,
            fee: _fee,
            recipient: _recipient,
            deadline: block.timestamp + DEADLINE_BUFFER,
            amountOut: _amountOut,
            amountInMaximum: _amountInMaximum,
            sqrtPriceLimitX96: 0
        });
        
        amountIn = swapRouter.exactOutputSingle(params);
        
        // 退还未使用的输入代币
        if (amountIn < _amountInMaximum) {
            IERC20(_tokenIn).forceApprove(address(swapRouter), 0);
            IERC20(_tokenIn).safeTransfer(msg.sender, _amountInMaximum - amountIn);
        }
        
        emit TokenSwapped(_tokenIn, _tokenOut, amountIn, _amountOut, _recipient);
    }
    
    /**
     * @dev 批量交换代币（用于投资时的代币分配）
     * @param _tokenIn 输入代币地址
     * @param _tokensOut 输出代币地址数组
     * @param _amountsIn 输入代币数量数组
     * @param _recipient 接收者地址
     * @param _fees 池费率数组
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
                // 获取报价
                uint256 quotedAmountOut = this.getQuote(_tokenIn, _tokensOut[i], _amountsIn[i], _fees[i]);
                uint256 amountOutMinimum = (quotedAmountOut * (BASIS_POINTS - slippageTolerance)) / BASIS_POINTS;
                
                // 批准并执行交换
                IERC20(_tokenIn).forceApprove(address(swapRouter), _amountsIn[i]);
                
                ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                    tokenIn: _tokenIn,
                    tokenOut: _tokensOut[i],
                    fee: _fees[i],
                    recipient: _recipient,
                    deadline: block.timestamp + DEADLINE_BUFFER,
                    amountIn: _amountsIn[i],
                    amountOutMinimum: amountOutMinimum,
                    sqrtPriceLimitX96: 0
                });
                
                amountsOut[i] = swapRouter.exactInputSingle(params);
                
                emit TokenSwapped(_tokenIn, _tokensOut[i], _amountsIn[i], amountsOut[i], _recipient);
            }
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
}