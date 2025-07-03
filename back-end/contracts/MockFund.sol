// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./FundShareToken.sol";

/**
 * @title MockFund
 * @dev 去中心化基金管理合约
 * 支持多种代币投资、自动重平衡、管理费收取等功能
 */
contract MockFund is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // 基金份额代币
    FundShareToken public immutable shareToken;
    
    // 基金支持的投资代币列表
    address[] public supportedTokens;
    mapping(address => bool) public isSupportedToken;
    mapping(address => uint256) public targetAllocations; // 目标分配比例 (基点，10000 = 100%)
    
    // USDC代币地址
    address public usdcToken;
    
    // 基金状态
    uint256 public totalAssets; // 基金总资产价值 (以USDC计价)
    uint256 public managementFeeRate; // 管理费率 (基点，100 = 1%)
    uint256 public lastFeeCollection; // 上次收取管理费时间
    
    // 投资和赎回参数
    uint256 public minimumInvestment; // 最小投资金额
    uint256 public minimumRedemption; // 最小赎回金额
    uint256 public redemptionFeeRate; // 赎回费率 (基点)
    
    // 重平衡参数
    uint256 public rebalanceThreshold; // 重平衡阈值 (基点)
    uint256 public lastRebalance; // 上次重平衡时间
    uint256 public rebalanceInterval; // 重平衡间隔时间
    
    // 常量
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_MANAGEMENT_FEE = 500; // 最大管理费5%
    uint256 public constant MAX_REDEMPTION_FEE = 100; // 最大赎回费1%
    
    // 事件
    event Investment(address indexed investor, uint256 usdcAmount, uint256 sharesIssued);
    event Redemption(address indexed investor, uint256 sharesRedeemed, uint256 usdcAmount);
    event TokenAdded(address indexed token, uint256 targetAllocation);
    event TokenRemoved(address indexed token);
    event AllocationUpdated(address indexed token, uint256 oldAllocation, uint256 newAllocation);
    event Rebalanced(uint256 timestamp);
    event ManagementFeeCollected(uint256 amount, uint256 timestamp);
    event ParameterUpdated(string parameter, uint256 oldValue, uint256 newValue);
    
    /**
     * @dev 构造函数
     * @param _shareTokenName 份额代币名称
     * @param _shareTokenSymbol 份额代币符号
     * @param _initialOwner 初始所有者
     * @param _managementFeeRate 管理费率 (基点)
     */
    constructor(
        string memory _shareTokenName,
        string memory _shareTokenSymbol,
        address _initialOwner,
        uint256 _managementFeeRate
    ) Ownable(_initialOwner) {
        require(_initialOwner != address(0), "Invalid owner address");
        require(_managementFeeRate <= MAX_MANAGEMENT_FEE, "Management fee too high");
        
        // 部署份额代币合约
        shareToken = new FundShareToken(_shareTokenName, _shareTokenSymbol, address(this));
        
        // 设置基金合约地址
        shareToken.setFundContract(address(this));
        
        // 设置初始参数
        managementFeeRate = _managementFeeRate;
        minimumInvestment = 100 * 10**6; // 100 USDC
        minimumRedemption = 10 * 10**6; // 10 USDC
        redemptionFeeRate = 50; // 0.5%
        rebalanceThreshold = 500; // 5%
        rebalanceInterval = 24 hours;
        
        lastFeeCollection = block.timestamp;
        lastRebalance = block.timestamp;
    }
    
    /**
     * @dev 添加支持的投资代币
     * @param _token 代币地址
     * @param _targetAllocation 目标分配比例 (基点)
     */
    function addSupportedToken(address _token, uint256 _targetAllocation) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(!isSupportedToken[_token], "Token already supported");
        require(_targetAllocation > 0 && _targetAllocation <= BASIS_POINTS, "Invalid allocation");
        
        // 检查总分配比例不超过100%
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
    
    /**
     * @dev 移除支持的投资代币
     * @param _token 代币地址
     */
    function removeSupportedToken(address _token) external onlyOwner {
        require(isSupportedToken[_token], "Token not supported");
        
        // 从数组中移除
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
    
    /**
     * @dev 更新代币目标分配比例
     * @param _token 代币地址
     * @param _newAllocation 新的目标分配比例
     */
    function updateTargetAllocation(address _token, uint256 _newAllocation) external onlyOwner {
        require(isSupportedToken[_token], "Token not supported");
        require(_newAllocation > 0 && _newAllocation <= BASIS_POINTS, "Invalid allocation");
        
        // 检查总分配比例
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
    
    /**
     * @dev 投资基金
     * @param _usdcAmount USDC投资金额
     */
    function invest(uint256 _usdcAmount) external nonReentrant whenNotPaused {
        require(_usdcAmount >= minimumInvestment, "Investment below minimum");
        
        // 收取管理费
        _collectManagementFee();
        
        // 计算应发行的份额数量
        uint256 sharesToIssue = _calculateSharesToIssue(_usdcAmount);
        require(sharesToIssue > 0, "Invalid shares calculation");
        
        // 转入USDC
        IERC20(getUSDCAddress()).safeTransferFrom(msg.sender, address(this), _usdcAmount);
        
        // 发行份额代币
        shareToken.mint(msg.sender, sharesToIssue);
        
        // 更新总资产
        totalAssets += _usdcAmount;
        
        emit Investment(msg.sender, _usdcAmount, sharesToIssue);
    }
    
    /**
     * @dev 赎回基金份额
     * @param _shareAmount 赎回的份额数量
     */
    function redeem(uint256 _shareAmount) external nonReentrant whenNotPaused {
        require(_shareAmount > 0, "Invalid share amount");
        require(shareToken.balanceOf(msg.sender) >= _shareAmount, "Insufficient shares");
        
        // 收取管理费
        _collectManagementFee();
        
        // 计算赎回金额
        uint256 usdcAmount = _calculateRedemptionAmount(_shareAmount);
        require(usdcAmount >= minimumRedemption, "Redemption below minimum");
        
        // 计算赎回费
        uint256 redemptionFee = (usdcAmount * redemptionFeeRate) / BASIS_POINTS;
        uint256 netAmount = usdcAmount - redemptionFee;
        
        // 销毁份额代币
        shareToken.burn(msg.sender, _shareAmount);
        
        // 转出USDC
        IERC20(getUSDCAddress()).safeTransfer(msg.sender, netAmount);
        
        // 更新总资产
        totalAssets -= usdcAmount;
        
        emit Redemption(msg.sender, _shareAmount, netAmount);
    }
    
    /**
     * @dev 手动触发重平衡
     */
    function rebalance() external onlyOwner {
        require(block.timestamp >= lastRebalance + rebalanceInterval, "Rebalance too frequent");
        
        _executeRebalance();
    }
    
    /**
     * @dev 收取管理费
     */
    function collectManagementFee() external onlyOwner {
        _collectManagementFee();
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // 内部函数
    
    /**
     * @dev 计算应发行的份额数量
     * @param _usdcAmount USDC投资金额
     * @return 份额数量
     */
    function _calculateSharesToIssue(uint256 _usdcAmount) internal view returns (uint256) {
        uint256 totalSupply = shareToken.totalSupply();
        if (totalSupply == 0) {
            // 首次投资，1:1比例
            return _usdcAmount;
        }
        
        // 按当前NAV计算
        return (_usdcAmount * totalSupply) / totalAssets;
    }
    
    /**
     * @dev 计算赎回金额
     * @param _shareAmount 份额数量
     * @return USDC金额
     */
    function _calculateRedemptionAmount(uint256 _shareAmount) internal view returns (uint256) {
        uint256 totalSupply = shareToken.totalSupply();
        require(totalSupply > 0, "No shares outstanding");
        
        return (_shareAmount * totalAssets) / totalSupply;
    }
    
    /**
     * @dev 执行重平衡
     */
    function _executeRebalance() internal {
        // 这里应该实现具体的重平衡逻辑
        // 包括计算当前分配、目标分配、执行交易等
        // 暂时只更新时间戳
        lastRebalance = block.timestamp;
        emit Rebalanced(block.timestamp);
    }
    
    /**
     * @dev 收取管理费
     */
    function _collectManagementFee() internal {
        if (block.timestamp <= lastFeeCollection) return;
        
        uint256 timeElapsed = block.timestamp - lastFeeCollection;
        uint256 annualFee = (totalAssets * managementFeeRate) / BASIS_POINTS;
        uint256 feeAmount = (annualFee * timeElapsed) / 365 days;
        
        if (feeAmount > 0) {
            // 将管理费转给所有者
            // 这里简化处理，实际应该铸造新的份额给管理者
            lastFeeCollection = block.timestamp;
            emit ManagementFeeCollected(feeAmount, block.timestamp);
        }
    }
    
    // 视图函数
    
    /**
     * @dev 设置USDC代币地址
     * @param _usdcToken USDC代币地址
     */
    function setUSDCToken(address _usdcToken) external onlyOwner {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = _usdcToken;
    }
    
    /**
     * @dev 获取USDC代币地址
     * @return USDC地址
     */
    function getUSDCAddress() public view returns (address) {
        require(usdcToken != address(0), "USDC token not set");
        return usdcToken;
    }
    
    /**
     * @dev 获取当前NAV
     * @return NAV值
     */
    function getCurrentNAV() external view returns (uint256) {
        uint256 totalSupply = shareToken.totalSupply();
        if (totalSupply == 0) return 10**6; // 初始NAV = 1 USDC
        
        return (totalAssets * 10**6) / totalSupply;
    }
    
    /**
     * @dev 获取支持的代币列表
     * @return 代币地址数组
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }
    
    /**
     * @dev 获取基金统计信息
     * @return 总资产、总份额、当前NAV
     */
    function getFundStats() external view returns (uint256, uint256, uint256) {
        uint256 totalSupply = shareToken.totalSupply();
        uint256 currentNAV = totalSupply == 0 ? 10**6 : (totalAssets * 10**6) / totalSupply;
        return (totalAssets, totalSupply, currentNAV);
    }
}