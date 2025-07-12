// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./FundShareToken.sol";
import "./ChainlinkPriceOracle.sol";
import "./UniswapIntegration.sol";

contract MockFund is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant BASIS_POINTS = 10000; // 100%
    uint256 public constant INITIAL_MFC_SUPPLY = 1000000 * 10**18; // 1 million MFC
    uint256 public constant INITIAL_USDC_AMOUNT = 1000000 * 10**6; // 1 million USDC
    uint256 public constant USDC_ALLOCATION = 5000; // 50% USDC
    uint256 public constant TOKEN_ALLOCATION = 5000; // 50% other tokens
    uint256 public constant MANAGEMENT_FEE_INTERVAL = 1 days; // Management fee collection interval

    // State variables
    FundShareToken public immutable shareToken;
    ChainlinkPriceOracle public immutable priceOracle;
    UniswapIntegration public immutable uniswapIntegration;
    
    address public usdcToken;
    address[] public supportedTokens;
    mapping(address => uint256) public mfcTokenRatio; // Amount of tokens per MFC
    uint256 public mfcUSDCAmount; // Amount of USDC per MFC
    
    bool public isInitialized;
    uint256 public minimumInvestment = 100 * 10**6; // 100 USDC
    uint256 public minimumRedemption = 100 * 10**6; // 100 USDC
    uint256 public managementFeeRate = 100; // 1%
    uint256 public lastFeeCollection;
    uint256 public totalManagementFeesCollected;

    // Events
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
        priceOracle = ChainlinkPriceOracle(_priceOracle);
        uniswapIntegration = UniswapIntegration(_uniswapIntegration);
        managementFeeRate = _managementFeeRate;
        lastFeeCollection = block.timestamp;
    }

    /**
     * @dev Add supported token
     * @param _token Token address
     * @param _allocation Allocation ratio (basis points)
     */
    function addSupportedToken(address _token, uint256 _allocation) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(!isInitialized, "Fund already initialized");
        require(supportedTokens.length < 4, "Maximum 4 tokens supported");
        
        supportedTokens.push(_token);
        emit SupportedTokenAdded(_token, _allocation);
    }

    /**
     * @dev Initialize fund with fixed asset portfolio
     * @param _initialUSDCAmount Initial USDC amount (must be 1 million USDC)
     */
    function initializeFund(uint256 _initialUSDCAmount) external onlyOwner {
        require(!isInitialized, "Fund already initialized");
        require(_initialUSDCAmount == INITIAL_USDC_AMOUNT, "Initial amount must be 1M USDC");
        require(supportedTokens.length == 4, "Must have exactly 4 supported tokens");
        
        // Transfer initial USDC
        IERC20(getUSDCAddress()).safeTransferFrom(msg.sender, address(this), _initialUSDCAmount);
        
        // Calculate purchase amount for each token (25% of 50%, i.e., 12.5% of total funds)
        uint256 tokenPurchaseAmount = (_initialUSDCAmount * TOKEN_ALLOCATION) / BASIS_POINTS; // 500k USDC
        uint256 perTokenAmount = tokenPurchaseAmount / 4; // 125k USDC per token
        
        // Purchase tokens and calculate token amount per MFC
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 tokenAmount = _purchaseTokenWithUSDC(token, perTokenAmount);
            
            // Calculate token amount per MFC (maintain token precision)
            mfcTokenRatio[token] = tokenAmount / (INITIAL_MFC_SUPPLY / 10**18);
        }
        
        // Calculate USDC amount per MFC (maintain USDC precision)
        mfcUSDCAmount = (_initialUSDCAmount * USDC_ALLOCATION) / (BASIS_POINTS * (INITIAL_MFC_SUPPLY / 10**18));
        
        // Mint initial MFC to deployer
        shareToken.mint(msg.sender, INITIAL_MFC_SUPPLY);
        
        isInitialized = true;
        
        emit FundInitialized(INITIAL_MFC_SUPPLY, _initialUSDCAmount);
    }

    /**
     * @dev Calculate fund Net Asset Value (NAV)
     * @return nav Fund NAV (priced in USDC)
     */
    function calculateNAV() public view returns (uint256 nav) {
        require(isInitialized, "Fund not initialized");
        
        // Calculate USDC portion
        uint256 usdcBalance = IERC20(getUSDCAddress()).balanceOf(address(this));
        
        // Calculate token portion
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
     * @dev Calculate value of single MFC
     * @return mfcValue USDC value of single MFC
     */
    function calculateMFCValue() public view returns (uint256 mfcValue) {
        require(isInitialized, "Fund not initialized");
        uint256 totalSupply = shareToken.totalSupply();
        if (totalSupply == 0) return 0;
        uint256 nav = calculateNAV();
        // Fix precision: nav(6 decimals) * 1e18 / totalSupply(18 decimals)
        mfcValue = (nav * 1e18) / totalSupply;
    }

    /**
     * @dev Invest USDC to get MFC
     * @param _usdcAmount Amount of USDC to invest
     */
    function invest(uint256 _usdcAmount) external nonReentrant whenNotPaused {
        require(isInitialized, "Fund not initialized");
        require(_usdcAmount >= minimumInvestment, "Investment below minimum");
        
        // Collect management fee
        _collectManagementFee();
        
        // Calculate MFC amount to receive (based on current NAV)
        uint256 mfcValue = calculateMFCValue();
        require(mfcValue > 0, "Invalid MFC value");
        
        uint256 mfcToMint = (_usdcAmount * 10**18) / mfcValue;
        require(mfcToMint > 0, "Invalid MFC amount");
        
        // Transfer USDC to contract
        IERC20(getUSDCAddress()).safeTransferFrom(msg.sender, address(this), _usdcAmount);
        
        // Purchase tokens according to fixed ratio
        uint256 tokenPurchaseAmount = (_usdcAmount * TOKEN_ALLOCATION) / BASIS_POINTS;
        uint256 perTokenAmount = tokenPurchaseAmount / 4;
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            _purchaseTokenWithUSDC(token, perTokenAmount);
        }
        
        // Mint MFC to investor
        shareToken.mint(msg.sender, mfcToMint);
        
        emit Investment(msg.sender, _usdcAmount, mfcToMint);
    }

    /**
     * @dev Redeem MFC to get USDC
     * @param _shareAmount Amount of MFC to redeem
     */
    function redeem(uint256 _shareAmount) external nonReentrant whenNotPaused {
        require(_shareAmount > 0, "Invalid share amount");
        require(FundShareToken(shareToken).balanceOf(msg.sender) >= _shareAmount, "Insufficient shares");
        
        // 收集管理费
        _collectManagementFee();
        
        // Calculate USDC value of redemption
        uint256 usdcValue = _calculateRedemptionValue(_shareAmount);
        require(usdcValue >= minimumRedemption, "Redemption below minimum");
        
        // Calculate redemption management fee (1%)
        uint256 redemptionFee = (usdcValue * managementFeeRate) / BASIS_POINTS;
        uint256 netAmount = usdcValue - redemptionFee;
        
        // Burn MFC
        shareToken.burn(msg.sender, _shareAmount);
        
        // Sell tokens proportionally for USDC
        _redeemTokensForUSDC(_shareAmount);
        
        // Transfer USDC to user (99%)
        IERC20(getUSDCAddress()).safeTransfer(msg.sender, netAmount);
        
        // Accumulate management fee (1%)
        totalManagementFeesCollected += redemptionFee;
        
        emit Redemption(msg.sender, _shareAmount, netAmount);
    }

    /**
     * @dev Purchase tokens with USDC
     * @param _token Token to purchase
     * @param _usdcAmount Amount of USDC
     * @return tokenAmount Amount of tokens received
     */
    function _purchaseTokenWithUSDC(address _token, uint256 _usdcAmount) internal returns (uint256 tokenAmount) {
        if (_token == getUSDCAddress()) {
            return _usdcAmount;
        }
        
        // Approve UniswapIntegration to spend USDC
        IERC20(getUSDCAddress()).approve(address(uniswapIntegration), _usdcAmount);
        
        try uniswapIntegration.swapExactInputSingle(
            getUSDCAddress(),
            _token,
            _usdcAmount,
            address(this),
            3000 // 0.3% fee
        ) returns (uint256 amountOut) {
            tokenAmount = amountOut;
        } catch {
            // If swap fails, keep USDC
            tokenAmount = 0;
        }
    }

    /**
     * @dev Calculate redemption value
     * @param _shareAmount Amount of MFC
     * @return usdcValue USDC value
     */
    function _calculateRedemptionValue(uint256 _shareAmount) internal view returns (uint256 usdcValue) {
        // Calculate USDC portion
        uint256 usdcPart = _shareAmount * mfcUSDCAmount;
        
        // Calculate token portion
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
     * @dev Redeem tokens for USDC
     * @param _shareAmount Amount of MFC
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
     * @dev Swap tokens for USDC
     * @param _token Token address
     * @param _amount Amount of tokens
     */
    function _swapTokenForUSDC(address _token, uint256 _amount) internal {
        if (_token == getUSDCAddress()) {
            return;
        }
        
        // Approve UniswapIntegration to spend token
        IERC20(_token).approve(address(uniswapIntegration), _amount);
        
        try uniswapIntegration.swapExactInputSingle(
            _token,
            getUSDCAddress(),
            _amount,
            address(this),
            3000 // 0.3% fee
        ) returns (uint256 /* amountOut */) {
            // Swap successful
        } catch {
            // If swap fails, transfer tokens directly to user
            IERC20(_token).safeTransfer(msg.sender, _amount);
        }
    }

    /**
     * @dev Get token value in USDC
     * @param _token Token address
     * @param _amount Amount of tokens
     * @return usdcValue USDC value
     */
    function _getTokenValueInUSDC(address _token, uint256 _amount) internal view returns (uint256 usdcValue) {
        if (_amount == 0) return 0;
        if (_token == getUSDCAddress()) return _amount;
        
        (int256 tokenPrice, ) = priceOracle.getLatestPrice(_token);
        require(tokenPrice > 0, "Invalid token price");
        
        // Chainlink price is 8 decimals, convert to USDC value (6 decimals precision)
        // Formula: (amount * price) / (10^8) = USDC value
        return (_amount * uint256(tokenPrice)) / (10 ** 8);
    }

    /**
     * @dev Collect management fee
     */
    function _collectManagementFee() internal {
        if (block.timestamp < lastFeeCollection + MANAGEMENT_FEE_INTERVAL) return;
        
        // Calculate circulating MFC amount (excluding issuer's holdings)
        uint256 totalSupply = FundShareToken(shareToken).totalSupply();
        uint256 ownerBalance = FundShareToken(shareToken).balanceOf(owner());
        uint256 circulatingSupply = totalSupply - ownerBalance;
        
        if (circulatingSupply == 0) {
            lastFeeCollection = block.timestamp;
            return;
        }
        
        // Calculate management fee (1%)
        uint256 feeAmount = (circulatingSupply * managementFeeRate) / BASIS_POINTS;
        
        if (feeAmount > 0) {
            // Deduct management fee from USDC balance
            uint256 usdcBalance = IERC20(getUSDCAddress()).balanceOf(address(this));
            uint256 usdcFeeAmount = 0;
            
            if (usdcBalance >= feeAmount) {
                usdcFeeAmount = feeAmount;
            } else {
                usdcFeeAmount = usdcBalance;
                // Need to sell tokens to supplement USDC
                uint256 remainingFee = feeAmount - usdcBalance;
                _sellTokensForManagementFee(remainingFee);
            }
            
            // Accumulate management fee
            totalManagementFeesCollected += feeAmount;
            lastFeeCollection = block.timestamp;
            
            emit ManagementFeeCollected(feeAmount, block.timestamp, totalManagementFeesCollected);
        }
    }

    /**
     * @dev Sell tokens to collect management fee
     * @param _requiredUSDC Required USDC amount
     */
    function _sellTokensForManagementFee(uint256 _requiredUSDC) internal {
        uint256 totalSold = 0;
        
        // Sell tokens proportionally
        for (uint256 i = 0; i < supportedTokens.length && totalSold < _requiredUSDC; i++) {
            address token = supportedTokens[i];
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            
            if (tokenBalance > 0) {
                // Calculate amount of tokens to sell
                uint256 remainingNeeded = _requiredUSDC - totalSold;
                uint256 tokenValue = _getTokenValueInUSDC(token, tokenBalance);
                
                if (tokenValue > 0) {
                    uint256 tokensToSell = tokenBalance;
                    if (tokenValue > remainingNeeded) {
                        // Sell proportionally
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

    // Management functions
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
    
    // Query functions
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
     * @dev Get total accumulated management fees
     */
    function getTotalManagementFees() external view returns (uint256) {
        return totalManagementFeesCollected;
    }
    
    /**
     * @dev Get circulating MFC amount (excluding issuer's holdings)
     */
    function getCirculatingSupply() external view returns (uint256) {
        uint256 totalSupply = FundShareToken(shareToken).totalSupply();
        uint256 ownerBalance = FundShareToken(shareToken).balanceOf(owner());
        return totalSupply - ownerBalance;
    }

    /**
     * @dev Get fund NAV information
     */
    function getFundNAV() external view returns (uint256 nav, uint256 mfcValue, uint256 totalSupply) {
        nav = calculateNAV();
        mfcValue = calculateMFCValue();
        totalSupply = shareToken.totalSupply();
    }
    
    /**
     * @dev Get fund token balances
     * @return tokens Array of token addresses (including USDC)
     * @return balances Array of token balances
     * @return decimals Array of token decimals
     */
    function getFundTokenBalances() external view returns (
        address[] memory tokens,
        uint256[] memory balances,
        uint8[] memory decimals
    ) {
        // Include USDC + supported tokens
        uint256 totalTokens = supportedTokens.length + 1;
        tokens = new address[](totalTokens);
        balances = new uint256[](totalTokens);
        decimals = new uint8[](totalTokens);
        
        // Add USDC first
        tokens[0] = getUSDCAddress();
        balances[0] = IERC20(getUSDCAddress()).balanceOf(address(this));
        decimals[0] = 6; // USDC has 6 decimals
        
        // Add supported tokens
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            tokens[i + 1] = supportedTokens[i];
            balances[i + 1] = IERC20(supportedTokens[i]).balanceOf(address(this));
            
            // Get token decimals (assume 18 for most tokens, 8 for WBTC)
            // This is a simplified approach - in production, you'd query the token contract
            decimals[i + 1] = 18; // Default to 18 decimals
        }
    }
}