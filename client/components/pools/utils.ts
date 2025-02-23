export const formatNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`
  } else if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(2)}K`
  } else {
    return `$${num.toFixed(2)}`
  }
}

export const calculateTVL = (reserve0: string, reserve1: string): number => {
  const token0Amount = Number(reserve0) / 1e18 // LST/LRT decimals = 18
  const token1Amount = Number(reserve1) / 1e6  // USDC decimals = 6
  const token0Price = token1Amount / token0Amount
  return (token0Amount * token0Price) + token1Amount
}

export const calculatePrice = (reserve0: string, reserve1: string): number => {
  const token0Amount = Number(reserve0) / 1e18
  const token1Amount = Number(reserve1) / 1e6
  return token1Amount / token0Amount
}

export const getSlashingRiskColor = (slashingPercentage: number): string => {
  if (slashingPercentage < 0.1) return 'text-green-500 dark:text-green-400'
  if (slashingPercentage < 0.5) return 'text-yellow-500 dark:text-yellow-400'
  if (slashingPercentage < 1) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-500 dark:text-red-400'
}

export const getSlashingRiskLabel = (slashingPercentage: number): string => {
  if (slashingPercentage < 0.1) return 'Very Low Risk'
  if (slashingPercentage < 0.5) return 'Low Risk'
  if (slashingPercentage < 1) return 'Medium Risk'
  return 'High Risk'
} 