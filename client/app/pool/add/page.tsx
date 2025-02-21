'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeftIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'

// Token Selection Modal Component
const PairSelectionModal = ({ isOpen, onClose, onSelect }: any) => {
  const pairs = [
    { name: 'ETH/USDC', token0: 'ETH', token1: 'USDC' },
    { name: 'LST/USDC', token0: 'LST', token1: 'USDC' },
    { name: 'LRT/USDC', token0: 'LRT', token1: 'USDC' },
    { name: 'LST/LRT', token0: 'LST', token1: 'LRT' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-md shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Select Pair</h3>
            <input
              type="text"
              placeholder="Search pairs"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 
                     focus:outline-none focus:ring-2 focus:ring-primary-500/20 mb-4"
            />
            <div className="space-y-2">
              {pairs.map(pair => (
                <motion.button
                  key={pair.name}
                  className="w-full flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    onSelect(pair)
                    onClose()
                  }}
                >
                  <div className="flex -space-x-2 mr-3">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center z-10">
                      <span className="text-xs font-medium text-primary-700 dark:text-primary-300">{pair.token0[0]}</span>
                    </div>
                    <div className="w-8 h-8 bg-primary-50 dark:bg-white/[0.05] rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400">{pair.token1[0]}</span>
                    </div>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{pair.name}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function AddLiquidityPage() {
  const [showPairModal, setShowPairModal] = useState(false)
  const [selectedPair, setSelectedPair] = useState<any>(null)
  const [formData, setFormData] = useState({
    token0Amount: '',
    token1Amount: ''
  })

  const handlePairSelect = (pair: any) => {
    setSelectedPair(pair)
    setFormData({ token0Amount: '', token1Amount: '' })
  }

  return (
    <>
      <AnimatedBackground />
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="relative bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-3xl 
                     border border-gray-100/20 dark:border-white/[0.08] p-6 shadow-xl">
          {/* Header with Back Button */}
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/[0.02] rounded-xl transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </motion.button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Liquidity</h1>
          </div>

          {/* Pool Selection Button */}
          <motion.button
            onClick={() => setShowPairModal(true)}
            className="w-full flex items-center justify-between bg-black/5 dark:bg-white/[0.02] rounded-xl p-4 mb-6
                     hover:bg-black/10 dark:hover:bg-white/[0.04] transition-colors"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-3">
              {selectedPair ? (
                <>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center z-10">
                      <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                        {selectedPair.token0[0]}
                      </span>
                    </div>
                    <div className="w-8 h-8 bg-primary-50 dark:bg-white/[0.05] rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                        {selectedPair.token1[0]}
                      </span>
                    </div>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedPair.name}</span>
                </>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">Select a pair</span>
              )}
            </div>
            <ChevronDownIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </motion.button>

          {selectedPair && (
            <div className="space-y-4">
              {/* First Token Input */}
              <div className="bg-black/5 dark:bg-white/[0.02] rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Input</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Balance: 0.00</span>
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={formData.token0Amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, token0Amount: e.target.value }))}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-2xl font-medium text-gray-900 dark:text-white focus:outline-none"
                  />
                  <div className="flex items-center gap-2 bg-white/40 dark:bg-white/[0.02] px-3 py-2 rounded-xl">
                    <div className="w-6 h-6 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                        {selectedPair.token0[0]}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedPair.token0}</span>
                  </div>
                </div>
              </div>

              {/* Second Token Input */}
              <div className="bg-black/5 dark:bg-white/[0.02] rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Input</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Balance: 0.00</span>
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={formData.token1Amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, token1Amount: e.target.value }))}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-2xl font-medium text-gray-900 dark:text-white focus:outline-none"
                  />
                  <div className="flex items-center gap-2 bg-white/40 dark:bg-white/[0.02] px-3 py-2 rounded-xl">
                    <div className="w-6 h-6 bg-primary-50 dark:bg-white/[0.05] rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                        {selectedPair.token1[0]}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedPair.token1}</span>
                  </div>
                </div>
              </div>

              {/* Add Liquidity Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-6 bg-primary-500/80 hover:bg-primary-600/80 text-white py-4 rounded-xl 
                         font-medium transition-colors duration-200"
              >
                Add Liquidity
              </motion.button>
            </div>
          )}
        </div>
      </div>

      <PairSelectionModal
        isOpen={showPairModal}
        onClose={() => setShowPairModal(false)}
        onSelect={handlePairSelect}
      />
    </>
  )
} 