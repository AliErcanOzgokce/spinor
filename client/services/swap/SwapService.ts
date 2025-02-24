import { parseUnits, formatUnits, createPublicClient, http, getContract, Address, type PublicClient, type WalletClient } from 'viem'
import { Token, SwapQuote, SwapDirection } from './types'
import { USDC, DEFAULT_SLIPPAGE } from './constants'
import { abcTestnet } from '@/config/wagmi'
import { ROUTER_ABI } from './abis'

export class SwapService {
  private readonly routerAddress: Address
  private readonly factoryAddress: Address
  private readonly API_URL = 'http://localhost:3000/api/pool-reserves'
  private readonly publicClient: PublicClient

  constructor(routerAddress: string, factoryAddress: string) {
    this.routerAddress = routerAddress as Address
    this.factoryAddress = factoryAddress as Address
    this.publicClient = createPublicClient({
      chain: abcTestnet,
      transport: http()
    })
  }

  // Token validation
  isValidTokenPair(tokenA: Token, tokenB: Token): boolean {
    if (tokenA.symbol === 'USDC') {
      return tokenB.symbol.startsWith('LST') || tokenB.symbol.startsWith('LRT')
    }
    if (tokenB.symbol === 'USDC') {
      return tokenA.symbol.startsWith('LST') || tokenA.symbol.startsWith('LRT')
    }
    return false
  }

  // Amount validation
  validateAmount(amount: string, token: Token): boolean {
    if (!amount || isNaN(Number(amount))) return false
    
    const numAmount = Number(amount)
    if (numAmount <= 0) return false
    
    try {
      parseUnits(amount, token.decimals)
      return true
    } catch {
      return false
    }
  }

    // Get all available tokens from pool reserves
    async getAvailableTokens(): Promise<Token[]> {
        try {
          const response = await fetch(this.API_URL)
          if (!response.ok) throw new Error('Failed to fetch pools')
          
          const result = await response.json()
          if (!result.success) throw new Error(result.message || 'Failed to fetch pools')
    
          const tokens = new Map<string, Token>()
          tokens.set(USDC.address, USDC)
    
          // Extract unique tokens from pools
          for (const pool of result.data) {
            if (pool.token0 !== USDC.address) {
              tokens.set(pool.token0, {
                symbol: pool.token0Symbol,
                address: pool.token0,
                decimals: 18 // LST/LRT tokens use 18 decimals
              })
            }
          }
    
          return Array.from(tokens.values())
        } catch (error) {
          console.error('Error fetching tokens:', error)
          throw new Error('Failed to fetch available tokens')
        }
      }


  // Get quote for swap
  async getQuote(
    tokenIn: Token,
    tokenOut: Token,
    amount: string,
    direction: SwapDirection
  ): Promise<SwapQuote> {
    if (!this.isValidTokenPair(tokenIn, tokenOut)) {
      throw new Error('Invalid token pair')
    }

    if (!this.validateAmount(amount, direction === 'exactIn' ? tokenIn : tokenOut)) {
      throw new Error('Invalid amount')
    }

    try {
      // Fetch pool reserves
      const response = await fetch(this.API_URL)
      if (!response.ok) throw new Error('Failed to fetch pool data')
      
      const result = await response.json()
      if (!result.success) throw new Error(result.message || 'Failed to fetch pool data')

      // Find the pool for this token pair
      const pool = result.data.find((p: any) => 
        (p.token0 === tokenIn.address && p.token1 === tokenOut.address) ||
        (p.token0 === tokenOut.address && p.token1 === tokenIn.address)
      )

      if (!pool) throw new Error('Pool not found')

      // Get reserves in the correct order
      const [reserveIn, reserveOut] = pool.token0 === tokenIn.address 
        ? [pool.reserve0, pool.reserve1]
        : [pool.reserve1, pool.reserve0]

      // Parse amounts to BigInt with proper decimals
      const amountInBN = parseUnits(amount, tokenIn.decimals)
      const reserveInBN = BigInt(reserveIn)
      const reserveOutBN = BigInt(reserveOut)

      // Calculate amount out using UniswapV2 formula
      // amountOut = (reserveOut * amountIn * 997) / (reserveIn * 1000 + amountIn * 997)
      const amountInWithFee = amountInBN * BigInt(997)
      const numerator = reserveOutBN * amountInWithFee
      const denominator = (reserveInBN * BigInt(1000)) + amountInWithFee
      const amountOutBN = numerator / denominator

      // Calculate price impact
      const priceImpact = Number(
        ((amountInBN * reserveOutBN - amountOutBN * reserveInBN) * BigInt(10000)) /
        (amountInBN * reserveOutBN)
      ) / 100

      return {
        amountOut: formatUnits(amountOutBN, tokenOut.decimals),
        priceImpact,
        route: [tokenIn, tokenOut]
      }
    } catch (error) {
      console.error('Error getting quote:', error)
      throw error
    }
  }

  // Check if enough allowance is given to router
  private async checkAllowance(
    token: Token,
    owner: Address,
    amount: bigint
  ): Promise<boolean> {
    try {
      const allowance = await this.publicClient.readContract({
        address: token.address as Address,
        abi: [{
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
          ],
          name: 'allowance',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function'
        }],
        functionName: 'allowance',
        args: [owner, this.routerAddress]
      })

      return allowance >= amount
    } catch (error) {
      console.error('Error checking allowance:', error)
      return false
    }
  }

  // Approve tokens to router
  private async approveTokens(
    token: Token,
    amount: bigint,
    address: Address,
    walletClient: WalletClient
  ): Promise<`0x${string}`> {
    try {
      const hash = await walletClient.writeContract({
        account: address,
        chain: walletClient.chain,
        address: token.address as Address,
        abi: [{
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          name: 'approve',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function'
        }],
        functionName: 'approve',
        args: [this.routerAddress, amount]
      })

      // Wait for approval transaction to be mined
      await this.publicClient.waitForTransactionReceipt({ hash })
      return hash
    } catch (error) {
      console.error('Error approving tokens:', error)
      throw new Error('Failed to approve tokens')
    }
  }

  // Execute swap
  async executeSwap(
    tokenIn: Token,
    tokenOut: Token,
    amount: string,
    slippage: number = DEFAULT_SLIPPAGE,
    address: Address,
    walletClient: WalletClient
  ): Promise<`0x${string}`> {
    if (!this.isValidTokenPair(tokenIn, tokenOut)) {
      throw new Error('Invalid token pair')
    }

    if (!this.validateAmount(amount, tokenIn)) {
      throw new Error('Invalid amount')
    }

    try {
      // Get quote first to calculate minimum amount out
      const quote = await this.getQuote(tokenIn, tokenOut, amount, 'exactIn')
      const amountIn = parseUnits(amount, tokenIn.decimals)
      const amountOutMin = parseUnits(
        (Number(quote.amountOut) * (1 - slippage / 100)).toFixed(tokenOut.decimals),
        tokenOut.decimals
      )

      // Check and approve tokens if needed
      const hasAllowance = await this.checkAllowance(tokenIn, address, amountIn)
      if (!hasAllowance) {
        await this.approveTokens(tokenIn, amountIn, address, walletClient)
      }

      // Get deadline (20 minutes from now)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)

      // Path for the swap - ensure addresses are properly typed
      const path: readonly [`0x${string}`, `0x${string}`] = [
        tokenIn.address as `0x${string}`,
        tokenOut.address as `0x${string}`
      ]

      // Execute the swap
      const hash = await walletClient.writeContract({
        account: address,
        chain: walletClient.chain,
        address: this.routerAddress,
        abi: ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [amountIn, amountOutMin, path, address, deadline]
      })

      return hash
    } catch (error) {
      console.error('Error executing swap:', error)
      throw error
    }
  }

  async getTokenBalance(token: Token, address: Address): Promise<string> {
    try {
      if (!address) return '0'

      const balance = await this.publicClient.readContract({
        address: token.address as Address,
        abi: [{
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function'
        }],
        functionName: 'balanceOf',
        args: [address]
      })

      // Convert raw balance to decimal string based on token decimals
      const divisor = token.symbol === 'USDC' ? 10e5 : 10e17
      const formattedBalance = Number(balance) / divisor
      return formattedBalance.toFixed(3)
    } catch (error) {
      console.error('Error getting token balance:', error)
      return '0'
    }
  }


  // Format amount with proper decimals
  formatAmount(amount: string, token: Token): string {
    try {
      const parsed = parseUnits(amount, token.decimals)
      return formatUnits(parsed, token.decimals)
    } catch {
      return '0'
    }
  }
} 