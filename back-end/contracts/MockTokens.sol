// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockWETH is ERC20, Ownable {
    
    event TokensMinted(address indexed to, uint256 amount);
    
    constructor(address _initialOwner) 
        ERC20("Mock Wrapped Ether", "WETH") 
        Ownable(_initialOwner) 
    {
        require(_initialOwner != address(0), "Invalid owner address");
        _mint(_initialOwner, 1000 * 10**decimals()); // 1000 WETH
    }
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    function faucet(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= 10 * 10**decimals(), "Amount too large"); // Maximum 10 WETH
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount);
    }
    
    function getTestTokens() external {
        uint256 testAmount = 1 * 10**decimals(); // 1 WETH
        _mint(msg.sender, testAmount);
        emit TokensMinted(msg.sender, testAmount);
    }
}

contract MockWBTC is ERC20, Ownable {
    
    event TokensMinted(address indexed to, uint256 amount);
    
    constructor(address _initialOwner) 
        ERC20("Mock Wrapped Bitcoin", "WBTC") 
        Ownable(_initialOwner) 
    {
        require(_initialOwner != address(0), "Invalid owner address");
        _mint(_initialOwner, 10 * 10**decimals()); // 10 WBTC
    }
    
    function decimals() public pure override returns (uint8) {
        return 8; // Bitcoin uses 8 decimal places
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    function faucet(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= 1 * 10**decimals(), "Amount too large"); // Maximum 1 WBTC
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount);
    }
    
    function getTestTokens() external {
        uint256 testAmount = 1 * 10**(decimals() - 1); // 0.1 WBTC
        _mint(msg.sender, testAmount);
        emit TokensMinted(msg.sender, testAmount);
    }
}

contract MockLINK is ERC20, Ownable {
    
    event TokensMinted(address indexed to, uint256 amount);
    
    constructor(address _initialOwner) 
        ERC20("Mock Chainlink Token", "LINK") 
        Ownable(_initialOwner) 
    {
        require(_initialOwner != address(0), "Invalid owner address");
        _mint(_initialOwner, 10000 * 10**decimals()); // 10,000 LINK
    }
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    function faucet(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= 1000 * 10**decimals(), "Amount too large"); // Maximum 1000 LINK
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount);
    }
    
    function getTestTokens() external {
        uint256 testAmount = 100 * 10**decimals(); // 100 LINK
        _mint(msg.sender, testAmount);
        emit TokensMinted(msg.sender, testAmount);
    }
}

contract MockDAI is ERC20, Ownable {
    
    event TokensMinted(address indexed to, uint256 amount);
    
    constructor(address _initialOwner) 
        ERC20("Mock Dai Stablecoin", "DAI") 
        Ownable(_initialOwner) 
    {
        require(_initialOwner != address(0), "Invalid owner address");
        _mint(_initialOwner, 1000000 * 10**decimals()); // 1,000,000 DAI
    }
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    function faucet(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= 10000 * 10**decimals(), "Amount too large"); // Maximum 10,000 DAI
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount);
    }
    
    function getTestTokens() external {
        uint256 testAmount = 1000 * 10**decimals(); // 1000 DAI
        _mint(msg.sender, testAmount);
        emit TokensMinted(msg.sender, testAmount);
    }
}

/**
 * @title MockTokensFactory
 * @dev Factory contract for deploying and managing all mock tokens
 */
contract MockTokensFactory is Ownable {
    
    // Token address mappings
    address public wbtc;
    address public weth;
    address public link;
    address public dai;
    
    // Events
    event TokenDeployed(string symbol, address tokenAddress);
    
    constructor(address _initialOwner) Ownable(_initialOwner) {
        require(_initialOwner != address(0), "Invalid owner address");
    }
    
    /**
     * @dev Deploy all tokens
     */
    function deployAllTokens() external onlyOwner {
        // Deploy WBTC
        MockWBTC wbtcToken = new MockWBTC(owner());
        wbtc = address(wbtcToken);
        emit TokenDeployed("WBTC", wbtc);
        
        // Deploy WETH
        MockWETH wethToken = new MockWETH(owner());
        weth = address(wethToken);
        emit TokenDeployed("WETH", weth);
        
        // Deploy LINK
        MockLINK linkToken = new MockLINK(owner());
        link = address(linkToken);
        emit TokenDeployed("LINK", link);
        
        // Deploy DAI
        MockDAI daiToken = new MockDAI(owner());
        dai = address(daiToken);
        emit TokenDeployed("DAI", dai);
    }
    
    /**
     * @dev Get all token addresses
     */
    function getAllTokenAddresses() external view returns (
        address wbtcAddress,
        address wethAddress,
        address linkAddress,
        address daiAddress
    ) {
        return (wbtc, weth, link, dai);
    }
    
    /**
     * @dev Check if all tokens are deployed
     */
    function areAllTokensDeployed() external view returns (bool) {
        return wbtc != address(0) && weth != address(0) && 
               link != address(0) && dai != address(0);
    }
}