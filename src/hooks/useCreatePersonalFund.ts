import { useCallback, useEffect, useState } from 'react';
import { 
  useWriteContract, 
  useWaitForTransactionReceipt, 
  useAccount,
  useChainId
} from 'wagmi';
import { type Address, zeroAddress, decodeEventLog } from 'viem';
import { PersonalFundFactoryABI } from '@/contracts/abis';
import { getContractAddress } from '@/config/addresses';

export interface CreateFundParams {
  monthlyDeposit: bigint;
  retirementAge: number;
  principal?: bigint;
  currentAge?: number;
  desiredMonthlyIncome?: bigint;
  yearsPayments?: number;
  interestRate?: number;
  timelockYears?: number;
  protocol?: Address;
  factoryAddress?: Address;
}

export interface UseCreatePersonalFundReturn {
  createFund: (params: CreateFundParams) => Promise<void>;
  reset: () => void;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  isError: boolean;
  txHash?: `0x${string}`;
  fundAddress?: Address;
  error: Error | null;
  isFactoryConfigured: boolean;
}

const VALIDATION = {
  MIN_RETIREMENT_AGE: 18,
  MAX_RETIREMENT_AGE: 120,
} as const;

const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet to create a fund.',
  FACTORY_NOT_CONFIGURED: 'Factory contract not configured for this network.',
  INVALID_MONTHLY_DEPOSIT: 'Monthly deposit must be greater than 0.',
  INVALID_RETIREMENT_AGE: `Retirement age must be between ${VALIDATION.MIN_RETIREMENT_AGE} and ${VALIDATION.MAX_RETIREMENT_AGE}.`,
  USER_REJECTED: 'Transaction was rejected in your wallet.',
  INSUFFICIENT_FUNDS: 'Insufficient ETH for gas fees.',
} as const;

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function parseContractError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  
  if (message.includes('User rejected') || message.includes('user rejected')) {
    return new ValidationError(ERROR_MESSAGES.USER_REJECTED);
  }
  if (message.includes('insufficient funds')) {
    return new ValidationError(ERROR_MESSAGES.INSUFFICIENT_FUNDS);
  }
  
  return error instanceof Error ? error : new Error(message);
}

function validateParams(params: CreateFundParams): void {
  const {
    monthlyDeposit,
    retirementAge,
    currentAge = 18,
  } = params;

  if (monthlyDeposit === undefined || monthlyDeposit <= 0n) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_MONTHLY_DEPOSIT);
  }

  if (retirementAge === undefined || 
      retirementAge < VALIDATION.MIN_RETIREMENT_AGE || 
      retirementAge > VALIDATION.MAX_RETIREMENT_AGE) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_RETIREMENT_AGE);
  }

  if (currentAge >= retirementAge) {
    throw new ValidationError('Current age must be less than retirement age.');
  }
}

export function useCreatePersonalFund(): UseCreatePersonalFundReturn {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const configuredFactoryAddress = getContractAddress(chainId, 'personalFundFactory');
  const isFactoryConfigured = !!configuredFactoryAddress;
  
  const [error, setError] = useState<Error | null>(null);
  const [fundAddress, setFundAddress] = useState<Address>();

  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isTxSuccess,
    data: receipt,
    error: txError,
  } = useWaitForTransactionReceipt({ 
    hash: txHash,
    query: {
      enabled: !!txHash,
    }
  });

  const extractFundAddressFromReceipt = useCallback((receipt: any): Address | undefined => {
    try {
      if (!configuredFactoryAddress) return undefined;
      const fundCreatedLog = receipt.logs.find((log: any) => {
        return log.address.toLowerCase() === configuredFactoryAddress.toLowerCase();
      });

      if (fundCreatedLog) {
        // Method 1: Try to get from topics (most reliable)
        if (fundCreatedLog.topics && fundCreatedLog.topics.length > 1) {
          // topics[0] is event signature, topics[1] is fundAddress (indexed)
          const fundAddressFromTopics = fundCreatedLog.topics[1];
          
          if (fundAddressFromTopics && 
              typeof fundAddressFromTopics === 'string' && 
              fundAddressFromTopics.startsWith('0x') &&
              fundAddressFromTopics.length === 66) { // 0x + 64 chars = 66
            return fundAddressFromTopics as Address;
          }
        }
        
        // Method 2: Try to decode the event
        try {
          const decoded = decodeEventLog({
            abi: PersonalFundFactoryABI,
            data: fundCreatedLog.data,
            topics: fundCreatedLog.topics,
          });
          
          if (decoded && 'args' in decoded) {
            const args = decoded.args as any;
            // Try different possible argument names
            const possibleAddress = args.fundAddress || args[0] || args._fundAddress;
            
            if (possibleAddress && 
                typeof possibleAddress === 'string' && 
                possibleAddress.startsWith('0x')) {
              return possibleAddress as Address;
            }
          }
        } catch {
          // Ignore decode error, we already tried topics
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[useCreatePersonalFund] Failed to extract fund address:', error);
      }
    }
    
    return undefined;
  }, [configuredFactoryAddress]);

  // Update fund address when receipt is available
  useEffect(() => {
    if (isTxSuccess && receipt && configuredFactoryAddress) {
      const newFundAddress = extractFundAddressFromReceipt(receipt);
      if (newFundAddress) {
        setFundAddress(newFundAddress);
        
        if (import.meta.env.DEV) {
          console.log('[useCreatePersonalFund] Fund created successfully!', {
            txHash,
            fundAddress: newFundAddress,
          });
        }
      }
    }
  }, [isTxSuccess, receipt, txHash, configuredFactoryAddress, extractFundAddressFromReceipt]);

  const createFund = useCallback(async (params: CreateFundParams) => {
    // Reset state
    setError(null);
    setFundAddress(undefined);

    // Check wallet connection
    if (!isConnected || !address) {
      const err = new ValidationError(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
      setError(err);
      throw err;
    }

    // Check factory configuration
    if (!configuredFactoryAddress) {
      const err = new ValidationError(ERROR_MESSAGES.FACTORY_NOT_CONFIGURED);
      setError(err);
      throw err;
    }

    try {
      // Validate inputs
      validateParams(params);

      const {
        monthlyDeposit,
        retirementAge,
        principal = 0n,
        currentAge = 18,
        desiredMonthlyIncome = 0n,
        yearsPayments = 20,
        interestRate = 700,
        timelockYears = 15,
        protocol = zeroAddress,
        factoryAddress = configuredFactoryAddress,
      } = params;

      if (import.meta.env.DEV) {
        console.log('[useCreatePersonalFund] Creating fund:', {
          factory: factoryAddress,
          monthlyDeposit: monthlyDeposit.toString(),
          retirementAge,
          from: address,
          chainId,
        });
      }

      writeContract({
        address: factoryAddress,
        abi: PersonalFundFactoryABI,
        functionName: 'createPersonalFund',
        args: [
          principal,
          monthlyDeposit,
          BigInt(currentAge),
          BigInt(retirementAge),
          desiredMonthlyIncome,
          BigInt(yearsPayments),
          BigInt(interestRate),
          BigInt(timelockYears),
          protocol,
        ],
      });

    } catch (err) {
      const parsedError = parseContractError(err);
      setError(parsedError);
      throw parsedError;
    }
  }, [address, isConnected, configuredFactoryAddress, chainId, writeContract]);

  const reset = useCallback(() => {
    setError(null);
    setFundAddress(undefined);
    resetWrite();
  }, [resetWrite]);

  useEffect(() => {
    if (writeError) {
      setError(parseContractError(writeError));
    }
  }, [writeError]);

  useEffect(() => {
    if (txError) {
      setError(parseContractError(txError));
    }
  }, [txError]);

  return {
    createFund,
    reset,
    isPending: isWritePending,
    isConfirming,
    isSuccess: isTxSuccess && !!fundAddress,
    isError: !!error || !!writeError || !!txError,
    txHash,
    fundAddress,
    error,
    isFactoryConfigured,
  };
}