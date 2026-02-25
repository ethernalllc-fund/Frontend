import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { parseUnits } from 'viem';

vi.mock('wagmi', () => ({
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
}));

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useCreatePersonalFund } from '@/hooks/useCreatePersonalFund';

const mockParams = {
  principal:        parseUnits('1000', 6),
  monthlyDeposit:   parseUnits('100', 6),
  currentAge:       30n,
  retirementAge:    65n,
  desiredMonthly:   parseUnits('2000', 6),
  yearsPayments:    20n,
  interestRate:     500n,
  timelockYears:    10n,
  selectedProtocol: '0xProtocolAddress' as `0x${string}`,
};

describe('useCreatePersonalFund', () => {
  it('llama a writeContract con los args correctos', () => {
    const mockWriteContract = vi.fn();

    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
      error: null,
      reset: vi.fn(),
    } as any);

    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: false,
      data: undefined,
    } as any);

    const { result } = renderHook(() => useCreatePersonalFund());

    act(() => {
      result.current.createFund(mockParams);
    });

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'createPersonalFund',
        args: [
          mockParams.principal,
          mockParams.monthlyDeposit,
          mockParams.currentAge,
          mockParams.retirementAge,
          mockParams.desiredMonthly,
          mockParams.yearsPayments,
          mockParams.interestRate,
          mockParams.timelockYears,
          mockParams.selectedProtocol,
        ],
      })
    );
  });

  it('expone isPending cuando la tx está pendiente', () => {
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: vi.fn(),
      data: undefined,
      isPending: true, // ← simulamos estado pendiente
      error: null,
      reset: vi.fn(),
    } as any);

    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: false,
      data: undefined,
    } as any);

    const { result } = renderHook(() => useCreatePersonalFund());
    expect(result.current.isPending).toBe(true);
  });

  it('expone isSuccess cuando la tx se confirma', () => {
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: vi.fn(),
      data: '0xTxHash' as `0x${string}`,
      isPending: false,
      error: null,
      reset: vi.fn(),
    } as any);

    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: true, // ← tx confirmada
      data: { transactionHash: '0xTxHash' },
    } as any);

    const { result } = renderHook(() => useCreatePersonalFund());
    expect(result.current.isSuccess).toBe(true);
  });
});