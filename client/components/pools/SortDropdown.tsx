import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowsUpDownIcon, ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Tooltip } from '@/components/shared/Tooltip'
import { SortField, SortOrder } from './types'

interface SortDropdownProps {
  value: { field: SortField; order: SortOrder }
  onChange: (field: SortField, order: SortOrder) => void
}

interface SortOptionType {
  field: SortField
  label: string
  description: string
}

const sortOptions: SortOptionType[] = [
  { 
    field: 'tvl', 
    label: 'Total Value Locked',
    description: 'The total value of all assets deposited in the pool. Higher TVL indicates more liquidity and potentially lower slippage.'
  },
  { 
    field: 'apy', 
    label: 'APY',
    description: 'Annual Percentage Yield. Shows the expected yearly returns from providing liquidity, including trading fees and rewards.'
  },
  { 
    field: 'price', 
    label: 'Price',
    description: 'Current exchange rate between the pool tokens. Useful for identifying trading opportunities.'
  },
  { 
    field: 'slashing', 
    label: 'Risk Score',
    description: 'Historical slashing percentage. Green (<0.1%) indicates very low risk, yellow (<0.5%) low risk, orange (<1%) medium risk, and red (>1%) high risk.'
  },
]

export const SortDropdown = ({ value, onChange }: SortDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getActiveLabel = () => {
    const option = sortOptions.find(opt => opt.field === value.field)
    return `${option?.label} (${value.order === 'desc' ? 'Highest' : 'Lowest'} First)`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Tooltip content="Click to sort pools by different metrics">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg 
                   rounded-xl border border-gray-100/20 dark:border-white/[0.08] hover:border-primary-500/30 
                   dark:hover:border-primary-400/30 transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-2">
            <ArrowsUpDownIcon className="w-4 h-4 text-primary-500 dark:text-primary-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {getActiveLabel()}
            </span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDownIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </motion.div>
        </motion.button>
      </Tooltip>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-64 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl 
                       rounded-xl border border-gray-100/20 dark:border-white/[0.08] shadow-xl z-40"
            >
              <div className="space-y-1">
                {sortOptions.map((option) => (
                  <div key={option.field} className="space-y-1">
                    {/* Category Label with Tooltip */}
                    <Tooltip content={option.description}>
                      <div className="px-3 py-1.5 cursor-help">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {option.label}
                        </span>
                      </div>
                    </Tooltip>
                    
                    {/* Highest First Option */}
                    <motion.button
                      onClick={() => {
                        onChange(option.field, 'desc')
                        setIsOpen(false)
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-lg 
                               hover:bg-gray-100/50 dark:hover:bg-white/[0.04] transition-colors"
                      whileHover={{ x: 4 }}
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        Highest First
                      </span>
                      {value.field === option.field && value.order === 'desc' && (
                        <CheckIcon className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                      )}
                    </motion.button>

                    {/* Lowest First Option */}
                    <motion.button
                      onClick={() => {
                        onChange(option.field, 'asc')
                        setIsOpen(false)
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-lg 
                               hover:bg-gray-100/50 dark:hover:bg-white/[0.04] transition-colors"
                      whileHover={{ x: 4 }}
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        Lowest First
                      </span>
                      {value.field === option.field && value.order === 'asc' && (
                        <CheckIcon className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                      )}
                    </motion.button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
} 