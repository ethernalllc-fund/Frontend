import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { TransactionReceipt } from 'viem';
import { PERSONAL_FUND_FACTORY_ABI } from '@/contracts/abis';
import { PERSONAL_FUND_FACTORY_ADDRESS } from '@/contracts/addresses';

export interface CreateFundParams {
  principal:        bigint;
  monthlyDeposit:   bigint;
  currentAge:       bigint;
  retirementAge:    bigint;
  desiredMonthly:   bigint;
  yearsPayments:    bigint;
  interestRate:     bigint;
  timelockYears:    bigint;
  selectedProtocol: `0x${string}`;
}

export interface CreatePersonalFundState {
  createFund:   (params: CreateFundParams) => void;
  txHash:       `0x${string}` | undefined;
  receipt:      TransactionReceipt | undefined;
  isPending:    boolean;
  isConfirming: boolean;
  isSuccess:    boolean;
  error:        Error | null;
  reset:        () => void;
}

export function useCreatePersonalFund(): CreatePersonalFundState {
  const {
    writeContract,
    data: txHash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const createFund = (params: CreateFundParams): void => {
    writeContract({
      address:      PERSONAL_FUND_FACTORY_ADDRESS,
      abi:          PERSONAL_FUND_FACTORY_ABI,
      functionName: 'createPersonalFund',
      args: [
        params.principal,
        params.monthlyDeposit,
        params.currentAge,
        params.retirementAge,
        params.desiredMonthly,
        params.yearsPayments,
        params.interestRate,
        params.timelockYears,
        params.selectedProtocol,
      ],
    });
  };

  return {
    createFund,
    txHash,
    receipt,
    isPending,
    isConfirming,
    isSuccess,
    error: error as Error | null,
    reset,
  };
}