# Uniswap V2 Implementation with LST and LRT Tokens

This project implements a Uniswap V2-like decentralized exchange (DEX) with custom Liquid Staking Tokens (LST) and Liquid Restaking Tokens (LRT). It includes smart contracts for the DEX infrastructure, token contracts, and helper services for interacting with the protocol.

## Features

- **Custom ERC20 Tokens**
  - LST (Liquid Staking Tokens) - LST1, LST2, LST3, LST4
  - LRT (Liquid Restaking Tokens) - LRT1, LRT2, LRT3, LRT4
  - Mock USDC for testing and examples

- **Uniswap V2 Core Contracts**
  - Factory contract for creating and managing token pairs
  - Router contract for handling swaps and liquidity operations
  - Pair contract implementing the AMM logic

- **TypeScript Services**
  - `UniswapService`: Base service with common functionality
  - `LiquidityService`: Handles adding and removing liquidity
  - `SwapService`: Manages token swaps with slippage protection

## Project Structure

```
hardhat/
├── contracts/
│   ├── dex/              # DEX core contracts
│   │   ├── interfaces/   # Contract interfaces
│   │   └── libraries/    # Helper libraries
│   └── tokens/           # ERC20 token contracts
├── scripts/
│   ├── core/            # Deployment and setup 
│   ├── dex/            # DEX interaction services
│   ├── examples/       # Usage examples
│   └── libraries/      # Helper utilities
└── test/               # Test files
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
cd hardhat
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the environment variables in `.env`:
```
INFURA_API_KEY=your_infura_api_key
ALCHEMY_API_KEY=your_alchemy_api_key
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Running Tests

```bash
npx hardhat test
```

### Deployment

1. Start a local Hardhat node:
```bash
npx hardhat node
```

2. Deploy the contracts:
```bash
npx hardhat run scripts/core/deploy.ts --network localhost
```

3. Create liquidity pools:
```bash
npx hardhat run scripts/core/createPools.ts --network localhost
```

## Usage Examples

### Running the Full Example

The `fullExample.ts` script demonstrates the complete workflow:

```bash
npx hardhat run scripts/examples/fullExample.ts --network localhost
```

This example includes:
- Minting tokens
- Creating a liquidity pool
- Adding liquidity
- Performing swaps
- Removing liquidity

### Key Features Demonstrated in Tests

The `SwapTest.ts` file includes comprehensive tests showing:
- Pool creation for all token pairs
- Initial liquidity provision
- Swap operations in both directions
- Slippage protection
- Event emission verification

## Smart Contract Details

### Factory Contract
- Creates and manages token pairs
- Maintains registry of all pairs
- Ensures unique pairs per token combination

### Router Contract
- Handles user interactions
- Manages liquidity operations
- Executes swaps with slippage protection
- Supports deadline enforcement

### Pair Contract
- Implements constant product AMM (x * y = k)
- Manages liquidity provider tokens
- Handles token swaps
- Maintains reserves and price accumulators

## TypeScript Services

### UniswapService
Base service providing:
- Pair management
- Token approvals
- Reserve queries
- Price calculations

### LiquidityService
Handles:
- Adding liquidity with slippage protection
- Removing liquidity
- LP token management

### SwapService
Manages:
- Token swaps
- Price impact calculations
- Slippage protection
- Minimum output enforcement

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
