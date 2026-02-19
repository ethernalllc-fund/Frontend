import { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useUSDCAllowance, useUSDCBalance } from './useUSDC';
import { useUSDCApproval }                  from './useUSDCApproval';
import { parseUSDC, needsApproval, formatUSDC, hasEnoughBalance } from './usdcUtils';
import type {
  TxStepStatus,
  UseUSDCTransactionProps,
  UseUSDCTransactionReturn,
} from '@/types/transaction_types';
import {
  TX_STEP_PROGRESS } from '@/types/transaction_types';

export function useUSDCTransaction({
  contractAddress,
  abi,
  functionName,
  args = [],
  usdcAmount,
  onApprovalSuccess,
  onTransactionSuccess,
  onError,
  enabled = true,
  autoExecuteAfterApproval = true,
}: UseUSDCTransactionProps): UseUSDCTransactionReturn {

  const { address } = useAccount();
  const [step,  setStep]  = useState<TxStepStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const {
    data:    userBalance = 0n,
    isLoading: isLoadingBalance,
    refetch: refetchBalance,
  } = useUSDCBalance(address);

  const {
    data:    currentAllowance,
    isLoading: isCheckingAllowance,
    refetch: refetchAllowance,
  } = useUSDCAllowance(address, contractAddress);

  const normalizedAmount: string =
    usdcAmount == null ? '0' : String(usdcAmount);

  const amountInWei: bigint = (() => {
    try {
      return parseUSDC(normalizedAmount);
    } catch {
      return 0n;
    }
  })();

  const requiresApproval =
    enabled &&
    amountInWei > 0n &&
    needsApproval(currentAllowance, amountInWei);

  const userHasEnoughBalance = hasEnoughBalance(userBalance, amountInWei);

  useEffect(() => {
    if (!import.meta.env.DEV || !enabled || !address) return;
    console.log('[useUSDCTransaction] Balance check:', {
      balance:          formatUSDC(userBalance),
      required:         formatUSDC(amountInWei),
      hasEnough:        userHasEnoughBalance,
      allowance:        formatUSDC(currentAllowance ?? 0n),
      requiresApproval,
      step,
    });
  }, [enabled, address, userBalance, amountInWei, userHasEnoughBalance, currentAllowance, requiresApproval, step]);

  const approval = useUSDCApproval({
    amount:  normalizedAmount,
    spender: contractAddress,
    onSuccess: (hash) => {
      if (import.meta.env.DEV) console.log('[useUSDCTransaction] Approval confirmed:', hash);
      setStep('approved');
      refetchAllowance();
      onApprovalSuccess?.();
    },
    onError: (err) => {
      setError(err);
      setStep('error');
      onError?.(err);
    },
  });

  const {
    writeContract,
    data:      txHash,
    isPending: isWritePending,
    error:     writeError,
    reset:     resetWrite,
  } = useWriteContract();

  const {
    isLoading: isTxConfirming,
    isSuccess: isTxSuccess,
    error:     txError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const executeApproval = useCallback(async (): Promise<void> => {
    if (!requiresApproval) {
      if (import.meta.env.DEV) console.warn('[useUSDCTransaction] Approval not required, skipping');
      return;
    }

    if (!userHasEnoughBalance) {
      const err = new Error(
        `Insufficient USDC balance.\n` +
        `Required: $${formatUSDC(amountInWei)}\n` +
        `Available: $${formatUSDC(userBalance)}\n` +
        `Missing: $${formatUSDC(amountInWei - userBalance)}\n\n` +
        `Please get test tokens from the faucet first.`,
      );
      setError(err);
      setStep('error');
      onError?.(err);
      throw err;
    }

    setStep('approving');
    setError(null);

    await approval.approve();
  }, [requiresApproval, userHasEnoughBalance, amountInWei, userBalance, approval, onError]);

  const executeTransaction = useCallback(async (): Promise<void> => {
    if (requiresApproval && step !== 'approved') {
      const err = new Error('USDC must be approved before executing the transaction.');
      setError(err);
      setStep('error');
      onError?.(err);
      throw err;
    }

    if (import.meta.env.DEV) {
      console.log('[useUSDCTransaction] Executing contract call:', {
        contractAddress,
        functionName,
        args,
      });
    }

    setStep('executing');
    setError(null);
    writeContract({
      address:      contractAddress,
      abi,
      functionName,
      args:         args as unknown[],

    });

  }, [requiresApproval, step, contractAddress, abi, functionName, args, writeContract, onError]);
  const executeAll = useCallback(async (): Promise<void> => {
    setError(null);

    if (!userHasEnoughBalance) {
      const err = new Error(
        `Insufficient USDC balance.\n` +
        `Required: $${formatUSDC(amountInWei)}\n` +
        `Available: $${formatUSDC(userBalance)}\n` +
        `Missing: $${formatUSDC(amountInWei - userBalance)}\n\n` +
        `Please get test tokens from the faucet first.`,
      );
      setError(err);
      setStep('error');
      onError?.(err);
      return;
    }

    try {
      if (requiresApproval) {
        if (import.meta.env.DEV) console.log('[useUSDCTransaction] Flow: Approve → Execute');
        await executeApproval();
      } else {
        if (import.meta.env.DEV) console.log('[useUSDCTransaction] Flow: Execute only (no approval needed)');
        await executeTransaction();
      }
    } catch {
    }
  }, [userHasEnoughBalance, amountInWei, userBalance, requiresApproval, executeApproval, executeTransaction, onError]);

  const reset = useCallback((): void => {
    setStep('idle');
    setError(null);
    approval.reset();
    resetWrite();
    refetchBalance();
  }, [approval, resetWrite, refetchBalance]);

  useEffect(() => {
    if (!autoExecuteAfterApproval)    return;
    if (step !== 'approved')          return;
    if (!approval.isSuccess)          return;

    if (import.meta.env.DEV) console.log('[useUSDCTransaction] Approval confirmed, auto-executing tx...');
    executeTransaction();
  }, [autoExecuteAfterApproval, step, approval.isSuccess, executeTransaction]);

  useEffect(() => {
    if (txHash && step === 'executing') {
      setStep('confirming');
    }
  }, [txHash, step]);

  useEffect(() => {
    if (!isTxSuccess || !txHash) return;
    if (import.meta.env.DEV) console.log('[useUSDCTransaction] Tx confirmed:', txHash);
    setStep('success');
    refetchBalance();
    onTransactionSuccess?.(txHash);
  }, [isTxSuccess, txHash, refetchBalance, onTransactionSuccess]);

  useEffect(() => {
    if (!writeError) return;
    const err = writeError as Error;
    setError(err);
    setStep('error');
    onError?.(err);
  }, [writeError, onError]);

  useEffect(() => {
    if (!txError) return;
    const err = txError as Error;
    setError(err);
    setStep('error');
    onError?.(err);
  }, [txError, onError]);

  return {
    step,
    progress:         TX_STEP_PROGRESS[step],
    requiresApproval,
    currentAllowance,
    userBalance,
    hasEnoughBalance: userHasEnoughBalance,
    error,

    executeApproval,
    executeTransaction,
    executeAll,
    refetchAllowance,
    reset,

    isApproving:           approval.isApproving || step === 'approving',
    isApprovingConfirming: approval.isConfirming,
    approvalSuccess:       approval.isSuccess,
    approvalHash:          approval.hash,
    isExecuting:           isWritePending || step === 'executing',
    isConfirming:          isTxConfirming || step === 'confirming',
    txHash,

    isLoading:
      isCheckingAllowance   ||
      isLoadingBalance      ||
      approval.isApproving  ||
      approval.isConfirming ||
      isWritePending        ||
      isTxConfirming        ||
      (['checking', 'approving', 'executing', 'confirming'] as TxStepStatus[]).includes(step),

    isSuccess: step === 'success' && isTxSuccess,
    isError:   step === 'error'   || !!error,
  };
}