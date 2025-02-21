'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'
import CreateAgentModal from '@/components/dashboard/CreateAgentModal'
import Link from 'next/link'

// Stats Card Component
const StatsCard = ({ title, value }: { title: string; value: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg rounded-xl border border-gray-100/20 
              dark:border-white/[0.08] p-4 hover:border-primary-500/20 dark:hover:border-primary-400/20 
              transition-colors duration-300"
  >
    <h3 className="text-sm text-gray-500 dark:text-gray-400">{title}</h3>
    <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{value}</p>
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
        <span className="text-xs font-medium text-primary-700 dark:text-primary-300">E</span>
      </div>
      <div className="w-8 h-8 bg-primary-50 dark:bg-white/[0.05] rounded-full flex items-center justify-center">
        <span className="text-xs font-medium text-primary-600 dark:text-primary-400">U</span>
      </div>
    </div>

    {/* Name */}
    <div className="flex-1">
      <p className="font-medium text-gray-900 dark:text-white">{asset.name}</p>
    </div>

    {/* APY */}
    <div className="px-4 text-right">
      <div className="flex items-center justify-end gap-1 text-green-500 dark:text-green-400">
        <ArrowTrendingUpIcon className="w-4 h-4" />
        <span className="font-medium">{asset.apy}%</span>
      </div>
    </div>

    {/* Price */}
    <div className="w-32 text-right">
      <p className="font-medium text-gray-900 dark:text-white">${asset.price}</p>
    </div>

    {/* Holdings */}
    <div className="w-32 text-right">
      <p className="font-medium text-gray-900 dark:text-white">${asset.holdings}</p>
    </div>
  </motion.div>
)

// Agent Row Component
const AgentRow = ({ agent }: { agent: any }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm rounded-xl p-4 
              border border-gray-100/20 dark:border-white/[0.08]"
  >
    {/* Icon */}
    <div className="w-8 h-8 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center mr-4">
      <span className="text-xs font-medium text-primary-700 dark:text-primary-300">A</span>
    </div>

    {/* Name */}
    <div className="flex-1">
      <p className="font-medium text-gray-900 dark:text-white">{agent.name}</p>
    </div>

    {/* Risk Level */}
    <div className="w-32 text-center">
      <p className="font-medium text-gray-900 dark:text-white">{agent.riskLevel}</p>
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
  </motion.div>
)

// Trade History Row Component
const TradeRow = ({ trade }: { trade: any }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm rounded-xl p-4 
              border border-gray-100/20 dark:border-white/[0.08]"
  >
    {/* Buy/Sell */}
    <div className="w-32">
      <div className="flex items-center space-x-2">
        <span className="font-medium text-gray-900 dark:text-white">{trade.buy}</span>
        <span className="text-gray-500 dark:text-gray-400">/</span>
        <span className="font-medium text-gray-900 dark:text-white">{trade.sell}</span>
      </div>
    </div>

    {/* Amount In */}
    <div className="flex-1 text-right">
      <p className="font-medium text-gray-900 dark:text-white">{trade.amountIn}</p>
    </div>

    {/* Amount Out */}
    <div className="w-32 text-right">
      <p className="font-medium text-gray-900 dark:text-white">{trade.amountOut}</p>
    </div>

    {/* APY Profit */}
    <div className="w-32 text-right">
      <p className="font-medium text-green-500 dark:text-green-400">{trade.apyProfit}%</p>
    </div>
  </motion.div>
)

export default function DashboardPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Mock data
  const stats = [
    { title: 'Balance', value: '$1,252' },
    { title: 'Total Earnings', value: '$341' },
    { title: 'Estimated APY', value: '12.3%' }
  ]

  const assets = Array(4).fill({
    name: 'aETH/USDC',
    apy: '7.23',
    price: '2,843.65',
    holdings: '752'
  })

  const agents = [{
    name: 'aliAI',
    riskLevel: 4,
    holdings: '2,843.65',
    profit: '752',
    totalPL: '341'
  }]

  const trades = Array(3).fill({
    buy: 'aETH',
    sell: 'bETH',
    amountIn: '172.5',
    amountOut: '173.4',
    apyProfit: '0.03'
  })

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Assets Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Assets</h2>
          <div className="space-y-3">
            {assets.map((asset, index) => (
              <AssetRow key={index} asset={asset} />
            ))}
          </div>
        </div>

        {/* My Agent Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">My Agent</h2>
          <div className="space-y-3">
            {agents.map((agent, index) => (
              <AgentRow key={index} agent={agent} />
            ))}
          </div>
        </div>

        {/* Trade History Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Trade History</h2>
          <div className="space-y-3">
            {trades.map((trade, index) => (
              <TradeRow key={index} trade={trade} />
            ))}
          </div>
        </div>
      </div>

      <CreateAgentModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  )
} 