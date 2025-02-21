'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, InformationCircleIcon, ChartBarIcon, ShieldCheckIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

// Enums
enum TradeStrategy {
  BEST_LST = 1,
  LST_LIQUIDITY = 2,
  BEST_LRT = 3,
  LRT_LIQUIDITY = 4,
  ARBITRAGE = 5
}

enum RiskLevel {
  VERY_LOW = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4
}

// Trade Strategy Options with detailed descriptions
const tradeStrategies = [
  { 
    id: TradeStrategy.BEST_LST,
    name: 'Best LST',
    description: 'Automatically selects and trades the best performing Liquid Staking Tokens',
    expectedApy: '8-12%',
    icon: <ChartBarIcon className="w-5 h-5" />,
    benefits: ['Lower risk exposure', 'Stable returns', 'Automated selection']
  },
  { 
    id: TradeStrategy.LST_LIQUIDITY,
    name: 'LST Liquidity',
    description: 'Provides liquidity to LST pools while earning trading fees and rewards',
    expectedApy: '10-15%',
    icon: <CurrencyDollarIcon className="w-5 h-5" />,
    benefits: ['Double earning potential', 'Fee generation', 'Pool rewards']
  },
  { 
    id: TradeStrategy.BEST_LRT,
    name: 'Best LRT',
    description: 'Focuses on highest yielding Liquid Restaking Tokens with strong fundamentals',
    expectedApy: '12-18%',
    icon: <ChartBarIcon className="w-5 h-5" />,
    benefits: ['Higher yield potential', 'Diversified exposure', 'Smart rebalancing']
  },
  { 
    id: TradeStrategy.LRT_LIQUIDITY,
    name: 'LRT Liquidity',
    description: 'Maximizes returns by providing liquidity to premium LRT pools',
    expectedApy: '15-20%',
    icon: <CurrencyDollarIcon className="w-5 h-5" />,
    benefits: ['Maximum yield potential', 'Fee accumulation', 'Compound returns']
  },
  { 
    id: TradeStrategy.ARBITRAGE,
    name: 'Arbitrage',
    description: 'Executes automated arbitrage between LST and LRT pools for profit',
    expectedApy: '10-25%',
    icon: <ChartBarIcon className="w-5 h-5" />,
    benefits: ['Market neutral', 'Immediate profits', 'Low correlation']
  },
]

// Risk Level Options with detailed information
const riskLevels = [
  { 
    id: RiskLevel.VERY_LOW,
    name: 'Very Low',
    description: 'Conservative strategy focusing on established tokens and stable yields',
    color: 'emerald',
    icon: <ShieldCheckIcon className="w-5 h-5" />,
    characteristics: ['Capital preservation', 'Stable tokens only', 'Minimal volatility']
  },
  { 
    id: RiskLevel.LOW,
    name: 'Low',
    description: 'Balanced approach with slightly higher yield potential',
    color: 'blue',
    icon: <ShieldCheckIcon className="w-5 h-5" />,
    characteristics: ['Moderate growth', 'Established protocols', 'Controlled risk']
  },
  { 
    id: RiskLevel.MEDIUM,
    name: 'Medium',
    description: 'Optimized for higher returns while maintaining reasonable risk levels',
    color: 'yellow',
    icon: <ShieldCheckIcon className="w-5 h-5" />,
    characteristics: ['Growth focused', 'Active management', 'Balanced exposure']
  },
  { 
    id: RiskLevel.HIGH,
    name: 'High',
    description: 'Aggressive strategy targeting maximum yield opportunities',
    color: 'red',
    icon: <ShieldCheckIcon className="w-5 h-5" />,
    characteristics: ['High growth potential', 'New opportunities', 'Higher volatility']
  },
]

// Duration Options with insights
const durations = [
  { 
    id: '1d',
    name: '1 Day',
    description: 'Short-term trading for quick opportunities',
    icon: <ClockIcon className="w-5 h-5" />,
    suitable: ['Arbitrage', 'Market timing', 'Quick profits']
  },
  { 
    id: '1w',
    name: '1 Week',
    description: 'Medium-term positions for better yield capture',
    icon: <ClockIcon className="w-5 h-5" />,
    suitable: ['Yield farming', 'Trend following', 'Fee accumulation']
  },
  { 
    id: '1m',
    name: '1 Month',
    description: 'Long-term strategy for sustainable returns',
    icon: <ClockIcon className="w-5 h-5" />,
    suitable: ['Compound interest', 'Protocol rewards', 'Stable growth']
  },
  { 
    id: '3m',
    name: '3 Months',
    description: 'Extended holding for maximum benefit capture',
    icon: <ClockIcon className="w-5 h-5" />,
    suitable: ['Maximum rewards', 'Long-term growth', 'Best APY rates']
  },
]

interface CreateAgentModalProps {
  isOpen: boolean
  onClose: () => void
}

// Strategy Card Component
const StrategyCard = ({ strategy, selected, onClick }: any) => (
  <motion.button
    type="button"
    whileHover={{ scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    transition={{ type: "tween", duration: 0.15 }}
    onClick={onClick}
    className={`w-full p-4 rounded-xl text-left transition-all duration-150 group
              ${selected 
                ? 'bg-primary-500/80 text-white' 
                : 'bg-white/30 dark:bg-white/[0.02] text-gray-900 dark:text-white hover:bg-white/40 dark:hover:bg-white/[0.03]'}`}
  >
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg ${selected ? 'bg-white/20' : 'bg-primary-100/80 dark:bg-white/[0.02]'}`}>
        {strategy.icon}
      </div>
      <div>
        <h3 className="font-medium">{strategy.name}</h3>
        <p className={`text-sm ${selected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
          APY: {strategy.expectedApy}
        </p>
      </div>
    </div>
    <p className={`text-sm mb-3 ${selected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
      {strategy.description}
    </p>
    <div className="flex flex-wrap gap-2">
      {strategy.benefits.map((benefit: string, index: number) => (
        <span
          key={index}
          className={`text-xs px-2 py-1 rounded-full 
                   ${selected 
                     ? 'bg-white/20 text-white' 
                     : 'bg-primary-50 dark:bg-white/[0.08] text-primary-600 dark:text-primary-300'}`}
        >
          {benefit}
        </span>
      ))}
    </div>
  </motion.button>
)

// Risk Level Button Component
const RiskLevelButton = ({ level, selected, onClick }: any) => (
  <motion.button
    type="button"
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`relative w-full p-4 rounded-xl text-left transition-all duration-150
              ${selected 
                ? 'bg-primary-500/80 text-white' 
                : 'bg-white/30 dark:bg-white/[0.02] text-gray-900 dark:text-white hover:bg-white/40 dark:hover:bg-white/[0.03]'}`}
  >
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg ${selected ? 'bg-white/20' : 'bg-primary-100 dark:bg-white/[0.08]'}`}>
        {level.icon}
      </div>
      <h3 className="font-medium">{level.name}</h3>
    </div>
    <p className={`text-sm ${selected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
      {level.description}
    </p>
  </motion.button>
)

// Duration Button Component
const DurationButton = ({ duration, selected, onClick }: any) => (
  <motion.button
    type="button"
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`w-full p-4 rounded-xl text-left transition-all duration-150
              ${selected 
                ? 'bg-primary-500/80 text-white' 
                : 'bg-white/30 dark:bg-white/[0.02] text-gray-900 dark:text-white hover:bg-white/40 dark:hover:bg-white/[0.03]'}`}
  >
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg ${selected ? 'bg-white/20' : 'bg-primary-100 dark:bg-white/[0.08]'}`}>
        {duration.icon}
      </div>
      <div>
        <h3 className="font-medium">{duration.name}</h3>
        <p className={`text-sm ${selected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
          {duration.description}
        </p>
      </div>
    </div>
  </motion.button>
)

export default function CreateAgentModal({ isOpen, onClose }: CreateAgentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    strategy: '',
    riskLevel: '',
    duration: '',
    tokenAmount: '',
  })

  const [estimatedEarnings, setEstimatedEarnings] = useState('$0.00')
  const [currentStep, setCurrentStep] = useState(1)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (name === 'tokenAmount' && value) {
      const mockApy = 0.12
      const amount = parseFloat(value)
      if (!isNaN(amount)) {
        const estimated = amount * mockApy
        setEstimatedEarnings(`$${estimated.toFixed(2)}`)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    onClose()
  }

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg rounded-xl 
                         border border-gray-100/20 dark:border-white/[0.08] focus:outline-none focus:ring-2 
                         focus:ring-primary-500/20 text-gray-900 dark:text-white"
                placeholder="Enter a unique name for your agent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trade Strategy
              </label>
              <div className="grid grid-cols-1 gap-3">
                {tradeStrategies.map(strategy => (
                  <StrategyCard
                    key={strategy.id}
                    strategy={strategy}
                    selected={formData.strategy === strategy.id.toString()}
                    onClick={() => setFormData(prev => ({ ...prev, strategy: strategy.id.toString() }))}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {riskLevels.map(level => (
                  <RiskLevelButton
                    key={level.id}
                    level={level}
                    selected={formData.riskLevel === level.id.toString()}
                    onClick={() => setFormData(prev => ({ ...prev, riskLevel: level.id.toString() }))}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {durations.map(duration => (
                  <DurationButton
                    key={duration.id}
                    duration={duration}
                    selected={formData.duration === duration.id}
                    onClick={() => setFormData(prev => ({ ...prev, duration: duration.id }))}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Investment Amount
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="tokenAmount"
                  value={formData.tokenAmount}
                  onChange={handleInputChange}
                  className="flex-1 px-4 py-3 bg-white/30 dark:bg-white/[0.02] backdrop-blur-lg rounded-xl 
                           border border-white/20 dark:border-gray-700/30 focus:outline-none focus:ring-2 
                           focus:ring-primary-500/20 text-gray-900 dark:text-white"
                  placeholder="Enter amount"
                />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 bg-white/30 dark:bg-white/[0.02] backdrop-blur-lg rounded-xl 
                           border border-white/20 dark:border-gray-700/30 font-medium text-gray-900 
                           dark:text-white min-w-[100px] text-center"
                >
                  TIA
                </motion.button>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white/30 dark:bg-white/[0.02] backdrop-blur-sm rounded-xl p-6 
                         border border-white/20 dark:border-gray-700/30">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Strategy Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Strategy</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {tradeStrategies.find(s => s.id.toString() === formData.strategy)?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Risk Level</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {riskLevels.find(l => l.id.toString() === formData.riskLevel)?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Duration</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {durations.find(d => d.id === formData.duration)?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Investment</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.tokenAmount ? `${formData.tokenAmount} TIA` : '-'}
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-100/20 dark:border-white/[0.08]">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Estimated Earnings (Annual)</span>
                    <span className="font-medium text-green-500 dark:text-green-400">{estimatedEarnings}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl 
                        border border-gray-100/20 dark:border-white/[0.08] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] 
                         transition-colors duration-200"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>

              <div className="p-6">
                {/* Header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Agent</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Step {currentStep} of 3: {currentStep === 1 ? 'Basic Setup' : currentStep === 2 ? 'Risk & Duration' : 'Investment'}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="relative mb-8">
                  <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full">
                    <motion.div
                      className="absolute h-2 bg-primary-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${(currentStep / 3) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="mb-8">
                  {getStepContent()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                  {currentStep > 1 ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="px-6 py-3 bg-white/30 dark:bg-white/[0.02] backdrop-blur-lg rounded-xl 
                               border border-white/20 dark:border-gray-700/30 font-medium text-gray-900 
                               dark:text-white hover:bg-white/40 dark:hover:bg-white/[0.03] transition-colors duration-150"
                    >
                      Previous
                    </motion.button>
                  ) : (
                    <div />
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (currentStep < 3) {
                        setCurrentStep(currentStep + 1)
                      } else {
                        handleSubmit({ preventDefault: () => {} } as React.FormEvent)
                      }
                    }}
                    className="px-6 py-3 bg-primary-500/80 text-white rounded-xl font-medium 
                             hover:bg-primary-600/80 transition-colors duration-150"
                  >
                    {currentStep === 3 ? 'Create Agent' : 'Next'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
} 