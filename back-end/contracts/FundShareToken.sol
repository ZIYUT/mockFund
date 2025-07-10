// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract FundShareToken is ERC20, Ownable, Pausable {

    // Fund contract address
    address public fundContract;
    
    // Events
    event FundContractSet(address indexed fundContract);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    
    constructor(
        string memory _name,
        string memory _symbol,
        address _initialOwner
    ) ERC20(_name, _symbol) Ownable(_initialOwner) {
        require(_initialOwner != address(0), "Invalid owner address");
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    /**
     * @dev 设置基金合约地址
     * @param _fundContract 基金合约地址
     */
    function setFundContract(address _fundContract) external onlyOwner {
        require(_fundContract != address(0), "Invalid fund contract address");
        fundContract = _fundContract;
        emit FundContractSet(_fundContract);
    }
    
    /**
     * @dev 铸造代币（仅限基金合约或所有者）
     * @param _to 接收者地址
     * @param _amount 数量
     */
    function mint(address _to, uint256 _amount) external {
        require(_to != address(0), "Cannot mint to zero address");
        require(_amount > 0, "Amount must be greater than zero");
        require(
            msg.sender == fundContract || msg.sender == owner(),
            "Only fund contract or owner can mint"
        );
        
        _mint(_to, _amount);
        emit TokensMinted(_to, _amount);
    }
    
    /**
     * @dev 销毁代币（仅限基金合约或所有者）
     * @param _from 销毁者地址
     * @param _amount 数量
     */
    function burn(address _from, uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than zero");
        require(
            msg.sender == fundContract || msg.sender == owner(),
            "Only fund contract or owner can burn"
        );
        
        _burn(_from, _amount);
        emit TokensBurned(_from, _amount);
    }

    /**
     * @dev 批量铸造代币
     * @param _recipients 接收者地址数组
     * @param _amounts 数量数组
     */
    function batchMint(address[] calldata _recipients, uint256[] calldata _amounts) external onlyOwner {
        require(_recipients.length == _amounts.length, "Arrays length mismatch");
        require(_recipients.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Invalid recipient address");
            require(_amounts[i] > 0, "Invalid amount");
            
            _mint(_recipients[i], _amounts[i]);
            emit TokensMinted(_recipients[i], _amounts[i]);
        }
    }
    
    /**
     * @dev 为测试目的铸造代币
     * @param _amount 数量
     */
    function mintForTesting(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than zero");
        require(_amount <= 10000 * 10**decimals(), "Amount too large"); // Maximum 10,000 tokens
        
        _mint(msg.sender, _amount);
        emit TokensMinted(msg.sender, _amount);
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 重写 transfer 函数，添加暂停检查
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        require(!Pausable.paused(), "Token transfer paused");
        return super.transfer(to, amount);
    }
    
    /**
     * @dev 重写 transferFrom 函数，添加暂停检查
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        require(!Pausable.paused(), "Token transfer paused");
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev 获取代币统计信息
     * @return totalSupply 总供应量
     * @return fundContractAddress 基金合约地址
     * @return isPaused 是否暂停
     */
    function getTokenStats() external view returns (
        uint256 totalSupply,
        address fundContractAddress,
        bool isPaused
    ) {
        return (ERC20.totalSupply(), fundContract, Pausable.paused());
    }

    /**
     * @dev 检查地址是否为基金合约
     * @param _address 要检查的地址
     * @return 是否为基金合约
     */
    function isFundContract(address _address) external view returns (bool) {
        return _address == fundContract;
    }
}