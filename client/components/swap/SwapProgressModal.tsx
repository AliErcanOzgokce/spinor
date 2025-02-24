import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLongRightIcon,
} from "@heroicons/react/24/outline";
import { abcTestnet } from "@/config/wagmi";
import type { Token } from "@/services/swap/types";

interface SwapProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: "approving" | "swapping" | "success" | "error";
  tokenIn: Token | null;
  tokenOut: Token | null;
  amountIn: string;
  amountOut: string;
  error?: string;
  txHash?: string;
}

// Enhanced Loading Spinner with Gradient Effect
const LoadingSpinner = () => (
  <div className="relative w-12 h-12 mx-auto">
    {/* Outer rotating gradient ring */}
    <motion.div
      className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-primary-300"
      animate={{
        rotate: 360,
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "linear",
      }}
    />
    {/* Inner white/dark circle */}
    <div className="absolute inset-1 rounded-full bg-white dark:bg-gray-900" />
    {/* Center dot with pulse effect */}
    <motion.div
      className="absolute inset-[38%] rounded-full bg-primary-500"
      animate={{
        scale: [1, 1.2, 1],
        opacity: [1, 0.8, 1],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  </div>
);

export const SwapProgressModal = ({
  isOpen,
  onClose,
  status,
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  error,
  txHash,
}: SwapProgressModalProps) => {
  // Get explorer URL from chain config
  const explorerUrl = abcTestnet.blockExplorers?.default.url;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background blur and gradient effect */}
            <div
              className="absolute -inset-[1px] bg-gradient-to-r from-primary-500/30 to-primary-600/30 
                          dark:from-primary-400/20 dark:to-primary-500/20 rounded-[20px] blur-lg"
            />

            <div
              className="relative bg-white/80 dark:bg-black/50 backdrop-blur-xl rounded-[20px] p-6 
                          shadow-xl dark:shadow-2xl shadow-black/5 dark:shadow-primary-500/5"
            >
              {/* Header with Token Info */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  {/* Token Icons */}
                  <div className="flex -space-x-2">
                    <div
                      className="w-8 h-8 bg-primary-100 dark:bg-white/[0.08] rounded-full 
                                  flex items-center justify-center z-10"
                    >
                      <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                        {tokenIn?.symbol[0]}
                      </span>
                    </div>
                    <div
                      className="w-8 h-8 bg-primary-50 dark:bg-white/[0.05] rounded-full 
                                  flex items-center justify-center"
                    >
                      <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                        {tokenOut?.symbol[0]}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {tokenIn?.symbol} → {tokenOut?.symbol}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {amountIn} → {amountOut}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Content */}
              <div className="flex flex-col items-center justify-center py-6">
                {status === "approving" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center w-full"
                  >
                    <LoadingSpinner />
                    <div className="mt-6 p-4 bg-black/5 dark:bg-white/5 rounded-2xl">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            From
                          </span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                            {amountIn} {tokenIn?.symbol}
                          </span>
                        </div>
                        <ArrowLongRightIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        <div className="flex flex-col items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            To
                          </span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                            {amountOut} {tokenOut?.symbol}
                          </span>
                        </div>
                      </div>
                    </div>
                    <h4 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                      Approving {tokenIn?.symbol}
                    </h4>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Please confirm the transaction in your wallet
                    </p>
                  </motion.div>
                )}

                {status === "swapping" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center w-full"
                  >
                    <div className="mb-6 p-4 bg-black/5 dark:bg-white/5 rounded-2xl">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            From
                          </span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                            {amountIn} {tokenIn?.symbol}
                          </span>
                        </div>
                        <ArrowLongRightIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        <div className="flex flex-col items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            To
                          </span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                            {amountOut} {tokenOut?.symbol}
                          </span>
                        </div>
                      </div>
                    </div>
                    <LoadingSpinner />
                    <h4 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                      Swapping Tokens
                    </h4>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Please wait while we process your swap
                    </p>
                  </motion.div>
                )}

                {status === "success" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center w-full"
                  >
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", duration: 0.5 }}
                    >
                      <div className="relative inline-block">
                        <div className="absolute inset-0 bg-green-500/20 dark:bg-green-500/10 rounded-full blur-lg" />
                        <CheckCircleIcon className="w-16 h-16 text-green-500 dark:text-green-400 relative" />
                      </div>
                    </motion.div>
                    <h4 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                      Swap Successful!
                    </h4>

                    {/* Transaction Details Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-6 p-6 bg-black/5 dark:bg-white/5 rounded-2xl mx-auto max-w-sm border border-black/5 dark:border-white/5"
                    >
                      <div className="flex items-center justify-between gap-6">
                        {/* From Token */}
                        <div className="flex flex-col items-center flex-1">
                          <div
                            className="w-12 h-12 bg-primary-100 dark:bg-white/[0.08] rounded-full 
                                        flex items-center justify-center mb-3"
                          >
                            <span className="text-lg font-medium text-primary-700 dark:text-primary-300">
                              {tokenIn?.symbol[0]}
                            </span>
                          </div>
                          <span className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                            {amountIn}
                          </span>
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {tokenIn?.symbol}
                          </span>
                        </div>

                        {/* Arrow */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-white/[0.03] flex items-center justify-center">
                            <ArrowLongRightIcon className="w-6 h-6 text-primary-500 dark:text-primary-400" />
                          </div>
                        </div>

                        {/* To Token */}
                        <div className="flex flex-col items-center flex-1">
                          <div
                            className="w-12 h-12 bg-primary-50 dark:bg-white/[0.05] rounded-full 
                                        flex items-center justify-center mb-3"
                          >
                            <span className="text-lg font-medium text-primary-600 dark:text-primary-400">
                              {tokenOut?.symbol[0]}
                            </span>
                          </div>
                          <span className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                            {amountOut}
                          </span>
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {tokenOut?.symbol}
                          </span>
                        </div>
                      </div>
                    </motion.div>

                    {txHash && explorerUrl && (
                      <motion.a
                        href={`${explorerUrl}/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 
                                 hover:bg-primary-500/20 dark:bg-primary-400/10 dark:hover:bg-primary-400/20 
                                 rounded-xl text-primary-600 dark:text-primary-400 text-sm font-medium 
                                 transition-colors duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        View on Explorer
                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      </motion.a>
                    )}
                  </motion.div>
                )}

                {status === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", duration: 0.5 }}
                    >
                      <div className="relative inline-block">
                        <div className="absolute inset-0 bg-red-500/20 dark:bg-red-500/10 rounded-full blur-lg" />
                        <XCircleIcon className="w-16 h-16 text-red-500 dark:text-red-400 relative" />
                      </div>
                    </motion.div>
                    <h4 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                      Swap Failed
                    </h4>
                    {error && (
                      <p
                        className="mt-2 text-sm text-red-500 dark:text-red-400 bg-red-500/10 
                                  dark:bg-red-500/5 rounded-lg px-4 py-2"
                      >
                        {error}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Close Button */}
              <motion.button
                onClick={onClose}
                className="mt-6 w-full px-4 py-3 bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 
                         dark:hover:bg-white/[0.12] rounded-xl font-medium text-gray-900 dark:text-white 
                         transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
