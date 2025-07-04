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
        minimumInvestment = 100 * 10**6; // 100 USDC
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
        
        // Collect management fee
        _collectManagementFee();
        
        // Calculate shares to issue
        uint256 sharesToIssue = _calculateSharesToIssue(_usdcAmount);
        require(sharesToIssue > 0, "Invalid shares calculation");
        
        // Transfer USDC
        IERC20(getUSDCAddress()).safeTransferFrom(msg.sender, address(this), _usdcAmount);
        
        // Distribute investment across supported tokens according to target allocations
        _distributeInvestment(_usdcAmount);
        
        // Issue share tokens
        shareToken.mint(msg.sender, sharesToIssue);
        
        // Update total assets
        totalAssets += _usdcAmount;
        
        emit Investment(msg.sender, _usdcAmount, sharesToIssue);
    }
    

    function redeem(uint256 _shareAmount) external nonReentrant whenNotPaused {
        require(_shareAmount > 0, "Invalid share amount");
        require(shareToken.balanceOf(msg.sender) >= _shareAmount, "Insufficient shares");
        
        // Collect management fee
        _collectManagementFee();
        
        // Calculate redemption amount
        uint256 usdcAmount = _calculateRedemptionAmount(_shareAmount);
        require(usdcAmount >= minimumRedemption, "Redemption below minimum");
        
        // Calculate redemption fee
        uint256 redemptionFee = (usdcAmount * redemptionFeeRate) / BASIS_POINTS;
        uint256 netAmount = usdcAmount - redemptionFee;
        
        // Burn share tokens
        shareToken.burn(msg.sender, _shareAmount);
        
        // Transfer USDC
        IERC20(getUSDCAddress()).safeTransfer(msg.sender, netAmount);
        
        // Update total assets
        totalAssets -= usdcAmount;
        
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
        address[] memory tokensOut = new address[](supportedTokens.length);
        uint256[] memory amountsIn = new uint256[](supportedTokens.length);
        uint24[] memory fees = new uint24[](supportedTokens.length);
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            tokensOut[i] = supportedTokens[i];
            amountsIn[i] = (_usdcAmount * targetAllocations[supportedTokens[i]]) / BASIS_POINTS;
            fees[i] = 3000; // 0.3% pool fee
        }
        
        // Approve USDC for Uniswap integration
        IERC20(getUSDCAddress()).forceApprove(address(uniswapIntegration), _usdcAmount);
        
        // Execute batch swap
        uint256[] memory amountsOut = uniswapIntegration.batchSwap(
            getUSDCAddress(),
            tokensOut,
            amountsIn,
            address(this),
            fees
        );
        
        // Update token holdings
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            tokenHoldings[supportedTokens[i]] += amountsOut[i];
        }
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
    
    // Token swapping functions removed - no rebalancing allowed
    
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
}