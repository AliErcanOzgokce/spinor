import { motion, AnimatePresence } from 'framer-motion'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { Token } from '@/services/swap/types'
import { TOKENS } from '@/services/swap/constants'

interface TokenSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (token: Token) => void
  selectedTokens: (Token | null)[]
  type: 'from' | 'to'
}

export const TokenSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  selectedTokens,
  type 
}: TokenSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter tokens based on search and already selected tokens
  const filteredTokens = TOKENS.filter(token => {
    // Don't show already selected tokens
    if (selectedTokens.some(selected => selected?.address === token.address)) {
      return false
    }
    
    // Filter by search query
    if (searchQuery) {
      return token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    }
    
    return true
  })

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
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Select a Token
            </h3>

            {/* Search Input */}
            <div className="relative mb-4">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by token name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-gray-700/50 rounded-2xl text-gray-900 
                         dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none 
                         focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            {/* Token List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 -mr-2">
              {filteredTokens.map((token) => (
                <motion.button
                  key={token.address}
                  className="w-full flex items-center gap-4 p-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 
                           rounded-xl transition-colors"
                  onClick={() => onSelect(token)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Token Icon */}
                  <div className="w-10 h-10 bg-primary-100 dark:bg-white/[0.08] rounded-full flex 
                               items-center justify-center shrink-0">
                    <span className="text-lg font-medium text-primary-700 dark:text-primary-300">
                      {token.symbol[0]}
                    </span>
                  </div>

                  {/* Token Info */}
                  <div className="flex-1 text-left">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {token.symbol}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {token.symbol.startsWith('LST') ? 'Liquid Staking Token' : 'Liquid Restaking Token'}
                    </p>
                  </div>

                  {/* Hover Indicator */}
                  <div className="w-2 h-2 rounded-full bg-primary-500/30 opacity-0 group-hover:opacity-100 
                               transition-opacity" />
                </motion.button>
              ))}

              {filteredTokens.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No tokens found
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 