'use client'

import { useState, useEffect, useMemo } from 'react'
import { FunnelIcon } from '@heroicons/react/24/outline'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'
import { PoolCard } from '@/components/pools/PoolCard'
import { PoolCardSkeleton } from '@/components/pools/PoolCardSkeleton'
import { FilterButton } from '@/components/pools/FilterButton'
import { SortDropdown } from '@/components/pools/SortDropdown'
import { PoolData, FilterType, SortField, SortOrder } from '@/components/pools/types'
import { calculateTVL, calculatePrice } from '@/components/pools/utils'

// Main Page Component
export default function PoolsPage() {
  const [pools, setPools] = useState<PoolData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtering and Sorting States
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sort, setSort] = useState<{ field: SortField; order: SortOrder }>({
    field: 'tvl',
    order: 'desc'
  })

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/pool-reserves')
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch pool data')
        }

        setPools(result.data)
        setError(null)
      } catch (err) {
        console.error('Error fetching pool data:', err)
        setError('Failed to load pool data. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchPools()
  }, [])

  // Filter and Sort Logic
  const filteredAndSortedPools = useMemo(() => {
    let filtered = [...pools]

    // Apply filter
    if (filterType !== 'all') {
      filtered = filtered.filter(pool => 
        filterType === 'lst' 
          ? pool.token0Symbol.startsWith('LST')
          : pool.token0Symbol.startsWith('LRT')
      )
    }

    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sort.field) {
        case 'tvl':
          comparison = calculateTVL(a.reserve0, a.reserve1) - calculateTVL(b.reserve0, b.reserve1)
          break
        case 'apy':
          comparison = (a.apy ?? 0) - (b.apy ?? 0)
          break
        case 'price':
          comparison = calculatePrice(a.reserve0, a.reserve1) - calculatePrice(b.reserve0, b.reserve1)
          break
        case 'slashing':
          comparison = (a.slashingHistory ?? 0) - (b.slashingHistory ?? 0)
          break
      }
      return sort.order === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [pools, filterType, sort])

  return (
    <>
      <AnimatedBackground />
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Pools</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Provide liquidity to earn trading fees and rewards
          </p>
        </div>

        {/* Updated Filter and Sort Controls */}
        {!loading && !error && pools.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-gray-400" />
              <FilterButton 
                active={filterType === 'all'} 
                onClick={() => setFilterType('all')}
              >
                All
              </FilterButton>
              <FilterButton 
                active={filterType === 'lst'} 
                onClick={() => setFilterType('lst')}
              >
                LST Only
              </FilterButton>
              <FilterButton 
                active={filterType === 'lrt'} 
                onClick={() => setFilterType('lrt')}
              >
                LRT Only
              </FilterButton>
            </div>

            <div className="ml-auto">
              <SortDropdown
                value={sort}
                onChange={(field, order) => setSort({ field, order })}
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <PoolCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Pool List */}
        {!loading && !error && (
          <div className="space-y-3">
            {filteredAndSortedPools.map((pool) => (
              <PoolCard key={pool.pairAddress} pool={pool} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredAndSortedPools.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {pools.length === 0 ? 'No pools available at the moment.' : 'No pools match your filters.'}
          </div>
        )}
      </div>
    </>
  )
}
