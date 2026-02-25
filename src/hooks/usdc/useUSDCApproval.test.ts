import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('wagmi', () => ({
  useWriteContract:             vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
  useAccount:                   vi.fn(),
  usePublicClient:              vi.fn(),
}));

vi.mock('@/hooks/usdc/usdcUtils', () => ({
  parseUSDC:      (amount: string) => BigInt(Math.round(parseFloat(amount) * 1_000_000)),
  useUSDCAddress: vi.fn(),
}));

import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  usePublicClient,
} from 'wagmi';
import { useUSDCAddress } from '@/hooks/usdc/usdcUtils';
import { useUSDCApproval } from '@/hooks/usdc/useUSDCApproval';

const SPENDER      = '0xSpenderAddress000000000000000000000000000' as `0x${string}`;
const USDC_ADDRESS = '0xUSDCAddress0000000000000000000000000000000' as `0x${string}`;
const USER_ADDRESS = '0xUserAddress0000000000000000000000000000000' as `0x${string}`;

function setupMocks(overrides: {
  writeContract?:  ReturnType<typeof vi.fn>;
  isPending?:      boolean;
  hash?:           `0x${string}` | undefined;
  writeError?:     Error | null;
  isConfirming?:   boolean;
  isSuccess?:      boolean;
  txError?:        Error | null;
  userAddress?:    `0x${string}` | undefined;
  usdcAddress?:    `0x${string}` | undefined;
  publicClient?:   object | null;
} = {}) {
  const writeContract = overrides.writeContract ?? vi.fn();

  vi.mocked(useAccount).mockReturnValue({
    address: 'userAddress' in overrides ? overrides.userAddress : USER_ADDRESS,
  } as any);

  vi.mocked(useUSDCAddress).mockReturnValue(
    'usdcAddress' in overrides ? (overrides.usdcAddress as any) : USDC_ADDRESS,
  );

  vi.mocked(usePublicClient).mockReturnValue(
    (overrides.publicClient === undefined
      ? { simulateContract: vi.fn().mockResolvedValue({}) }
      : overrides.publicClient) as any,
  );

  vi.mocked(useWriteContract).mockReturnValue({
    writeContract,
    data:      overrides.hash       ?? undefined,
    isPending: overrides.isPending  ?? false,
    error:     overrides.writeError ?? null,
    reset:     vi.fn(),
  } as any);

  vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
    isLoading: overrides.isConfirming ?? false,
    isSuccess: overrides.isSuccess    ?? false,
    error:     overrides.txError      ?? null,
  } as any);

  return { writeContract };
}

const defaultProps = { amount: '100', spender: SPENDER };

describe('useUSDCApproval', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('validaciones previas al approve', () => {
    
    it('establece error si la wallet no está conectada', async () => {
      setupMocks({ userAddress: undefined });
      const { result } = renderHook(() => useUSDCApproval(defaultProps));

      let caught: Error | undefined;
      await act(async () => {
        await result.current.approve().catch((e: Error) => { caught = e; });
      });

      expect(caught?.message).toBe('Wallet not connected.');
      expect(result.current.isError).toBe(true);
    });

    it('establece error si no hay dirección USDC para la red', async () => {
      setupMocks({ usdcAddress: undefined });
      const { result } = renderHook(() => useUSDCApproval(defaultProps));

      let caught: Error | undefined;
      await act(async () => {
        await result.current.approve().catch((e: Error) => { caught = e; });
      });

      expect(caught?.message).toBe('USDC contract not found for this network.');
      expect(result.current.isError).toBe(true);
    });

    it('lanza error si el spender es zero address', async () => {
      setupMocks();
      const { result } = renderHook(() =>
        useUSDCApproval({
          amount:  '100',
          spender: '0x0000000000000000000000000000000000000000',
        }),
      );
      await expect(result.current.approve()).rejects.toThrow('Invalid spender address.');
    });

    it('lanza error si el amount es 0', async () => {
      setupMocks();
      const { result } = renderHook(() =>
        useUSDCApproval({ amount: '0', spender: SPENDER }),
      );
      await expect(result.current.approve()).rejects.toThrow('Amount must be greater than 0.');
    });

    it('lanza error si el amount es negativo', async () => {
      setupMocks();
      const { result } = renderHook(() =>
        useUSDCApproval({ amount: '-50', spender: SPENDER }),
      );
      await expect(result.current.approve()).rejects.toThrow('Amount must be greater than 0.');
    });
  });

  it('llama a writeContract con el amount correcto en wei', async () => {
    const { writeContract } = setupMocks();
    const { result } = renderHook(() => useUSDCApproval(defaultProps));

    await act(async () => { await result.current.approve(); });

    expect(writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address:      USDC_ADDRESS,
        functionName: 'approve',
        args:         [SPENDER, 100_000_000n],
      }),
    );
  });

  it('approveMax llama con MAX_UINT256', async () => {
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    const { writeContract } = setupMocks();
    const { result } = renderHook(() => useUSDCApproval(defaultProps));

    await act(async () => { await result.current.approveMax(); });

    expect(writeContract).toHaveBeenCalledWith(
      expect.objectContaining({ args: [SPENDER, MAX_UINT256] }),
    );
  });

  it('llama a onSuccess cuando la tx se confirma', () => {
    const TX_HASH  = '0xApprovalHash' as `0x${string}`;
    const onSuccess = vi.fn();

    setupMocks({ hash: TX_HASH, isSuccess: true });
    renderHook(() => useUSDCApproval({ ...defaultProps, onSuccess }));

    expect(onSuccess).toHaveBeenCalledWith(TX_HASH);
  });

  it('si la simulación falla, no llama a writeContract', async () => {
    const { writeContract } = setupMocks({
      publicClient: {
        simulateContract: vi.fn().mockRejectedValue(new Error('execution reverted')),
      },
    });

    const { result } = renderHook(() => useUSDCApproval(defaultProps));
    await expect(result.current.approve()).rejects.toThrow();
    expect(writeContract).not.toHaveBeenCalled();
  });

  it('si no hay publicClient, omite la simulación y ejecuta igual', async () => {
    const { writeContract } = setupMocks({ publicClient: null });
    const { result } = renderHook(() => useUSDCApproval(defaultProps));

    await act(async () => { await result.current.approve(); });
    expect(writeContract).toHaveBeenCalled();
  });

  it('clasifica "User rejected" correctamente', () => {
    setupMocks({ writeError: new Error('User rejected the request') });
    const { result } = renderHook(() => useUSDCApproval(defaultProps));
    expect(result.current.error?.message).toBe('Transaction cancelled by user.');
  });

  it('clasifica "insufficient funds" correctamente', () => {
    setupMocks({ writeError: new Error('insufficient funds for gas') });
    const { result } = renderHook(() => useUSDCApproval(defaultProps));
    expect(result.current.error?.message).toContain('Insufficient ETH');
  });

  it('clasifica "Internal JSON-RPC error" correctamente', () => {
    setupMocks({ writeError: new Error('Internal JSON-RPC error') });
    const { result } = renderHook(() => useUSDCApproval(defaultProps));
    expect(result.current.error?.message).toContain('RPC error');
  });

  it('expone isApproving cuando la tx está pendiente', () => {
    setupMocks({ isPending: true });
    const { result } = renderHook(() => useUSDCApproval(defaultProps));
    expect(result.current.isApproving).toBe(true);
  });

  it('expone isConfirming cuando está esperando el bloque', () => {
    setupMocks({ isConfirming: true });
    const { result } = renderHook(() => useUSDCApproval(defaultProps));
    expect(result.current.isConfirming).toBe(true);
  });

  it('expone isError cuando hay un error', () => {
    setupMocks({ writeError: new Error('algo salió mal') });
    const { result } = renderHook(() => useUSDCApproval(defaultProps));
    expect(result.current.isError).toBe(true);
  });

  it('reset limpia el error', async () => {
    const { result, rerender } = renderHook(
      ({ err }) => {
        vi.mocked(useWriteContract).mockReturnValue({
          writeContract: vi.fn(),
          data:      undefined,
          isPending: false,
          error:     err,
          reset:     vi.fn(),
        } as any);
        vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
          isLoading: false, isSuccess: false, error: null,
        } as any);
        return useUSDCApproval(defaultProps);
      },
      { initialProps: { err: new Error('write failed') as Error | null } },
    );

    expect(result.current.isError).toBe(true);
    rerender({ err: null });
    act(() => { result.current.reset(); });

    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
  });
});