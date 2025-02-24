import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

interface Step {
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  hash?: string;
}

interface AddLiquidityProgressModalProps {
  open: boolean;
  onClose: () => void;
  steps: Step[];
  error?: string;
  onSuccess?: () => void;
}

// Enhanced Loading Spinner with Gradient Effect
const LoadingSpinner = () => (
  <div className="relative w-8 h-8">
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

export const AddLiquidityProgressModal = ({
  open,
  onClose,
  steps,
  error,
  onSuccess,
}: AddLiquidityProgressModalProps) => {
  const isAllCompleted = steps.every(step => step.status === 'completed');
  const hasError = steps.some(step => step.status === 'error');
  const lastCompletedStep = steps.findLast(step => step.status === 'completed');

  return (
    <AnimatePresence>
      {open && (
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
              {isAllCompleted ? (
                // Success View
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Liquidity Added Successfully
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Your liquidity has been added to the pool
                  </p>
                  {lastCompletedStep?.hash && (
                    <a
                      href={`https://explorer.abc.t.raas.gelato.cloud/tx/${lastCompletedStep.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 mb-6"
                    >
                      View on Explorer
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                  )}
                  <motion.button
                    className="w-full py-3 px-4 rounded-xl text-white font-medium bg-primary-500 hover:bg-primary-600 
                             dark:bg-primary-600 dark:hover:bg-primary-700 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onSuccess?.();
                      onClose();
                    }}
                  >
                    Close
                  </motion.button>
                </div>
              ) : (
                // Progress View
                <>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Adding Liquidity
                  </h3>

                  <div className="space-y-4">
                    {steps.map((step, index) => {
                      // Skip pending steps if previous step had an error
                      if (step.status === 'pending' && index > 0 && steps[index - 1].status === 'error') {
                        return null;
                      }

                      return (
                        <div
                          key={step.label}
                          className="flex items-center gap-6 p-4 bg-black/5 dark:bg-white/5 rounded-xl"
                        >
                          {step.status === 'loading' ? (
                            <LoadingSpinner />
                          ) : step.status === 'completed' ? (
                            <CheckCircleIcon className="w-8 h-8 text-green-500 dark:text-green-400" />
                          ) : step.status === 'error' ? (
                            <XCircleIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {step.label}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {step.status === 'loading'
                                ? 'Waiting for confirmation...'
                                : step.status === 'completed'
                                ? 'Completed'
                                : step.status === 'error'
                                ? 'Failed'
                                : 'Pending'}
                            </p>
                            {step.hash && (
                              <a
                                href={`https://explorer.abc.t.raas.gelato.cloud/tx/${step.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1 mt-1"
                              >
                                View Transaction
                                <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 