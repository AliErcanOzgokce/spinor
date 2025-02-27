'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ArrowsRightLeftIcon, PlusIcon, MinusIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'
import CreateAgentModal from '@/components/dashboard/CreateAgentModal'
import Link from 'next/link'
import { AmountSkeleton } from '@/components/shared/AmountSkeleton'
import { TradeDetailsModal } from '@/components/dashboard/TradeDetailsModal'
import { Switch } from '@/components/ui/switch'
import { TOKENS } from '@/constants/tokens'
import { formatUnits } from 'ethers'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { getStrategyName, getRiskLevelName, getRiskLevelColor } from '@/utils/trade'
import { AgentControlModal } from '@/components/dashboard/AgentControlModal'
import { SPINOR_AGENT_ADDRESS } from '@/constants/contracts'

interface Token {
  symbol: string
  address: string
  formatted: number
  balance: string
}

interface Pool {
  token0Symbol: string
  token1Symbol: string
  apy: number
}

interface Asset {
  name: string
  holdings: string
  price: string
  apy: string
}

interface AgentInfo {
  address: string;
  name: string;
  riskLevel: number;
  strategy: number;
  isActive: boolean;
  holdings: string;
  profit: string;
  totalPL: string;
}

interface TradeHistoryResponse {
  success: boolean;
  trades: Array<{
    timestamp: string;
    actionType: string;
    tokenA: string;
    tokenB: string;
    amountA: string;
    amountB: string;
    reason: string;
    txHash: string;
    status: string;
    tradeStrategy: string;
    riskLevel: string;
    pnl: string;
    apy: string;
  }>;
}

// Helper functions
const formatAmount = (amount: string, decimals: number) => {
  return parseFloat(formatUnits(amount, decimals)).toFixed(6)
}

const getTokenSymbol = (address: string) => {
  return Object.values(TOKENS).find(token => token.address.toLowerCase() === address.toLowerCase())?.symbol || address;
};

const getTokenDecimals = (address: string) => {
  return Object.values(TOKENS).find(token => token.address.toLowerCase() === address.toLowerCase())?.decimals || 18;
};

const getActionIcon = (type: string) => {
  switch (type) {
    case 'swap':
      return <ArrowsRightLeftIcon className="h-5 w-5" />;
    case 'addLiquidity':
      return <PlusIcon className="h-5 w-5" />;
    case 'removeLiquidity':
      return <MinusIcon className="h-5 w-5" />;
    default:
      return <InformationCircleIcon className="h-5 w-5" />;
  }
};

// Stats Card Component
const StatsCard = ({ title, value, isApy = false }: { title: string; value: string; isApy?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg rounded-xl border border-gray-100/20 
              dark:border-white/[0.08] p-6 hover:border-primary-500/20 dark:hover:border-primary-400/20 
              transition-colors duration-300 w-full"
  >
    <h3 className="text-sm text-gray-500 dark:text-gray-400">{title}</h3>
    {isApy ? (
      <div className="flex items-center gap-2 mt-2">
        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 dark:text-green-400" />
        </div>
        <p className="text-2xl font-semibold text-green-500 dark:text-green-400">{value}</p>
      </div>
    ) : (
      <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">{value}</p>
    )}
  </motion.div>
)

// Asset Row Component
const AssetRow = ({ asset }: { asset: any }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm rounded-xl p-4 
              border border-gray-100/20 dark:border-white/[0.08] hover:border-primary-500/20 
              dark:hover:border-primary-400/20 transition-colors duration-300"
  >
    {/* Token Icons */}
    <div className="flex -space-x-2 mr-4">
      <div className="w-8 h-8 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center z-10">
        <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
          {asset.name.charAt(0)}
        </span>
      </div>
    </div>

    {/* Name and Holdings */}
    <div className="flex-1">
      <p className="font-medium text-gray-900 dark:text-white">{asset.name}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {asset.tokenAmount} tokens
      </p>
    </div>

    {/* APY */}
    <div className="px-4 text-right">
      <p className="text-sm text-gray-500 dark:text-gray-400">APY</p>
      <div className="flex items-center justify-end gap-1 text-green-500 dark:text-green-400">
        <ArrowTrendingUpIcon className="w-4 h-4" />
        <span className="font-medium">{asset.apy}%</span>
      </div>
    </div>

    {/* Holdings in USD */}
    <div className="w-32 text-right">
      <p className="text-sm text-gray-500 dark:text-gray-400">Value</p>
      <p className="font-medium text-gray-900 dark:text-white">${asset.holdings}</p>
    </div>
  </motion.div>
)

// Agent Row Component
const AgentRow = ({ agent, onManage }: { agent: AgentInfo; onManage: () => void }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm rounded-xl p-4 
              border border-gray-100/20 dark:border-white/[0.08] hover:border-primary-500/20 
              dark:hover:border-primary-400/20 transition-colors duration-300"
  >
    {/* Icon */}
    <div className="w-8 h-8 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center mr-4">
      <span className="text-xs font-medium text-primary-700 dark:text-primary-300">A</span>
    </div>

    {/* Name and Strategy */}
    <div className="flex-1">
      <p className="font-medium text-gray-900 dark:text-white">{agent.name}</p>
      <p className="text-sm text-gray-500">{getStrategyName(agent.strategy)}</p>
    </div>

    {/* Risk Level */}
    <div className="w-32 text-center">
      <p className={`font-medium ${getRiskLevelColor(agent.riskLevel)}`}>
        {getRiskLevelName(agent.riskLevel)}
      </p>
    </div>

    {/* Holdings */}
    <div className="w-32 text-right">
      <p className="font-medium text-gray-900 dark:text-white">${agent.holdings}</p>
    </div>

    {/* Profit */}
    <div className="w-32 text-right">
      <p className="font-medium text-green-500 dark:text-green-400">${agent.profit}</p>
    </div>

    {/* Total P/L */}
    <div className="w-32 text-right">
      <p className="font-medium text-green-500 dark:text-green-400">{agent.totalPL}%</p>
    </div>

    {/* Manage Button */}
    <div className="ml-4">
      <button
        onClick={onManage}
        className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium 
                 hover:bg-primary-600 transition-colors duration-200"
      >
        Manage
      </button>
    </div>
  </motion.div>
)

// Trade History Row Component
const TradeRow = ({ trade, onClick }: { trade: any; onClick: () => void }) => {
  const tokenASymbol = getTokenSymbol(trade.action.tokenA)
  const tokenBSymbol = getTokenSymbol(trade.action.tokenB)
  const tokenADecimals = getTokenDecimals(trade.action.tokenA)
  const tokenBDecimals = getTokenDecimals(trade.action.tokenB)

  // Calculate final USDC amount for arbitrage
  const finalUsdcAmount = trade.tradeStrategy === 5 
    ? (parseFloat(formatAmount(trade.action.amountA, tokenADecimals)) + trade.pnl).toFixed(6)
    : '0'

  return (
    <div className="p-4 flex items-center justify-between gap-4">
      {/* Left side - Action and Tokens */}
      <div className="flex items-center gap-4 flex-1">
        <div className="w-10 h-10 bg-gray-900/50 rounded-full flex items-center justify-center">
          {getActionIcon(trade.action.type)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-white capitalize">
              {trade.action.type}
            </p>
            <span className="text-sm text-gray-400">•</span>
            <p className="text-sm text-gray-400">
              {new Date(trade.timestamp * 1000).toLocaleString()}
            </p>
          </div>
          {trade.tradeStrategy === 5 ? (
            <div className="flex items-center gap-1 text-sm text-gray-300 mt-0.5">
              <span className="font-medium">{formatAmount(trade.action.amountA, tokenADecimals)}</span>
              <span className="text-gray-500">{tokenASymbol}</span>
              <span className="text-gray-500 mx-1">→</span>
              <span className="font-medium">{formatAmount(trade.action.amountB, tokenBDecimals)}</span>
              <span className="text-gray-500">{tokenBSymbol}</span>
              <span className="text-gray-500 mx-1">→</span>
              <span className="font-medium">{finalUsdcAmount}</span>
              <span className="text-gray-500">{tokenASymbol}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm text-gray-300 mt-0.5">
              <span className="font-medium">{formatAmount(trade.action.amountA, tokenADecimals)}</span>
              <span className="text-gray-500">{tokenASymbol}</span>
              {trade.action.amountB !== '0' && (
                <>
                  <span className="text-gray-500 mx-1">→</span>
                  <span className="font-medium">{formatAmount(trade.action.amountB, tokenBDecimals)}</span>
                  <span className="text-gray-500">{tokenBSymbol}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Middle - Strategy and Risk Level */}
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {getStrategyName(trade.tradeStrategy)}
          </span>
        </div>
        <span className={`text-sm ${getRiskLevelColor(trade.riskLevel)}`}>
          {getRiskLevelName(trade.riskLevel)}
        </span>
      </div>

      {/* Right side - Performance */}
      <div className="w-32 flex justify-end">
        {trade.tradeStrategy === 5 ? (
          <div className="flex items-center gap-2">
            {trade.pnl >= 0 ? (
              <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
            ) : (
              <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
            )}
            <p className={`font-medium ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${Math.abs(trade.pnl).toFixed(2)}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
            <p className="font-medium text-green-500">{trade.apy.toFixed(2)}%</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [selectedTrade, setSelectedTrade] = useState<any>(null)
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [trades, setTrades] = useState<any[]>([])
  const [showAgentAssets, setShowAgentAssets] = useState(false)
  const { address } = useAccount()
  const [error, setError] = useState<string | null>(null)
  const [showAllAssets, setShowAllAssets] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false)
  const [agents, setAgents] = useState<AgentInfo[]>([])
  
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch agent info from backend
      const agentResponse = await fetch('http://localhost:3000/api/agent-info')
      const agentData = await agentResponse.json()

      // Fetch pool reserves from backend
      const poolResponse = await fetch('http://localhost:3000/api/pool-reserves')
      const poolData = await poolResponse.json()

      // Fetch user balances from API
      const userResponse = await fetch(`/api/user-balances?address=${address}`)
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user balances')
      }
      const userData = await userResponse.json()

      // Fetch trade history from API
      const historyResponse = await fetch('/api/trade-history')
      if (!historyResponse.ok) {
        throw new Error('Failed to fetch trade history')
      }
      const historyData = await historyResponse.json()

      if (!agentData.success || !poolData.success || !userData.success || !historyData.success) {
        throw new Error('One or more API calls failed')
      }

      const agentInfo = agentData.data
      const pools = poolData.data
      const userBalances = userData.data
      const trades = historyData.data

      // Calculate total PNL from arbitrage trades (strategy 5)
      const totalPnl = trades
        .filter(t => t.tradeStrategy === 5)
        .reduce((sum, t) => sum + t.pnl, 0)

      // Set agents list
      setAgents([{
        address: SPINOR_AGENT_ADDRESS,
        name: 'Spinor Agent',
        riskLevel: agentInfo.configuration.riskLevel,
        strategy: agentInfo.configuration.tradeStrategy,
        isActive: agentInfo.isActive,
        holdings: agentInfo.balances.usdc.formatted.toFixed(2),
        profit: totalPnl.toFixed(2),
        totalPL: ((totalPnl / agentInfo.balances.usdc.formatted) * 100).toFixed(2)
      }])

      // Calculate average APY from pools
      const avgApy = calculateAverageApy(pools, agentInfo.balances.tokens)

      // Set stats
      setStats([
        {
          title: 'Balance',
          value: showAgentAssets 
            ? `$${agentInfo.balances.usdc.formatted.toFixed(2)}`
            : `$${userBalances.usdc.formatted.toFixed(2)}`
        },
        {
          title: 'Estimated APY',
          value: `${avgApy.toFixed(2)}%`,
          isApy: true
        },
        {
          title: 'Total PNL',
          value: `$${totalPnl.toFixed(2)}`
        }
      ])

      // Set assets based on view type
      const assetList = showAgentAssets ? agentInfo.balances : userBalances
      const filteredAssets = assetList.tokens
        .filter(token => token.formatted > 0)
        .map(token => ({
          name: token.symbol,
          tokenAmount: token.formatted.toFixed(6),
          holdings: token.formatted.toFixed(2),
          apy: (pools.find(p => p.token0Symbol === token.symbol || p.token1Symbol === token.symbol)?.apy || 0).toFixed(2)
        }))

      setAssets(filteredAssets)
      setTrades(trades)
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  };

  const calculateAverageApy = (pools: Pool[], tokens: Token[]) => {
    if (!tokens.length) return 0
    
    const relevantPools = pools.filter(pool => 
      tokens.some(token => 
        pool.token0Symbol === token.symbol || pool.token1Symbol === token.symbol
      )
    )

    if (!relevantPools.length) return 0

    const totalApy = relevantPools.reduce((sum, pool) => sum + pool.apy, 0)
    return totalApy / relevantPools.length
  }

  useEffect(() => {
    if (address) {
      fetchData()
    }
  }, [address, showAgentAssets])

  return (
    <>
      <AnimatedBackground />
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Dashboard</h1>
          <div className="flex gap-4">
            <Link href="/pool/remove">
              <motion.button
                className="px-4 py-2 bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg rounded-xl 
                         border border-gray-100/20 dark:border-white/[0.08] font-medium text-gray-900 
                         dark:text-white hover:border-primary-500/20 dark:hover:border-primary-400/20 
                         transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Liquidity Positions
              </motion.button>
            </Link>
            <motion.button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl font-medium 
                       hover:bg-primary-600 transition-colors duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Create Agent
            </motion.button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8 w-full">
          {stats.map((stat, index) => (
            <StatsCard key={index} title={stat.title} value={stat.value} isApy={stat.isApy} />
          ))}
        </div>

        {/* Assets Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Assets</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {showAgentAssets ? 'Agent' : 'User'} Assets
                </span>
                <Switch
                  checked={showAgentAssets}
                  onCheckedChange={setShowAgentAssets}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <AmountSkeleton />
            ) : assets.length > 0 ? (
              <>
                {(showAllAssets ? assets : assets.slice(0, 4)).map((asset, index) => (
                  <AssetRow key={index} asset={asset} />
                ))}
                {assets.length > 4 && (
                  <div className="text-center mt-4">
                    <button
                      onClick={() => setShowAllAssets(!showAllAssets)}
                      className="text-primary-500 hover:text-primary-600 dark:text-primary-400 
                               dark:hover:text-primary-300 font-medium"
                    >
                      {showAllAssets ? 'Show Less' : `Show All (${assets.length})`}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No assets found.</p>
            )}
          </div>
        </div>

        {/* Agents Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">My Agents</h2>
          </div>

          <div className="space-y-4">
            {loading ? (
              <AmountSkeleton />
            ) : agents.length > 0 ? (
              agents.map((agent, index) => (
                <AgentRow
                  key={index}
                  agent={agent}
                  onManage={() => {
                    setSelectedAgent(agent)
                    setIsAgentModalOpen(true)
                  }}
                />
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No agents found.</p>
            )}
          </div>
        </div>

        {/* Trade History Section */}
        <div className="backdrop-blur-sm bg-gray-900/50 rounded-xl shadow-sm border border-gray-800/50">
          <div className="p-6 border-b border-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-white">Trade History</h2>
              <p className="text-sm text-gray-400">Click on a trade for more details</p>
            </div>
          </div>

          <div className="divide-y divide-gray-800/50">
            {loading ? (
              <div className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              </div>
            ) : trades.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-400">No trade history found</p>
              </div>
            ) : (
              trades.map((trade: any, index: number) => (
                <div
                  key={`${trade.txHash}-${index}`}
                  onClick={() => {
                    setSelectedTrade(trade)
                    setIsTradeModalOpen(true)
                  }}
                  className="hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <TradeRow trade={trade} onClick={() => {}} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <TradeDetailsModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        trade={selectedTrade}
      />
      <CreateAgentModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Agent Control Modal */}
      {selectedAgent && (
        <AgentControlModal
          isOpen={isAgentModalOpen}
          onClose={() => setIsAgentModalOpen(false)}
          agentAddress={selectedAgent.address}
          currentStrategy={selectedAgent.strategy}
          currentRiskLevel={selectedAgent.riskLevel}
          isActive={selectedAgent.isActive}
          onSuccess={() => {
            setIsAgentModalOpen(false)
            fetchData()
          }}
        />
      )}
    </>
  )
}