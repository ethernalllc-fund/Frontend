/// <reference types="vite/client" />
import { useState, useEffect, useCallback, startTransition } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  usePublicClient,
} from 'wagmi';
import { erc20Abi, type Address, type PublicClient } from 'viem';
import { parseUSDC, useUSDCAddress } from './usdcUtils';

// ─── Gas ──────────────────────────────────────────────────────────────────────
// Lee getGasPrice() real de la red y lo clampea a un máximo por chain.
// Evita los valores absurdos que devuelven algunas RPCs de testnet.
const GAS_CAP_BY_CHAIN: Record<number, bigint> = {
  421614: 2_000_000_000n,   // Arbitrum Sepolia: máx 2 gwei
  42161:  10_000_000_000n,  // Arbitrum One:     máx 10 gwei
  137:    500_000_000_000n, // Polygon:          máx 500 gwei
  80002:  500_000_000_000n, // Polygon Amoy:     máx 500 gwei
  1:      300_000_000_000n, // Ethereum:         máx 300 gwei
  11155111: 50_000_000_000n,// Sepolia:          máx 50 gwei
};
const DEFAULT_GAS_CAP = 10_000_000_000n; // 10 gwei fallback

async function safeGasPrice(publicClient: PublicClient): Promise<bigint> {
  const chainId = publicClient.chain?.id ?? 421614;
  const cap = GAS_CAP_BY_CHAIN[chainId] ?? DEFAULT_GAS_CAP;
  try {
    const price = await publicClient.getGasPrice();
    return price > cap ? cap : price;
  } catch {
    return cap;
  }
}

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

async function simulateApprove(
  publicClient: PublicClient,
  usdcAddress: Address,
  spender: Address,
  amount: bigint,
  account: Address,
): Promise<void> {
  try {
    await publicClient.simulateContract({
      address:      usdcAddress,
      abi:          erc20Abi,
      functionName: 'approve',
      args:         [spender, amount],
      account,
    });
  } catch (err) {
    throw classifyError(err);
  }
}

export function useUSDCApproval({
  amount,
  spender,
  onSuccess,
  onError,
}: UseUSDCApprovalProps): UseUSDCApprovalReturn {
  const { address }  = useAccount();
  const usdcAddress  = useUSDCAddress();
  const publicClient = usePublicClient();
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

      // ── Gas: precio real de la red clampeado al máximo por chain ─────
      let gasOverrides: { gasPrice: bigint } | undefined;
      if (publicClient) {
        try {
          const gp = await safeGasPrice(publicClient);
          gasOverrides = { gasPrice: gp };
          if (import.meta.env.DEV) {
            console.log('[useUSDCApproval] gasPrice:', gp.toString(), 'wei');
          }
        } catch { /* usar defaults de wagmi */ }
      }

      if (import.meta.env.DEV) {
        console.log('[useUSDCApproval] Simulating approve...', {
          spender:     spender.slice(0, 10) + '...',
          from:        from.slice(0, 10) + '...',
          usdcAddress: usdcAddr.slice(0, 10) + '...',
          amountWei:   amountWei.toString(),
        });
      }

      if (publicClient) {
        await simulateApprove(publicClient, usdcAddr, spender, amountWei, from);
      }

      if (import.meta.env.DEV) {
        console.log('[useUSDCApproval] Simulation OK, sending to wallet...');
      }

      writeContract({
        address:      usdcAddr,
        abi:          erc20Abi,
        functionName: 'approve',
        args:         [spender, amountWei],
        ...gasOverrides,
      });
    },
    [validateCommon, address, usdcAddress, spender, publicClient, writeContract, onError],
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