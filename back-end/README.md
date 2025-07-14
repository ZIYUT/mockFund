# MockFund Smart Contract System (Sepolia Testnet)

MockFund is a decentralized fund (DeFi Fund) smart contract system for the Ethereum Sepolia testnet. It supports multi-asset portfolio management, share token issuance, flexible investment/redemption, and automated management fee collection. This project is designed for developers, auditors, and advanced users who want to understand and use a transparent DeFi fund system.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Contract Architecture](#contract-architecture)
- [Portfolio Allocation & Mechanisms](#portfolio-allocation--mechanisms)
- [Deployment & Verification](#deployment--verification)
- [Scripts & Utilities](#scripts--utilities)
- [Security Features](#security-features)
- [FAQ](#faq)
- [License](#license)

---

## Project Overview

MockFund allows users to invest USDC and receive MFC tokens representing fund shares. The fund automatically allocates assets across major crypto tokens and supports real-time redemption. Management fees are collected automatically, and all operations are fully transparent.

**Key Features:**
- Fund initialization based on deployment-time token prices
- Dynamic NAV and MFC value calculation
- Invest USDC to receive MFC at real-time value
- Deployment info auto-saved to `deployments/`
- One-click contract verification script

---

## Contract Architecture

- **MockFund.sol**: The main fund contract, handling investment, redemption, asset allocation, management fees, and NAV calculation.
- **FundShareToken.sol**: ERC20 share token (MFC), mintable/burnable only by the fund contract.
- **ChainlinkPriceOracle.sol**: Aggregates token prices using Chainlink feeds.
- **UniswapIntegration.sol**: Integrates Uniswap for token swaps.
- **MockTokens.sol / MockUSDC.sol**: Mock tokens for local and testnet development.

---

## Portfolio Allocation & Mechanisms

### Allocation Ratios
- USDC: 50% (stable reserve)
- Major tokens: 50% (diversified growth)
  - WBTC: 12.5%
  - WETH: 12.5%
  - LINK: 12.5%
  - DAI: 12.5%

### Investment & Redemption
- When users invest USDC, the contract allocates funds according to the above ratios.
- On redemption, assets are swapped to USDC at real-time prices and returned to the user.
- Both management and redemption fees are fixed at 1%.

### Management Fee
- 1% annualized management fee, accrued daily on circulating MFC supply.
- 1% redemption fee, deducted automatically on redemption.

---

## Deployment & Verification

### 1. Install Dependencies
```bash
cd back-end
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in `back-end/`:
```
ETHERSCAN_API_KEY=your_etherscan_api_key
SEPOLIA_RPC_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_deployer_private_key
```

### 3. Deploy Contracts to Sepolia
```bash
npx hardhat run scripts/deploy-sepolia.js --network sepolia
```
Deployment info will be saved to `deployments/sepolia-deployment.json`.

### 4. One-Click Contract Verification
```bash
node scripts/verify-all.js
```
This script reads deployment info and verifies MockFund, ChainlinkPriceOracle, UniswapIntegration, and more.

---

## Scripts & Utilities
- `scripts/deploy-sepolia.js`: Deploys all core contracts to Sepolia in one step.
- `scripts/verify-all.js`: Verifies all contracts on Etherscan using deployment info.
- Additional scripts for debugging, testing, and fund management are available in the `scripts/` directory.

---

## Security Features
- **Reentrancy Protection**: Uses OpenZeppelin ReentrancyGuard
- **Pause Mechanism**: Owner can pause all critical operations
- **Access Control**: onlyOwner modifier for sensitive functions
- **Slippage Protection**: Swaps support max slippage settings
- **Price Validity Checks**: Oracle prices must be up-to-date

---

## FAQ
- **Contract verification failed?**
  - Ensure your local compiler version and optimizer settings match those used at deployment. Recompile with `npx hardhat clean && npx hardhat compile --force` before verifying.
- **Investment/Redemption failed?**
  - Check if the fund is initialized, token balances are sufficient, and the price oracle is working.
- **Management fee withdrawal issues?**
  - Only the contract owner can withdraw, and there must be a positive fee balance.

---

## License

This project is licensed under the MIT License. Contributions via issues and pull requests are welcome.

---

For frontend integration, portfolio logic, or contract ABI details, see the `front-end/README.md` or review the contract source code and scripts directly.