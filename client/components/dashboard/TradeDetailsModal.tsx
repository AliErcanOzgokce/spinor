import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { XMarkIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ArrowsRightLeftIcon, PlusIcon, MinusIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { formatUnits } from 'ethers'
import { TOKENS } from '@/constants/tokens'
import { getStrategyName, getRiskLevelName, getRiskLevelColor } from '@/utils/trade'
import gelatoLogo from '@/assets/gelato.svg'
import abcLogo from '@/assets/abc.png'
import Image from 'next/image'


interface TradeDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  trade: any
}

// Custom Robot Icon Component
const RobotIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    stroke="currentColor"
  >
    {/* Robot Head - Elliptical */}
    <ellipse 
      cx="12" 
      cy="12" 
      rx="8" 
      ry="7" 
      className="text-primary-500" 
      strokeWidth={1.5} 
    />
    
    {/* Robot Eyes */}
    <circle cx="9" cy="11" r="1.2" className="text-primary-500" fill="currentColor" />
    <circle cx="15" cy="11" r="1.2" className="text-primary-500" fill="currentColor" />
    
    {/* Smiling Mouth */}
    <path
      d="M9 14.5c3 1.5 6 0 6 0"
      strokeLinecap="round"
      strokeWidth={1.5}
      className="text-primary-500"
    />
    
    {/* Antenna */}
    <line x1="12" y1="3" x2="12" y2="5" strokeWidth={1.5} className="text-primary-500" />
    <circle cx="12" cy="3" r="0.5" className="text-primary-500" fill="currentColor" />
  </svg>
)


const formatAmount = (amount: string, decimals: number) => {
  return parseFloat(formatUnits(amount, decimals)).toFixed(6)
}

const getTokenSymbol = (address: string) => {
  const token = Object.values(TOKENS).find(t => t.address.toLowerCase() === address.toLowerCase())
  return token?.symbol || 'Unknown'
}

const getTokenDecimals = (address: string) => {
  const token = Object.values(TOKENS).find(t => t.address.toLowerCase() === address.toLowerCase())
  return token?.decimals || 18
}

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleString()
}

const getActionIcon = (type: string) => {
  switch (type) {
    case 'swap':
      return <ArrowsRightLeftIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
    case 'addLiquidity':
      return <PlusIcon className="w-6 h-6 text-green-500" />
    case 'removeLiquidity':
      return <MinusIcon className="w-6 h-6 text-red-500" />
    default:
      return null
  }
}

export const TradeDetailsModal = ({ isOpen, onClose, trade }: TradeDetailsModalProps) => {
  if (!trade) return null

  const tokenASymbol = getTokenSymbol(trade.action.tokenA)
  const tokenBSymbol = getTokenSymbol(trade.action.tokenB)
  const tokenADecimals = getTokenDecimals(trade.action.tokenA)
  const tokenBDecimals = getTokenDecimals(trade.action.tokenB)

  // Calculate final USDC amount for arbitrage
  const finalUsdcAmount = trade.tradeStrategy === 5 
    ? (parseFloat(formatAmount(trade.action.amountA, tokenADecimals)) + trade.pnl).toFixed(6)
    : '0'

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl 
                                     bg-white dark:bg-gray-900 shadow-xl transition-all">
                {/* Header */}
                <div className="relative p-6 pb-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-white/[0.08] rounded-full 
                                  flex items-center justify-center">
                      {getActionIcon(trade.action.type)}
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                        {trade.action.type}
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTimestamp(trade.timestamp)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 
                             dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Token Flow Section */}
                  {trade.tradeStrategy === 5 ? (
                    <div className="space-y-4">
                      {/* First Step: USDC to Token */}
                      <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Step 1: Initial USDC
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-white/[0.08] rounded-full 
                                        flex items-center justify-center">
                            <span className="text-lg font-medium text-primary-700 dark:text-primary-300">
                              {tokenASymbol.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{tokenASymbol}</p>
                            <p className="text-sm text-gray-500">
                              {formatAmount(trade.action.amountA, tokenADecimals)} tokens
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Second Step: Token to Token */}
                      <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Step 2: Swap to {tokenBSymbol}
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-white/[0.08] rounded-full 
                                        flex items-center justify-center">
                            <span className="text-lg font-medium text-primary-700 dark:text-primary-300">
                              {tokenBSymbol.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{tokenBSymbol}</p>
                            <p className="text-sm text-gray-500">
                              {formatAmount(trade.action.amountB, tokenBDecimals)} tokens
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Third Step: Token back to USDC */}
                      <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Step 3: Final USDC
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-white/[0.08] rounded-full 
                                        flex items-center justify-center">
                            <span className="text-lg font-medium text-primary-700 dark:text-primary-300">
                              {tokenASymbol.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{tokenASymbol}</p>
                            <p className="text-sm text-gray-500">
                              {finalUsdcAmount} tokens
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl p-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Token Pair
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-white/[0.08] rounded-full 
                                        flex items-center justify-center">
                            <span className="text-lg font-medium text-primary-700 dark:text-primary-300">
                              {tokenASymbol.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{tokenASymbol}</p>
                            <p className="text-sm text-gray-500">
                              {formatAmount(trade.action.amountA, tokenADecimals)} tokens
                            </p>
                          </div>
                        </div>
                        {trade.action.amountB !== '0' && (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 dark:bg-white/[0.08] rounded-full 
                                          flex items-center justify-center">
                              <span className="text-lg font-medium text-primary-700 dark:text-primary-300">
                                {tokenBSymbol.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{tokenBSymbol}</p>
                              <p className="text-sm text-gray-500">
                                {formatAmount(trade.action.amountB, tokenBDecimals)} tokens
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Strategy & Performance Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl p-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Strategy Details
                      </h3>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {getStrategyName(trade.tradeStrategy)}
                        </p>
                        <p className="text-sm text-gray-500">{getRiskLevelName(trade.riskLevel)}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl p-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Performance
                      </h3>
                      {trade.tradeStrategy === 5 ? (
                        <div className="flex items-center gap-2">
                          {trade.pnl >= 0 ? (
                            <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
                          ) : (
                            <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
                          )}
                          <p className={`font-medium ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${Math.abs(trade.pnl).toFixed(2)} PnL
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
                          <p className="font-medium text-green-500">{trade.apy.toFixed(2)}% APY</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Powered By Section */}
                  <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl p-4 space-y-4">
                    {/* AI Agent Info */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center">
                        <RobotIcon className="w-5 h-5 text-primary-500" />
                      </div>
                      <span className="text-sm text-gray-400">SpinorAgent executes this trade</span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-gray-800" />

                    {/* Logos */}
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                          <div className="w-6 h-6 rounded-full overflow-hidden">
                            <Image src={gelatoLogo} alt="Gelato" className="w-full h-full object-cover" />
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">Powered by Gelato Relay</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                          <div className="w-6 h-6 rounded-full overflow-hidden">
                            <Image src={abcLogo} alt="ABC Network" className="w-full h-full object-cover" />
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">ABC Network</span>
                      </div>
                    </div>
                  </div>

                  {/* Reason Section */}
                  <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                      Trade Reason
                    </h3>
                    <p className="text-gray-900 dark:text-white">{trade.action.reason}</p>
                  </div>

                  {/* Transaction Details */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Transaction Details
                    </h3>
                    <a
                      href={`https://explorer.abc.t.raas.gelato.cloud/tx/${trade.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:text-primary-600 dark:text-primary-400 
                               dark:hover:text-primary-300 text-sm flex items-center gap-1"
                    >
                      View on Explorer
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
} 