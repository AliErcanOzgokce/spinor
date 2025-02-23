import { motion } from 'framer-motion'

export const PoolCardSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="relative"
  >
    <div className="relative flex items-center bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg rounded-xl 
                  border border-gray-100/20 dark:border-white/[0.08] p-4">
      {/* Token Icons Skeleton */}
      <div className="flex -space-x-2 mr-4">
        <div className="w-10 h-10 bg-gray-200 dark:bg-white/[0.06] rounded-full animate-pulse" />
        <div className="w-10 h-10 bg-gray-100 dark:bg-white/[0.04] rounded-full animate-pulse" />
      </div>

      {/* Pool Name and TVL Skeleton */}
      <div className="flex-1">
        <div className="h-5 w-32 bg-gray-200 dark:bg-white/[0.06] rounded-md animate-pulse mb-2" />
        <div className="flex items-center gap-3">
          <div className="h-4 w-40 bg-gray-100 dark:bg-white/[0.04] rounded-md animate-pulse" />
          <div className="h-4 w-24 bg-gray-100 dark:bg-white/[0.04] rounded-md animate-pulse" />
        </div>
      </div>

      {/* Price Skeleton */}
      <div className="px-4">
        <div className="h-5 w-20 bg-gray-200 dark:bg-white/[0.06] rounded-md animate-pulse mb-1" />
        <div className="h-4 w-12 bg-gray-100 dark:bg-white/[0.04] rounded-md animate-pulse" />
      </div>

      {/* APY Skeleton */}
      <div className="px-4">
        <div className="h-5 w-16 bg-gray-200 dark:bg-white/[0.06] rounded-md animate-pulse mb-1" />
        <div className="h-4 w-12 bg-gray-100 dark:bg-white/[0.04] rounded-md animate-pulse" />
      </div>

      {/* Slashing History Skeleton */}
      <div className="px-4">
        <div className="flex items-center justify-end gap-1">
          <div className="h-5 w-16 bg-gray-200 dark:bg-white/[0.06] rounded-md animate-pulse mb-1" />
          <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
        </div>
        <div className="h-4 w-16 bg-gray-100 dark:bg-white/[0.04] rounded-md animate-pulse" />
      </div>

      {/* Button Skeleton */}
      <div className="ml-4 h-9 w-28 bg-gray-200 dark:bg-white/[0.06] rounded-xl animate-pulse" />
    </div>
  </motion.div>
) 