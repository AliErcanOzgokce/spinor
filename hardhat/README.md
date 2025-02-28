# 📝 Spinor Smart Contracts

This project implements a Uniswap V2-like decentralized exchange (DEX) with custom Liquid Staking Tokens (LST) and Liquid Restaking Tokens (LRT), along with an automated trading agent. It includes smart contracts for the DEX infrastructure, token contracts, and helper services for interacting with the protocol.

## 🎯 Features

- **Trading Agent**: Automated trading execution and management
- **Dual Pool System**: Primary and secondary pools for arbitrage
- **History Tracking**: Detailed trade and performance history
- **Token Contracts**: LST and LRT token implementations
- **AMM Integration**: Modified Uniswap V2 contracts

- **Custom ERC20 Tokens**
  - LST (Liquid Staking Tokens) - LST1, LST2, LST3, LST4
  - LRT (Liquid Restaking Tokens) - LRT1, LRT2, LRT3, LRT4
  - Mock USDC for testing and examples

- **Uniswap V2 Core Contracts**
  - Factory contract for creating and managing token pairs
  - Router contract for handling swaps and liquidity operations
  - Pair contract implementing the AMM logic

- **Automated Trading Agent**
  - SpinorAgent contract for automated trading operations
  - Supports USDC deposits and withdrawals
  - Automated swaps between USDC and LST/LRT tokens
  - Liquidity provision and removal
  - Emergency withdrawal functionality
  - Pausable operations for safety

- **TypeScript Services**
  - `UniswapService`: Base service with common functionality
  - `LiquidityService`: Handles adding and removing liquidity
  - `SwapService`: Manages token swaps with slippage protection

## Project Structure

```
contracts/
├── agents/
│   └── SpinorAgent.sol     # Main trading agent contract
├── history/
│   └── SpinorHistory.sol   # Trade history tracking
├── dex/
│   ├── UniswapV2Factory.sol
│   ├── UniswapV2Router.sol
│   ├── UniswapV2Pair.sol
│   ├── libraries/
│   │   ├── Math.sol
│   │   └── UQ112x112.sol
│   └── interfaces/
│       ├── IUniswapV2Factory.sol
│       ├── IUniswapV2Router.sol
│       └── IUniswapV2Pair.sol
└── tokens/
    ├── MockUSDC.sol        # Mock USDC token for testing
    ├── LST.sol             # Liquid Staking Token
    └── LRT.sol             # Liquid Restaking Token
```

## �� Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Compile contracts:
```bash
npx hardhat compile
```

4. Run tests:
```bash
npx hardhat test
```

## ⚙️ Configuration

Required environment variables:

```env
# Network Configuration
RPC_URL=https://rpc.abc.t.raas.gelato.cloud
PRIVATE_KEY=785a779bda4a506f674c7dbf41ce51247a25442736de50a0b446c45f119b2add
```

## 📄 Contract Addresses

### Primary DEX (First Pool)
- Factory: `0x258Ca93BC0EBBaEDf8f3728e6B15C792a4f81Ea4`
- Router: `0xbad4cd744F1aFf811859Ba9523Bd0bb3a766913D`
- USDC: `0x5b4Df904F6DDb52fa6c92a8e175d44B89bEec30b`

### Secondary DEX (Arbitrage Pool)
- Factory: `0xb16B38Ba7c189d4aAe20A36c7643150C55B4c43C`
- Router: `0x4abF7832035d137Da8cD9165443419437BADdb9d`

### Core Contracts
- SpinorAgent: `0x1151180290CAa1Ab4e3d9d9E5C226Af6259b7f87`
- SpinorHistory: `0xB1ea9b87B5F7551F15aa620970ED13E4C0A85eC8`

### LST Tokens
- LST1: `0x765eC58a58B1De2F14Ca6a88f0c4CD8967BBeadF`
- LST2: `0x583244c44d04d6FFe9693Def783F39492852D664`
- LST3: `0xb3CbfB95A57318A8764F0533F5e43600daf18B07`
- LST4: `0x22a994FC9e4799AD4878075a9d43579D42D712F9`

### LRT Tokens
- LRT1: `0xd579B67eb5dBe576A5D94260778bFE969139441d`
- LRT2: `0xC36232cdffb63D88AC7B36A3d94025535a9179f2`
- LRT3: `0x9EfDd2E0E9A55378626cB244997B2763d0D2ec1F`
- LRT4: `0x279CED13DfE2A4373A72EEdD1382DE4F39152bB0`

## 🛠 Development

### Available Scripts

```bash
# Deploy all core contracts (Factory, Router, Tokens)
npx hardhat run scripts/core/deploy.ts --network abc

# Deploy trading agent and history contracts
npx hardhat run scripts/core/deployAgent.ts --network abc

# Create initial liquidity pools
npx hardhat run scripts/core/createPools.ts --network abc

# Deploy second DEX for arbitrage
npx hardhat run scripts/core/deployArbitrageEnvironment.ts --network abc

# Fund the trading agent with USDC
npx hardhat run scripts/core/fundAgent.ts --network abc

# Update trading strategy and risk level
npx hardhat update-strategy --strategy 2 --risk 3 --network abc
```

### Network Configuration

The project is configured to work with the following networks:

```typescript
networks: {
    hardhat: {
        chainId: 1337
    },
    localhost: {
        url: "http://127.0.0.1:8545"
    },
    abc: {
        url: process.env.RPC_URL,
        accounts: [process.env.PRIVATE_KEY],
        gasPrice: "auto",
        gas: 2100000,
        timeout: 60000
    },
}
```

## 📊 Contract Details

### SpinorAgent
- Manages trading strategies and execution
- Handles risk management
- Tracks positions and performance
- Interacts with both DEX pools for arbitrage

### Factory Contract
- Creates and manages token pairs
- Maintains registry of all pairs
- Ensures unique pairs per token combination

### UniswapV2 Implementation
- Modified Uniswap V2 contracts
- Dual pool system for arbitrage
- Custom fee structure
- Optimized for LST/LRT trading

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

### Token System
- 8 ERC20 tokens (4 LST + 4 LRT)
- Each token paired with USDC
- Different price ratios between pools
- Arbitrage opportunities by design

### SpinorHistory
- Tracks all trading operations
- Records entry and exit prices
- Maintains performance metrics
- Stores historical trade data
- Provides analytics functions

## 🔒 Security Features

- OpenZeppelin contracts for security
- Reentrancy protection
- Access control mechanisms
- Upgradeable contract patterns
- Emergency pause functionality

## 🧪 Testing

The test suite includes:
- Unit tests for each contract
- Integration tests for DEX interactions
- Security vulnerability tests
- Gas optimization tests

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
- Removing liquidity safely
- LP token management
- Reserve monitoring

### SwapService
Manages:
- Token swaps with slippage protection
- Price impact calculations
- Minimum output enforcement
- Error handling

## 📚 Dependencies

```json
{
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^2.0.0",
    "@nomiclabs/hardhat-ethers": "^2.0.0",
    "@openzeppelin/contracts": "^4.9.0",
    "@openzeppelin/hardhat-upgrades": "^1.28.0",
    "@typechain/ethers-v5": "^10.2.0",
    "@typechain/hardhat": "^6.1.5",
    "ethers": "^5.7.2",
    "hardhat": "^2.12.7",
    "typescript": "^4.9.5"
  }
}
```






