'use client'

import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Syne } from 'next/font/google'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/layout/Navbar'
import { ThemeProvider } from '@/context/ThemeContext'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${syne.variable}`}>
      <body className="min-h-screen flex flex-col bg-white dark:bg-black transition-colors duration-200">
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
      </body>
    </html>
  )
}
