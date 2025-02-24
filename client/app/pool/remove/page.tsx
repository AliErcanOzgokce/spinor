'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'
import { PoolService } from '@/services/pool/PoolService'
import { Token } from '@/services/swap/types'
import { CONTRACT_ADDRESSES } from '@/services/swap/constants'
import { useAccount, useWalletClient } from 'wagmi'
import { RemoveLiquidityProgressModal } from '@/components/pool/RemoveLiquidityProgressModal'
import { AmountSkeleton } from '@/components/shared/AmountSkeleton'
import { TOKENS } from '@/constants/tokens'
import { formatUnits, parseUnits } from 'viem'

// Initialize PoolService
const poolService = new PoolService(
  CONTRACT_ADDRESSES.ROUTER,
  CONTRACT_ADDRESSES.FACTORY
)

interface LPTokenBalance {
  token0: Token
  token1: Token
  balance: string
  loading: boolean
  fee?: string
  tokenRatio?: string
  feeEarned?: string
}

export default function RemoveLiquidityPage() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [lpTokenBalances, setLPTokenBalances] = useState<LPTokenBalance[]>([])
  const [selectedPair, setSelectedPair] = useState<LPTokenBalance | null>(null)
  const [lpAmount, setLPAmount] = useState('')
  const [expectedAmount0, setExpectedAmount0] = useState('0')
  const [expectedAmount1, setExpectedAmount1] = useState('0')
  const [modalOpen, setModalOpen] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isLoadingBalances, setIsLoadingBalances] = useState(true)

  type StepStatus = 'pending' | 'loading' | 'completed' | 'error'
  interface Step {
    label: string
    status: StepStatus
    hash?: string
  }

  const [steps, setSteps] = useState<Step[]>([
    { label: 'Approving LP Token', status: 'pending' },
    { label: 'Removing Liquidity', status: 'pending' }
  ])
  const [error, setError] = useState('')

  // Fetch LP token balances for all possible pairs
  useEffect(() => {
    const fetchLPBalances = async () => {
      if (!address) return

      console.log('Starting to fetch LP balances...');
      setIsLoadingBalances(true);
      const balances: LPTokenBalance[] = [];

      // USDC is always token0
      const usdc = TOKENS.USDC;
      const otherTokens = Object.values(TOKENS).filter(token => token.address !== usdc.address);

      console.log('Checking balances for tokens:', otherTokens.map(t => t.symbol));

      for (const token of otherTokens) {
        try {
          const balance = await poolService.getLPTokenBalance(usdc, token, address);
          console.log(`Balance for ${token.symbol}:`, balance);
          
          if (Number(balance) > 0) {
            // Get pool reserves to calculate ratio
            const reserves = await poolService.getPoolReserves(usdc, token);
            console.log(`Reserves for ${token.symbol}:`, reserves);
            
            let tokenRatio = '0/0';
            if (reserves && reserves.reserveA !== 0n && reserves.reserveB !== 0n) {
              const reserveA = Number(formatUnits(reserves.reserveA, usdc.decimals));
              const reserveB = Number(formatUnits(reserves.reserveB, token.decimals));
              tokenRatio = `${reserveA.toLocaleString(undefined, { maximumFractionDigits: 2 })}/${reserveB.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
            }
            
            // Calculate fee earned
            const feeEarned = await poolService.calculateFeeEarned(usdc, token, balance, address);
            
            balances.push({
              token0: usdc,
              token1: token,
              balance,
              loading: false,
              fee: '0.3%',
              tokenRatio,
              feeEarned
            });
          }
        } catch (error) {
          console.error(`Error fetching LP balance for ${token.symbol}:`, error);
        }
      }

      console.log('Final balances:', balances);
      setLPTokenBalances(balances);
      setIsLoadingBalances(false);
    };

    fetchLPBalances();
  }, [address]);

  // Calculate expected amounts when LP amount changes
  useEffect(() => {
    const calculateExpectedAmounts = async () => {
      if (!selectedPair || !lpAmount || isNaN(Number(lpAmount)) || Number(lpAmount) <= 0) {
        setExpectedAmount0('0')
        setExpectedAmount1('0')
        return
      }

      setIsCalculating(true)
      try {
        const { amountAMin, amountBMin } = await poolService.calculateRemoveMinAmounts(
          selectedPair.token0,
          selectedPair.token1,
          lpAmount
        )
        setExpectedAmount0(formatUnits(amountAMin, selectedPair.token0.decimals))
        setExpectedAmount1(formatUnits(amountBMin, selectedPair.token1.decimals))
      } catch (error) {
        console.error('Error calculating expected amounts:', error)
      } finally {
        setIsCalculating(false)
      }
    }

    calculateExpectedAmounts()
  }, [selectedPair, lpAmount])

  const handleRemoveLiquidity = async () => {
    if (!walletClient || !address) {
      setError('Please connect your wallet first')
      return
    }

    if (!selectedPair || !lpAmount) {
      setError('Please fill in all fields')
      return
    }

    setModalOpen(true)
    setError('')
    
    try {
      // Reset steps
      setSteps([
        { label: 'Approving LP Token', status: 'pending' },
        { label: 'Removing Liquidity', status: 'pending' }
      ])

      const hash = await poolService.removeLiquidity(
        selectedPair.token0,
        selectedPair.token1,
        lpAmount,
        0.5, // 0.5% slippage
        address,
        walletClient,
        // Handle LP Token Approval
        () => {
          setSteps(prev => prev.map((step, i) => 
            i === 0 ? { ...step, status: 'loading' as StepStatus } : step
          ))
        }
      )

      // Update steps after successful transaction
      setSteps(prev => prev.map((step, i) => 
        i === 1 ? { ...step, status: 'completed', hash } : { ...step, status: 'completed' }
      ))
    } catch (err: any) {
      setError(err.message)
      // Find the current loading step and mark it as error
      setSteps(prev => prev.map(step => 
        step.status === 'loading' ? { ...step, status: 'error' as StepStatus } : step
      ))
    }
  }

  const handleSuccess = () => {
    // Reset form and refresh balances
    setLPAmount('')
    setExpectedAmount0('0')
    setExpectedAmount1('0')
    setSelectedPair(null)
    // Refresh LP token balances
    if (address) {
      const fetchLPBalances = async () => {
        setIsLoadingBalances(true)
        const balances: LPTokenBalance[] = []
        const usdc = TOKENS.USDC
        const otherTokens = Object.values(TOKENS).filter(token => token.address !== usdc.address)

        for (const token of otherTokens) {
          try {
            const balance = await poolService.getLPTokenBalance(usdc, token, address)
            if (Number(balance) > 0) {
              // Get pool reserves to calculate ratio
              const reserves = await poolService.getPoolReserves(usdc, token)
              let tokenRatio = '0/0'
              if (reserves && reserves.reserveA !== 0n && reserves.reserveB !== 0n) {
                const reserveA = Number(formatUnits(reserves.reserveA, usdc.decimals))
                const reserveB = Number(formatUnits(reserves.reserveB, token.decimals))
                tokenRatio = `${reserveA.toLocaleString(undefined, { maximumFractionDigits: 2 })}/${reserveB.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              }
              
              // Calculate fee earned
              const feeEarned = await poolService.calculateFeeEarned(usdc, token, balance, address)
              
              balances.push({
                token0: usdc,
                token1: token,
                balance,
                loading: false,
                fee: '0.3%',
                tokenRatio,
                feeEarned
              })
            }
          } catch (error) {
            console.error(`Error fetching LP balance for ${token.symbol}:`, error)
          }
        }

        setLPTokenBalances(balances)
        setIsLoadingBalances(false)
      }
      fetchLPBalances()
    }
  }

  return (
    <>
      <AnimatedBackground />
      <div className="relative min-h-screen py-20">
        <div className="w-full max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Positions
              </h1>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>

          {isLoadingBalances ? (
            // Loading skeleton for LP positions
            <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl rounded-3xl overflow-hidden">
              <div className="animate-pulse">
                <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : lpTokenBalances.length > 0 ? (
            <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl rounded-3xl overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[2fr_3fr_1fr_4fr] gap-4 p-4 border-b border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400">
                <div>Name</div>
                <div>Token Pair</div>
                <div className="text-center">Fee</div>
                <div className="text-right">Position</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {lpTokenBalances.map((lpToken) => (
                  <div
                    key={`${lpToken.token0.address}-${lpToken.token1.address}`}
                    className={`grid grid-cols-[2fr_3fr_1fr_4fr] gap-4 p-6 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors
                              ${selectedPair?.token1.address === lpToken.token1.address ? 
                                'bg-primary-50 dark:bg-primary-900/10' : ''}`}
                  >
                    {/* Name Column */}
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12">
                        <div className="absolute top-0 left-0 w-8 h-8 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 z-10">
                          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            {lpToken.token0.symbol[0]}
                          </span>
                        </div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            {lpToken.token1.symbol[0]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {lpToken.token0.symbol}/{lpToken.token1.symbol}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Pool
                        </div>
                      </div>
                    </div>

                    {/* Token Pair Column */}
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-gray-900 dark:text-white font-mono">
                        <span className="text-sm font-medium bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded">
                          {lpToken.tokenRatio ? lpToken.tokenRatio.split('/')[0] : '0.00'}
                        </span>
                        <span className="text-gray-400">/</span>
                        <span className="text-sm font-medium bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded">
                          {lpToken.tokenRatio ? lpToken.tokenRatio.split('/')[1] : '0.00'}
                        </span>
                      </div>
                    </div>

                    {/* Fee Column */}
                    <div className="flex items-center justify-center">
                      <div className="bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {lpToken.fee}
                        </span>
                      </div>
                    </div>

                    {/* Position Column */}
                    <div className="flex items-center justify-end gap-6">
                      <div className="flex items-center gap-3 bg-[#1a1b1f] rounded-xl px-4 py-2.5">
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-500">
                            LP Balance
                          </span>
                          <span className="text-base font-medium text-white">
                            {Number(lpToken.balance).toFixed(4)}
                          </span>
                        </div>
                      </div>
                      <motion.button
                        className="px-6 py-2.5 rounded-xl text-red-400 font-medium 
                                 bg-red-400/10 hover:bg-red-400/20 
                                 transition-colors min-w-[160px]"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPair(lpToken)}
                      >
                        Remove Liquidity
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl rounded-3xl p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                You don't have any liquidity positions yet
              </p>
              <Link
                href="/pool/add"
                className="inline-block py-3 px-6 rounded-xl text-white font-medium bg-primary-500 
                         hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 transition-colors"
              >
                Add Liquidity
              </Link>
            </div>
          )}

          {/* Remove Liquidity Modal */}
          <AnimatePresence>
            {selectedPair && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center"
                onClick={() => setSelectedPair(null)}
              >
                <motion.div
                  className="w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-3xl p-6"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Remove Liquidity
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex-1">
                      <div className="relative mb-2">
                        <div className="bg-[#1a1b1f] rounded-2xl p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1.5">
                                <input
                                  type="number"
                                  value={lpAmount}
                                  onChange={(e) => setLPAmount(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full bg-transparent text-3xl font-medium text-white focus:outline-none"
                                />
                                <button
                                  onClick={() => setLPAmount(selectedPair.balance)}
                                  className="px-3 py-1.5 bg-primary-500/10 rounded-lg 
                                           text-primary-400 text-sm font-medium 
                                           hover:bg-primary-400/20 transition-colors"
                                >
                                  MAX
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Balance: {Number(selectedPair.balance).toFixed(4)}</span>
                                <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                                <span className="text-sm text-gray-500">LP Tokens</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg p-4 rounded-xl 
                                  border border-gray-100/20 dark:border-white/[0.08]">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          You Will Receive
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-medium text-gray-900 dark:text-white">
                            {isCalculating ? <AmountSkeleton /> : Number(expectedAmount0).toFixed(4)}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {selectedPair.token0.symbol}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg p-4 rounded-xl 
                                  border border-gray-100/20 dark:border-white/[0.08]">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          You Will Receive
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-medium text-gray-900 dark:text-white">
                            {isCalculating ? <AmountSkeleton /> : Number(expectedAmount1).toFixed(4)}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {selectedPair.token1.symbol}
                          </span>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <motion.button
                        className="flex-1 py-4 px-6 rounded-xl text-primary-600 dark:text-primary-400 font-medium 
                                 bg-primary-500/10 dark:bg-primary-400/10 hover:bg-primary-500/20 
                                 dark:hover:bg-primary-400/20 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPair(null)}
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        className="flex-1 py-4 px-6 rounded-xl text-white font-medium bg-primary-500 
                                 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 
                                 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed 
                                 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRemoveLiquidity}
                        disabled={!lpAmount || isCalculating}
                      >
                        Remove Liquidity
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <RemoveLiquidityProgressModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          steps={steps}
          error={error}
          onSuccess={handleSuccess}
        />
      </div>
    </>
  )
} 