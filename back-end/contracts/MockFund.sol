// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./FundShareToken.sol";
import "./PriceOracle.sol";
import "./MockUniswapIntegration.sol";

contract MockFund is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // 常量
    uint256 public constant BASIS_POINTS = 10000; // 100%
    uint256 public constant INITIAL_MFC_SUPPLY = 1000000 * 10**18; // 100万MFC
    uint256 public constant INITIAL_USDC_AMOUNT = 1000000 * 10**6; // 100万USDC
    uint256 public constant USDC_ALLOCATION = 5000; // 50% USDC
    uint256 public constant TOKEN_ALLOCATION = 5000; // 50% 其他代币
    uint256 public constant MANAGEMENT_FEE_INTERVAL = 1 days; // 管理费收取间隔

    // 状态变量
    FundShareToken public immutable shareToken;
    PriceOracle public immutable priceOracle;
    MockUniswapIntegration public immutable uniswapIntegration;
    
    address public usdcToken;
    address[] public supportedTokens;
    mapping(address => uint256) public mfcTokenRatio; // 每个MFC包含的代币数量
    uint256 public mfcUSDCAmount; // 每个MFC包含的USDC数量
    
    bool public isInitialized;
    uint256 public minimumInvestment = 100 * 10**6; // 100 USDC
    uint256 public minimumRedemption = 100 * 10**6; // 100 USDC
    uint256 public managementFeeRate = 100; // 1%
    uint256 public lastFeeCollection;
    uint256 public totalManagementFeesCollected;

    // 事件
    event FundInitialized(uint256 initialSupply, uint256 initialUSDC);
    event Investment(address indexed investor, uint256 usdcAmount, uint256 mfcAmount);
    event Redemption(address indexed investor, uint256 shareAmount, uint256 usdcAmount);
    event ManagementFeeCollected(uint256 feeAmount, uint256 timestamp, uint256 totalFees);
    event SupportedTokenAdded(address token, uint256 allocation);

    constructor(
        string memory _shareTokenName,
        string memory _shareTokenSymbol,
        address _initialOwner,
        uint256 _managementFeeRate,
        address _priceOracle,
        address _uniswapIntegration
    ) Ownable(_initialOwner) {
        require(_priceOracle != address(0), "Invalid price oracle");
        require(_uniswapIntegration != address(0), "Invalid uniswap integration");
        
        shareToken = new FundShareToken(_shareTokenName, _shareTokenSymbol, address(this));
        priceOracle = PriceOracle(_priceOracle);
        uniswapIntegration = MockUniswapIntegration(_uniswapIntegration);
        managementFeeRate = _managementFeeRate;
        lastFeeCollection = block.timestamp;
    }

    /**
     * @dev 添加支持的代币
     * @param _token 代币地址
     * @param _allocation 分配比例（基点）
     */
    function addSupportedToken(address _token, uint256 _allocation) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(!isInitialized, "Fund already initialized");
        require(supportedTokens.length < 4, "Maximum 4 tokens supported");
        
        supportedTokens.push(_token);
        emit SupportedTokenAdded(_token, _allocation);
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
     * @dev 计算基金净值（NAV）
     * @return nav 基金净值（以USDC计价）
     */
    function calculateNAV() public view returns (uint256 nav) {
        require(isInitialized, "Fund not initialized");
        
        // 计算USDC部分
        uint256 usdcBalance = IERC20(getUSDCAddress()).balanceOf(address(this));
        
        // 计算代币部分
        uint256 tokenValue = 0;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            if (tokenBalance > 0) {
                tokenValue += _getTokenValueInUSDC(token, tokenBalance);
            }
        }
        
        nav = usdcBalance + tokenValue;
    }

    /**
     * @dev 计算单个MFC的价值
     * @return mfcValue 单个MFC的USDC价值
     */
    function calculateMFCValue() public view returns (uint256 mfcValue) {
        require(isInitialized, "Fund not initialized");
        
        uint256 totalSupply = shareToken.totalSupply();
        if (totalSupply == 0) return 0;
        
        uint256 nav = calculateNAV();
        mfcValue = nav / totalSupply;
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
        
        // 计算能获得的MFC数量（基于当前净值）
        uint256 mfcValue = calculateMFCValue();
        require(mfcValue > 0, "Invalid MFC value");
        
        uint256 mfcToMint = (_usdcAmount * 10**18) / mfcValue;
        require(mfcToMint > 0, "Invalid MFC amount");
        
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
        uint256 mfcValue = calculateMFCValue();
        require(mfcValue > 0, "Invalid MFC value");
        mfcAmount = (_usdcAmount * 10**18) / mfcValue;
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

    /**
     * @dev 获取基金净值信息
     */
    function getFundNAV() external view returns (uint256 nav, uint256 mfcValue, uint256 totalSupply) {
        nav = calculateNAV();
        mfcValue = calculateMFCValue();
        totalSupply = shareToken.totalSupply();
    }
}