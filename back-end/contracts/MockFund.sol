// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./FundShareToken.sol";
import "./PriceOracle.sol";
import "./MockUniswapIntegration.sol";

contract MockFund is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Fund share token
    FundShareToken public immutable shareToken;
    
    // Price oracle for real-time pricing
    PriceOracle public priceOracle;
    
    // Uniswap integration for token swapping
    MockUniswapIntegration public uniswapIntegration;
    
    // USDC token address
    address public usdcToken;
    
    // Fund status
    bool public isInitialized;
    uint256 public constant INITIAL_MFC_SUPPLY = 1000000 * 10**18; // 100万 MFC
    uint256 public constant INITIAL_USDC_AMOUNT = 1000000 * 10**6; // 100万 USDC
    
    // 固定资产分配比例（基点，10000 = 100%）
    uint256 public constant USDC_ALLOCATION = 5000; // 50% USDC
    uint256 public constant TOKEN_ALLOCATION = 5000; // 50% 其他代币
    
    // 支持的代币列表（WBTC, WETH, LINK, DAI）
    address[] public supportedTokens;
    mapping(address => bool) public isSupportedToken;
    mapping(address => uint256) public tokenAllocations; // 每个代币的分配比例（占50%中的比例）
    
    // 每个MFC代表的固定资产比例（以最小单位计算）
    mapping(address => uint256) public mfcTokenRatio; // 每个MFC包含的代币数量
    uint256 public mfcUSDCAmount; // 每个MFC包含的USDC数量
    
    // 管理费
    uint256 public managementFeeRate; // 管理费率（基点，100 = 1%）
    uint256 public lastFeeCollection; // 上次收取管理费时间
    uint256 public totalManagementFeesCollected; // 累计收取的管理费总额
    uint256 public constant MANAGEMENT_FEE_INTERVAL = 1 minutes; // 管理费收取间隔（1分钟）
    
    // 投资和赎回参数
    uint256 public minimumInvestment; // 最小投资金额
    uint256 public minimumRedemption; // 最小赎回金额
    uint256 public redemptionFeeRate; // 赎回费率（基点）
    
    // 常量
    uint256 public constant BASIS_POINTS = 10000;
    
    // 事件
    event FundInitialized(uint256 initialMFCSupply, uint256 initialUSDCAmount);
    event Investment(address indexed investor, uint256 usdcAmount, uint256 sharesIssued);
    event Redemption(address indexed investor, uint256 sharesRedeemed, uint256 usdcAmount);
    event ManagementFeeCollected(uint256 amount, uint256 timestamp, uint256 totalCollected);
    event TokenAdded(address indexed token, uint256 allocation);

    constructor(
        string memory _shareTokenName,
        string memory _shareTokenSymbol,
        address _initialOwner,
        uint256 _managementFeeRate,
        address _priceOracle,
        address _uniswapIntegration
    ) Ownable(_initialOwner) {
        require(_initialOwner != address(0), "Invalid owner address");
        require(_managementFeeRate == 100, "Management fee must be 1%"); // 固定1%
        require(_priceOracle != address(0), "Invalid price oracle address");
        require(_uniswapIntegration != address(0), "Invalid Uniswap integration address");
        
        // 部署份额代币合约
        shareToken = new FundShareToken(_shareTokenName, _shareTokenSymbol, address(this));
        shareToken.setFundContract(address(this));
        
        // 设置外部合约
        priceOracle = PriceOracle(_priceOracle);
        uniswapIntegration = MockUniswapIntegration(_uniswapIntegration);
        
        // 设置初始参数
        managementFeeRate = 100; // 固定1%
        minimumInvestment = 10 * 10**6; // 10 USDC
        minimumRedemption = 10 * 10**6; // 10 USDC
        redemptionFeeRate = 100; // 固定1%
        lastFeeCollection = block.timestamp;
    }
    
    /**
     * @dev 添加支持的代币
     * @param _token 代币地址
     * @param _allocation 分配比例（占50%中的比例，10000 = 100%）
     */
    function addSupportedToken(address _token, uint256 _allocation) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(!isSupportedToken[_token], "Token already supported");
        require(_allocation > 0 && _allocation <= BASIS_POINTS, "Invalid allocation");
        
        // 检查总分配不超过100%
        uint256 totalAllocation = _allocation;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            totalAllocation += tokenAllocations[supportedTokens[i]];
        }
        require(totalAllocation <= BASIS_POINTS, "Total allocation exceeds 100%");
        
        supportedTokens.push(_token);
        isSupportedToken[_token] = true;
        tokenAllocations[_token] = _allocation;
        
        emit TokenAdded(_token, _allocation);
    }
    
    /**
     * @dev 初始化基金，建立固定资产组合
     * @param _initialUSDCAmount 初始USDC金额（必须是100万USDC）
     */
    function initializeFund(uint256 _initialUSDCAmount) external onlyOwner {
        require(!isInitialized, "Fund already initialized");
        require(_initialUSDCAmount == INITIAL_USDC_AMOUNT, "Initial amount must be 1M USDC");
        require(supportedTokens.length == 4, "Must have exactly 4 supported tokens");
        
        // 转移初始USDC
        IERC20(getUSDCAddress()).safeTransferFrom(msg.sender, address(this), _initialUSDCAmount);
        
        // 计算每个代币的购买金额（50%中的25%，即总资金的12.5%）
        uint256 tokenPurchaseAmount = (_initialUSDCAmount * TOKEN_ALLOCATION) / BASIS_POINTS; // 50万USDC
        uint256 perTokenAmount = tokenPurchaseAmount / 4; // 每个代币12.5万USDC
        
        // 购买代币并计算每个MFC包含的代币数量
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 tokenAmount = _purchaseTokenWithUSDC(token, perTokenAmount);
            
            // 计算每个MFC包含的代币数量
            mfcTokenRatio[token] = tokenAmount / INITIAL_MFC_SUPPLY;
    }
    
        // 计算每个MFC包含的USDC数量
        mfcUSDCAmount = (_initialUSDCAmount * USDC_ALLOCATION) / (BASIS_POINTS * INITIAL_MFC_SUPPLY);
        
        // 铸造初始MFC给部署者
        shareToken.mint(msg.sender, INITIAL_MFC_SUPPLY);
        
        isInitialized = true;
        
        emit FundInitialized(INITIAL_MFC_SUPPLY, _initialUSDCAmount);
    }
    
    /**
     * @dev 投资USDC获得MFC
     * @param _usdcAmount 投资USDC数量
     */
    function invest(uint256 _usdcAmount) external nonReentrant whenNotPaused {
        require(isInitialized, "Fund not initialized");
        require(_usdcAmount >= minimumInvestment, "Investment below minimum");
        
        // 收集管理费
        _collectManagementFee();
        
        // 计算能获得的MFC数量（1:1比例）
        uint256 mfcToMint = _usdcAmount;
        
        // 转移USDC到合约
        IERC20(getUSDCAddress()).safeTransferFrom(msg.sender, address(this), _usdcAmount);
        
        // 按照固定比例购买代币
        uint256 tokenPurchaseAmount = (_usdcAmount * TOKEN_ALLOCATION) / BASIS_POINTS;
        uint256 perTokenAmount = tokenPurchaseAmount / 4;
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            _purchaseTokenWithUSDC(token, perTokenAmount);
        }
        
        // 铸造MFC给投资者
        shareToken.mint(msg.sender, mfcToMint);
        
        emit Investment(msg.sender, _usdcAmount, mfcToMint);
    }
    
    /**
     * @dev 赎回MFC获得USDC
     * @param _shareAmount 赎回MFC数量
     */
    function redeem(uint256 _shareAmount) external nonReentrant whenNotPaused {
        require(_shareAmount > 0, "Invalid share amount");
        require(FundShareToken(shareToken).balanceOf(msg.sender) >= _shareAmount, "Insufficient shares");
        
        // 收集管理费
        _collectManagementFee();
        
        // 计算赎回的USDC价值
        uint256 usdcValue = _calculateRedemptionValue(_shareAmount);
        require(usdcValue >= minimumRedemption, "Redemption below minimum");
        
        // 计算赎回管理费（1%）
        uint256 redemptionFee = (usdcValue * managementFeeRate) / BASIS_POINTS;
        uint256 netAmount = usdcValue - redemptionFee;
        
        // 销毁MFC
        shareToken.burn(msg.sender, _shareAmount);
        
        // 按比例卖出代币换成USDC
        _redeemTokensForUSDC(_shareAmount);
        
        // 转移USDC给用户（99%）
        IERC20(getUSDCAddress()).safeTransfer(msg.sender, netAmount);
        
        // 累计管理费（1%）
        totalManagementFeesCollected += redemptionFee;
        
        emit Redemption(msg.sender, _shareAmount, netAmount);
    }
    
    /**
     * @dev 使用USDC购买代币
     * @param _token 要购买的代币
     * @param _usdcAmount USDC数量
     * @return tokenAmount 获得的代币数量
     */
    function _purchaseTokenWithUSDC(address _token, uint256 _usdcAmount) internal returns (uint256 tokenAmount) {
        if (_token == getUSDCAddress()) {
            return _usdcAmount;
        }
        
        try uniswapIntegration.swapExactInputSingle(
            getUSDCAddress(),
            _token,
            _usdcAmount,
            address(this),
            3000 // 0.3% 费率
        ) returns (uint256 amountOut) {
            tokenAmount = amountOut;
        } catch {
            // 如果交换失败，保留USDC
            tokenAmount = 0;
        }
    }
    
    /**
     * @dev 计算赎回价值
     * @param _shareAmount MFC数量
     * @return usdcValue USDC价值
     */
    function _calculateRedemptionValue(uint256 _shareAmount) internal view returns (uint256 usdcValue) {
        // 计算USDC部分
        uint256 usdcPart = _shareAmount * mfcUSDCAmount;
        
        // 计算代币部分
        uint256 tokenPart = 0;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 tokenAmount = _shareAmount * mfcTokenRatio[token];
            if (tokenAmount > 0) {
                tokenPart += _getTokenValueInUSDC(token, tokenAmount);
            }
        }
        
        usdcValue = usdcPart + tokenPart;
    }
    
    /**
     * @dev 赎回代币换成USDC
     * @param _shareAmount MFC数量
     */
    function _redeemTokensForUSDC(uint256 _shareAmount) internal {
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 tokenAmount = _shareAmount * mfcTokenRatio[token];
            
            if (tokenAmount > 0) {
                uint256 tokenBalance = IERC20(token).balanceOf(address(this));
                if (tokenBalance >= tokenAmount) {
                    _swapTokenForUSDC(token, tokenAmount);
                }
            }
        }
    }
    
    /**
     * @dev 将代币换成USDC
     * @param _token 代币地址
     * @param _amount 代币数量
     */
    function _swapTokenForUSDC(address _token, uint256 _amount) internal {
        if (_token == getUSDCAddress()) {
            return;
            }
        
        try uniswapIntegration.swapExactInputSingle(
            _token,
            getUSDCAddress(),
            _amount,
            address(this),
            3000 // 0.3% 费率
        ) returns (uint256 /* amountOut */) {
            // 交换成功
        } catch {
            // 如果交换失败，直接转移代币给用户
            IERC20(_token).safeTransfer(msg.sender, _amount);
        }
    }
    
    /**
     * @dev 获取代币USDC价值
     * @param _token 代币地址
     * @param _amount 代币数量
     * @return usdcValue USDC价值
     */
    function _getTokenValueInUSDC(address _token, uint256 _amount) internal view returns (uint256 usdcValue) {
        if (_amount == 0) return 0;
        if (_token == getUSDCAddress()) return _amount;
        
        (int256 tokenPrice, ) = priceOracle.getLatestPrice(_token);
        require(tokenPrice > 0, "Invalid token price");
        
        // Chainlink价格是8位小数，转换为USDC价值（6位精度）
        // 公式：(amount * price) / (10^8) = USDC价值
        return (_amount * uint256(tokenPrice)) / (10 ** 8);
    }
    
    /**
     * @dev 收集管理费
     */
    function _collectManagementFee() internal {
        if (block.timestamp < lastFeeCollection + MANAGEMENT_FEE_INTERVAL) return;
        
        // 计算流通的MFC数量（排除发行者持有的MFC）
        uint256 totalSupply = FundShareToken(shareToken).totalSupply();
        uint256 ownerBalance = FundShareToken(shareToken).balanceOf(owner());
        uint256 circulatingSupply = totalSupply - ownerBalance;
        
        if (circulatingSupply == 0) {
            lastFeeCollection = block.timestamp;
            return;
        }
        
        // 计算管理费（1%）
        uint256 feeAmount = (circulatingSupply * managementFeeRate) / BASIS_POINTS;
        
        if (feeAmount > 0) {
            // 从USDC余额中扣除管理费
            uint256 usdcBalance = IERC20(getUSDCAddress()).balanceOf(address(this));
            uint256 usdcFeeAmount = 0;
            
            if (usdcBalance >= feeAmount) {
                usdcFeeAmount = feeAmount;
            } else {
                usdcFeeAmount = usdcBalance;
                // 需要卖出代币来补充USDC
                uint256 remainingFee = feeAmount - usdcBalance;
                _sellTokensForManagementFee(remainingFee);
            }
            
            // 累计管理费
            totalManagementFeesCollected += feeAmount;
            lastFeeCollection = block.timestamp;
            
            emit ManagementFeeCollected(feeAmount, block.timestamp, totalManagementFeesCollected);
        }
    }
    
    /**
     * @dev 卖出代币收取管理费
     * @param _requiredUSDC 需要的USDC数量
     */
    function _sellTokensForManagementFee(uint256 _requiredUSDC) internal {
        uint256 totalSold = 0;
        
        // 按比例卖出代币
        for (uint256 i = 0; i < supportedTokens.length && totalSold < _requiredUSDC; i++) {
            address token = supportedTokens[i];
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            
            if (tokenBalance > 0) {
                // 计算需要卖出的代币数量
                uint256 remainingNeeded = _requiredUSDC - totalSold;
                uint256 tokenValue = _getTokenValueInUSDC(token, tokenBalance);
                
                if (tokenValue > 0) {
                    uint256 tokensToSell = tokenBalance;
                    if (tokenValue > remainingNeeded) {
                        // 按比例卖出
                        tokensToSell = (tokenBalance * remainingNeeded) / tokenValue;
                    }
                    
                    if (tokensToSell > 0) {
                        _swapTokenForUSDC(token, tokensToSell);
                        totalSold += _getTokenValueInUSDC(token, tokensToSell);
                    }
                }
            }
        }
    }
    
    // 管理功能
    function collectManagementFee() external onlyOwner {
        _collectManagementFee();
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }

    function setUSDCToken(address _usdcToken) external onlyOwner {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = _usdcToken;
    }

    function getUSDCAddress() public view returns (address) {
        require(usdcToken != address(0), "USDC token not set");
        return usdcToken;
    }
    
    // 查询功能
    function getFundStats() external view returns (uint256, uint256, bool) {
        return (FundShareToken(shareToken).totalSupply(), INITIAL_MFC_SUPPLY, isInitialized);
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }
    
    function getMFCComposition() external view returns (
        address[] memory tokens,
        uint256[] memory ratios,
        uint256 usdcAmount
    ) {
        tokens = new address[](supportedTokens.length);
        ratios = new uint256[](supportedTokens.length);
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            tokens[i] = supportedTokens[i];
            ratios[i] = mfcTokenRatio[supportedTokens[i]];
        }
        
        usdcAmount = mfcUSDCAmount;
        }
    
    function getInvestmentPreview(uint256 _usdcAmount) external view returns (uint256 mfcAmount) {
        require(isInitialized, "Fund not initialized");
        mfcAmount = _usdcAmount; // 1:1比例
    }
    
    function getRedemptionPreview(uint256 _shareAmount) external view returns (uint256 usdcAmount) {
        require(isInitialized, "Fund not initialized");
        usdcAmount = _calculateRedemptionValue(_shareAmount);
    }
    
    /**
     * @dev 获取累计管理费总额
     */
    function getTotalManagementFees() external view returns (uint256) {
        return totalManagementFeesCollected;
    }
    
    /**
     * @dev 获取流通的MFC数量（排除发行者持有的）
     */
    function getCirculatingSupply() external view returns (uint256) {
        uint256 totalSupply = FundShareToken(shareToken).totalSupply();
        uint256 ownerBalance = FundShareToken(shareToken).balanceOf(owner());
        return totalSupply - ownerBalance;
    }
}