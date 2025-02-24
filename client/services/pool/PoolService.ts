import { parseUnits, formatUnits, createPublicClient, http, getContract, Address, type PublicClient, type WalletClient } from 'viem'
import { Token } from '../swap/types'
import { DEFAULT_SLIPPAGE } from '../swap/constants'
import { abcTestnet } from '@/config/wagmi'
import { ROUTER_ABI, ERC20_ABI, PAIR_ABI, FACTORY_ABI } from '@/constants/abis'

export class PoolService {
  private readonly routerAddress: Address
  private readonly factoryAddress: Address
  private readonly API_URL = 'http://localhost:3000/api/pool-reserves'
  private readonly publicClient: PublicClient
  private readonly FEE_RATE = 0.003 // 0.3% fee rate

  constructor(routerAddress: string, factoryAddress: string) {
    this.routerAddress = routerAddress as Address
    this.factoryAddress = factoryAddress as Address
    this.publicClient = createPublicClient({
      chain: abcTestnet,
      transport: http()
    })
  }

  // Get pool reserves
  async getPoolReserves(tokenA: Token, tokenB: Token): Promise<{ reserveA: bigint, reserveB: bigint } | null> {
    try {
      const pairAddress = await this.getPairAddress(tokenA, tokenB);
      
      if (pairAddress === '0x0000000000000000000000000000000000000000') {
        return { reserveA: 0n, reserveB: 0n };
      }

      const [reserve0, reserve1] = await this.publicClient.readContract({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'getReserves'
      }).then(([r0, r1]) => [BigInt(r0), BigInt(r1)]);

      // Get token order
      const token0Address = await this.publicClient.readContract({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'token0'
      });

      // Return reserves in the correct order
      const [reserveA, reserveB] = token0Address.toLowerCase() === tokenA.address.toLowerCase()
        ? [reserve0, reserve1]
        : [reserve1, reserve0];

      return { reserveA, reserveB };
    } catch (error) {
      console.error('Error getting pool reserves:', error);
      return { reserveA: 0n, reserveB: 0n };
    }
  }

  // Calculate optimal amount out based on amount in
  async calculateOptimalAmountOut(
    tokenA: Token,
    tokenB: Token,
    amountADesired: string
  ): Promise<string | null> {
    try {
      // Validate input
      if (!amountADesired || isNaN(Number(amountADesired)) || Number(amountADesired) <= 0) {
        return null;
      }

      const reserves = await this.getPoolReserves(tokenA, tokenB)
      const { reserveA, reserveB } = reserves

      // Convert input to BigInt with proper decimals
      const amountADesiredBN = parseUnits(amountADesired, tokenA.decimals)
      
      if (reserveA === 0n && reserveB === 0n) {
        // For first liquidity provision, maintain the ratio based on token decimals
        const amountBRaw = Number(amountADesired)
        return amountBRaw.toFixed(tokenB.decimals) // Return exact number with proper decimals
      }

      // Calculate optimal amount using the same formula as the contract
      const amountBOptimal = (amountADesiredBN * reserveB) / reserveA
      const formattedAmount = formatUnits(amountBOptimal, tokenB.decimals)
      
      // Format the result to maintain consistent decimal places
      const numAmount = Number(formattedAmount)
      return numAmount.toFixed(tokenB.decimals)
    } catch (error) {
      console.error('Error calculating optimal amount:', error)
      return null
    }
  }

  // Token validation
  isValidTokenPair(tokenA: Token, tokenB: Token): boolean {
    if (!tokenA || !tokenB) return false
    return tokenA.address.toLowerCase() !== tokenB.address.toLowerCase()
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

  // Get token balance
  async getTokenBalance(token: Token, address: Address): Promise<string> {
    try {
      const balance = await this.publicClient.readContract({
        address: token.address as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address]
      })

      return formatUnits(balance, token.decimals)
    } catch (error) {
      console.error('Error getting token balance:', error)
      return '0'
    }
  }

  // Check if enough allowance is given to router
  private async checkAllowance(
    token: Token,
    owner: Address,
    spender: Address,
    amount: bigint
  ): Promise<boolean> {
    try {
      const allowance = await this.publicClient.readContract({
        address: token.address as Address,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, spender]
      })

      return allowance >= amount
    } catch (error) {
      console.error('Error checking allowance:', error)
      return false
    }
  }

  // Approve tokens to router
  async approveToken(
    token: Token,
    amount: string,
    address: Address,
    walletClient: WalletClient
  ): Promise<`0x${string}`> {
    try {
      const amountBN = parseUnits(amount, token.decimals)
      const hash = await walletClient.writeContract({
        account: address,
        chain: walletClient.chain,
        address: token.address as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [this.routerAddress, amountBN]
      })

      // Wait for approval transaction to be mined
      await this.publicClient.waitForTransactionReceipt({ hash })
      return hash
    } catch (error) {
      console.error('Error approving tokens:', error)
      throw new Error('Failed to approve tokens')
    }
  }

  // Add liquidity
  async addLiquidity(
    tokenA: Token,
    tokenB: Token,
    amountA: string,
    amountB: string,
    slippage: number = DEFAULT_SLIPPAGE,
    address: Address,
    walletClient: WalletClient,
    onApproveToken0?: () => void,
    onApproveToken1?: () => void
  ): Promise<`0x${string}`> {
    if (!this.isValidTokenPair(tokenA, tokenB)) {
      throw new Error('Invalid token pair')
    }

    if (!this.validateAmount(amountA, tokenA) || !this.validateAmount(amountB, tokenB)) {
      throw new Error('Invalid amount')
    }

    try {
      // Get current reserves to validate amounts
      const reserves = await this.getPoolReserves(tokenA, tokenB)
      const amountADesired = parseUnits(amountA, tokenA.decimals)
      const amountBDesired = parseUnits(amountB, tokenB.decimals)

      // If pool exists, validate the ratio
      if (reserves.reserveA > 0n && reserves.reserveB > 0n) {
        const currentRatio = (reserves.reserveB * BigInt(1e18)) / reserves.reserveA
        const providedRatio = (amountBDesired * BigInt(1e18)) / amountADesired
        
        // Allow 1% deviation from the current ratio
        const minRatio = currentRatio * 99n / 100n
        const maxRatio = currentRatio * 101n / 100n
        
        if (providedRatio < minRatio || providedRatio > maxRatio) {
          throw new Error('Provided liquidity ratio deviates too much from the current pool ratio')
        }
      }

      // Calculate minimum amounts with slippage
      const amountAMin = (amountADesired * BigInt(Math.floor((1 - slippage) * 10000))) / BigInt(10000)
      const amountBMin = (amountBDesired * BigInt(Math.floor((1 - slippage) * 10000))) / BigInt(10000)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200) // 20 minutes

      // Always approve Token A (USDC)
      onApproveToken0?.()
      await this.approveToken(tokenA, amountA, address, walletClient)

      // Always approve Token B
      onApproveToken1?.()
      await this.approveToken(tokenB, amountB, address, walletClient)

      // Execute add liquidity
      const hash = await walletClient.writeContract({
        account: address,
        chain: walletClient.chain,
        address: this.routerAddress,
        abi: ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [
          tokenA.address as Address,
          tokenB.address as Address,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          address,
          deadline
        ]
      })

      await this.publicClient.waitForTransactionReceipt({ hash })
      return hash
    } catch (error) {
      console.error('Error adding liquidity:', error)
      throw error
    }
  }

  // Get token addresses from pair contract
  async getPairTokens(pairAddress: string): Promise<[string, string]> {
    try {
      const [token0, token1] = await Promise.all([
        this.publicClient.readContract({
          address: pairAddress as Address,
          abi: PAIR_ABI,
          functionName: 'token0'
        }),
        this.publicClient.readContract({
          address: pairAddress as Address,
          abi: PAIR_ABI,
          functionName: 'token1'
        })
      ]);

      return [token0, token1];
    } catch (error) {
      console.error('Error getting pair tokens:', error);
      throw new Error('Failed to get pair tokens');
    }
  }

  // Get LP token balance
  async getLPTokenBalance(tokenA: Token, tokenB: Token, address: Address): Promise<string> {
    try {
      // Get pair address
      const pairAddress = await this.getPairAddress(tokenA, tokenB);

      if (pairAddress === '0x0000000000000000000000000000000000000000') {
        return '0';
      }

      // Get LP token balance
      const balance = await this.publicClient.readContract({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'balanceOf',
        args: [address]
      });

      return formatUnits(balance, 18); // LP tokens always have 18 decimals
    } catch (error) {
      console.error('Error getting LP token balance:', error);
      return '0';
    }
  }

  // Get pair address
  async getPairAddress(tokenA: Token, tokenB: Token): Promise<Address> {
    try {
      const pairAddress = await this.publicClient.readContract({
        address: this.factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'getPair',
        args: [tokenA.address as Address, tokenB.address as Address]
      }) as Address;

      return pairAddress;
    } catch (error) {
      console.error('Error getting pair address:', error);
      throw new Error('Failed to get pair address');
    }
  }

  // Calculate minimum amounts for removing liquidity
  async calculateRemoveMinAmounts(
    tokenA: Token,
    tokenB: Token,
    liquidity: string,
    slippage: number = DEFAULT_SLIPPAGE
  ): Promise<{ amountAMin: bigint, amountBMin: bigint }> {
    try {
      const pairAddress = await this.getPairAddress(tokenA, tokenB);
      const [totalSupply, reserves] = await Promise.all([
        this.publicClient.readContract({
          address: pairAddress,
          abi: PAIR_ABI,
          functionName: 'totalSupply'
        }),
        this.getPoolReserves(tokenA, tokenB)
      ]);

      if (!reserves || totalSupply === 0n) {
        return { amountAMin: 0n, amountBMin: 0n };
      }

      const liquidityBN = parseUnits(liquidity, 18);
      const amountA = (liquidityBN * reserves.reserveA) / totalSupply;
      const amountB = (liquidityBN * reserves.reserveB) / totalSupply;

      const amountAMin = (amountA * BigInt(Math.floor((1 - slippage) * 10000))) / BigInt(10000);
      const amountBMin = (amountB * BigInt(Math.floor((1 - slippage) * 10000))) / BigInt(10000);

      return { amountAMin, amountBMin };
    } catch (error) {
      console.error('Error calculating minimum amounts:', error);
      throw error;
    }
  }

  // Remove liquidity
  async removeLiquidity(
    tokenA: Token,
    tokenB: Token,
    liquidity: string,
    slippage: number = DEFAULT_SLIPPAGE,
    address: Address,
    walletClient: WalletClient,
    onApprovePair?: () => void
  ): Promise<`0x${string}`> {
    try {
      const pairAddress = await this.getPairAddress(tokenA, tokenB);
      const liquidityBN = parseUnits(liquidity, 18);

      // Calculate minimum amounts
      const { amountAMin, amountBMin } = await this.calculateRemoveMinAmounts(
        tokenA,
        tokenB,
        liquidity,
        slippage
      );

      // Check and approve LP tokens if needed
      const hasAllowance = await this.checkAllowance(
        { address: pairAddress, decimals: 18 } as Token,
        address,
        this.routerAddress,
        liquidityBN
      );

      if (!hasAllowance) {
        onApprovePair?.();
        await this.approveToken(
          { address: pairAddress, decimals: 18 } as Token,
          liquidity,
          address,
          walletClient
        );
      }

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

      // Execute remove liquidity
      const hash = await walletClient.writeContract({
        account: address,
        chain: walletClient.chain,
        address: this.routerAddress,
        abi: ROUTER_ABI,
        functionName: 'removeLiquidity',
        args: [
          tokenA.address as Address,
          tokenB.address as Address,
          liquidityBN,
          amountAMin,
          amountBMin,
          address,
          deadline
        ]
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error) {
      console.error('Error removing liquidity:', error);
      throw error;
    }
  }

  // Calculate fee earned for a position
  async calculateFeeEarned(
    tokenA: Token,
    tokenB: Token,
    lpTokenBalance: string,
    address: Address
  ): Promise<string> {
    try {
      const pairAddress = await this.getPairAddress(tokenA, tokenB)
      const [totalSupply, reserves] = await Promise.all([
        this.publicClient.readContract({
          address: pairAddress,
          abi: PAIR_ABI,
          functionName: 'totalSupply'
        }),
        this.getPoolReserves(tokenA, tokenB)
      ])

      if (!reserves || totalSupply === 0n) {
        return '0'
      }

      // Calculate share of the pool
      const lpTokenBalanceBN = parseUnits(lpTokenBalance, 18)
      const shareOfPool = Number(lpTokenBalanceBN) / Number(totalSupply)

      // Calculate total value locked in the pool
      const token0USD = Number(formatUnits(reserves.reserveA, tokenA.decimals)) * 2000 // Assuming USDC price
      const token1USD = Number(formatUnits(reserves.reserveB, tokenB.decimals)) * 2000 // Example price
      const totalValueLocked = token0USD + token1USD

      // Calculate fee earned (0.3% of volume)
      // This is a simplified calculation. In reality, you would need to track historical volume
      const estimatedDailyVolume = totalValueLocked * 0.1 // Assume 10% daily volume
      const dailyFees = estimatedDailyVolume * this.FEE_RATE
      const userDailyFees = dailyFees * shareOfPool

      return userDailyFees.toFixed(2)
    } catch (error) {
      console.error('Error calculating fee earned:', error)
      return '0'
    }
  }
} 