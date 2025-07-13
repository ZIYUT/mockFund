// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./FundShareToken.sol";
import "./ChainlinkPriceOracle.sol";
import "./UniswapIntegration.sol";

/**
 * @title MockFundImproved
 * @dev 改进版的MockFund合约，解决初始化时的USDC余额问题
 * 
 * 主要改进：
 * 1. 智能检测合约中现有的USDC余额
 * 2. 支持使用现有余额进行初始化
 * 3. 更灵活的初始化参数
 * 4. 增强的错误处理和状态检查
 * 5. 支持紧急提取功能
 */
contract MockFundImproved is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant BASIS_POINTS = 10000; // 100%
    uint256 public constant INITIAL_MFC_SUPPLY = 1000000 * 10**18; // 1 million MFC
    uint256 public constant DEFAULT_USDC_AMOUNT = 1000000 * 10**6; // 1 million USDC
    uint256 public constant USDC_ALLOCATION = 5000; // 50% USDC
    uint256 public constant TOKEN_ALLOCATION = 5000; // 50% other tokens
    uint256 public constant MANAGEMENT_FEE_INTERVAL = 1 days;

    // State variables
    FundShareToken public immutable shareToken;
    ChainlinkPriceOracle public immutable priceOracle;
    UniswapIntegration public immutable uniswapIntegration;
    
    address public usdcToken;
    address[] public supportedTokens;
    
    // Fixed composition per MFC (calculated during initialization)
    mapping(address => uint256) public mfcTokenRatio; // Amount of tokens per MFC (with token decimals)
    uint256 public mfcUSDCAmount; // Amount of USDC per MFC (with 6 decimals)
    
    bool public isInitialized;
    uint256 public minimumInvestment = 100 * 10**6; // 100 USDC
    uint256 public minimumRedemption = 100 * 10**6; // 100 USDC
    uint256 public managementFeeRate = 100; // 1%
    uint256 public lastFeeCollection;
    uint256 public totalManagementFeesCollected;
    uint256 public managementFeeUSDCBalance; // 可提取的管理费USDC余额
    uint256 public actualInitialAmount; // 实际用于初始化的USDC数量

    // Events
    event FundInitialized(uint256 initialSupply, uint256 actualUSDCAmount, uint256 existingUSDC, uint256 transferredUSDC);
    event Investment(address indexed investor, uint256 usdcAmount, uint256 mfcAmount);
    event Redemption(address indexed investor, uint256 shareAmount, uint256 usdcAmount);
    event ManagementFeeCollected(uint256 feeAmount, uint256 timestamp, uint256 totalFees);
    event ManagementFeeWithdrawn(uint256 amount, address to);
    event ManagementFeeUSDCCollected(uint256 usdcAmount, uint256 timestamp);
    event SupportedTokenAdded(address token, uint256 allocation);
    event TokenCompositionSet(address token, uint256 amountPerMFC);
    event EmergencyWithdraw(address token, uint256 amount, address to);
    event USDCTokenSet(address usdcToken);

    constructor(
        address _usdcToken,
        address _uniswapIntegration,
        address _priceOracle,
        address _shareToken
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_priceOracle != address(0), "Invalid price oracle address");
        require(_uniswapIntegration != address(0), "Invalid uniswap integration address");
        require(_shareToken != address(0), "Invalid share token address");
        
        usdcToken = _usdcToken;
        shareToken = FundShareToken(_shareToken);
        priceOracle = ChainlinkPriceOracle(_priceOracle);
        uniswapIntegration = UniswapIntegration(_uniswapIntegration);
        lastFeeCollection = block.timestamp;
        
        emit USDCTokenSet(_usdcToken);
    }

    /**
     * @dev 设置支持的代币和权重
     * @param _tokens 代币地址数组
     * @param _weights 权重数组（基点）
     */
    function setSupportedTokens(address[] calldata _tokens, uint256[] calldata _weights) external onlyOwner {
        require(!isInitialized, "Fund already initialized");
        require(_tokens.length == _weights.length, "Arrays length mismatch");
        require(_tokens.length == 4, "Must have exactly 4 supported tokens");
        
        // 清空现有的支持代币
        delete supportedTokens;
        
        // 添加新的支持代币
        for (uint256 i = 0; i < _tokens.length; i++) {
            require(_tokens[i] != address(0), "Invalid token address");
            require(_tokens[i] != usdcToken, "Cannot add USDC as supported token");
            supportedTokens.push(_tokens[i]);
            emit SupportedTokenAdded(_tokens[i], _weights[i]);
        }
    }

    /**
     * @dev 改进的基金初始化函数
     * @param _additionalUSDCAmount 额外需要转入的USDC数量（如果为0，则只使用现有余额）
     * @param _useExistingBalance 是否使用合约中现有的USDC余额
     */
    function initializeFundImproved(
        uint256 _additionalUSDCAmount,
        bool _useExistingBalance
    ) external onlyOwner {
        require(!isInitialized, "Fund already initialized");
        require(supportedTokens.length == 4, "Must have exactly 4 supported tokens");
        
        // 检查合约中现有的USDC余额
        uint256 existingUSDCBalance = IERC20(usdcToken).balanceOf(address(this));
        
        uint256 totalUSDCForInitialization;
        
        if (_useExistingBalance && existingUSDCBalance > 0) {
            // 使用现有余额 + 额外转入的USDC
            if (_additionalUSDCAmount > 0) {
                IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), _additionalUSDCAmount);
            }
            totalUSDCForInitialization = existingUSDCBalance + _additionalUSDCAmount;
        } else {
            // 传统模式：必须转入指定数量的USDC
            require(_additionalUSDCAmount >= DEFAULT_USDC_AMOUNT, "Insufficient USDC amount for initialization");
            IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), _additionalUSDCAmount);
            totalUSDCForInitialization = _additionalUSDCAmount;
        }
        
        require(totalUSDCForInitialization >= DEFAULT_USDC_AMOUNT, "Total USDC amount too low for initialization");
        
        // 记录实际用于初始化的金额
        actualInitialAmount = totalUSDCForInitialization;
        
        // 执行初始化逻辑
        _performInitialization(totalUSDCForInitialization);
        
        emit FundInitialized(
            INITIAL_MFC_SUPPLY, 
            totalUSDCForInitialization, 
            existingUSDCBalance, 
            _additionalUSDCAmount
        );
    }

    /**
     * @dev 兼容性初始化函数（保持与原版本的兼容性）
     * @param _initialUSDCAmount 初始USDC数量
     */
    function initializeFund(uint256 _initialUSDCAmount) external onlyOwner {
        require(!isInitialized, "Fund already initialized");
        require(_initialUSDCAmount == DEFAULT_USDC_AMOUNT, "Initial amount must be 1M USDC");
        require(supportedTokens.length == 4, "Must have exactly 4 supported tokens");
        
        // 检查是否有现有余额
        uint256 existingUSDCBalance = IERC20(usdcToken).balanceOf(address(this));
        
        if (existingUSDCBalance >= DEFAULT_USDC_AMOUNT) {
            // 如果现有余额足够，直接使用现有余额
            actualInitialAmount = existingUSDCBalance;
            _performInitialization(existingUSDCBalance);
            
            emit FundInitialized(INITIAL_MFC_SUPPLY, existingUSDCBalance, existingUSDCBalance, 0);
        } else {
            // 传统模式：转入指定数量的USDC
            IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), _initialUSDCAmount);
            actualInitialAmount = _initialUSDCAmount;
            _performInitialization(_initialUSDCAmount);
            
            emit FundInitialized(INITIAL_MFC_SUPPLY, _initialUSDCAmount, 0, _initialUSDCAmount);
        }
    }

    /**
     * @dev 执行实际的初始化逻辑
     * @param _totalUSDCAmount 用于初始化的总USDC数量
     */
    function _performInitialization(uint256 _totalUSDCAmount) internal {
        // Calculate USDC allocation: 50% stays as USDC
        uint256 usdcToKeep = (_totalUSDCAmount * USDC_ALLOCATION) / BASIS_POINTS;
        uint256 usdcForTokens = _totalUSDCAmount - usdcToKeep;
        
        // Each token gets 12.5% of total fund
        uint256 perTokenUSDC = usdcForTokens / 4;
        
        // Purchase tokens using fixed rates and calculate precise composition
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 tokenAmount = _purchaseTokenWithFixedRate(token, perTokenUSDC);
            
            // Calculate exact token amount per MFC
            uint8 tokenDecimals = _getTokenDecimals(token);
            uint256 scaledTokenAmount;
            if (tokenDecimals <= 18) {
                scaledTokenAmount = tokenAmount * (10 ** (18 - tokenDecimals));
            } else {
                scaledTokenAmount = tokenAmount / (10 ** (tokenDecimals - 18));
            }
            
            mfcTokenRatio[token] = scaledTokenAmount / (INITIAL_MFC_SUPPLY / 1e18);
            emit TokenCompositionSet(token, mfcTokenRatio[token]);
        }
        
        // Calculate USDC amount per MFC
        mfcUSDCAmount = (usdcToKeep * 1e18) / INITIAL_MFC_SUPPLY;
        
        // Mint initial MFC to contract
        shareToken.mint(address(this), INITIAL_MFC_SUPPLY);
        
        isInitialized = true;
    }

    /**
     * @dev 紧急提取函数 - 允许所有者提取任何代币
     * @param _token 代币地址（address(0)表示ETH）
     * @param _amount 提取数量
     * @param _to 接收地址
     */
    function emergencyWithdraw(
        address _token,
        uint256 _amount,
        address _to
    ) external onlyOwner {
        require(_to != address(0), "Invalid recipient address");
        
        if (_token == address(0)) {
            // 提取ETH
            require(address(this).balance >= _amount, "Insufficient ETH balance");
            payable(_to).transfer(_amount);
        } else {
            // 提取ERC20代币
            require(IERC20(_token).balanceOf(address(this)) >= _amount, "Insufficient token balance");
            IERC20(_token).safeTransfer(_to, _amount);
        }
        
        emit EmergencyWithdraw(_token, _amount, _to);
    }

    /**
     * @dev 重置基金状态（仅在紧急情况下使用）
     */
    function resetFundState() external onlyOwner {
        require(isInitialized, "Fund not initialized");
        
        // 重置状态变量
        isInitialized = false;
        actualInitialAmount = 0;
        
        // 清空代币比例
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            mfcTokenRatio[supportedTokens[i]] = 0;
        }
        mfcUSDCAmount = 0;
        
        // 重置管理费相关状态
        managementFeeUSDCBalance = 0;
        totalManagementFeesCollected = 0;
        lastFeeCollection = block.timestamp;
    }

    /**
     * @dev 获取合约状态信息
     */
    function getContractStatus() external view returns (
        bool initialized,
        uint256 usdcBalance,
        uint256 actualInitAmount,
        uint256 mfcSupply,
        uint256 supportedTokenCount
    ) {
        initialized = isInitialized;
        usdcBalance = IERC20(usdcToken).balanceOf(address(this));
        actualInitAmount = actualInitialAmount;
        mfcSupply = shareToken.totalSupply();
        supportedTokenCount = supportedTokens.length;
    }

    // 以下是从原合约复制的核心功能函数
    
    function _purchaseTokenWithFixedRate(address _token, uint256 _usdcAmount) internal returns (uint256 tokenAmount) {
        if (_token == usdcToken) {
            return _usdcAmount;
        }
        
        uint256 fixedRate = uniswapIntegration.getFixedRate(_token);
        require(fixedRate > 0, "Fixed rate not set for token");
        
        uint8 tokenDecimals = _getTokenDecimals(_token);
        tokenAmount = (_usdcAmount * (10 ** tokenDecimals)) / fixedRate;
        
        IERC20(usdcToken).approve(address(uniswapIntegration), _usdcAmount);
        
        uint256 actualAmount = uniswapIntegration.swapExactInputSingle(
            usdcToken,
            _token,
            _usdcAmount,
            address(this),
            3000
        );
        
        return tokenAmount;
    }
    
    function _getTokenDecimals(address _token) internal view returns (uint8 decimals) {
        try IERC20Metadata(_token).decimals() returns (uint8 tokenDecimals) {
            return tokenDecimals;
        } catch {
            return 18;
        }
    }

    function calculateNAV() public view returns (uint256 nav) {
        require(isInitialized, "Fund not initialized");
        
        uint256 usdcBalance = IERC20(usdcToken).balanceOf(address(this));
        
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

    function _getTokenValueInUSDC(address _token, uint256 _amount) internal view returns (uint256) {
        if (_token == usdcToken) {
            return _amount;
        }
        
        (int256 tokenPrice,) = priceOracle.getLatestPrice(_token);
        require(tokenPrice > 0, "Invalid token price");
        
        uint8 tokenDecimals = _getTokenDecimals(_token);
        uint256 divisor = 10 ** (8 + tokenDecimals - 6);
        return (_amount * uint256(tokenPrice)) / divisor;
    }

    function calculateMFCValue() public view returns (uint256 mfcValue) {
        require(isInitialized, "Fund not initialized");
        uint256 totalSupply = shareToken.totalSupply();
        if (totalSupply == 0) return 0;
        uint256 nav = calculateNAV();
        mfcValue = (nav * 1e18) / totalSupply;
    }

    // 管理函数
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setUSDCToken(address _usdcToken) external onlyOwner {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = _usdcToken;
        emit USDCTokenSet(_usdcToken);
    }

    function getUSDCAddress() public view returns (address) {
        require(usdcToken != address(0), "USDC token not set");
        return usdcToken;
    }
    
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    // 接收ETH
    receive() external payable {}
}