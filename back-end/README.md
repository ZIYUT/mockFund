# Mock Fund Smart Contracts

This repository contains the smart contracts for the Mock Fund project, a decentralized fund management system built on Ethereum.

## Overview

The Mock Fund project consists of the following smart contracts:

- **MockFund**: The main fund management contract that handles investments, redemptions, and portfolio rebalancing
- **FundShareToken**: An ERC20 token representing shares in the fund
- **MockUSDC**: A mock USDC stablecoin for testing
- **MockTokens**: Various mock tokens (WETH, WBTC, LINK, UNI) for testing the fund's investment capabilities
- **TokenFactory**: A contract to manage the addresses of the mock tokens

## Prerequisites

- Node.js (v16+)
- npm or yarn
- An Ethereum wallet with Sepolia testnet ETH

## Installation

```bash
# Install dependencies
npm install
```

## Local Development

```bash
# Start a local Hardhat node
npx hardhat node

# Deploy contracts to local node
npx hardhat run scripts/deploy.js --network localhost

# Run tests
npx hardhat test
```

## Sepolia Testnet Deployment

### Prerequisites

1. **Sepolia Testnet ETH**
   - You need Sepolia ETH to pay for gas fees
   - Get free Sepolia ETH from faucets like:
     - [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
     - [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
     - [QuickNode Sepolia Faucet](https://faucet.quicknode.com/ethereum/sepolia)

2. **Wallet Setup**
   - You need a wallet with a private key
   - **IMPORTANT**: Never share your private key or commit it to version control

### Configuration

1. **Set up environment variables**
   - Copy `.env.example` to `.env` if you haven't already
   - Edit the `.env` file and set your private key:
     ```
     PRIVATE_KEY=your_wallet_private_key_here
     ```
   - Make sure the RPC URL is set correctly:
     ```
     SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key
     ```
   - Set your Etherscan API key for contract verification:
     ```
     ETHERSCAN_API_KEY=your_etherscan_api_key
     ```

### Deployment Steps

1. **Install dependencies** (if not already installed)
   ```bash
   npm install
   ```

2. **Deploy to Sepolia testnet**
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```

   This will:
   - Deploy all mock tokens (USDC, WETH, WBTC, LINK, UNI)
   - Deploy the TokenFactory and register all tokens
   - Deploy the MockFund contract with a 2% management fee
   - Configure the fund with a portfolio allocation
   - Save deployment information to `./deployments/sepolia.json`

3. **Verify contracts on Etherscan** (optional but recommended)
   ```bash
   npx hardhat run scripts/verify.js --network sepolia
   ```
   
   Alternatively, you can manually verify contracts:
   ```bash
   npx hardhat verify --network sepolia CONTRACT_ADDRESS CONSTRUCTOR_ARGS
   ```
   Replace `CONTRACT_ADDRESS` with the deployed contract address and `CONSTRUCTOR_ARGS` with the constructor arguments.

## After Deployment

1. Copy the contract addresses from the deployment output to your frontend configuration
2. Test the contracts on Sepolia testnet
3. Use the faucet functions in the mock tokens to get test tokens

## Contract Interaction

After deployment, you can interact with the contracts using:

1. **Hardhat console**:
   ```bash
   npx hardhat console --network sepolia
   ```

2. **Frontend application**: Use the contract addresses from the deployment output in your frontend application.

3. **Etherscan**: Once verified, you can interact with the contracts directly on Etherscan.

## Troubleshooting

- If you encounter an "insufficient funds" error, make sure you have enough Sepolia ETH
- If deployment fails, check your `.env` configuration and network connection
- For verification issues, ensure your Etherscan API key is correct

## Testing

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/MockFund.test.js

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test
```

## Security Reminders

- These contracts are for demonstration and testing purposes only
- Do not use real funds with these contracts
- Keep your private keys secure and never share them
- Never commit your private keys or sensitive information to version control

## License

MIT