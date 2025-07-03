// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./FundShareToken.sol";


contract MockFund is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Fund share token
    FundShareToken public immutable shareToken;
    
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
    
    // Investment and redemption parameters
    uint256 public minimumInvestment; // Minimum investment amount
    uint256 public minimumRedemption; // Minimum redemption amount
    uint256 public redemptionFeeRate; // Redemption fee rate (basis points)
    
    // Rebalancing parameters
    uint256 public rebalanceThreshold; // Rebalance threshold (basis points)
    uint256 public lastRebalance; // Last rebalance time
    uint256 public rebalanceInterval; // Rebalance interval time
    
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
    event Rebalanced(uint256 timestamp);
    event ManagementFeeCollected(uint256 amount, uint256 timestamp);
    event ParameterUpdated(string parameter, uint256 oldValue, uint256 newValue);
    

    constructor(
        string memory _shareTokenName,
        string memory _shareTokenSymbol,
        address _initialOwner,
        uint256 _managementFeeRate
    ) Ownable(_initialOwner) {
        require(_initialOwner != address(0), "Invalid owner address");
        require(_managementFeeRate <= MAX_MANAGEMENT_FEE, "Management fee too high");
        
        // Deploy share token contract
        shareToken = new FundShareToken(_shareTokenName, _shareTokenSymbol, address(this));
        
        // Set fund contract address
        shareToken.setFundContract(address(this));
        
        // Set initial parameters
        managementFeeRate = _managementFeeRate;
        minimumInvestment = 100 * 10**6; // 100 USDC
        minimumRedemption = 10 * 10**6; // 10 USDC
        redemptionFeeRate = 50; // 0.5%
        rebalanceThreshold = 500; // 5%
        rebalanceInterval = 24 hours;
        
        lastFeeCollection = block.timestamp;
        lastRebalance = block.timestamp;
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
        
        // Collect management fee
        _collectManagementFee();
        
        // Calculate shares to issue
        uint256 sharesToIssue = _calculateSharesToIssue(_usdcAmount);
        require(sharesToIssue > 0, "Invalid shares calculation");
        
        // Transfer USDC
        IERC20(getUSDCAddress()).safeTransferFrom(msg.sender, address(this), _usdcAmount);
        
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
    

    function rebalance() external onlyOwner {
        require(block.timestamp >= lastRebalance + rebalanceInterval, "Rebalance too frequent");
        
        _executeRebalance();
    }
    

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
    

    function _executeRebalance() internal {
        // Here should implement specific rebalancing logic
        // Including calculating current allocation, target allocation, executing trades, etc.
        // For now, just update the timestamp
        lastRebalance = block.timestamp;
        emit Rebalanced(block.timestamp);
    }
    

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
}