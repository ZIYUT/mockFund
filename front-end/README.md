# MockFund DeFi Investment Fund Frontend Application

**Demo Video**: [Watch the demonstration](https://youtu.be/F4E0VJd3zZU)

**Live Demo**: [https://mock-fund.vercel.app/](https://mock-fund.vercel.app/)

This is a Next.js-based decentralized investment fund frontend application running on the Sepolia testnet. The application provides a complete DeFi investment experience, including investment, redemption, real-time price monitoring, and portfolio management features.

## Core Features

### Fund Management
- **Smart Portfolio**: 50% USDC + 12.5% WBTC + 12.5% WETH + 12.5% LINK + 12.5% DAI
- **Real-time NAV Calculation**: Based on Chainlink price oracles for real-time NAV computation
- **Management Fee Mechanism**: 1% annual management fee, automatically collected
- **Transparent Operations**: All transactions and asset allocations are fully transparent

### Investment Features
- **USDC Investment**: Invest using USDC to receive MFC (fund share tokens)
- **Investment Preview**: Real-time calculation of MFC amount for invested sum
- **One-click Approval**: Smart contract approval mechanism, secure and convenient
- **Instant Confirmation**: Real-time confirmation and balance updates for investments

### Redemption Features
- **Flexible Redemption**: Redeem MFC tokens for USDC at any time
- **Redemption Preview**: Real-time calculation of USDC value for MFC
- **Fair Pricing**: Fair redemption prices based on real-time NAV
- **Quick Settlement**: Instant receipt of redeemed funds

### Data Visualization
- **Real-time Price Charts**: Price trend charts for each token
- **Portfolio Analysis**: Asset allocation pie chart and ratio display
- **Historical Data**: Fund NAV and MFC value historical trends
- **Performance Analysis**: Investment return rates and yield curves

### Test Token Acquisition
- **One-click Acquisition**: Quickly obtain test USDC tokens
- **Balance Display**: Real-time display of wallet token balances
- **Transaction Status**: Real-time display of transaction progress and status

## Complete Usage Flow

### Step 1: Connect Wallet
1. Visit [https://mock-fund.vercel.app/](https://mock-fund.vercel.app/)
2. Click the "Connect MetaMask" button
3. Ensure your wallet is switched to the Sepolia testnet
4. Authorize wallet connection

### Step 2: Acquire Test Tokens
1. In the left "Get Test Tokens" panel
2. Click "Get 1000 USDC" button
3. Confirm the transaction and wait for completion
4. Check wallet balance update

### Step 3: Invest in Fund
1. Switch to the "Investment" tab
2. Enter the USDC amount to invest
3. Click "Calculate Preview" to see the MFC amount you'll receive
4. Click "Approve USDC" for token approval
5. After approval, click "Invest" button
6. Confirm the transaction and wait for completion
7. Check MFC balance and investment results

### Step 4: View Portfolio
1. View fund overview data at the top:
   - **Fund NAV**: Total fund net asset value
   - **MFC Value**: Value of a single MFC token
   - **Investment Progress**: Investment progress percentage
   - **Management Fee**: Management fee rate

2. In the portfolio charts:
   - Real-time price trends for each token
   - Asset allocation pie chart
   - Fund NAV historical trend
   - MFC value change curve

### Step 5: Redeem Investment
1. Switch to the "Redemption" tab
2. Enter the MFC amount to redeem
3. Click "Calculate Preview" to see the USDC amount you'll receive
4. Click "Approve MFC" for token approval
5. After approval, click "Redeem" button
6. Confirm the transaction and wait for completion
7. Check USDC balance update

## Interface Features

### Main Page Layout
- **Top Title**: MockFund DeFi Fund brand identifier
- **Fund Overview Cards**: Display key financial indicators
- **Portfolio Charts**: Real-time prices and historical data visualization
- **Left Panel**: Wallet connection and test token acquisition
- **Right Panel**: Investment and redemption functions

### Portfolio Chart Area
1. **Token Price Charts**: 
   - Display real-time prices for WBTC, WETH, LINK, DAI, USDC
   - Support time range selection and zooming
   - Hover to show specific values

2. **Asset Allocation Pie Chart**:
   - Show proportions of each token in the portfolio
   - Color-coded for different assets
   - Display specific amounts and percentages

3. **Fund NAV Chart**:
   - Show historical changes in fund total NAV
   - MFC token value trends
   - Investment return calculations

4. **Refresh Button**: Manually refresh all data and charts

### Investment Panel
- **USDC Balance Display**: Current wallet USDC balance
- **Investment Amount Input**: Enter USDC amount to invest
- **Preview Calculation**: Show MFC amount to be received
- **Approve Button**: Approve contract to use USDC
- **Invest Button**: Execute investment transaction
- **Transaction Status**: Show transaction progress and results

### Redemption Panel
- **MFC Balance Display**: Current wallet MFC balance
- **Redemption Amount Input**: Enter MFC amount to redeem
- **Preview Calculation**: Show USDC amount to be received
- **Approve Button**: Approve contract to use MFC
- **Redeem Button**: Execute redemption transaction
- **Transaction Status**: Show transaction progress and results

### Test Token Panel
- **USDC Balance**: Real-time display of current USDC balance
- **Get Button**: One-click to get 1000 test USDC
- **Transaction Status**: Show token acquisition transaction status
- **Refresh Feature**: Manually refresh balance information

## Technical Architecture

### Frontend Tech Stack
- **Next.js 14**: React full-stack framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Wagmi**: React Hooks for Ethereum
- **Viem**: TypeScript interface for Ethereum
- **Recharts**: React charting library

### Smart Contract Integration
- **MockFund**: Main fund contract (0x9fFB513271065CFfE4Fda7DA3E610Df629101F27)
- **FundShareToken**: MFC token contract (0xD3eC59d9B6bE6A97D47D5349ba7792c0b0C3594f)
- **MockUSDC**: Test USDC contract (0xA51E19C25DBb5B1F41cE70bDdA89A65284e8EfF1)
- **ChainlinkPriceOracle**: Price oracle (0x95900F1E3FC7e5cbBa11239DAFC5295e28C21fB5)
- **UniswapIntegration**: Uniswap integration (0x41A7F830320aBAab995E26BEFc17Ee72BdD7d216)

### Price Data Sources
- **Chainlink Price Oracles**: On-chain real-time price data
- **CoinGecko API**: Historical price data and charts
- **Real-time Updates**: 30-second caching mechanism to ensure data freshness

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the environment variable example file:

```bash
cp env.example .env.local
```

Edit the `.env.local` file:

```bash
# Alchemy API Key - for accessing Sepolia testnet
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here

# CoinGecko API Key - for fetching token prices (optional)
# NEXT_PUBLIC_COINGECKO_API_KEY=your_coingecko_api_key_here

# CoinGecko API Base URL
NEXT_PUBLIC_COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables Explanation

### Required Environment Variables
- `NEXT_PUBLIC_ALCHEMY_API_KEY`: Alchemy API key for accessing Sepolia testnet

### Optional Environment Variables
- `NEXT_PUBLIC_COINGECKO_API_KEY`: CoinGecko API key for fetching token prices
- `NEXT_PUBLIC_COINGECKO_BASE_URL`: CoinGecko API base URL

> **Note**: If no CoinGecko API key is configured, the application will use mock data for chart displays.
