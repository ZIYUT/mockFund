// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev 模拟USDC代币合约，用于测试环境
 * 具有铸造功能，方便测试时获取代币
 */
contract MockUSDC is ERC20, Ownable {
    
    // 事件
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    
    /**
     * @dev 构造函数
     * @param _initialOwner 初始所有者地址
     */
    constructor(address _initialOwner) 
        ERC20("Mock USD Coin", "USDC") 
        Ownable(_initialOwner) 
    {
        require(_initialOwner != address(0), "Invalid owner address");
        
        // 给部署者铸造初始供应量
        _mint(_initialOwner, 1000000 * 10**decimals()); // 100万 USDC
    }
    
    /**
     * @dev 返回代币精度
     * @return USDC使用6位小数
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    /**
     * @dev 铸造代币 (仅所有者)
     * @param to 接收地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev 销毁代币
     * @param amount 销毁数量
     */
    function burn(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
    
    /**
     * @dev 批量铸造代币给多个地址 (测试用)
     * @param recipients 接收地址数组
     * @param amounts 对应的铸造数量数组
     */
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
    
    /**
     * @dev 免费获取测试代币 (任何人都可以调用)
     * @param amount 请求的代币数量
     */
    function faucet(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= 10000 * 10**decimals(), "Amount too large"); // 最多一次获取10,000 USDC
        
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount);
    }
    
    /**
     * @dev 获取标准测试金额 (1000 USDC)
     */
    function getTestTokens() external {
        uint256 testAmount = 1000 * 10**decimals(); // 1000 USDC
        _mint(msg.sender, testAmount);
        emit TokensMinted(msg.sender, testAmount);
    }
}