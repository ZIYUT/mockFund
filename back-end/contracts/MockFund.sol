// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./FundShareToken.sol";
import "./PriceOracle.sol";
import "./UniswapIntegration.sol";


contract MockFund is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Fund share token
    FundShareToken public immutable shareToken;
    
    // Price oracle for real-time pricing
    PriceOracle public priceOracle;
    
    // Uniswap integration for token swapping
    UniswapIntegration public uniswapIntegration;
    
    // List of supported investment tokens
    address[] public supportedTokens;
    mapping(address => bool) public isSupportedToken;
    mapping(address => uint256) public targetAllocations; // Target allocation ratio (basis points, 10000 = 100%)
    
    // USDC token address
    address public usdcToken;
    
    // Fund status
    uint256 public totalAssets; // Total fund asset value (priced in USDC)
    uint256 public managementFeeRate; // Management fee rate (basis points, 100 = 1%)
    uint256 public lastFeeCollection; // Last management fee collection time
    
    // Token holdings
    mapping(address => uint256) public tokenHoldings; // Current token holdings
    
    // Investment and redemption parameters
    uint256 public minimumInvestment; // Minimum investment amount
    uint256 public minimumRedemption; // Minimum redemption amount
    uint256 public redemptionFeeRate; // Redemption fee rate (basis points)
    
    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_MANAGEMENT_FEE = 500; // Maximum management fee 5%
    uint256 public constant MAX_REDEMPTION_FEE = 100; // Maximum redemption fee 1%
    
    // Events
    event Investment(address indexed investor, uint256 usdcAmount, uint256 sharesIssued);
    event Redemption(address indexed investor, uint256 sharesRedeemed, uint256 usdcAmount);
    event TokenAdded(address indexed token, uint256 targetAllocation);
    event TokenRemoved(address indexed token);
    event AllocationUpdated(address indexed token, uint256 oldAllocation, uint256 newAllocation);
    event ManagementFeeCollected(uint256 amount, uint256 timestamp);
    event ParameterUpdated(string parameter, uint256 oldValue, uint256 newValue);
    

    constructor(
        string memory _shareTokenName,
        string memory _shareTokenSymbol,
        address _initialOwner,
        uint256 _managementFeeRate,
        address _priceOracle,
        address _uniswapIntegration
    ) Ownable(_initialOwner) {
        require(_initialOwner != address(0), "Invalid owner address");
        require(_managementFeeRate <= MAX_MANAGEMENT_FEE, "Management fee too high");
        require(_priceOracle != address(0), "Invalid price oracle address");
        require(_uniswapIntegration != address(0), "Invalid Uniswap integration address");
        
        // Deploy share token contract
        shareToken = new FundShareToken(_shareTokenName, _shareTokenSymbol, address(this));
        
        // Set fund contract address
        shareToken.setFundContract(address(this));
        
        // Set external contracts
        priceOracle = PriceOracle(_priceOracle);
        uniswapIntegration = UniswapIntegration(_uniswapIntegration);
        
        // Set initial parameters
        managementFeeRate = _managementFeeRate;
        minimumInvestment = 10 * 10**6; // 10 USDC (reduced for testing)
        minimumRedemption = 10 * 10**6; // 10 USDC
        redemptionFeeRate = 50; // 0.5%
        lastFeeCollection = block.timestamp;
    }
    

    function addSupportedToken(address _token, uint256 _targetAllocation) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(!isSupportedToken[_token], "Token already supported");
        require(_targetAllocation > 0 && _targetAllocation <= BASIS_POINTS, "Invalid allocation");
        
        // Check that total allocation does not exceed 100%
        uint256 totalAllocation = _targetAllocation;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            totalAllocation += targetAllocations[supportedTokens[i]];
        }
        require(totalAllocation <= BASIS_POINTS, "Total allocation exceeds 100%");
        
        supportedTokens.push(_token);
        isSupportedToken[_token] = true;
        targetAllocations[_token] = _targetAllocation;
        
        emit TokenAdded(_token, _targetAllocation);
    }
    

    function removeSupportedToken(address _token) external onlyOwner {
        require(isSupportedToken[_token], "Token not supported");
        
        // Remove from array
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == _token) {
                supportedTokens[i] = supportedTokens[supportedTokens.length - 1];
                supportedTokens.pop();
                break;
            }
        }
        
        isSupportedToken[_token] = false;
        delete targetAllocations[_token];
        
        emit TokenRemoved(_token);
    }
    

    function updateTargetAllocation(address _token, uint256 _newAllocation) external onlyOwner {
        require(isSupportedToken[_token], "Token not supported");
        require(_newAllocation > 0 && _newAllocation <= BASIS_POINTS, "Invalid allocation");
        
        // Check total allocation ratio
        uint256 totalAllocation = _newAllocation;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] != _token) {
                totalAllocation += targetAllocations[supportedTokens[i]];
            }
        }
        require(totalAllocation <= BASIS_POINTS, "Total allocation exceeds 100%");
        
        uint256 oldAllocation = targetAllocations[_token];
        targetAllocations[_token] = _newAllocation;
        
        emit AllocationUpdated(_token, oldAllocation, _newAllocation);
    }
    

    function invest(uint256 _usdcAmount) external nonReentrant whenNotPaused {
        require(_usdcAmount >= minimumInvestment, "Investment below minimum");
        require(supportedTokens.length > 0, "No supported tokens");
        
        // 收集管理费
        _collectManagementFee();
        
        // 计算当前 MFC 价格（USDC/MFC）
        uint256 currentMFCPrice = _calculateCurrentMFCPrice();
        require(currentMFCPrice > 0, "Invalid MFC price");
        
        // 计算用户能获得的 MFC 数量
        uint256 mfcToMint = (_usdcAmount * 10**18) / currentMFCPrice; // 使用18位精度
        require(mfcToMint > 0, "Invalid MFC amount");
        
        // 转移 USDC 到合约
        IERC20(getUSDCAddress()).safeTransferFrom(msg.sender, address(this), _usdcAmount);
        
        // 按照目标分配比例购买其他代币
        _purchaseTokensWithUSDC(_usdcAmount);
        
        // 铸造 MFC 给投资者
        shareToken.mint(msg.sender, mfcToMint);
        
        // 更新总资产
        totalAssets += _usdcAmount;
        
        emit Investment(msg.sender, _usdcAmount, mfcToMint);
    }
    

    function redeem(uint256 _shareAmount) external nonReentrant whenNotPaused {
        require(_shareAmount > 0, "Invalid share amount");
        require(shareToken.balanceOf(msg.sender) >= _shareAmount, "Insufficient shares");
        
        // 收集管理费
        _collectManagementFee();
        
        // 计算当前 MFC 价格
        uint256 currentMFCPrice = _calculateCurrentMFCPrice();
        require(currentMFCPrice > 0, "Invalid MFC price");
        
        // 计算赎回的 USDC 价值
        uint256 usdcValue = (_shareAmount * currentMFCPrice) / 10**18;
        require(usdcValue >= minimumRedemption, "Redemption below minimum");
        
        // 计算赎回费用
        uint256 redemptionFee = (usdcValue * redemptionFeeRate) / BASIS_POINTS;
        uint256 netAmount = usdcValue - redemptionFee;
        
        // 销毁 MFC
        shareToken.burn(msg.sender, _shareAmount);
        
        // 按比例赎回所有代币
        _redeemTokensProportionally(_shareAmount);
        
        // 转移 USDC 给用户
        IERC20(getUSDCAddress()).safeTransfer(msg.sender, netAmount);
        
        // 更新总资产
        totalAssets -= usdcValue;
        
        emit Redemption(msg.sender, _shareAmount, netAmount);
    }
    

    // Rebalancing functionality removed - tokens remain as purchased
    

    function collectManagementFee() external onlyOwner {
        _collectManagementFee();
    }
    

    function pause() external onlyOwner {
        _pause();
    }
    

    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Internal functions
    

    function _calculateSharesToIssue(uint256 _usdcAmount) internal view returns (uint256) {
        uint256 totalSupply = shareToken.totalSupply();
        if (totalSupply == 0) {
            // First investment, 1:1 ratio
            return _usdcAmount;
        }
        
        // Calculate based on current NAV
        return (_usdcAmount * totalSupply) / totalAssets;
    }
    

    function _calculateRedemptionAmount(uint256 _shareAmount) internal view returns (uint256) {
        uint256 totalSupply = shareToken.totalSupply();
        require(totalSupply > 0, "No shares outstanding");
        
        return (_shareAmount * totalAssets) / totalSupply;
    }
    

    // Rebalancing functionality removed - tokens remain as purchased
    

    function _collectManagementFee() internal {
        if (block.timestamp <= lastFeeCollection) return;
        
        uint256 timeElapsed = block.timestamp - lastFeeCollection;
        uint256 annualFee = (totalAssets * managementFeeRate) / BASIS_POINTS;
        uint256 feeAmount = (annualFee * timeElapsed) / 365 days;
        
        if (feeAmount > 0) {
            // Transfer management fee to owner
            // Simplified handling, in practice should mint new shares to the manager
            lastFeeCollection = block.timestamp;
            emit ManagementFeeCollected(feeAmount, block.timestamp);
        }
    }
    
    /**
     * @dev Distribute investment across supported tokens according to target allocations
     */
    function _distributeInvestment(uint256 _usdcAmount) internal {
        // 在测试环境中，跳过 Uniswap 交换，直接保留 USDC
        // 这样可以避免 Sepolia 测试网上流动性不足的问题
        
        // 计算每个代币的目标分配金额
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            uint256 targetAmount = (_usdcAmount * targetAllocations[supportedTokens[i]]) / BASIS_POINTS;
            if (targetAmount > 0) {
                // 在测试环境中，我们直接记录目标分配，但不进行实际交换
                // 这样可以避免 Uniswap 集成问题
                tokenHoldings[supportedTokens[i]] += targetAmount;
            }
        }
        
        // 保留剩余的 USDC 在合约中
        // 这部分 USDC 将作为基金的现金储备
    }
    
    /**
     * @dev Calculate total portfolio value in USDC
     */
    function _calculatePortfolioValue() internal view returns (uint256) {
        uint256 totalValue = IERC20(getUSDCAddress()).balanceOf(address(this));
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 tokenBalance = tokenHoldings[token];
            if (tokenBalance > 0) {
                totalValue += _getTokenValueInUSDC(token, tokenBalance);
            }
        }
        
        return totalValue;
    }
    
    /**
     * @dev Get token value in USDC using price oracle
     */
    function _getTokenValueInUSDC(address _token, uint256 _amount) internal view returns (uint256) {
        if (_amount == 0) return 0;
        if (_token == getUSDCAddress()) return _amount;
        
        (int256 tokenPrice, ) = priceOracle.getLatestPrice(_token);
        require(tokenPrice > 0, "Invalid token price");
        
        // Assume 18 decimals for most tokens, convert to USDC value (6 decimals)
        // Chainlink price is 8 decimals, so: (amount * price) / 10^(18 + 8 - 6)
        return (_amount * uint256(tokenPrice)) / (10 ** 20);
    }
    
    /**
     * @dev Get token amount from USDC value
     */
    function _getTokenAmountFromUSDCValue(address _token, uint256 _usdcValue) internal view returns (uint256) {
        if (_usdcValue == 0) return 0;
        if (_token == getUSDCAddress()) return _usdcValue;
        
        (int256 tokenPrice, ) = priceOracle.getLatestPrice(_token);
        require(tokenPrice > 0, "Invalid token price");
        
        // Convert from USDC value to token amount
        // Assume 18 decimals for most tokens
        return (_usdcValue * (10 ** 20)) / uint256(tokenPrice);
    }
    
    /**
     * @dev 计算当前 MFC 价格（USDC/MFC）
     * @return 当前 MFC 价格，以 USDC 计价（6位精度）
     */
    function _calculateCurrentMFCPrice() internal view returns (uint256) {
        uint256 totalSupply = shareToken.totalSupply();
        if (totalSupply == 0) {
            // 如果还没有发行任何 MFC，返回初始价格 1 USDC
            return 10**6;
        }
        
        // 计算当前组合总价值（USDC）
        uint256 totalPortfolioValue = _calculatePortfolioValue();
        
        // MFC 价格 = 总组合价值 / 总发行量
        return (totalPortfolioValue * 10**6) / totalSupply;
    }
    
    /**
     * @dev 使用 USDC 购买其他代币
     * @param _usdcAmount 要使用的 USDC 数量
     */
    function _purchaseTokensWithUSDC(uint256 _usdcAmount) internal {
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            uint256 targetAmount = (_usdcAmount * targetAllocations[supportedTokens[i]]) / BASIS_POINTS;
            if (targetAmount > 0) {
                // 使用 Uniswap 购买代币
                _swapUSDCForToken(supportedTokens[i], targetAmount);
            }
        }
    }
    
    /**
     * @dev 使用 USDC 购买指定代币
     * @param _tokenOut 要购买的代币地址
     * @param _usdcAmount USDC 数量
     */
    function _swapUSDCForToken(address _tokenOut, uint256 _usdcAmount) internal {
        if (_tokenOut == getUSDCAddress()) {
            // 如果目标代币是 USDC，直接保留
            return;
        }
        
        try uniswapIntegration.swapExactInputSingle(
            getUSDCAddress(),
            _tokenOut,
            _usdcAmount,
            address(this),
            3000 // 0.3% 费率
        ) returns (uint256 amountOut) {
            // 更新代币持有量
            tokenHoldings[_tokenOut] += amountOut;
        } catch {
            // 如果交换失败，保留 USDC
            // 这可以处理流动性不足的情况
        }
    }
    
    /**
     * @dev Calculate absolute value
     */
    function _abs(int256 x) internal pure returns (uint256) {
        return x >= 0 ? uint256(x) : uint256(-x);
    }
    
    // View functions
    

    function setUSDCToken(address _usdcToken) external onlyOwner {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = _usdcToken;
    }
    

    function getUSDCAddress() public view returns (address) {
        require(usdcToken != address(0), "USDC token not set");
        return usdcToken;
    }
    

    function getCurrentNAV() external view returns (uint256) {
        uint256 totalSupply = shareToken.totalSupply();
        if (totalSupply == 0) return 10**6; // Initial NAV = 1 USDC
        
        return (totalAssets * 10**6) / totalSupply;
    }
    

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }
    

    function getFundStats() external view returns (uint256, uint256, uint256) {
        uint256 totalSupply = shareToken.totalSupply();
        uint256 currentNAV = totalSupply == 0 ? 10**6 : (totalAssets * 10**6) / totalSupply;
        return (totalAssets, totalSupply, currentNAV);
    }
    
    /**
     * @dev Get current portfolio allocations
     */
    function getCurrentAllocations() external view returns (address[] memory tokens, uint256[] memory allocations) {
        tokens = new address[](supportedTokens.length);
        allocations = new uint256[](supportedTokens.length);
        
        uint256 totalPortfolioValue = _calculatePortfolioValue();
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            tokens[i] = supportedTokens[i];
            uint256 tokenValue = _getTokenValueInUSDC(supportedTokens[i], tokenHoldings[supportedTokens[i]]);
            allocations[i] = totalPortfolioValue > 0 ? (tokenValue * BASIS_POINTS) / totalPortfolioValue : 0;
        }
    }
    
    /**
     * @dev Get token holdings
     */
    function getTokenHoldings() external view returns (address[] memory tokens, uint256[] memory holdings) {
        tokens = new address[](supportedTokens.length);
        holdings = new uint256[](supportedTokens.length);
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            tokens[i] = supportedTokens[i];
            holdings[i] = tokenHoldings[supportedTokens[i]];
        }
    }
    
    /**
     * @dev Get portfolio value breakdown
     */
    function getPortfolioBreakdown() external view returns (
        address[] memory tokens,
        uint256[] memory holdings,
        uint256[] memory values,
        uint256[] memory allocations,
        uint256 totalValue
    ) {
        tokens = new address[](supportedTokens.length);
        holdings = new uint256[](supportedTokens.length);
        values = new uint256[](supportedTokens.length);
        allocations = new uint256[](supportedTokens.length);
        
        totalValue = _calculatePortfolioValue();
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            tokens[i] = supportedTokens[i];
            holdings[i] = tokenHoldings[supportedTokens[i]];
            values[i] = _getTokenValueInUSDC(supportedTokens[i], holdings[i]);
            allocations[i] = totalValue > 0 ? (values[i] * BASIS_POINTS) / totalValue : 0;
        }
    }
    
    // Rebalancing check function removed
    
    /**
     * @dev Update price oracle address (only owner)
     */
    function updatePriceOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid oracle address");
        priceOracle = PriceOracle(_newOracle);
    }
    
    /**
     * @dev 按比例赎回所有代币
     * @param _shareAmount 要赎回的 MFC 数量
     */
    function _redeemTokensProportionally(uint256 _shareAmount) internal {
        uint256 totalSupply = shareToken.totalSupply();
        require(totalSupply > 0, "No shares outstanding");
        
        // 计算赎回比例
        uint256 redemptionRatio = (_shareAmount * BASIS_POINTS) / totalSupply;
        
        // 赎回 USDC
        uint256 usdcToRedeem = (IERC20(getUSDCAddress()).balanceOf(address(this)) * redemptionRatio) / BASIS_POINTS;
        if (usdcToRedeem > 0) {
            IERC20(getUSDCAddress()).safeTransfer(msg.sender, usdcToRedeem);
        }
        
        // 赎回其他代币
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            if (token == getUSDCAddress()) continue; // USDC 已经处理过了
            
            uint256 tokenBalance = tokenHoldings[token];
            if (tokenBalance > 0) {
                uint256 tokenToRedeem = (tokenBalance * redemptionRatio) / BASIS_POINTS;
                if (tokenToRedeem > 0) {
                    // 尝试将代币换成 USDC
                    _swapTokenForUSDC(token, tokenToRedeem);
                    // 更新持有量
                    tokenHoldings[token] -= tokenToRedeem;
                }
            }
        }
    }
    
    /**
     * @dev 将代币换成 USDC
     * @param _tokenIn 要卖出的代币
     * @param _tokenAmount 代币数量
     */
    function _swapTokenForUSDC(address _tokenIn, uint256 _tokenAmount) internal {
        if (_tokenIn == getUSDCAddress()) {
            return;
        }
        
        try uniswapIntegration.swapExactInputSingle(
            _tokenIn,
            getUSDCAddress(),
            _tokenAmount,
            address(this),
            3000 // 0.3% 费率
        ) returns (uint256 amountOut) {
            // 交换成功，USDC 已经在合约中
        } catch {
            // 如果交换失败，直接转移代币给用户
            IERC20(_tokenIn).safeTransfer(msg.sender, _tokenAmount);
        }
    }

    /**
     * @dev 初始化基金，发行 100 万 MFC 并建立初始投资组合
     * @param _initialUSDCAmount 初始 USDC 投资金额（100万 USDC）
     */
    function initializeFund(uint256 _initialUSDCAmount) external onlyOwner {
        require(shareToken.totalSupply() == 0, "Fund already initialized");
        require(_initialUSDCAmount == 1000000 * 10**6, "Initial amount must be 1M USDC");
        require(supportedTokens.length > 0, "No supported tokens");
        
        // 转移初始 USDC
        IERC20(getUSDCAddress()).safeTransferFrom(msg.sender, address(this), _initialUSDCAmount);
        
        // 按照目标分配购买代币
        _purchaseTokensWithUSDC(_initialUSDCAmount);
        
        // 铸造 100 万 MFC 给部署者
        uint256 initialMFCSupply = 1000000 * 10**18; // 100万 MFC，18位精度
        shareToken.mint(msg.sender, initialMFCSupply);
        
        // 设置总资产
        totalAssets = _initialUSDCAmount;
        
        emit Investment(msg.sender, _initialUSDCAmount, initialMFCSupply);
    }

    /**
     * @dev 获取当前 MFC 价格（USDC/MFC）
     * @return 当前 MFC 价格，以 USDC 计价（6位精度）
     */
    function getCurrentMFCPrice() external view returns (uint256) {
        return _calculateCurrentMFCPrice();
    }
    
    /**
     * @dev 获取投资预览（计算投资 USDC 能获得多少 MFC）
     * @param _usdcAmount 投资 USDC 数量
     * @return mfcAmount 能获得的 MFC 数量
     * @return mfcPrice 当前 MFC 价格
     */
    function getInvestmentPreview(uint256 _usdcAmount) external view returns (uint256 mfcAmount, uint256 mfcPrice) {
        mfcPrice = _calculateCurrentMFCPrice();
        if (mfcPrice > 0) {
            mfcAmount = (_usdcAmount * 10**18) / mfcPrice;
        }
    }
}