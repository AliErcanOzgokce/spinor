# 🤖 Spinor AI Trading Agent

The AI Trading Agent is the core component of Spinor that executes trading strategies based on market analysis and risk assessment.

## 🎯 Features

- **OpenAI Integration**: Utilizes GPT-3.5 for market analysis and strategy selection
- **Gelato Automation**: Executes trades using Gelato Relayer for gas-free transactions
- **Risk Management**: Implements 4-level risk assessment system
- **Multi-Strategy Support**: LST, LRT, and Arbitrage trading strategies
- **Real-time Monitoring**: Continuous pool and market analysis

## 🏗 Project Structure

```
src/
├── services/
│   ├── agent.service.ts     # Main trading agent logic
│   ├── arbitrage.service.ts # Arbitrage detection and execution
│   ├── openai.service.ts    # AI analysis and decision making
│   ├── history.service.ts   # Trade history tracking with (SpinorHistory)
│   └── pool.service.ts      # Pool metrics and analysis
├── types/
│   ├── index.ts             # Type definitions
└── index.ts
```

## 🚀 Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Start the agent:
```bash
npm run start
```

## ⚙️ Configuration

The agent requires the following environment variables:

```env
# Network Configuration
RPC_URL=https://rpc.abc.t.raas.gelato.cloud
CHAIN_ID=112
NETWORK_NAME="ABC Testnet"
CURRENCY_SYMBOL="TEST"

# API Keys
OPENAI_API_KEY=
GELATO_SPONSOR_KEY=

# Example Private Key
PRIVATE_KEY=785a779bda4a506f674c7dbf41ce51247a25442736de50a0b446c45f119b2add
```

## 📊 Services

### agent.service.ts
- Manages trading strategy execution
- Handles token swaps and liquidity provision
- Monitors positions and balances
- Integrates with Gelato for automated execution

### arbitrage.service.ts
- Detects arbitrage opportunities between pools
- Calculates optimal trade amounts
- Executes arbitrage transactions
- Monitors profitability

### openai.service.ts
- Analyzes market conditions
- Determines risk levels
- Selects optimal trading strategies
- Provides market insights

### history.service.ts
- Tracks all trading activities
- Calculates performance metrics
- Maintains transaction history
- Generates reports

### pool.service.ts
- Monitors pool reserves
- Calculates APY and slippage
- Tracks liquidity metrics
- Analyzes pool health

## 🔍 Monitoring

The agent provides real-time monitoring through various metrics:

- Trade execution status
- Pool reserve changes
- Profit/loss tracking
- Risk level adjustments
