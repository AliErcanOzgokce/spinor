import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { XMarkIcon, ArrowPathIcon, PauseIcon, PlayIcon, ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { ethers } from 'ethers'
import { SPINOR_AGENT_ABI } from '@/constants/abis'
import { TOKENS } from '@/constants/tokens'
import { walletClientToSigner } from '@/utils/wallet'
import { SPINOR_AGENT_ADDRESS } from '@/constants/contracts'

interface Step {
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  hash?: string;
}

interface AgentControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentAddress: string;
  currentStrategy: number;
  currentRiskLevel: number;
  isActive: boolean;
  onSuccess?: () => void;
}

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
)

export const AgentControlModal = ({
  isOpen,
  onClose,
  agentAddress,
  currentStrategy,
  currentRiskLevel,
  isActive: initialIsActive,
  onSuccess
}: AgentControlModalProps) => {
  const { address } = useAccount()
  const walletClient = useWalletClient()
  const publicClient = usePublicClient()
  
  const [amount, setAmount] = useState('')
  const [strategy, setStrategy] = useState(currentStrategy)
  const [riskLevel, setRiskLevel] = useState(currentRiskLevel)
  const [steps, setSteps] = useState<Step[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'settings'>('settings')
  const [isActive, setIsActive] = useState(initialIsActive)

  // Check contract's isActive state
  useEffect(() => {
    const checkIsActive = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('https://rpc.abc.t.raas.gelato.cloud')
        const contract = new ethers.Contract(SPINOR_AGENT_ADDRESS, SPINOR_AGENT_ABI, provider)
        const active = await contract.isActive()
        setIsActive(active)
      } catch (err) {
        console.error('Error checking isActive:', err)
      }
    }
    
    const interval = setInterval(checkIsActive, 5000) // Check every 5 seconds
    checkIsActive() // Initial check

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (agentAddress !== SPINOR_AGENT_ADDRESS) {
      console.warn('Agent address mismatch:', { provided: agentAddress, config: SPINOR_AGENT_ADDRESS })
    }
  }, [agentAddress])

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setSteps([]);
      setError(null);
      setAmount('');
      setLoading(false);
    }
  }, [isOpen]);

  // Reset steps and error after successful operation
  const handleSuccess = () => {
    setSteps([]);
    setError(null);
    setAmount('');
    setLoading(false);
    if (onSuccess) {
      setTimeout(() => {
        onSuccess();
      }, 1000); // Wait for 1 second before refreshing data
    }
  };

  const handleStartPause = async () => {
    if (!address || !walletClient.data) return
    
    try {
      setLoading(true)
      setError(null)
      
      const signer = await walletClientToSigner(walletClient.data)
      const agent = new ethers.Contract(SPINOR_AGENT_ADDRESS, SPINOR_AGENT_ABI, signer)
      
      if (isActive) {
        setSteps([{ label: 'Pausing agent', status: 'loading' }])
        const tx = await agent.pause()
        await tx.wait()
        setSteps([{ label: 'Pausing agent', status: 'completed', hash: tx.hash }])
        setIsActive(false)
      } else {
        setSteps([{ label: 'Starting agent', status: 'loading' }])
        const tx = await agent.start()
        await tx.wait()
        setSteps([{ label: 'Starting agent', status: 'completed', hash: tx.hash }])
        setIsActive(true)
      }
      
      handleSuccess()
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message)
      setSteps(steps.map(step => ({ ...step, status: 'error' })))
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async () => {
    if (!address || !walletClient.data || !amount) return
    
    try {
      setLoading(true)
      setError(null)
      
      const signer = await walletClientToSigner(walletClient.data)
      const usdc = new ethers.Contract(TOKENS.USDC.address, ['function approve(address,uint256)'], signer)
      const agent = new ethers.Contract(SPINOR_AGENT_ADDRESS, SPINOR_AGENT_ABI, signer)
      const amountWei = ethers.parseUnits(amount, TOKENS.USDC.decimals)
      
      setSteps([
        { label: 'Pausing agent', status: 'loading' },
        { label: 'Approving USDC', status: 'pending' },
        { label: 'Depositing USDC', status: 'pending' },
        { label: 'Starting agent', status: 'pending' }
      ])

      // First pause the agent
      const pauseTx = await agent.pause()
      await pauseTx.wait()
      setSteps([
        { label: 'Pausing agent', status: 'completed', hash: pauseTx.hash },
        { label: 'Approving USDC', status: 'loading' },
        { label: 'Depositing USDC', status: 'pending' },
        { label: 'Starting agent', status: 'pending' }
      ])
      
      const approveTx = await usdc.approve(SPINOR_AGENT_ADDRESS, amountWei)
      await approveTx.wait()
      setSteps([
        { label: 'Pausing agent', status: 'completed', hash: pauseTx.hash },
        { label: 'Approving USDC', status: 'completed', hash: approveTx.hash },
        { label: 'Depositing USDC', status: 'loading' },
        { label: 'Starting agent', status: 'pending' }
      ])
      
      const depositTx = await agent.deposit(TOKENS.USDC.address, amountWei)
      await depositTx.wait()
      setSteps([
        { label: 'Pausing agent', status: 'completed', hash: pauseTx.hash },
        { label: 'Approving USDC', status: 'completed', hash: approveTx.hash },
        { label: 'Depositing USDC', status: 'completed', hash: depositTx.hash },
        { label: 'Starting agent', status: 'loading' }
      ])

      // Finally start the agent again
      const startTx = await agent.start()
      await startTx.wait()
      setSteps([
        { label: 'Pausing agent', status: 'completed', hash: pauseTx.hash },
        { label: 'Approving USDC', status: 'completed', hash: approveTx.hash },
        { label: 'Depositing USDC', status: 'completed', hash: depositTx.hash },
        { label: 'Starting agent', status: 'completed', hash: startTx.hash }
      ])
      
      handleSuccess()
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message)
      setSteps(steps.map(step => ({ ...step, status: 'error' })))
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!address || !walletClient.data || !amount) return
    
    try {
      setLoading(true)
      setError(null)
      
      const signer = await walletClientToSigner(walletClient.data)
      const agent = new ethers.Contract(SPINOR_AGENT_ADDRESS, SPINOR_AGENT_ABI, signer)
      const amountWei = ethers.parseUnits(amount, TOKENS.USDC.decimals)
      
      setSteps([
        { label: 'Pausing agent', status: 'loading' },
        { label: 'Withdrawing USDC', status: 'pending' },
        { label: 'Starting agent', status: 'pending' }
      ])

      // First pause the agent
      const pauseTx = await agent.pause()
      await pauseTx.wait()
      setSteps([
        { label: 'Pausing agent', status: 'completed', hash: pauseTx.hash },
        { label: 'Withdrawing USDC', status: 'loading' },
        { label: 'Starting agent', status: 'pending' }
      ])
      
      const withdrawTx = await agent.withdraw(TOKENS.USDC.address, amountWei)
      await withdrawTx.wait()
      setSteps([
        { label: 'Pausing agent', status: 'completed', hash: pauseTx.hash },
        { label: 'Withdrawing USDC', status: 'completed', hash: withdrawTx.hash },
        { label: 'Starting agent', status: 'loading' }
      ])

      // Finally start the agent again
      const startTx = await agent.start()
      await startTx.wait()
      setSteps([
        { label: 'Pausing agent', status: 'completed', hash: pauseTx.hash },
        { label: 'Withdrawing USDC', status: 'completed', hash: withdrawTx.hash },
        { label: 'Starting agent', status: 'completed', hash: startTx.hash }
      ])
      
      handleSuccess()
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message)
      setSteps(steps.map(step => ({ ...step, status: 'error' })))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStrategy = async () => {
    if (!address || !walletClient.data) return
    
    try {
      setLoading(true)
      setError(null)
      
      const signer = await walletClientToSigner(walletClient.data)
      const agent = new ethers.Contract(SPINOR_AGENT_ADDRESS, SPINOR_AGENT_ABI, signer)
      
      setSteps([
        { label: 'Pausing agent', status: 'loading' },
        { label: 'Updating strategy', status: 'pending' },
        { label: 'Updating risk level', status: 'pending' },
        { label: 'Starting agent', status: 'pending' }
      ])

      // First pause the agent
      const pauseTx = await agent.pause()
      await pauseTx.wait()
      setSteps([
        { label: 'Pausing agent', status: 'completed', hash: pauseTx.hash },
        { label: 'Updating strategy', status: 'loading' },
        { label: 'Updating risk level', status: 'pending' },
        { label: 'Starting agent', status: 'pending' }
      ])
      
      const strategyTx = await agent.setTradeStrategy(strategy)
      await strategyTx.wait()
      setSteps([
        { label: 'Pausing agent', status: 'completed', hash: pauseTx.hash },
        { label: 'Updating strategy', status: 'completed', hash: strategyTx.hash },
        { label: 'Updating risk level', status: 'loading' },
        { label: 'Starting agent', status: 'pending' }
      ])
      
      const riskTx = await agent.setRiskLevel(riskLevel)
      await riskTx.wait()
      setSteps([
        { label: 'Pausing agent', status: 'completed', hash: pauseTx.hash },
        { label: 'Updating strategy', status: 'completed', hash: strategyTx.hash },
        { label: 'Updating risk level', status: 'completed', hash: riskTx.hash },
        { label: 'Starting agent', status: 'loading' }
      ])

      // Finally start the agent again
      const startTx = await agent.start()
      await startTx.wait()
      setSteps([
        { label: 'Pausing agent', status: 'completed', hash: pauseTx.hash },
        { label: 'Updating strategy', status: 'completed', hash: strategyTx.hash },
        { label: 'Updating risk level', status: 'completed', hash: riskTx.hash },
        { label: 'Starting agent', status: 'completed', hash: startTx.hash }
      ])
      
      handleSuccess()
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message)
      setSteps(steps.map(step => ({ ...step, status: 'error' })))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl 
                                     bg-white dark:bg-gray-900 shadow-xl transition-all">
                {/* Header */}
                <div className="relative p-6 pb-4 border-b border-gray-200 dark:border-gray-800">
                  <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                    Agent Control Panel
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 
                             dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Tabs */}
                  <div className="flex space-x-4 mb-6">
                    <button
                      onClick={() => setActiveTab('deposit')}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        activeTab === 'deposit'
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => setActiveTab('withdraw')}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        activeTab === 'withdraw'
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      Withdraw
                    </button>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        activeTab === 'settings'
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      Settings
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="space-y-6">
                    {activeTab === 'deposit' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Amount (USDC)
                          </label>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <button
                          onClick={handleDeposit}
                          disabled={loading || !amount}
                          className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg font-medium 
                                   hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? <LoadingSpinner /> : 'Deposit'}
                        </button>
                      </div>
                    )}

                    {activeTab === 'withdraw' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Amount (USDC)
                          </label>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <button
                          onClick={handleWithdraw}
                          disabled={loading || !amount}
                          className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg font-medium 
                                   hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? <LoadingSpinner /> : 'Withdraw'}
                        </button>
                      </div>
                    )}

                    {activeTab === 'settings' && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Trade Strategy
                          </label>
                          <select
                            value={strategy}
                            onChange={(e) => setStrategy(Number(e.target.value))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            <option value={1}>Best LST</option>
                            <option value={2}>Best LST + Liquidity</option>
                            <option value={3}>Best LRT</option>
                            <option value={4}>Best LRT + Liquidity</option>
                            <option value={5}>Arbitrage</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Risk Level
                          </label>
                          <select
                            value={riskLevel}
                            onChange={(e) => setRiskLevel(Number(e.target.value))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            <option value={1}>Very Low</option>
                            <option value={2}>Low</option>
                            <option value={3}>Medium</option>
                            <option value={4}>High</option>
                          </select>
                        </div>

                        <div className="flex gap-4">
                          <button
                            onClick={handleUpdateStrategy}
                            disabled={loading || (strategy === currentStrategy && riskLevel === currentRiskLevel)}
                            className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium 
                                     hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? <LoadingSpinner /> : 'Update Settings'}
                          </button>
                          <button
                            onClick={handleStartPause}
                            disabled={loading}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                              isActive
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            {loading ? (
                              <LoadingSpinner />
                            ) : isActive ? (
                              <div className="flex items-center justify-center gap-2">
                                <PauseIcon className="w-5 h-5" />
                                <span>Pause</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <PlayIcon className="w-5 h-5" />
                                <span>Start</span>
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Steps */}
                  {steps.length > 0 && (
                    <div className="mt-6 space-y-4">
                      {steps.map((step, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {step.status === 'loading' ? (
                              <LoadingSpinner />
                            ) : step.status === 'completed' ? (
                              <div className="w-4 h-4 rounded-full bg-green-500" />
                            ) : step.status === 'error' ? (
                              <div className="w-4 h-4 rounded-full bg-red-500" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-700" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300">{step.label}</span>
                          </div>
                          {step.hash && (
                            <a
                              href={`https://explorer.abc.t.raas.gelato.cloud/tx/${step.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-500 hover:text-primary-600 text-sm"
                            >
                              View
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 
                                  rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
} 