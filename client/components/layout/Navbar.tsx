import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/context/ThemeContext'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggleTheme } = useTheme()

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/80 dark:bg-black/80 backdrop-blur-lg shadow-sm' 
          : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="relative w-7 h-7 sm:w-8 sm:h-8">
            <Image
              src="/logo.png"
              alt="Spinor"
              width={32}
              height={32}
              className={`w-full h-full transition-colors duration-300 ${
                theme === 'dark' ? 'invert-0' : 'invert'
              }`}
            />
          </div>
          <span className="text-xl sm:text-2xl font-bold font-[--font-syne] text-black dark:text-white transition-colors duration-300">
            spinor
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-6">
          <NavLink href="/swap">Swap</NavLink>
          <NavLink href="/">Pool</NavLink>
          <NavLink href="/dashboard">Dashboard</NavLink>
        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Toggle Button */}
          <motion.button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {theme === 'dark' ? (
              <SunIcon className="w-5 h-5 text-white" />
            ) : (
              <MoonIcon className="w-5 h-5 text-gray-800" />
            )}
          </motion.button>

          {/* AppKit Web Component */}
          {/* @ts-expect-error Web Component */}
          <appkit-button />
        </div>
      </div>
    </motion.nav>
  )
}

// Animated Navigation Link Component
const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="relative group px-3 py-2">
    {/* Text */}
    <span className="relative z-10 text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
      {children}
    </span>

    {/* Permanent Underline with Glow Effect */}
    <div className="absolute bottom-0 left-0 w-full">
      {/* Base line */}
      <div className="absolute inset-0 h-[1px] bg-gray-200 dark:bg-gray-700" />
      
      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 h-[2px] bg-primary-500 dark:bg-primary-400 opacity-0 group-hover:opacity-100 transition-all duration-300"
      />
      
      {/* Enhanced glow blur effect */}
      <motion.div
        className="absolute inset-0 h-[3px] bg-primary-500/50 dark:bg-primary-400/50 blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
      />
    </div>
  </Link>
)

export default Navbar 