'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'

// Position Card Component
const PositionCard = ({ position }: { position: any }) => {
  const [isRemoving, setIsRemoving] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group"
    >
      <div className="relative flex items-center justify-between bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg rounded-xl 
                    border border-gray-100/20 dark:border-white/[0.08] p-4 hover:border-primary-500/20 
                    dark:hover:border-primary-400/20 transition-colors duration-300">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Token Icons */}
          <div className="flex -space-x-2">
            <div className="w-10 h-10 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center z-10">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">E</span>
            </div>
            <div className="w-10 h-10 bg-primary-50 dark:bg-white/[0.05] rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">U</span>
            </div>
          </div>

          {/* Position Details */}
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white">{position.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {position.token0Amount} / {position.token1Amount}
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-8">
          {/* Fee Info */}
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Fee Earned</p>
            <p className="font-medium text-gray-900 dark:text-white">${position.feeEarned}</p>
          </div>

          {/* Remove Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsRemoving(true)}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 dark:bg-red-500/20 dark:hover:bg-red-500/30 
                     text-red-600 dark:text-red-400 rounded-xl font-medium text-sm transition-colors duration-200"
          >
            Remove Liquidity
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default function RemoveLiquidityPage() {
  // Mock positions data
  const positions = [
    {
      name: 'aETH/USDC',
      token0Amount: '1.2',
      token1Amount: '3124',
      feeEarned: '28.65'
    },
    {
      name: 'LST/USDC',
      token0Amount: '2.4',
      token1Amount: '6248',
      feeEarned: '42.30'
    },
    {
      name: 'LRT/USDC',
      token0Amount: '3.6',
      token1Amount: '9372',
      feeEarned: '56.90'
    },
    {
      name: 'LST/LRT',
      token0Amount: '100',
      token1Amount: '95',
      feeEarned: '34.75'
    }
  ]

  return (
    <>
      <AnimatedBackground />
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/[0.02] rounded-xl transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </motion.button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Positions</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              View and manage your liquidity positions
            </p>
          </div>
        </div>

        {/* Positions List */}
        <div className="space-y-3">
          {positions.map((position, index) => (
            <PositionCard key={index} position={position} />
          ))}
        </div>

        {/* No Positions State */}
        {positions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No liquidity positions found</p>
            <Link href="/pool/add">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-4 px-6 py-2 bg-primary-500/80 hover:bg-primary-600/80 text-white rounded-xl 
                         font-medium transition-colors duration-200"
              >
                Add Liquidity
              </motion.button>
            </Link>
          </div>
        )}
      </div>
    </>
  )
} 