import { motion } from 'framer-motion'

interface FilterButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

export const FilterButton = ({ active, onClick, children }: FilterButtonProps) => (
  <motion.button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active 
        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
        : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'
    }`}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    {children}
  </motion.button>
) 