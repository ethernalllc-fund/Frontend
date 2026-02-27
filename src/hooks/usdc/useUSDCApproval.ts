import { useState, useEffect, useCallback, startTransition } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi';
import { erc20Abi } from 'viem';
import { parseUSDC, useUSDCAddress } from './usdcUtils';

export interface UseUSDCApprovalProps {
  amount: string;
  spender: `0x${string}`;
  onSuccess?: (hash: `0x${string}`) => void;
  onError?: (error: Error) => void;
}

export interface UseUSDCApprovalReturn {
  approve:    () => Promise<void>;
  approveMax: () => Promise<void>;
  reset:      () => void;

  isApproving:  boolean;   // wallet abierta / esperando firma
  isConfirming: boolean;   // tx enviada, esperando confirmación on-chain
  isSuccess:    boolean;   // tx confirmada con éxito
  isError:      boolean;
  hash?:        `0x${string}`;
  error:        Error | null;
}

const MAX_UINT256 = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

function classifyError(raw: unknown): Error {
  const msg = (raw as Error)?.message ?? String(raw);

  if (msg.includes('User rejected') || msg.includes('user rejected')) {
    return new Error('Transaction cancelled by user.');
  }
  if (msg.includes('insufficient funds') || msg.includes('Insufficient ETH')) {
    return new Error(
      'Insufficient ETH for gas fees. Get ETH from the faucet and try again.',
    );
  }
  if (msg.includes('Internal JSON-RPC error')) {
    return new Error(
      'RPC error. Most likely cause: insufficient ETH for gas.\n' +
      'Steps: (1) check your ETH balance, (2) wait 30s, (3) try again.',
    );
  }
  if (msg.includes('Cannot approve zero address')) {
    return new Error('Invalid spender address (zero address).');
  }

  const shortMsg = (raw as { shortMessage?: string })?.shortMessage;
  return new Error(shortMsg ?? msg);
}

export function useUSDCApproval({
  amount,
  spender,
  onSuccess,
  onError,
}: UseUSDCApprovalProps): UseUSDCApprovalReturn {
  const { address }  = useAccount();
  const usdcAddress  = useUSDCAddress();
  const [localError, setLocalError] = useState<Error | null>(null);

  const {
    writeContract,
    data:       hash,
    isPending:  isWritePending,
    error:      writeError,
    reset:      resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error:     txError,
  } = useWaitForTransactionReceipt({ hash });

  // ─── FIX: validateCommon memoizado para que _doApprove capture siempre
  // los valores actuales de address/usdcAddress/spender desde su closure ───────
  const validateCommon = useCallback((): Error | null => {
    if (!address)     return new Error('Wallet not connected.');
    if (!usdcAddress) return new Error('USDC contract not found for this network.');
    if (!spender || spender === ZERO_ADDRESS)
                      return new Error('Invalid spender address.');
    return null;
  }, [address, usdcAddress, spender]);

  const _doApprove = useCallback(
    async (amountWei: bigint): Promise<void> => {
      const validationError = validateCommon();
      if (validationError) {
        setLocalError(validationError);
        onError?.(validationError);
        throw validationError;
      }

      const from     = address!;
      const usdcAddr = usdcAddress!;

      startTransition(() => { setLocalError(null); });

      if (import.meta.env.DEV) {
        console.log('[useUSDCApproval] Sending approve to wallet...', {
          spender:     spender.slice(0, 10) + '...',
          from:        from.slice(0, 10) + '...',
          usdcAddress: usdcAddr.slice(0, 10) + '...',
          amountWei:   amountWei.toString(),
        });
      }

      writeContract({
        address:      usdcAddr,
        abi:          erc20Abi,
        functionName: 'approve',
        args:         [spender, amountWei],
        gas:          100_000n, // gasLimit fijo — approve ERC-20 nunca supera ~60k
      });
    },
    [validateCommon, address, usdcAddress, spender, writeContract, onError],
  );

  const approve = useCallback(async (): Promise<void> => {
    if (!amount || parseFloat(amount) <= 0) {
      const err = new Error('Amount must be greater than 0.');
      setLocalError(err);
      onError?.(err);
      throw err;
    }
    await _doApprove(parseUSDC(amount));
  }, [amount, _doApprove, onError]);

  const approveMax = useCallback(async (): Promise<void> => {
    await _doApprove(MAX_UINT256);
  }, [_doApprove]);

  const reset = useCallback(() => {
    startTransition(() => {
      setLocalError(null);
    });
    resetWrite();
  }, [resetWrite]);

  useEffect(() => {
    if (!isSuccess || !hash) return;

    if (import.meta.env.DEV) {
      console.log('[useUSDCApproval] Approval confirmed on-chain', {
        hash,
        spender: spender.slice(0, 10) + '...',
      });
    }

    startTransition(() => {
      setLocalError(null);
    });
    onSuccess?.(hash);
  }, [isSuccess, hash, onSuccess, spender]);

  useEffect(() => {
    if (!writeError) return;
    const classified = classifyError(writeError);
    startTransition(() => {
      setLocalError(classified);
    });
    onError?.(classified);
  }, [writeError, onError]);

  useEffect(() => {
    if (!txError) return;
    const classified = classifyError(txError);
    startTransition(() => {
      setLocalError(classified);
    });
    onError?.(classified);
  }, [txError, onError]);

  const finalError: Error | null =
    (txError ? classifyError(txError) : null) ??
    (writeError ? classifyError(writeError) : null) ??
    localError;

  return {
    approve,
    approveMax,
    reset,

    isApproving:  isWritePending,
    isConfirming,
    isSuccess,
    isError:      !!finalError,
    hash,
    error:        finalError,
  };
}