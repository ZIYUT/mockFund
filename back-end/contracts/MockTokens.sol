// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MockUSDC.sol";

/**
 * @title MockWETH
 * @dev 模拟Wrapped Ethereum代币
 */
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
        require(amount <= 10 * 10**decimals(), "Amount too large"); // 最多10 WETH
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount);
    }
    
    function getTestTokens() external {
        uint256 testAmount = 1 * 10**decimals(); // 1 WETH
        _mint(msg.sender, testAmount);
        emit TokensMinted(msg.sender, testAmount);
    }
}

/**
 * @title MockWBTC
 * @dev 模拟Wrapped Bitcoin代币
 */
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
        return 8; // Bitcoin使用8位小数
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    function faucet(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= 1 * 10**decimals(), "Amount too large"); // 最多1 WBTC
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount);
    }
    
    function getTestTokens() external {
        uint256 testAmount = 1 * 10**(decimals() - 1); // 0.1 WBTC
        _mint(msg.sender, testAmount);
        emit TokensMinted(msg.sender, testAmount);
    }
}

/**
 * @title MockLINK
 * @dev 模拟Chainlink代币
 */
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
        require(amount <= 1000 * 10**decimals(), "Amount too large"); // 最多1000 LINK
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount);
    }
    
    function getTestTokens() external {
        uint256 testAmount = 100 * 10**decimals(); // 100 LINK
        _mint(msg.sender, testAmount);
        emit TokensMinted(msg.sender, testAmount);
    }
}

/**
 * @title MockUNI
 * @dev 模拟Uniswap代币
 */
contract MockUNI is ERC20, Ownable {
    
    event TokensMinted(address indexed to, uint256 amount);
    
    constructor(address _initialOwner) 
        ERC20("Mock Uniswap Token", "UNI") 
        Ownable(_initialOwner) 
    {
        require(_initialOwner != address(0), "Invalid owner address");
        _mint(_initialOwner, 10000 * 10**decimals()); // 10,000 UNI
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
        require(amount <= 1000 * 10**decimals(), "Amount too large"); // 最多1000 UNI
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount);
    }
    
    function getTestTokens() external {
        uint256 testAmount = 50 * 10**decimals(); // 50 UNI
        _mint(msg.sender, testAmount);
        emit TokensMinted(msg.sender, testAmount);
    }
}

/**
 * @title TokenFactory
 * @dev 简化的代币工厂合约，用于管理模拟代币地址
 */
contract TokenFactory is Ownable {
    
    // 已部署的代币合约地址
    mapping(string => address) public deployedTokens;
    address[] public allTokens;
    
    // 事件
    event TokenRegistered(string indexed symbol, address indexed tokenAddress);
    
    constructor(address _initialOwner) Ownable(_initialOwner) {
        require(_initialOwner != address(0), "Invalid owner address");
    }
    
    /**
     * @dev 注册代币地址
     * @param symbol 代币符号
     * @param tokenAddress 代币地址
     */
    function registerToken(string memory symbol, address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        require(deployedTokens[symbol] == address(0), "Token already registered");
        
        deployedTokens[symbol] = tokenAddress;
        allTokens.push(tokenAddress);
        emit TokenRegistered(symbol, tokenAddress);
    }
    
    /**
     * @dev 获取代币地址
     * @param symbol 代币符号
     * @return 代币合约地址
     */
    function getTokenAddress(string memory symbol) external view returns (address) {
        return deployedTokens[symbol];
    }
    
    /**
     * @dev 获取所有已部署的代币地址
     * @return 代币地址数组
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    /**
     * @dev 检查代币是否已部署
     * @param symbol 代币符号
     * @return 是否已部署
     */
    function isTokenDeployed(string memory symbol) external view returns (bool) {
        return deployedTokens[symbol] != address(0);
    }
}