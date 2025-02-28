# 🖥️ Spinor Backend Service

The Spinor Backend Service provides essential APIs and services for the Spinor platform, including pool data management, swap bot operations, and market simulation.

## 🎯 Features

- **Pool Management**: Real-time tracking of pool reserves and metrics
- **Swap Bot**: Automated market simulation for testing
- **API Services**: Endpoints for frontend & ai-trader integration
- **Market Analysis**: APY and slashing history calculations
- **Performance Monitoring**: System health and metrics tracking

## 🏗 Project Structure

```
src/
├── services/
│   ├── SwapService.ts      # Pool data management
│   ├── UniSwapService.ts   # Performance metrics
├── types/
│   └── index.ts            # All types info
├── app.ts
├── config.ts
├── index.ts
└── swapBot.ts

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

3. Start the server:
```bash
npm run dev
```

4. Start the swap bot:
```bash
npm run bot
```

## ⚙️ Configuration

Required environment variables:

```env
PORT=3000
RPC_URL=https://rpc.abc.t.raas.gelato.cloud
# Example Private Key
ADMIN_PRIVATE_KEY=785a779bda4a506f674c7dbf41ce51247a25442736de50a0b446c45f119b2add 
```

## 🔌 API Endpoints

### Pool Data
- `GET /api/pool-reserves`
  - Returns current pool reserves and metrics
  - Includes APY and slashing history data
  - Real-time updates via WebSocket

### Agent Information
- `GET /api/agent-info`
  - Returns balance information
  - Strategy and risk level details

## 🤖 Swap Bot

The swap bot performs automated swaps to:
- Generate market activity
- Create arbitrage opportunities
- Simulate real trading conditions

Configuration:
- Customizable swap intervals
- Min/max swap amounts
- Token pair selection
- Gas price limits

## 📊 Metrics

The service tracks:
- Pool reserve changes
- APY calculations
- Slashing history
- System performance
- API response times


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details. 