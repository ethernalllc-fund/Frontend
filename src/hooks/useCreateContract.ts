import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient, useAccount } from 'wagmi';
import { type Address, parseAbi } from 'viem';

const factoryABI = parseAbi([
  'function createRetirementContract(uint256 monthlyAmount, uint256 retirementAge) returns (address)'
]);
const MIN_RETIREMENT_AGE = 18;
const MAX_RETIREMENT_AGE = 120;
const MIN_MONTHLY_AMOUNT = 0n; 
const GAS_LIMIT = 500_000n;

interface UseCreateContractProps {
  onSuccess?: (contractAddress: Address, txHash: `0x${string}`) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface UseCreateContractReturn {
  createContract: (
    factoryAddress: Address,
    monthlyAmount: bigint,
    retirementAge: number
  ) => Promise<void>;

  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  isError: boolean;
  hash?: `0x${string}`;
  error: Error | null;
  reset: () => void;
}

const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet first',
  INVALID_FACTORY_ADDRESS: 'Invalid factory address',
  ZERO_FACTORY_ADDRESS: 'Cannot use zero address as factory',
  INVALID_MONTHLY_AMOUNT: 'Monthly amount must be greater than 0',
  INVALID_RETIREMENT_AGE: `Retirement age must be between ${MIN_RETIREMENT_AGE} and ${MAX_RETIREMENT_AGE}`,
  INSUFFICIENT_GAS: 'Insufficient ETH for gas fees. Please add ETH to your wallet.',
  USER_REJECTED: 'Transaction rejected by user',
  SIMULATION_FAILED: 'Transaction would fail. Please check your inputs.',
} as const;

function validateInputs(
  factoryAddress: Address | undefined,
  monthlyAmount: bigint | undefined,
  retirementAge: number | undefined
): void {
  if (!factoryAddress) {
    throw new Error(ERROR_MESSAGES.INVALID_FACTORY_ADDRESS);
  }
  if (factoryAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(ERROR_MESSAGES.ZERO_FACTORY_ADDRESS);
  }
  if (monthlyAmount === undefined || monthlyAmount <= MIN_MONTHLY_AMOUNT) {
    throw new Error(ERROR_MESSAGES.INVALID_MONTHLY_AMOUNT);
  }
  if (retirementAge === undefined) {
    throw new Error(ERROR_MESSAGES.INVALID_RETIREMENT_AGE);
  }
  if (!Number.isInteger(retirementAge)) {
    throw new Error('Retirement age must be a whole number');
  }
  if (retirementAge < MIN_RETIREMENT_AGE || retirementAge > MAX_RETIREMENT_AGE) {
    throw new Error(ERROR_MESSAGES.INVALID_RETIREMENT_AGE);
  }
}

function parseContractError(error: any): string {
  const errorMessage = error.message || '';
  if (errorMessage.includes('insufficient funds')) {
    return ERROR_MESSAGES.INSUFFICIENT_GAS;
  }
  if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
    return ERROR_MESSAGES.USER_REJECTED;
  }
  if (errorMessage.includes('execution reverted')) {
    const revertMatch = errorMessage.match(/reverted with reason string '(.+?)'/);
    if (revertMatch) {
      return `Contract error: ${revertMatch[1]}`;
    }
    return ERROR_MESSAGES.SIMULATION_FAILED;
  }
  return errorMessage || 'Unknown error occurred';
}

export function useCreateContract({
  onSuccess,
  onError,
  enabled = true,
}: UseCreateContractProps = {}): UseCreateContractReturn {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const [error, setError] = useState<Error | null>(null);
  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: txError,
  } = useWaitForTransactionReceipt({ hash });

  const createContract = useCallback(
    async (
      factoryAddress: Address,
      monthlyAmount: bigint,
      retirementAge: number
    ): Promise<void> => {
      if (!enabled) {
        console.warn('⚠️ useCreateContract is disabled');
        return;
      }

      if (!userAddress) {
        const err = new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
        setError(err);
        onError?.(err);
        throw err;
      }

      console.log('🏗️ Creating retirement contract...', {
        factory: `${factoryAddress.slice(0, 6)}...${factoryAddress.slice(-4)}`,
        monthlyAmount: monthlyAmount.toString(),
        retirementAge,
        user: `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`,
      });
      setError(null);

      try {
        console.log('📋 Validating inputs...');
        validateInputs(factoryAddress, monthlyAmount, retirementAge);
        console.log('✅ Inputs validated');
        if (publicClient) {
          try {
            console.log('🧪 Simulating transaction...');
            
            const { result } = await publicClient.simulateContract({
              address: factoryAddress,
              abi: factoryABI,
              functionName: 'createRetirementContract',
              args: [monthlyAmount, BigInt(retirementAge)],
              account: userAddress,
            });

            console.log('✅ Simulation successful');
            console.log('📄 Expected contract address:', result);

          } catch (simulationError: any) {
            console.error('❌ Simulation failed:', simulationError);
            const userMessage = parseContractError(simulationError);
            const err = new Error(userMessage);
            
            setError(err);
            onError?.(err);
            throw err;
          }
        } else {
          console.warn('⚠️ Public client not available, skipping simulation');
        }

        console.log('🚀 Executing transaction...');
        
        writeContract({
          address: factoryAddress,
          abi: factoryABI,
          functionName: 'createRetirementContract',
          args: [monthlyAmount, BigInt(retirementAge)],
          gas: GAS_LIMIT,
        });

      } catch (err) {
        console.error('❌ Contract creation failed:', err);
        if (!(err instanceof Error && err.message.includes('simulation'))) {
          const error = err as Error;
          const userMessage = parseContractError(error);
          const enhancedError = new Error(userMessage);
          
          setError(enhancedError);
          onError?.(enhancedError);
        }

        throw err;
      }
    },
    [userAddress, publicClient, writeContract, enabled, onError]
  );

  const reset = useCallback(() => {
    setError(null);
    resetWrite();
  }, [resetWrite]);

  useEffect(() => {
    if (isSuccess && hash) {
      console.log('✅ Retirement contract created!', {
        txHash: hash,
      });

      setError(null);
      onSuccess?.(hash as unknown as Address, hash);
    }
  }, [isSuccess, hash, onSuccess]);

  useEffect(() => {
    if (writeError) {
      console.error('❌ Write error:', writeError);
      const error = writeError as Error;
      const userMessage = parseContractError(error);
      const enhancedError = new Error(userMessage);
      setError(enhancedError);
      onError?.(enhancedError);
    }
  }, [writeError, onError]);

  useEffect(() => {
    if (txError) {
      console.error('❌ Transaction error:', txError);
      const error = txError as Error;
      const userMessage = parseContractError(error);
      const enhancedError = new Error(userMessage);
      setError(enhancedError);
      onError?.(enhancedError);
    }
  }, [txError, onError]);

  return {
    createContract,
    isPending: isWritePending,
    isConfirming,
    isSuccess,
    isError: !!error || !!writeError || !!txError,
    hash,
    error: error || (writeError as Error) || (txError as Error) || null,
    reset,
  };
}