# 🎨 Spinor Frontend Client

The Spinor Frontend Client provides a modern and intuitive interface for users to create and manage their AI trading agents, monitor performance, and interact with the Spinor platform.

## 🎯 Features

- **Agent Creation**: Easy setup of AI trading agents
- **Strategy Management**: Configure trading strategies and risk levels
- **Performance Dashboard**: Real-time monitoring of trading activities
- **Portfolio Overview**: Track balances and positions
- **Transaction History**: Detailed trade history and analytics


## 🚀 Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```


## 📱 Pages

### Dashboard (/dashboard)
- Agent overview
- Performance metrics
- Balance tracking
- Strategy configuration

### Swap (/swap)
- Token swapping interface
- Price information
- Slippage settings
- Transaction confirmation

### Pool (/pool)
- Liquidity pool management
- Pool statistics
- Yield information

#### Add Liquidity (/pool/add)
- Add liquidity to pools
- Token pair selection
- Amount configuration
- Price range settings

#### Remove Liquidity (/pool/remove)
- Remove liquidity from pools
- LP token management
- Withdrawal options
- Position closing


## 🔌 API Integration

### Agent APIs
- `GET /api/agents`
  - List all agents

### Trade History
- `GET /api/trade-history`
  - Transaction details
  - Performance metrics
  - Filter by date range

### User Balances
- `GET /api/user-balances`
  - Token balances
  - USDC balance
  - LP positions



## 📦 Dependencies

Core:
- Next.js 15.1.6
- React 19.0.0
- Ethers.js 6.13.5
- Wagmi 2.14.11
- Viem 2.23.4
- @reown/appkit 1.6.8
- @reown/appkit-adapter-wagmi 1.6.8
- @tanstack/react-query 5.66.9
- Framer Motion 12.4.7

UI Components:
- @headlessui/react 2.2.0
- @heroicons/react 2.2.0
- @radix-ui/react-* (Dialog, Dropdown-Menu, Icons, Slot, Toast)
- Tailwind CSS 3.4.1
- class-variance-authority 0.7.1
- tailwind-merge 3.0.1
- tailwindcss-animate 1.0.7

Development:
- TypeScript 5
- @types/node 20
- @types/react 19
- @types/react-dom 19
- PostCSS 8



