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
     * @dev Set fund contract address
     * @param _fundContract Fund contract address
     */
    function setFundContract(address _fundContract) external onlyOwner {
        require(_fundContract != address(0), "Invalid fund contract address");
        fundContract = _fundContract;
        emit FundContractSet(_fundContract);
    }
    
    /**
     * @dev Mint tokens (only fund contract or owner)
     * @param _to Recipient address
     * @param _amount Amount
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
     * @dev Burn tokens (only fund contract or owner)
     * @param _from Burner address
     * @param _amount Amount
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
     * @dev Batch mint tokens
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of amounts
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
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Override transfer function with pause check
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        require(!Pausable.paused(), "Token transfer paused");
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom function with pause check
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        require(!Pausable.paused(), "Token transfer paused");
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev Get token statistics
     * @return totalSupply Total supply
     * @return fundContractAddress Fund contract address
     * @return isPaused Whether paused
     */
    function getTokenStats() external view returns (
        uint256 totalSupply,
        address fundContractAddress,
        bool isPaused
    ) {
        return (ERC20.totalSupply(), fundContract, Pausable.paused());
    }

    /**
     * @dev Check if address is fund contract
     * @param _address Address to check
     * @return Whether it is fund contract
     */
    function isFundContract(address _address) external view returns (bool) {
        return _address == fundContract;
    }
}