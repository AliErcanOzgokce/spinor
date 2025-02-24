export interface Token {
  symbol: string
  address: string
  decimals: number
}

export interface SwapQuote {
  amountOut: string
  priceImpact: number
  route: Token[]
}

export interface SwapState {
  tokenIn: Token | null
  tokenOut: Token | null
  amountIn: string
  amountOut: string
  loading: boolean
  error: string | null
  priceImpact: number
}

export type SwapDirection = 'exactIn' | 'exactOut' 