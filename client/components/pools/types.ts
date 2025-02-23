export interface PoolData {
  pairAddress: string
  token0: string
  token1: string
  reserve0: string
  reserve1: string
  token0Symbol: string
  token1Symbol: string
  apy: number | null
  slashingHistory: number | null
}

export type SortField = 'tvl' | 'apy' | 'price' | 'slashing'
export type SortOrder = 'asc' | 'desc'
export type FilterType = 'all' | 'lst' | 'lrt'

export interface SortOption {
  field: SortField
  label: string
}

export interface SortValue {
  field: SortField
  order: SortOrder
} 