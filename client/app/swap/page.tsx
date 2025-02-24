'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowsUpDownIcon, ChevronDownIcon, PlusIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'
import { SwapService } from '@/services/swap/SwapService'
import { Token, SwapState } from '@/services/swap/types'
import { USDC, DEFAULT_SLIPPAGE, CONTRACT_ADDRESSES } from '@/services/swap/constants'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { TokenSelector } from '@/components/TokenSelector'
import { SwapProgressModal } from '@/components/swap/SwapProgressModal'

// Initialize SwapService
const swapService = new SwapService(
  CONTRACT_ADDRESSES.ROUTER,
  CONTRACT_ADDRESSES.FACTORY
)

// Slippage Settings Modal Component
const SlippageModal = ({
  isOpen,
  onClose,
  slippage,
  onSlippageChange
}: {
  isOpen: boolean
  onClose: () => void
  slippage: number
  onSlippageChange: (value: number) => void
}) => {
  const [customSlippage, setCustomSlippage] = useState('')

  const presetSlippages = [0.1, 0.5, 1.0]

  const handleCustomSlippageChange = (value: string) => {
    setCustomSlippage(value)
    const numValue = Number(value)
    if (!isNaN(numValue) && numValue > 0 && numValue <= 5) {
      onSlippageChange(numValue)
    }
  }

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
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Slippage Tolerance</h3>
            
            <div className="flex gap-2 mb-4">
              {presetSlippages.map((value) => (
                <button
                  key={value}
                  onClick={() => onSlippageChange(value)}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                    slippage === value
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="number"
                value={customSlippage}
                onChange={(e) => handleCustomSlippageChange(e.target.value)}
                placeholder="Custom slippage"
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white 
                         placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 
                         focus:ring-primary-500/20"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
            </div>

            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Your transaction will revert if the price changes unfavorably by more than this percentage.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Token Input Component
const TokenInput = ({ 
  value, 
  onChange, 
  token, 
  onTokenSelect, 
  label,
  disabled = false,
  showPrice = false,
  price = '',
  isLoading = false
}: { 
  value: string
  onChange: (value: string) => void
  token: Token | null
  onTokenSelect: () => void
  label: string
  disabled?: boolean
  showPrice?: boolean
  price?: string
  isLoading?: boolean
}) => {
  const { address } = useAccount()
  const [balance, setBalance] = useState('0')

  useEffect(() => {
    const getBalance = async () => {
      if (token && address && swapService) {
        const balance = await swapService.getTokenBalance(token, address)
        setBalance(balance)
      }
    }
    getBalance()
  }, [token, address])

  return (
    <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg p-4 rounded-2xl border border-gray-100/20 dark:border-white/[0.08]">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Balance:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {Number(balance)}
          </span>
          {token && balance !== '0' && (
            <button
              onClick={() => onChange(balance)}
              className="text-xs text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300"
            >
              MAX
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="w-[calc(100%-140px)] animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ) : (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.00"
            disabled={disabled}
            className="w-[calc(100%-140px)] bg-transparent text-2xl font-medium text-gray-900 dark:text-white focus:outline-none"
          />
        )}
        <motion.button
          className="flex items-center gap-2 bg-gray-50 dark:bg-white/[0.06] px-4 py-2 rounded-xl border border-gray-100/20 
                   dark:border-white/[0.08] w-[140px] hover:bg-gray-100/50 dark:hover:bg-white/[0.08] transition-colors duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onTokenSelect}
        >
          {token ? (
            <>
              <div className="w-6 h-6 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-primary-700 dark:text-primary-300">{token.symbol[0]}</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white min-w-[50px]">{token.symbol}</span>
            </>
          ) : (
            <span className="font-medium text-gray-500 dark:text-gray-400">Select</span>
          )}
          <ChevronDownIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-auto" />
        </motion.button>
      </div>
    </div>
  )
}

export default function SwapPage() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [availableTokens, setAvailableTokens] = useState<Token[]>([USDC])
  const [state, setState] = useState<SwapState>({
    tokenIn: USDC,
    tokenOut: null,
    amountIn: '',
    amountOut: '',
    loading: false,
    error: null,
    priceImpact: 0
  })

  const [showSlippageModal, setShowSlippageModal] = useState(false)
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE * 100) // Convert to percentage

  // Update token selection modal state
  const [tokenSelectorConfig, setTokenSelectorConfig] = useState<{
    isOpen: boolean
    type: 'from' | 'to'
  }>({
    isOpen: false,
    type: 'from'
  })

  // New states for swap progress
  const [swapStatus, setSwapStatus] = useState<'approving' | 'swapping' | 'success' | 'error'>('approving')
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [swapError, setSwapError] = useState<string>()
  const [txHash, setTxHash] = useState<string>()

  // Add this at the top of the component with other state declarations
  const quoteTimeoutRef = useRef<NodeJS.Timeout>();

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      if (quoteTimeoutRef.current) {
        clearTimeout(quoteTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const tokens = await swapService.getAvailableTokens()
        setAvailableTokens([USDC, ...tokens])
      } catch (error) {
        console.error('Error fetching tokens:', error)
      }
    }
    fetchTokens()
  }, [])

  const handleSwapTokens = () => {
    setState(prev => ({
      ...prev,
      tokenIn: prev.tokenOut,
      tokenOut: prev.tokenIn,
      amountIn: '',
      amountOut: ''
    }))
  }

  const handleAmountInChange = async (value: string) => {
    setState(prev => ({ ...prev, amountIn: value, loading: true, error: null }))
    
    if (!state.tokenIn || !state.tokenOut || !value || value === '0') {
      setState(prev => ({ ...prev, amountOut: '', loading: false }))
      return
    }

    try {
      // Add debounce to avoid rapid state updates
      clearTimeout(quoteTimeoutRef.current)
      
      quoteTimeoutRef.current = setTimeout(async () => {
        const quote = await swapService.getQuote(
          state.tokenIn!,
          state.tokenOut!,
          value,
          'exactIn'
        )
        
        // Only update if the input amount hasn't changed
        setState(prev => {
          if (prev.amountIn === value) {
            return {
              ...prev,
              amountOut: quote.amountOut,
              priceImpact: quote.priceImpact,
              loading: false,
              error: null
            }
          }
          return prev
        })
      }, 500) // Increased debounce time
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        amountOut: '',
        loading: false,
        error: error.message
      }))
    }
  }

  const handleSwap = async () => {
    if (!state.tokenIn || !state.tokenOut || !state.amountIn || !address || !walletClient) {
      setState(prev => ({ ...prev, error: 'Please connect your wallet and select tokens' }))
      return
    }

    try {
      // Store current amounts before resetting state
      const currentAmountIn = state.amountIn;
      const currentAmountOut = state.amountOut;
      
      setShowProgressModal(true)
      setSwapStatus('approving')
      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const hash = await swapService.executeSwap(
          state.tokenIn,
          state.tokenOut,
          currentAmountIn,
          slippage,
          address,
          walletClient
        )

        // Set transaction hash and show success
        setTxHash(hash)
        setSwapStatus('success')
        
        // Reset form but keep the successful amounts in the modal
        setState(prev => ({ 
          ...prev, 
          amountIn: '', 
          amountOut: '',
          loading: false,
          error: null
        }))

        // Update modal amounts
        setModalState({
          amountIn: currentAmountIn,
          amountOut: currentAmountOut
        })

      } catch (error: any) {
        console.error('Swap error:', error)
        setSwapStatus('error')
        setSwapError(error.message || 'Failed to execute swap. Please try again.')
        setState(prev => ({ ...prev, loading: false, error: error.message }))
      }
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  // Add this near other state declarations
  const [modalState, setModalState] = useState({
    amountIn: '',
    amountOut: ''
  });

  // Update token selection handlers
  const openTokenSelector = (type: 'from' | 'to') => {
    setTokenSelectorConfig({ isOpen: true, type })
  }

  const closeTokenSelector = () => {
    setTokenSelectorConfig(prev => ({ ...prev, isOpen: false }))
  }

  const handleTokenSelect = (token: Token) => {
    if (tokenSelectorConfig.type === 'from') {
      setState(prev => ({ ...prev, tokenIn: token, amountOut: '' }))
    } else {
      setState(prev => ({ ...prev, tokenOut: token, amountOut: '' }))
    }
    closeTokenSelector()
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
                onClick={() => setShowSlippageModal(true)}
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </motion.button>
            </div>

            <div className="space-y-2">
              <TokenInput
                value={state.amountIn}
                onChange={handleAmountInChange}
                token={state.tokenIn}
                onTokenSelect={() => openTokenSelector('from')}
                label="You pay"
                showPrice={false}
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
                value={state.amountOut}
                onChange={() => {}}
                token={state.tokenOut}
                onTokenSelect={() => openTokenSelector('to')}
                label="You receive"
                disabled
                showPrice={false}
                isLoading={state.loading}
              />
            </div>

            {state.error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                {state.error}
              </div>
            )}

            <div className="mt-6 p-4 bg-gray-50/80 dark:bg-white/[0.03] backdrop-blur-sm rounded-xl space-y-2 
                         border border-gray-100/20 dark:border-white/[0.08]">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Price Impact</span>
                <span className={`font-medium ${
                  state.priceImpact > 1 ? 'text-red-500 dark:text-red-400' :
                  state.priceImpact > 0.5 ? 'text-yellow-500 dark:text-yellow-400' :
                  'text-green-500 dark:text-green-400'
                }`}>
                  {state.priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Slippage Tolerance</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {slippage}%
                </span>
              </div>
              {state.tokenIn && state.tokenOut && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Route</span>
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {state.tokenIn.symbol} → {state.tokenOut.symbol}
                  </span>
                </div>
              )}
            </div>

            <motion.button
              className="w-full mt-6 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 
                       text-white py-4 rounded-xl font-medium shadow-[0_0_30px_rgba(107,112,244,0.2)] 
                       dark:shadow-[0_0_30px_rgba(107,112,244,0.1)] hover:shadow-[0_0_30px_rgba(107,112,244,0.4)] 
                       dark:hover:shadow-[0_0_30px_rgba(107,112,244,0.2)] transition-all duration-200 disabled:opacity-50
                       disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSwap}
              disabled={!state.tokenIn || !state.tokenOut || !state.amountIn || state.loading}
            >
              {state.loading ? 'Loading...' : 'Swap'}
            </motion.button>
          </motion.div>
        </div>

        <TokenSelector
          isOpen={tokenSelectorConfig.isOpen}
          onClose={closeTokenSelector}
          onSelect={handleTokenSelect}
          selectedTokens={[state.tokenIn, state.tokenOut]}
          type={tokenSelectorConfig.type}
        />
        <SlippageModal
          isOpen={showSlippageModal}
          onClose={() => setShowSlippageModal(false)}
          slippage={slippage}
          onSlippageChange={setSlippage}
        />
      </div>

      <SwapProgressModal
        isOpen={showProgressModal}
        onClose={() => {
          setShowProgressModal(false)
          setSwapStatus('approving')
          setTxHash(undefined)
          setSwapError(undefined)
          setModalState({ amountIn: '', amountOut: '' })
        }}
        status={swapStatus}
        tokenIn={state.tokenIn}
        tokenOut={state.tokenOut}
        amountIn={modalState.amountIn || state.amountIn}
        amountOut={modalState.amountOut || state.amountOut}
        error={swapError}
        txHash={txHash}
      />
    </>
  )
} 