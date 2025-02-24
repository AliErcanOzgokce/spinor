export interface Token {
  address: string
  symbol: string
  name: string
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