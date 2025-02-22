# Spinor: AI-Powered DeFi Trading Agent

Spinor is an intelligent trading agent that optimizes long-term APY through automated trading strategies in DeFi markets, particularly focusing on Liquid Staking Tokens (LSTs) and Liquid Restaking Tokens (LRTs).

## 🚀 Features

### Trading Strategies

1. **Best LST Strategy**
   - Analyzes and selects optimal LST based on user's risk profile
   - Considers APY, total stake amount, and slashing history
   - Perfect for passive yield optimization

2. **LST Liquidity Strategy**
   - Combines LST investment with liquidity provision
   - Automatically splits investment 50/50 between token and liquidity pool
   - Enhanced yield through LP fees

3. **Best LRT Strategy**
   - Identifies most profitable LRT based on risk profile
   - Evaluates APY and liquidity metrics
   - Ideal for higher yield potential

4. **LRT Liquidity Strategy**
   - Combines LRT investment with liquidity provision
   - Optimizes position sizes for maximum returns
   - Balanced approach to yield farming

5. **Arbitrage Strategy**
   - Monitors price differences across pools
   - Executes trades when profitable opportunities arise
   - Risk-free returns through market inefficiencies

### Risk Management

- **Customizable Risk Levels (1-4)**
  - Level 1 (Very Low): Prioritizes stability and total stake amount
  - Level 2 (Low): Balanced approach to APY and stability
  - Level 3 (Medium): Higher emphasis on APY
  - Level 4 (High): Maximum APY focus

### Technical Stack

- **Smart Contract Integration**
  - Utilizes Gelato Relayers for automated execution
  - Integrates with major DeFi protocols

- **AI Analysis**
  - OpenAI GPT-3.5 Turbo for market analysis
  - Real-time sentiment analysis
  - Risk assessment and trade recommendations

- **Data Sources**
  - Real-time pool reserves monitoring
  - APY tracking
  - Slashing history analysis
  - Total stake amount tracking

## 🛠 Installation

```bash
# Clone the repository
git clone https://github.com/AliErcanOzgokce/spinor.git

# Install dependencies
cd spinor
npm install

# Set up environment variables
cp .env.example .env
# Add your OpenAI API key to .env
```

## 🚦 Usage

```bash
# Start the trading agent
npm start

# Run in development mode
npm run dev
```

## 📊 Configuration

The agent can be configured through environment variables:

```env
OPENAI_API_KEY=your_api_key
RPC_URL=your_rpc_url
```

## 🔄 Trading Process

1. **Data Collection**
   - Fetches current pool states
   - Retrieves token metrics
   - Analyzes market conditions

2. **Strategy Execution**
   - Evaluates best opportunities based on risk level
   - Calculates optimal trade sizes
   - Executes trades through Gelato Relayers

3. **Monitoring & Adjustment**
   - Continuous performance tracking
   - Real-time risk assessment
   - Strategy optimization

## 🔐 Security

- Secure API key management
- Rate limiting implementation
- Error handling and recovery
- Transaction verification

## 📈 Performance Metrics

- APY optimization
- Slippage minimization
- Gas efficiency
- Risk-adjusted returns


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 👥 Team

- Osman Gocer
- Ali Ercan Ozgokce
- Zeynep Sude Kacar
- Mehmet Güngör

