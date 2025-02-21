'use client'

import { motion } from 'framer-motion'
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'

// Pool Card Component
const PoolCard = ({ pool }: { pool: any }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative group"
  >
    {/* Hover Glow Effect */}
    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500/0 to-primary-600/0 group-hover:from-primary-500/10 
                   group-hover:to-primary-600/10 dark:group-hover:from-primary-400/[0.08] dark:group-hover:to-primary-500/[0.08] 
                   rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500" />
    
    <div className="relative flex items-center bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg rounded-xl 
                  border border-gray-100/20 dark:border-white/[0.08] p-4 hover:border-primary-500/20 
                  dark:hover:border-primary-400/20 transition-colors duration-300">
      {/* Token Icons */}
      <div className="flex -space-x-2 mr-4">
        <div className="w-10 h-10 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center z-10">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">E</span>
        </div>
        <div className="w-10 h-10 bg-primary-50 dark:bg-white/[0.05] rounded-full flex items-center justify-center">
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">U</span>
        </div>
      </div>

      {/* Pool Name */}
      <div className="flex-1">
        <h3 className="text-base font-medium text-gray-900 dark:text-white">ETH/USDC</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Uniswap V2</p>
      </div>

      {/* APY */}
      <div className="px-4 text-right">
        <div className="flex items-center justify-end gap-1 text-green-500 dark:text-green-400">
          <ArrowTrendingUpIcon className="w-4 h-4" />
          <span className="font-medium">7.23%</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">APY</p>
      </div>

      {/* Price */}
      <div className="px-4 text-right">
        <p className="font-medium text-gray-900 dark:text-white">$2,843.65</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
      </div>

      {/* Add Liquidity Button */}
      <motion.button
        className="ml-4 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 
                 rounded-xl font-medium text-sm text-gray-900 dark:text-white transition-colors duration-200"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Add Liquidity
      </motion.button>
    </div>
  </motion.div>
)

// Main Page Component
export default function PoolsPage() {
  // Mock data for pools
  const pools = Array(6).fill({
    name: 'ETH/USDC',
    platform: 'Uniswap V2',
    apy: '7.23',
    price: '2,843.65'
  })

  return (
    <>
      <AnimatedBackground />
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Pools</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Provide liquidity to earn trading fees and rewards
          </p>
        </div>

        {/* Pool List */}
        <div className="space-y-3">
          {pools.map((pool, index) => (
            <PoolCard key={index} pool={pool} />
          ))}
        </div>
      </div>
    </>
  )
}
