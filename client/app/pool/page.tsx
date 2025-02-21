'use client'

import { motion } from 'framer-motion'
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'

// Pool Row Component
const PoolRow = ({ pool }: { pool: any }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg rounded-xl 
              border border-gray-100/20 dark:border-white/[0.08] p-4 hover:border-primary-500/20 
              dark:hover:border-primary-400/20 transition-colors duration-200"
  >
    {/* Token Icons & Name */}
    <div className="flex items-center flex-1">
      <div className="flex -space-x-2 mr-3">
        <div className="w-8 h-8 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center z-10">
          <span className="text-xs font-medium text-primary-700 dark:text-primary-300">E</span>
        </div>
        <div className="w-8 h-8 bg-primary-50 dark:bg-white/[0.05] rounded-full flex items-center justify-center">
          <span className="text-xs font-medium text-primary-600 dark:text-primary-400">U</span>
        </div>
      </div>
      <span className="font-medium text-gray-900 dark:text-white">{pool.name}</span>
    </div>

    {/* APY */}
    <div className="w-32 flex items-center justify-end">
      <div className="flex items-center gap-1 text-green-500 dark:text-green-400">
        <ArrowTrendingUpIcon className="w-4 h-4" />
        <span className="font-medium">{pool.apy}%</span>
      </div>
    </div>

    {/* Price */}
    <div className="w-40 text-right">
      <span className="font-medium text-gray-900 dark:text-white">${pool.price}</span>
    </div>

    {/* Add Liquidity Button */}
    <div className="w-40 text-right">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="px-4 py-2 bg-primary-500/80 hover:bg-primary-600/80 text-white rounded-xl 
                 font-medium transition-colors duration-200"
      >
        Add Liquidity
      </motion.button>
    </div>
  </motion.div>
)

export default function PoolPage() {
  // Mock data for pools
  const pools = Array(6).fill({
    name: 'aETH/USDC',
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
        </div>

        {/* Table Header */}
        <div className="flex items-center px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex-1">Name</div>
          <div className="w-32 text-right">APY</div>
          <div className="w-40 text-right">Price</div>
          <div className="w-40 text-right">Liquidity</div>
        </div>

        {/* Pool List */}
        <div className="space-y-2">
          {pools.map((pool, index) => (
            <PoolRow key={index} pool={pool} />
          ))}
        </div>
      </div>
    </>
  )
}