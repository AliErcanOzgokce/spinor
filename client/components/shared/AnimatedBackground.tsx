'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export const AnimatedBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      requestAnimationFrame(() => {
        setMousePosition({
          x: e.clientX,
          y: e.clientY,
        })
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.15] dark:opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #4f4f4f 1px, transparent 1px),
            linear-gradient(to bottom, #4f4f4f 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Main Ambient Light */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute w-full h-full"
          animate={{
            background: [
              'radial-gradient(circle at 50% 50%, rgba(107, 112, 244, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 50%, rgba(107, 112, 244, 0.15) 0%, transparent 55%)',
              'radial-gradient(circle at 50% 50%, rgba(107, 112, 244, 0.1) 0%, transparent 50%)',
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Interactive Glow Effect */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        style={{
          background: `
            radial-gradient(
              1200px circle at ${mousePosition.x}px ${mousePosition.y}px,
              rgba(107, 112, 244, 0.05),
              transparent 40%
            )
          `,
        }}
      />

      {/* Subtle Gradient Overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-white/10 
                   dark:from-transparent dark:via-black/5 dark:to-black/10" 
      />
    </div>
  )
} 