'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowsUpDownIcon, ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'

// Token Selection Modal Component
const TokenModal = ({ isOpen, onClose, onSelect }: any) => (
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
          <h3 className="text-xl font-semibold mb-4">Select Token</h3>
          <input
            type="text"
            placeholder="Search by name or paste address"
            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <div className="mt-4 space-y-2">
            {['ETH', 'USDC', 'LST', 'LRT'].map(token => (
              <motion.button
                key={token}
                className="w-full flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  onSelect(token)
                  onClose()
                }}
              >
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300">{token.slice(0, 1)}</span>
                </div>
                <span className="ml-3 font-medium">{token}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

// Token Input Component
const TokenInput = ({ value, onChange, token, onTokenSelect, label }: any) => (
  <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg p-4 rounded-2xl border border-gray-100/20 dark:border-white/[0.08]">
    <div className="flex justify-between mb-2">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm text-gray-500 dark:text-gray-400">Balance: 0.00</span>
    </div>
    <div className="flex items-center gap-3">
      <input
        type="number"
        value={value}
        onChange={onChange}
        placeholder="0.00"
        className="w-[calc(100%-140px)] bg-transparent text-2xl font-medium text-gray-900 dark:text-white focus:outline-none"
      />
      <motion.button
        className="flex items-center gap-2 bg-gray-50 dark:bg-white/[0.06] px-4 py-2 rounded-xl border border-gray-100/20 
                 dark:border-white/[0.08] w-[140px] hover:bg-gray-100/50 dark:hover:bg-white/[0.08] transition-colors duration-200"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onTokenSelect}
      >
        <div className="w-6 h-6 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center shrink-0">
          <span className="text-xs font-medium text-primary-700 dark:text-primary-300">{token.slice(0, 1)}</span>
        </div>
        <span className="font-medium text-gray-900 dark:text-white min-w-[50px]">{token}</span>
        <ChevronDownIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-auto" />
      </motion.button>
    </div>
  </div>
)

export default function SwapPage() {
  const [tokenFrom, setTokenFrom] = useState('ETH')
  const [tokenTo, setTokenTo] = useState('USDC')
  const [amount, setAmount] = useState('')
  const [showFromModal, setShowFromModal] = useState(false)
  const [showToModal, setShowToModal] = useState(false)

  const handleSwapTokens = () => {
    setTokenFrom(tokenTo)
    setTokenTo(tokenFrom)
  }

  return (
    <>
      <AnimatedBackground />
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="relative">
          {/* Glow Effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500/30 to-primary-600/30 dark:from-primary-400/10 dark:to-primary-500/10 rounded-[24px] blur-2xl opacity-75 group-hover:opacity-100 transition duration-1000" />
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500/30 to-primary-600/30 dark:from-primary-400/10 dark:to-primary-500/10 rounded-[24px] blur opacity-75 group-hover:opacity-100 transition duration-1000" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white/80 dark:bg-black/50 backdrop-blur-xl rounded-3xl border border-gray-100/20 
                     dark:border-white/[0.08] p-6 shadow-xl dark:shadow-2xl shadow-black/5 dark:shadow-primary-500/5"
          >
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Swap</h1>
              <motion.button
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PlusIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </motion.button>
            </div>

            <div className="space-y-2">
              <TokenInput
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                token={tokenFrom}
                onTokenSelect={() => setShowFromModal(true)}
                label="You pay"
              />

              <div className="flex justify-center -my-2 relative z-10">
                <motion.button
                  className="bg-primary-100 dark:bg-white/[0.06] p-3 rounded-xl shadow-md hover:shadow-lg transition-shadow"
                  whileHover={{ scale: 1.1, rotate: 180 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSwapTokens}
                >
                  <ArrowsUpDownIcon className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                </motion.button>
              </div>

              <TokenInput
                value={'0.00'}
                onChange={() => {}}
                token={tokenTo}
                onTokenSelect={() => setShowToModal(true)}
                label="You receive"
              />
            </div>

            <div className="mt-6 p-4 bg-gray-50/80 dark:bg-white/[0.03] backdrop-blur-sm rounded-xl space-y-2 
                         border border-gray-100/20 dark:border-white/[0.08]">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Price Impact</span>
                <span className="font-medium text-green-500 dark:text-green-400">{'< 0.01%'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Route</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{`${tokenFrom} → ${tokenTo}`}</span>
              </div>
            </div>

            <motion.button
              className="w-full mt-6 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 
                       text-white py-4 rounded-xl font-medium shadow-[0_0_30px_rgba(107,112,244,0.2)] 
                       dark:shadow-[0_0_30px_rgba(107,112,244,0.1)] hover:shadow-[0_0_30px_rgba(107,112,244,0.4)] 
                       dark:hover:shadow-[0_0_30px_rgba(107,112,244,0.2)] transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Swap
            </motion.button>
          </motion.div>
        </div>

        <TokenModal
          isOpen={showFromModal}
          onClose={() => setShowFromModal(false)}
          onSelect={setTokenFrom}
        />
        <TokenModal
          isOpen={showToModal}
          onClose={() => setShowToModal(false)}
          onSelect={setTokenTo}
        />
      </div>
    </>
  )
} 