# �� Spinor: AI-Powered Yield Trading Agent Platform

Spinor is a decentralized platform that enables users to create and manage their own AI-powered yield trading agents. By leveraging OpenAI for market analysis and Gelato Relayers for execution, Spinor optimizes returns across Liquid Staking Tokens (LSTs) and Liquid Restaking Tokens (LRTs).

## 🎯 Key Features

### Trading Strategies

1. **Best LST Strategy**
   - Selects optimal LST based on user's risk profile
   - APY range: 3%-7%
   - Risk-based token selection and swap execution
   - Continuous performance monitoring

2. **Best LST + Liquidity**
   - Combines LST investment with liquidity provision
   - Initial swap followed by pool liquidity addition
   - Enhanced returns through trading fees
   - Automated position management

3. **Best LRT Strategy**
   - Identifies optimal LRT based on risk assessment
   - APY range: 7%-12%
   - Higher yield potential with managed risk
   - Real-time market analysis

4. **Best LRT + Liquidity**
   - LRT investment with liquidity provision
   - Strategic position sizing in pools
   - Dual yield sources (LRT rewards + LP fees)
   - Automated rebalancing

5. **Arbitrage Strategy**
   - Cross-pool arbitrage between primary and secondary pools
   - Automated opportunity detection and execution
   - Risk-free returns from market inefficiencies
   - Real-time price monitoring

### Risk Management System

Risk Levels (1-4):
- **Level 1**: Ultra-conservative, prioritizing stability
  - Lower APY (3%-4% for LST, 7%-8% for LRT)
  - Minimal slashing history
- **Level 2**: Balanced risk-reward approach
  - Moderate APY (4%-5% for LST, 8%-9% for LRT)
  - Low slashing history
- **Level 3**: Growth-oriented with managed risk
  - Higher APY (5%-6% for LST, 9%-10% for LRT)
  - Moderate slashing history
- **Level 4**: Aggressive yield optimization
  - Maximum APY (6%-7% for LST, 10%-12% for LRT)
  - Higher slashing history tolerance

## 🏗 Project Structure

```
spinor/
├── ai-trader/      # AI Trading Agent Service
├── backend/        # Backend API & Swap Bot
├── client/         # Frontend Application
└── hardhat/        # Smart Contracts & Deployment
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

## 🚀 Quick Start

1. Clone the repository:
\`\`\`bash
git clone https://github.com/AliErcanOzgokce/spinor.git
cd spinor
\`\`\`

2. Set up each component:
\`\`\`bash
# AI Trader Setup
cd ai-trader
npm install
cp .env.example .env

# Backend Setup
cd ../backend
npm install
cp .env.example .env

# Client Setup
cd ../client
npm install
cp .env.example .env

# Hardhat Setup
cd ../hardhat
npm install
cp .env.example .env
\`\`\`

3. Start the services:
\`\`\`bash
# Start AI Trader
cd ai-trader
npm run start

# Start Backend
cd ../backend
npm run dev     # Start server
npm run bot     # Start swap bot

# Start Client
cd ../client
npm run dev
\`\`\`

## 🔌 API Endpoints

### Backend APIs
- \`/api/pool-reserves\`: Returns primary pool data including APY and slashing metrics
- \`/api/agent-info\`: Returns agent configuration and balances

### Client APIs
- \`/api/agents\`: Retrieves all created agent addresses
- \`/api/trade-history\`: Fetches agent's trading history
- \`/api/user-balances\`: Returns user's token balances

## 🛠 Technologies Used

### Core Technologies
- **Gelato Relayers**: Automated transaction execution
- **OpenAI GPT-3.5**: Market analysis and strategy optimization
- **ABC Test Network**: Development and testing environment
- **Uniswap V2**: AMM infrastructure (dual pool system for arbitrage)

### Backend Stack
- **Node.js & Express**: API server
- **TypeScript**: Type-safe development
- **ethers.js**: Blockchain interaction
- **Gelato Relay SDK**: Transaction automation


### Smart Contracts
- **Hardhat**: Development environment
- **Solidity**: Smart contract language
- **OpenZeppelin**: Security standards
- **Uniswap V2**: DEX implementation

## 🗺 Future Roadmap

### Q2 2025
- Multi-agent management system
- Advanced portfolio analytics
- Integration with major DEXes
- Cross-chain support planning

### Q3 2025
- Twitter sentiment analysis integration
- Real-time market data feeds
- Enhanced risk management features

### Q4 2025
- Public Testnet Launch
- Advanced AI strategy customization
- Adding other trading strategies
- Improving Dashboard

## 👥 Team

- **Osman Gocer** - Smart Contract Development
- **Ali Ercan Ozgokce** - Backend & AI Integration
- **Zeynep Sude Kacar** - Frontend Development
- **Mehmet Güngör** - Product & Strategy

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.



