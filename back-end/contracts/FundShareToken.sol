// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title FundShareToken
 * @dev ERC20代币合约，代表Mock Fund的份额
 * 只有基金合约可以铸造和销毁代币
 */
contract FundShareToken is ERC20, Ownable, ERC20Permit {
    // 基金合约地址
    address public fundContract;
    
    // 事件
    event FundContractSet(address indexed oldFund, address indexed newFund);
    event SharesMinted(address indexed to, uint256 amount);
    event SharesBurned(address indexed from, uint256 amount);
    
    /**
     * @dev 构造函数
     * @param _name 代币名称
     * @param _symbol 代币符号
     * @param _initialOwner 初始所有者地址
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _initialOwner
    ) ERC20(_name, _symbol) Ownable(_initialOwner) ERC20Permit(_name) {
        require(_initialOwner != address(0), "Invalid owner address");
    }
    
    /**
     * @dev 设置基金合约地址
     * @param _fundContract 基金合约地址
     */
    function setFundContract(address _fundContract) external onlyOwner {
        require(_fundContract != address(0), "Invalid fund contract address");
        address oldFund = fundContract;
        fundContract = _fundContract;
        emit FundContractSet(oldFund, _fundContract);
    }
    
    /**
     * @dev 铸造份额代币
     * @param to 接收地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == fundContract, "Only fund contract can mint");
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        
        _mint(to, amount);
        emit SharesMinted(to, amount);
    }
    
    /**
     * @dev 销毁份额代币
     * @param from 销毁地址
     * @param amount 销毁数量
     */
    function burn(address from, uint256 amount) external {
        require(msg.sender == fundContract, "Only fund contract can burn");
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        _burn(from, amount);
        emit SharesBurned(from, amount);
    }
    
    /**
     * @dev 获取代币精度
     * @return 代币精度(18位小数)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    /**
     * @dev 检查是否为基金合约
     * @param account 要检查的地址
     * @return 是否为基金合约
     */
    function isFundContract(address account) external view returns (bool) {
        return account == fundContract;
    }
}