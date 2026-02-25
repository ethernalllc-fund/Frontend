import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('wagmi', () => ({
  useWriteContract:             vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
  useAccount:                   vi.fn(),
}));

import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi';
import { useCreateContract } from './useCreateContract';

const FACTORY_ADDRESS = '0x1234567890123456789012345678901234567890' as `0x${string}`;
const MONTHLY_AMOUNT  = 100_000_000n;
const RETIREMENT_AGE  = 65;

function setupMocks(overrides: {
  writeContract?:  ReturnType<typeof vi.fn>;
  isPending?:      boolean;
  hash?:           `0x${string}` | undefined;
  writeError?:     Error | null;
  isConfirming?:   boolean;
  isSuccess?:      boolean;
  txError?:        Error | null;
  userAddress?:    `0x${string}` | undefined;
} = {}) {
  const writeContract = overrides.writeContract ?? vi.fn();

  vi.mocked(useAccount).mockReturnValue({
    address: overrides.userAddress ?? '0xUserAddress' as `0x${string}`,
  } as any);

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

describe('useCreateContract', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── Validaciones de inputs ───────────────────────────────────────────────────

  describe('validateInputs', () => {
    it('rechaza zero address como factory', async () => {
      setupMocks();
      const { result } = renderHook(() => useCreateContract());

      await expect(
        result.current.createContract(
          '0x0000000000000000000000000000000000000000',
          MONTHLY_AMOUNT, RETIREMENT_AGE,
        ),
      ).rejects.toThrow('Cannot use zero address as factory');
    });

    it('rechaza monthlyAmount igual a 0', async () => {
      setupMocks();
      const { result } = renderHook(() => useCreateContract());

      await expect(
        result.current.createContract(FACTORY_ADDRESS, 0n, RETIREMENT_AGE),
      ).rejects.toThrow('Monthly amount must be greater than 0');
    });

    it('rechaza edad de retiro menor a 18', async () => {
      setupMocks();
      const { result } = renderHook(() => useCreateContract());

      await expect(
        result.current.createContract(FACTORY_ADDRESS, MONTHLY_AMOUNT, 17),
      ).rejects.toThrow(/Retirement age must be between/);
    });

    it('rechaza edad de retiro mayor a 120', async () => {
      setupMocks();
      const { result } = renderHook(() => useCreateContract());

      await expect(
        result.current.createContract(FACTORY_ADDRESS, MONTHLY_AMOUNT, 121),
      ).rejects.toThrow(/Retirement age must be between/);
    });

    it('rechaza edad de retiro con decimales', async () => {
      setupMocks();
      const { result } = renderHook(() => useCreateContract());

      await expect(
        result.current.createContract(FACTORY_ADDRESS, MONTHLY_AMOUNT, 65.5),
      ).rejects.toThrow('Retirement age must be a whole number');
    });
  });

  // ─── Wallet no conectada ──────────────────────────────────────────────────────
  // Configuramos userAddress: undefined ANTES del renderHook para que el
  // useCallback capture el valor correcto en su closure inicial.

  it('establece error si la wallet no está conectada', async () => {
    vi.mocked(useAccount).mockReturnValue({ address: undefined } as any);
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: vi.fn(), data: undefined, isPending: false, error: null, reset: vi.fn(),
    } as any);
    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false, isSuccess: false, error: null,
    } as any);

    const onError = vi.fn();
    const { result } = renderHook(() => useCreateContract({ onError }));

    await act(async () => {
      await result.current.createContract(
        FACTORY_ADDRESS, MONTHLY_AMOUNT, RETIREMENT_AGE,
      ).catch(() => {});
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('Please connect your wallet first');
  });

  // ─── Hook deshabilitado ───────────────────────────────────────────────────────

  it('no ejecuta nada si enabled=false', async () => {
    const { writeContract } = setupMocks();
    const { result } = renderHook(() => useCreateContract({ enabled: false }));

    await result.current.createContract(FACTORY_ADDRESS, MONTHLY_AMOUNT, RETIREMENT_AGE);
    expect(writeContract).not.toHaveBeenCalled();
  });

  // ─── Happy path ───────────────────────────────────────────────────────────────

  it('llama a writeContract con los args correctos', async () => {
    const { writeContract } = setupMocks();
    const { result } = renderHook(() => useCreateContract());

    await act(async () => {
      await result.current.createContract(FACTORY_ADDRESS, MONTHLY_AMOUNT, RETIREMENT_AGE);
    });

    expect(writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address:      FACTORY_ADDRESS,
        functionName: 'createPersonalFund',
        args: expect.arrayContaining([MONTHLY_AMOUNT, BigInt(RETIREMENT_AGE)]),
      }),
    );
  });

  it('llama a onSuccess cuando la tx se confirma', () => {
    const TX_HASH  = '0xDeadBeef' as `0x${string}`;
    const onSuccess = vi.fn();

    setupMocks({ hash: TX_HASH, isSuccess: true });
    renderHook(() => useCreateContract({ onSuccess }));

    expect(onSuccess).toHaveBeenCalledWith(TX_HASH, TX_HASH);
  });

  // ─── Estados ─────────────────────────────────────────────────────────────────

  it('expone isPending correctamente', () => {
    setupMocks({ isPending: true });
    const { result } = renderHook(() => useCreateContract());
    expect(result.current.isPending).toBe(true);
  });

  it('expone isConfirming correctamente', () => {
    setupMocks({ isConfirming: true });
    const { result } = renderHook(() => useCreateContract());
    expect(result.current.isConfirming).toBe(true);
  });

  it('expone isError cuando hay writeError', () => {
    setupMocks({ writeError: new Error('write failed') });
    const { result } = renderHook(() => useCreateContract());
    expect(result.current.isError).toBe(true);
  });

  // ─── parseContractError ───────────────────────────────────────────────────────

  it('clasifica "insufficient funds" correctamente', () => {
    setupMocks({ writeError: new Error('insufficient funds for gas') });
    const { result } = renderHook(() => useCreateContract());
    expect(result.current.error?.message).toContain('Insufficient ETH');
  });

  it('clasifica "User rejected" correctamente', () => {
    setupMocks({ writeError: new Error('User rejected the request') });
    const { result } = renderHook(() => useCreateContract());
    expect(result.current.error?.message).toBe('Transaction rejected by user');
  });

  // ─── Reset ────────────────────────────────────────────────────────────────────

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
        return useCreateContract();
      },
      { initialProps: { err: new Error('write failed') as Error | null } },
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    rerender({ err: null });
    act(() => { result.current.reset(); });

    expect(result.current.error).toBeNull();
  });
});