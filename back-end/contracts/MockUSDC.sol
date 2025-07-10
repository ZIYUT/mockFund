// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    
    // Events
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event FaucetUsed(address indexed user, uint256 amount);

    constructor(address _initialOwner) 
        ERC20("Mock USD Coin", "USDC") 
        Ownable(_initialOwner) 
    {
        require(_initialOwner != address(0), "Invalid owner address");
        
        // Mint initial supply to deployer
        _mint(_initialOwner, 1000000 * 10**decimals()); // 1 million USDC
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function burn(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            require(amounts[i] > 0, "Invalid amount");
            
            _mint(recipients[i], amounts[i]);
            emit TokensMinted(recipients[i], amounts[i]);
        }
    }

    function faucet(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= 10000 * 10**decimals(), "Amount too large"); // Maximum 10,000 USDC per request
        
        _mint(msg.sender, amount);
        emit FaucetUsed(msg.sender, amount);
    }

    function getTestTokens() external {
        uint256 testAmount = 1000 * 10**decimals(); // 1000 USDC
        _mint(msg.sender, testAmount);
        emit FaucetUsed(msg.sender, testAmount);
    }
    
    /**
     * @dev 为测试目的快速获取大量USDC
     */
    function getLargeAmount() external {
        uint256 largeAmount = 100000 * 10**decimals(); // 100,000 USDC
        _mint(msg.sender, largeAmount);
        emit FaucetUsed(msg.sender, largeAmount);
    }
    
    /**
     * @dev 为合约地址铸造USDC（用于测试）
     */
    function mintForContract(address contractAddress, uint256 amount) external onlyOwner {
        require(contractAddress != address(0), "Invalid contract address");
        require(amount > 0, "Amount must be greater than zero");
        
        _mint(contractAddress, amount);
        emit TokensMinted(contractAddress, amount);
    }
}