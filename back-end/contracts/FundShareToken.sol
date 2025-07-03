// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract FundShareToken is ERC20, Ownable, ERC20Permit {

    address public fundContract;
    
    // Events
    event FundContractSet(address indexed oldFund, address indexed newFund);
    event SharesMinted(address indexed to, uint256 amount);
    event SharesBurned(address indexed from, uint256 amount);
    
    constructor(
        string memory _name,
        string memory _symbol,
        address _initialOwner
    ) ERC20(_name, _symbol) Ownable(_initialOwner) ERC20Permit(_name) {
        require(_initialOwner != address(0), "Invalid owner address");
    }

    function setFundContract(address _fundContract) external onlyOwner {
        require(_fundContract != address(0), "Invalid fund contract address");
        address oldFund = fundContract;
        fundContract = _fundContract;
        emit FundContractSet(oldFund, _fundContract);
    }
    
    function mint(address to, uint256 amount) external {
        require(msg.sender == fundContract, "Only fund contract can mint");
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        
        _mint(to, amount);
        emit SharesMinted(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == fundContract, "Only fund contract can burn");
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        _burn(from, amount);
        emit SharesBurned(from, amount);
    }
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function isFundContract(address account) external view returns (bool) {
        return account == fundContract;
    }
}