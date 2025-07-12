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

contract MockFund is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant BASIS_POINTS = 10000; // 100%
    uint256 public constant INITIAL_MFC_SUPPLY = 1000000 * 10**18; // 1 million MFC
    uint256 public constant INITIAL_USDC_AMOUNT = 1000000 * 10**6; // 1 million USDC
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

    // Events
    event FundInitialized(uint256 initialSupply, uint256 initialUSDC);
    event Investment(address indexed investor, uint256 usdcAmount, uint256 mfcAmount);
    event Redemption(address indexed investor, uint256 shareAmount, uint256 usdcAmount);
    event ManagementFeeCollected(uint256 feeAmount, uint256 timestamp, uint256 totalFees);
    event ManagementFeeWithdrawn(uint256 amount, address to);
    event ManagementFeeUSDCCollected(uint256 usdcAmount, uint256 timestamp);
    event SupportedTokenAdded(address token, uint256 allocation);
    event TokenCompositionSet(address token, uint256 amountPerMFC);

    constructor(
        string memory _shareTokenName,
        string memory _shareTokenSymbol,
        address _initialOwner,
        uint256 _managementFeeRate,
        address _priceOracle,
        address _uniswapIntegration
    ) Ownable(_initialOwner) {
        require(_priceOracle != address(0), "Invalid price oracle address");
        require(_uniswapIntegration != address(0), "Invalid uniswap integration address");
        require(_managementFeeRate <= 1000, "Management fee rate too high"); // Max 10%
        
        shareToken = new FundShareToken(_shareTokenName, _shareTokenSymbol, address(this));
        // Set this contract as the fund contract for the share token
        shareToken.setFundContract(address(this));
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
     * @dev Initialize fund with fixed rates and precise token allocation
     * @param _initialUSDCAmount Initial USDC amount (must be 1 million USDC)
     */
    function initializeFund(uint256 _initialUSDCAmount) external onlyOwner {
        require(!isInitialized, "Fund already initialized");
        require(_initialUSDCAmount == INITIAL_USDC_AMOUNT, "Initial amount must be 1M USDC");
        require(supportedTokens.length == 4, "Must have exactly 4 supported tokens");
        
        // Note: Fixed rate mode should be enabled before calling this function
        // We don't call setFixedRateMode here to avoid ownership issues
        
        // Transfer initial USDC
        IERC20(getUSDCAddress()).safeTransferFrom(msg.sender, address(this), _initialUSDCAmount);
        
        // Calculate USDC allocation: 50% stays as USDC
        uint256 usdcToKeep = (_initialUSDCAmount * USDC_ALLOCATION) / BASIS_POINTS; // 500,000 USDC
        uint256 usdcForTokens = _initialUSDCAmount - usdcToKeep; // 500,000 USDC
        
        // Each token gets 12.5% of total fund (125,000 USDC worth)
        uint256 perTokenUSDC = usdcForTokens / 4; // 125,000 USDC per token
        
        // Purchase tokens using fixed rates and calculate precise composition
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 tokenAmount = _purchaseTokenWithFixedRate(token, perTokenUSDC);
            
            // Calculate exact token amount per MFC
            // tokenAmount has token's native decimals
            // INITIAL_MFC_SUPPLY has 18 decimals
            // Scale tokenAmount to 18 decimals for consistent storage
            uint8 tokenDecimals = _getTokenDecimals(token);
            uint256 scaledTokenAmount;
            if (tokenDecimals <= 18) {
                scaledTokenAmount = tokenAmount * (10 ** (18 - tokenDecimals));
            } else {
                scaledTokenAmount = tokenAmount / (10 ** (tokenDecimals - 18));
            }
            // Calculate ratio: scaledTokenAmount (18 decimals) / INITIAL_MFC_SUPPLY (18 decimals)
            // This gives us the ratio with 18 decimal places of precision
            mfcTokenRatio[token] = scaledTokenAmount / (INITIAL_MFC_SUPPLY / 1e18);
            
            emit TokenCompositionSet(token, mfcTokenRatio[token]);
        }
        
        // Calculate USDC amount per MFC
        // usdcToKeep has 6 decimals, INITIAL_MFC_SUPPLY has 18 decimals
        mfcUSDCAmount = (usdcToKeep * 1e18) / INITIAL_MFC_SUPPLY;
        
        // Note: Fixed rate mode should be disabled after initialization by the deployer
        // We don't call setFixedRateMode here to avoid ownership issues
        
        // Mint initial MFC to contract (not deployer)
        // Since this contract is the owner of shareToken, we can call mint directly
        shareToken.mint(address(this), INITIAL_MFC_SUPPLY);
        
        isInitialized = true;
        
        emit FundInitialized(INITIAL_MFC_SUPPLY, _initialUSDCAmount);
    }
    
    /**
     * @dev Purchase tokens using fixed rates
     * @param _token Token to purchase
     * @param _usdcAmount Amount of USDC to spend
     * @return tokenAmount Amount of tokens received
     */
    function _purchaseTokenWithFixedRate(address _token, uint256 _usdcAmount) internal returns (uint256 tokenAmount) {
        if (_token == getUSDCAddress()) {
            return _usdcAmount;
        }
        
        // Get fixed rate (USDC per token, scaled by 1e6)
        uint256 fixedRate = uniswapIntegration.getFixedRate(_token);
        require(fixedRate > 0, "Fixed rate not set for token");
        
        // Calculate token amount based on fixed rate
        // For example: 125,000 USDC (125000 * 1e6) / 115,000 USDC per WBTC (115000 * 1e6) = 1.087 WBTC
        // fixedRate is scaled by 1e6, _usdcAmount is scaled by 1e6
        // Result should be in token's native decimals
        
        // Get token decimals
        uint8 tokenDecimals = _getTokenDecimals(_token);
        
        // Simple calculation: tokenAmount = _usdcAmount / fixedRate * 10^tokenDecimals
        // _usdcAmount is scaled by 1e6, fixedRate is scaled by 1e6
        // So: tokenAmount = (_usdcAmount * 10^tokenDecimals) / fixedRate
        tokenAmount = (_usdcAmount * (10 ** tokenDecimals)) / fixedRate;
        
        // Approve and execute swap
        IERC20(getUSDCAddress()).approve(address(uniswapIntegration), _usdcAmount);
        
        uint256 actualAmount = uniswapIntegration.swapExactInputSingle(
            getUSDCAddress(),
            _token,
            _usdcAmount,
            address(this),
            3000
        );
        
        // Use calculated amount for precision
        return tokenAmount;
    }
    
    /**
     * @dev Get token decimals
     * @param _token Token address
     * @return decimals Token decimals
     */
    function _getTokenDecimals(address _token) internal view returns (uint8 decimals) {
        // For known tokens, return specific decimals
        // In production, you would query the token contract
        try IERC20Metadata(_token).decimals() returns (uint8 tokenDecimals) {
            return tokenDecimals;
        } catch {
            // Fallback to 18 decimals if query fails
            return 18;
        }
    }

    /**
     * @dev Calculate fund Net Asset Value (NAV) using real-time Chainlink prices
     * @return nav Fund NAV (priced in USDC)
     */
    function calculateNAV() public view returns (uint256 nav) {
        require(isInitialized, "Fund not initialized");
        
        // Calculate USDC portion
        uint256 usdcBalance = IERC20(getUSDCAddress()).balanceOf(address(this));
        
        // Calculate token portion using real-time Chainlink prices
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
     * @dev Calculate value of single MFC using real-time prices
     * @return mfcValue USDC value of single MFC (6 decimals)
     */
    function calculateMFCValue() public view returns (uint256 mfcValue) {
        require(isInitialized, "Fund not initialized");
        uint256 totalSupply = shareToken.totalSupply();
        if (totalSupply == 0) return 0;
        uint256 nav = calculateNAV();
        // nav(6 decimals) * 1e18 / totalSupply(18 decimals) = mfcValue(6 decimals)
        // Simplified: nav * 1e18 / totalSupply
        mfcValue = (nav * 1e18) / totalSupply;
    }
    
    /**
     * @dev Calculate theoretical MFC value based on fixed composition and real-time prices
     * @return theoreticalValue Theoretical USDC value of single MFC
     */
    function calculateTheoreticalMFCValue() public view returns (uint256 theoreticalValue) {
        require(isInitialized, "Fund not initialized");
        
        // Calculate USDC portion
        uint256 usdcPortion = mfcUSDCAmount / 1e12; // Convert from 18 decimals to 6 decimals
        
        // Calculate token portion using real-time prices
        uint256 tokenPortion = 0;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 tokenAmountPerMFC = mfcTokenRatio[token]; // This is scaled by 1e18
            
            // Convert to actual token amount (convert back to token's native decimals)
            uint8 tokenDecimals = _getTokenDecimals(token);
            uint256 actualTokenAmount;
            if (tokenDecimals <= 18) {
                actualTokenAmount = tokenAmountPerMFC / (10 ** (18 - tokenDecimals)) / 1e18;
            } else {
                actualTokenAmount = tokenAmountPerMFC * (10 ** (tokenDecimals - 18)) / 1e18;
            }
            
            if (actualTokenAmount > 0) {
                uint256 tokenValue = _getTokenValueInUSDC(token, actualTokenAmount);
                tokenPortion += tokenValue;
            }
        }
        
        theoreticalValue = usdcPortion + tokenPortion;
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
        
        uint256 mfcToTransfer = (_usdcAmount * 1e18) / mfcValue;
        require(mfcToTransfer > 0, "Invalid MFC amount");
        
        // Check if contract has enough MFC to sell
        require(shareToken.balanceOf(address(this)) >= mfcToTransfer, "Insufficient MFC in contract");
        
        // Transfer USDC to contract
        IERC20(getUSDCAddress()).safeTransferFrom(msg.sender, address(this), _usdcAmount);
        
        // Purchase tokens according to fixed ratio
        uint256 tokenPurchaseAmount = (_usdcAmount * TOKEN_ALLOCATION) / BASIS_POINTS;
        uint256 perTokenAmount = tokenPurchaseAmount / 4;
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            _purchaseTokenWithUSDC(token, perTokenAmount);
        }
        
        // Transfer MFC from contract to investor
        shareToken.transfer(msg.sender, mfcToTransfer);
        
        emit Investment(msg.sender, _usdcAmount, mfcToTransfer);
    }

    /**
     * @dev Redeem MFC to get USDC (using real-time prices)
     * @param _shareAmount Amount of MFC to redeem
     */
    function redeem(uint256 _shareAmount) external nonReentrant whenNotPaused {
        require(_shareAmount > 0, "Invalid share amount");
        require(shareToken.balanceOf(msg.sender) >= _shareAmount, "Insufficient shares");
        
        // Collect management fee
        _collectManagementFee();
        
        // Calculate USDC value of redemption using real-time prices
        uint256 usdcValue = _calculateRedemptionValue(_shareAmount);
        require(usdcValue >= minimumRedemption, "Redemption below minimum");
        
        // Calculate redemption management fee (1%)
        uint256 redemptionFee = (usdcValue * managementFeeRate) / BASIS_POINTS;
        uint256 netAmount = usdcValue - redemptionFee;
        
        // Transfer MFC from investor back to contract
        shareToken.transferFrom(msg.sender, address(this), _shareAmount);
        
        // Sell tokens proportionally for USDC using real-time prices
        _redeemTokensForUSDC(_shareAmount);
        
        // Transfer USDC to user
        IERC20(getUSDCAddress()).safeTransfer(msg.sender, netAmount);
        
        // 将赎回手续费累加到管理费USDC余额
        managementFeeUSDCBalance += redemptionFee;
        totalManagementFeesCollected += redemptionFee;
        
        emit Redemption(msg.sender, _shareAmount, netAmount);
    }

    /**
     * @dev Purchase tokens with USDC (using real-time prices)
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
            3000
        ) returns (uint256 amountOut) {
            tokenAmount = amountOut;
        } catch {
            // If swap fails, keep USDC
            tokenAmount = 0;
        }
    }

    /**
     * @dev Calculate redemption value using real-time prices
     * @param _shareAmount Amount of MFC
     * @return usdcValue USDC value
     */
    function _calculateRedemptionValue(uint256 _shareAmount) internal view returns (uint256 usdcValue) {
        // Calculate proportional USDC amount
        uint256 usdcPart = (_shareAmount * mfcUSDCAmount) / 1e18;
        
        // Calculate proportional token amounts and their real-time values
        uint256 tokenPart = 0;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 tokenAmountPerMFC = (_shareAmount * mfcTokenRatio[token]) / 1e18;
            
            // Convert to actual token amount (convert back to token's native decimals)
            uint8 tokenDecimals = _getTokenDecimals(token);
            uint256 actualTokenAmount;
            if (tokenDecimals <= 18) {
                actualTokenAmount = tokenAmountPerMFC / (10 ** (18 - tokenDecimals));
            } else {
                actualTokenAmount = tokenAmountPerMFC * (10 ** (tokenDecimals - 18)) / 1e18;
            }
            
            if (actualTokenAmount > 0) {
                tokenPart += _getTokenValueInUSDC(token, actualTokenAmount);
            }
        }
        
        usdcValue = usdcPart + tokenPart;
    }

    /**
     * @dev Redeem tokens for USDC using real-time prices
     * @param _shareAmount Amount of MFC
     */
    function _redeemTokensForUSDC(uint256 _shareAmount) internal {
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 tokenAmountPerMFC = (_shareAmount * mfcTokenRatio[token]) / 1e18;
            
            // Convert to actual token amount (convert back to token's native decimals)
            uint8 tokenDecimals = _getTokenDecimals(token);
            uint256 actualTokenAmount;
            if (tokenDecimals <= 18) {
                actualTokenAmount = tokenAmountPerMFC / (10 ** (18 - tokenDecimals));
            } else {
                actualTokenAmount = tokenAmountPerMFC * (10 ** (tokenDecimals - 18)) / 1e18;
            }
            
            if (actualTokenAmount > 0) {
                uint256 tokenBalance = IERC20(token).balanceOf(address(this));
                if (tokenBalance >= actualTokenAmount) {
                    _swapTokenForUSDC(token, actualTokenAmount);
                }
            }
        }
    }

    /**
     * @dev Swap tokens for USDC using real-time prices
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
            3000
        ) returns (uint256 /* amountOut */) {
            // Swap successful
        } catch {
            // If swap fails, transfer tokens directly to user
            IERC20(_token).safeTransfer(msg.sender, _amount);
        }
    }

    /**
     * @dev Get token value in USDC using real-time Chainlink prices
     * @param _token Token address
     * @param _amount Amount of tokens
     * @return usdcValue USDC value
     */
    function _getTokenValueInUSDC(address _token, uint256 _amount) internal view returns (uint256 usdcValue) {
        if (_amount == 0) return 0;
        if (_token == getUSDCAddress()) return _amount;
        
        (int256 tokenPrice, ) = priceOracle.getLatestPrice(_token);
        require(tokenPrice > 0, "Invalid token price");
        
        // Get token decimals
        uint8 tokenDecimals = _getTokenDecimals(_token);
        
        // Chainlink price is 8 decimals, token amount has tokenDecimals, result should be 6 decimals (USDC)
        // Formula: (amount * price) / (10^(8 + tokenDecimals - 6))
        uint256 divisor = 10 ** (8 + tokenDecimals - 6);
        return (_amount * uint256(tokenPrice)) / divisor;
    }

    /**
     * @dev Collect management fee
     */
    function _collectManagementFee() internal {
        if (block.timestamp < lastFeeCollection + MANAGEMENT_FEE_INTERVAL) return;
        
        // Calculate circulating MFC amount (excluding issuer's holdings)
        uint256 totalSupply = shareToken.totalSupply();
        uint256 ownerBalance = shareToken.balanceOf(owner());
        uint256 circulatingSupply = totalSupply - ownerBalance;
        
        if (circulatingSupply == 0) {
            lastFeeCollection = block.timestamp;
            return;
        }
        
        // Calculate management fee value in USDC
        uint256 mfcValue = calculateMFCValue();
        uint256 feeAmountMFC = (circulatingSupply * managementFeeRate) / BASIS_POINTS;
        uint256 feeAmountUSDC = (feeAmountMFC * mfcValue) / 1e18;
        
        if (feeAmountUSDC > 0) {
            // 实际分离USDC到管理费余额
            uint256 usdcBalance = IERC20(getUSDCAddress()).balanceOf(address(this));
            if (usdcBalance >= feeAmountUSDC) {
                managementFeeUSDCBalance += feeAmountUSDC;
            } else {
                // 如果USDC不足，卖出部分代币获取USDC
                _sellTokensForManagementFee(feeAmountUSDC - usdcBalance);
                managementFeeUSDCBalance += feeAmountUSDC;
            }
            
            totalManagementFeesCollected += feeAmountUSDC;
            lastFeeCollection = block.timestamp;
            
            emit ManagementFeeCollected(feeAmountUSDC, block.timestamp, totalManagementFeesCollected);
            emit ManagementFeeUSDCCollected(feeAmountUSDC, block.timestamp);
        }
    }

    /**
     * @dev 卖出代币获取USDC用于管理费
     * @param _usdcNeeded 需要的USDC数量
     */
    function _sellTokensForManagementFee(uint256 _usdcNeeded) internal {
        uint256 usdcObtained = 0;
        
        for (uint256 i = 0; i < supportedTokens.length && usdcObtained < _usdcNeeded; i++) {
            address token = supportedTokens[i];
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            
            if (tokenBalance > 0) {
                // 计算需要卖出的代币数量
                uint256 tokenValue = _getTokenValueInUSDC(token, tokenBalance);
                uint256 remainingNeeded = _usdcNeeded - usdcObtained;
                
                if (tokenValue > remainingNeeded) {
                    // 只卖出部分代币
                    uint256 tokenToSell = (tokenBalance * remainingNeeded) / tokenValue;
                    _swapTokenForUSDC(token, tokenToSell);
                    usdcObtained += remainingNeeded;
                } else {
                    // 卖出全部代币
                    _swapTokenForUSDC(token, tokenBalance);
                    usdcObtained += tokenValue;
                }
            }
        }
    }
    
    /**
     * @dev 一键提取所有管理费到部署者地址
     */
    function withdrawAllManagementFees() external onlyOwner {
        require(managementFeeUSDCBalance > 0, "No management fees to withdraw");
        
        uint256 withdrawAmount = managementFeeUSDCBalance;
        managementFeeUSDCBalance = 0;
        
        // 转账USDC到部署者地址
        IERC20(getUSDCAddress()).safeTransfer(owner(), withdrawAmount);
        
        emit ManagementFeeWithdrawn(withdrawAmount, owner());
    }
    
    /**
     * @dev 查询可提取的管理费余额
     */
    function getWithdrawableManagementFees() external view returns (uint256) {
        return managementFeeUSDCBalance;
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
        return (shareToken.totalSupply(), INITIAL_MFC_SUPPLY, isInitialized);
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
        mfcAmount = (_usdcAmount * 1e18) / mfcValue;
    }
    
    function getRedemptionPreview(uint256 _shareAmount) external view returns (uint256 usdcAmount) {
        require(isInitialized, "Fund not initialized");
        usdcAmount = _calculateRedemptionValue(_shareAmount);
    }

    function getTotalManagementFees() external view returns (uint256) {
        return totalManagementFeesCollected;
    }
    
    function getCirculatingSupply() external view returns (uint256) {
        uint256 totalSupply = shareToken.totalSupply();
        uint256 ownerBalance = shareToken.balanceOf(owner());
        return totalSupply - ownerBalance;
    }

    function getFundNAV() external view returns (uint256 nav, uint256 mfcValue, uint256 totalSupply) {
        nav = calculateNAV();
        mfcValue = calculateMFCValue();
        totalSupply = shareToken.totalSupply();
    }
    
    function getFundTokenBalances() external view returns (
        address[] memory tokens,
        uint256[] memory balances,
        uint8[] memory decimals
    ) {
        uint256 totalTokens = supportedTokens.length + 1;
        tokens = new address[](totalTokens);
        balances = new uint256[](totalTokens);
        decimals = new uint8[](totalTokens);
        
        // Add USDC first
        tokens[0] = getUSDCAddress();
        balances[0] = IERC20(getUSDCAddress()).balanceOf(address(this));
        decimals[0] = 6;
        
        // Add supported tokens
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            tokens[i + 1] = supportedTokens[i];
            balances[i + 1] = IERC20(supportedTokens[i]).balanceOf(address(this));
            decimals[i + 1] = _getTokenDecimals(supportedTokens[i]);
        }
    }
}