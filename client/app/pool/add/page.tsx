'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';
import { AnimatedBackground } from '@/components/shared/AnimatedBackground';
import { PoolService } from '@/services/pool/PoolService';
import { Token } from '@/services/swap/types';
import { CONTRACT_ADDRESSES } from '@/services/swap/constants';
import { useAccount, useWalletClient } from 'wagmi';
import { TokenSelector } from '@/components/TokenSelector';
import { AddLiquidityProgressModal } from '@/components/pool/AddLiquidityProgressModal';
import { AmountSkeleton } from '@/components/shared/AmountSkeleton';
import { useSearchParams } from 'next/navigation';
import { TOKENS } from '@/constants/tokens';

// Initialize PoolService
const poolService = new PoolService(
  CONTRACT_ADDRESSES.ROUTER,
  CONTRACT_ADDRESSES.FACTORY
);

// Token Input Component
const TokenInput = ({ 
  value, 
  onChange, 
  token, 
  onTokenSelect, 
  label,
  disabled = false,
  isLoading = false,
}: { 
  value: string
  onChange: (value: string) => void
  token: Token | null
  onTokenSelect: () => void
  label: string
  disabled?: boolean
  isLoading?: boolean
}) => {
  const { address } = useAccount();
  const [balance, setBalance] = useState('0');

  useEffect(() => {
    const getBalance = async () => {
      if (token && address && poolService) {
        const balance = await poolService.getTokenBalance(token, address);
        setBalance(balance);
      }
    };
    getBalance();
  }, [token, address]);

  return (
    <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg p-4 rounded-2xl border border-gray-100/20 dark:border-white/[0.08]">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Balance:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {Number(balance)}
          </span>
          {token && balance !== '0' && (
            <button
              onClick={() => onChange(balance)}
              className="text-xs text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300"
            >
              MAX
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="w-[calc(100%-140px)]">
            <AmountSkeleton />
          </div>
        ) : (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.00"
            disabled={disabled}
            className="w-[calc(100%-140px)] bg-transparent text-2xl font-medium text-gray-900 dark:text-white focus:outline-none"
          />
        )}
        <motion.button
          className="flex items-center gap-2 bg-gray-50 dark:bg-white/[0.06] px-4 py-2 rounded-xl border border-gray-100/20 
                   dark:border-white/[0.08] w-[140px] hover:bg-gray-100/50 dark:hover:bg-white/[0.08] transition-colors duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onTokenSelect}
        >
          {token ? (
            <>
              <div className="w-6 h-6 bg-primary-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-primary-700 dark:text-primary-300">{token.symbol[0]}</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white min-w-[50px]">{token.symbol}</span>
            </>
          ) : (
            <span className="font-medium text-gray-500 dark:text-gray-400">Select</span>
          )}
          <PlusIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-auto" />
        </motion.button>
      </div>
    </div>
  );
};

export default function AddLiquidityPage() {
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [token0, setToken0] = useState<Token | null>(null);
  const [token1, setToken1] = useState<Token | null>(null);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [tokenSelectorConfig, setTokenSelectorConfig] = useState<{
    isOpen: boolean;
    type: 'from' | 'to';
  }>({
    isOpen: false,
    type: 'from',
  });

  type StepStatus = 'pending' | 'loading' | 'completed' | 'error';
  interface Step {
    label: string;
    status: StepStatus;
    hash?: string;
  }

  const [steps, setSteps] = useState<Step[]>([
    { label: 'Approving Token 0', status: 'pending' },
    { label: 'Approving Token 1', status: 'pending' },
    { label: 'Adding Liquidity', status: 'pending' }
  ]);
  const [error, setError] = useState('');

  const handleAddLiquidity = async () => {
    if (!walletClient || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!token0 || !token1 || !amount0 || !amount1) {
      setError('Please fill in all fields');
      return;
    }

    setModalOpen(true);
    setError('');
    
    try {
      // Reset steps
      setSteps([
        { label: 'Approving Token 0', status: 'pending' },
        { label: 'Approving Token 1', status: 'pending' },
        { label: 'Adding Liquidity', status: 'pending' }
      ]);

      const hash = await poolService.addLiquidity(
        token0,
        token1,
        amount0,
        amount1,
        0.5, // 0.5% slippage
        address,
        walletClient,
        // Handle Token0 Approval
        () => {
          setSteps(prev => prev.map((step, i) => 
            i === 0 ? { ...step, status: 'loading' as StepStatus } : step
          ));
        },
        // Handle Token1 Approval
        () => {
          setSteps(prev => prev.map((step, i) => 
            i === 1 ? { ...step, status: 'loading' as StepStatus } : step
          ));
        }
      );

      // Update steps after successful transaction
      setSteps(prev => prev.map((step, i) => 
        i === 2 ? { ...step, status: 'completed', hash } : { ...step, status: 'completed' }
      ));
    } catch (err: any) {
      setError(err.message);
      // Find the current loading step and mark it as error
      setSteps(prev => prev.map(step => 
        step.status === 'loading' ? { ...step, status: 'error' as StepStatus } : step
      ));
    }
  };

  const handleSuccess = () => {
    // Reset form
    setAmount0('');
    setAmount1('');
    setToken0(null);
    setToken1(null);
  };

  const openTokenSelector = (type: 'from' | 'to') => {
    setTokenSelectorConfig({ isOpen: true, type });
  };

  const closeTokenSelector = () => {
    setTokenSelectorConfig({ ...tokenSelectorConfig, isOpen: false });
  };

  const handleTokenSelect = (token: Token) => {
    // Always ensure USDC is token0 and other token is token1
    if (token.address === TOKENS.USDC.address) {
      setToken0(token);
      // If we already have a non-USDC token1, keep it
      if (token1 && token1.address !== TOKENS.USDC.address) {
        setToken1(token1);
      } else {
        setToken1(null);
      }
    } else {
      // If selecting non-USDC token, it should always go to token1
      setToken0(TOKENS.USDC);
      setToken1(token);
    }
    setAmount0('');
    setAmount1('');
    closeTokenSelector();
  };

  // Auto-select tokens based on URL parameters
  useEffect(() => {
    const loadTokensFromPair = async () => {
      const pairAddress = searchParams.get('address');
      if (!pairAddress) return;

      try {
        // Get token addresses from pair
        const [token0Address, token1Address] = await poolService.getPairTokens(pairAddress);
        
        // Always set USDC as token0
        setToken0(TOKENS.USDC);

        // Find which token is not USDC and set it as token1
        const nonUsdcAddress = token0Address.toLowerCase() === TOKENS.USDC.address.toLowerCase()
          ? token1Address
          : token0Address;

        // Find the token in our token list
        const selectedToken = Object.values(TOKENS).find(
          (t): t is Token => t.address.toLowerCase() === nonUsdcAddress.toLowerCase()
        );

        if (selectedToken) {
          setToken1(selectedToken);
        }
      } catch (error) {
        console.error('Error loading pair tokens:', error);
      }
    };

    loadTokensFromPair();
  }, [searchParams]);

  // Disable token0 selection if we have a non-USDC token1
  const isToken0Disabled = Boolean(token1 && token1.address !== TOKENS.USDC.address);

  return (
    <>
      <AnimatedBackground />
      <div className="relative min-h-screen flex  py-20">
        <div className="w-full max-w-lg mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Add Liquidity
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Provide liquidity to earn trading fees
            </p>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl rounded-3xl p-6 shadow-xl shadow-black/5">
            <div className="space-y-4">
              <TokenInput
                label="Token 0"
                value={amount0}
                onChange={setAmount0}
                token={token0}
                onTokenSelect={() => openTokenSelector('from')}
                disabled={isToken0Disabled}
              />

              <div className="flex justify-center -my-2">
                <div className="bg-gray-50 dark:bg-white/[0.06] p-2 rounded-xl">
                  <PlusIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                </div>
              </div>

              <TokenInput
                label="Token 1"
                value={amount1}
                onChange={setAmount1}
                token={token1}
                onTokenSelect={() => openTokenSelector('to')}
                disabled={isCalculating}
                isLoading={isCalculating}
              />

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <motion.button
                className="w-full py-4 px-6 rounded-xl text-white font-medium bg-primary-500 hover:bg-primary-600 
                         dark:bg-primary-600 dark:hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 
                         disabled:cursor-not-allowed transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddLiquidity}
                disabled={!token0 || !token1 || !amount0 || !amount1 || isCalculating}
              >
                Add Liquidity
              </motion.button>
            </div>
          </div>
        </div>

        <TokenSelector
          isOpen={tokenSelectorConfig.isOpen}
          onClose={closeTokenSelector}
          onSelect={handleTokenSelect}
          selectedTokens={[token0, token1]}
          type={tokenSelectorConfig.type}
        />

        <AddLiquidityProgressModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          steps={steps}
          error={error}
          onSuccess={handleSuccess}
        />
      </div>
    </>
  );
} 