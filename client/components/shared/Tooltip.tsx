'use client'

import { useState, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TooltipProps {
  content: string
  children: ReactNode
  delay?: number
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export const Tooltip = ({ 
  content, 
  children, 
  delay = 0.2,
  position = 'top' 
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay * 1000)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const getPositionStyles = () => {
    switch (position) {
      case 'bottom':
        return 'top-full mt-2'
      case 'left':
        return 'right-full mr-2'
      case 'right':
        return 'left-full ml-2'
      default:
        return 'bottom-full mb-2'
    }
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${getPositionStyles()}`}
          >
            <div className="relative">
              {/* Tooltip Content */}
              <div className="px-3 py-2 text-sm bg-gray-900/90 dark:bg-gray-800/90 text-white rounded-lg 
                           backdrop-blur-sm border border-white/10 shadow-xl max-w-xs">
                {content}
              </div>
              
              {/* Arrow */}
              <div className={`
                absolute w-2 h-2 bg-gray-900/90 dark:bg-gray-800/90 border border-white/10
                transform rotate-45 ${
                  position === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2' :
                  position === 'left' ? 'top-1/2 -right-1 -translate-y-1/2' :
                  position === 'right' ? 'top-1/2 -left-1 -translate-y-1/2' :
                  '-bottom-1 left-1/2 -translate-x-1/2'
                }
              `} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 