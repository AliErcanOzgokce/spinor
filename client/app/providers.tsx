'use client'

import { ThemeProvider } from '@/context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'
import type { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiAdapter } from '@/config/wagmi'

// Set up queryClient
const queryClient = new QueryClient()

export function Providers({ 
  children 
}: { 
  children: ReactNode
}) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AnimatedBackground />
          <Navbar />
          <AnimatePresence mode="wait">
            <motion.main
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="flex-grow pt-20"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
} 