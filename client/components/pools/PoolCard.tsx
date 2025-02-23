import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { Tooltip } from '@/components/shared/Tooltip'
import { PoolData } from './types'
import { calculateTVL, calculatePrice, formatNumber, getSlashingRiskColor, getSlashingRiskLabel } from './utils'

interface PoolCardProps {
  pool: PoolData
}

export const PoolCard = ({ pool }: PoolCardProps) => {
  const tvl = calculateTVL(pool.reserve0, pool.reserve1)
  const price = calculatePrice(pool.reserve0, pool.reserve1)

  return (
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
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {pool.token0Symbol[0]}
            </span>
          </div>
          <div className="w-10 h-10 bg-primary-50 dark:bg-white/[0.05] rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {pool.token1Symbol[0]}
            </span>
          </div>
        </div>

        {/* Pool Name and TVL */}
        <div className="flex-1">
          <h3 className="text-base font-medium text-gray-900 dark:text-white flex items-center gap-3">
            {pool.token0Symbol}/{pool.token1Symbol}
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary-500/30"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-primary-500/50"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-primary-500/70"></div>
            </div>
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pool.token0Symbol.startsWith('LST') ? 'Liquid Staking Token' : 'Liquid Restaking Token'}
            </p>
            <div className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400">
              <span className="font-medium">{formatNumber(tvl)}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">TVL</span>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="px-4 text-right">
          <p className="font-medium text-gray-900 dark:text-white">${price.toFixed(2)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
        </div>

        {/* APY */}
        <div className="px-4 text-right">
          {pool.apy !== null ? (
            <div className="flex items-center justify-end gap-1 text-green-500 dark:text-green-400">
              <ArrowTrendingUpIcon className="w-4 h-4" />
              <span className="font-medium">{pool.apy}%</span>
            </div>
          ) : (
            <div className="text-gray-400 dark:text-gray-500">N/A</div>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">APY</p>
        </div>

        {/* Slashing History */}
        <div className="px-4 text-right">
          {pool.slashingHistory !== null ? (
            <Tooltip content={getSlashingRiskLabel(pool.slashingHistory)}>
              <div className="flex items-center justify-end gap-1">
                <div className={`font-medium ${getSlashingRiskColor(pool.slashingHistory)}`}>
                  {pool.slashingHistory.toFixed(2)}%
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  pool.slashingHistory < 0.1 ? 'bg-green-500 dark:bg-green-400' :
                  pool.slashingHistory < 0.5 ? 'bg-yellow-500 dark:bg-yellow-400' :
                  pool.slashingHistory < 1 ? 'bg-orange-500 dark:bg-orange-400' :
                  'bg-red-500 dark:bg-red-400'
                }`} />
              </div>
            </Tooltip>
          ) : (
            <p className="text-gray-400 dark:text-gray-500">N/A</p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">Risk Score</p>
        </div>

        {/* Add Liquidity Button */}
        <Link href={`/pool/add?address=${pool.pairAddress}`}>
          <motion.button
            className="ml-4 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 
                     rounded-xl font-medium text-sm text-gray-900 dark:text-white transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Add Liquidity
          </motion.button>
        </Link>
      </div>
    </motion.div>
  )
} 