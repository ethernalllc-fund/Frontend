import { useReadContract } from 'wagmi';
import type { Address } from 'viem';
import { TREASURY_ABI } from '@/contracts/abis';
import { TREASURY_ADDRESS } from '@/contracts/addresses';

export interface TreasuryState {
  totalDeposited: bigint | undefined;
  fundCount:      bigint | undefined;
  balance:        bigint | undefined;
  isLoading:      boolean;
  refetch:        () => void;
}

export function useTreasury(address?: Address): TreasuryState {
  const resolvedAddress = address ?? TREASURY_ADDRESS;

  const { data: stats, isLoading: l1, refetch } = useReadContract({
    address:      resolvedAddress,
    abi:          TREASURY_ABI,
    functionName: 'getTreasuryStats',
    query: {
      enabled:         Boolean(resolvedAddress),
      refetchInterval: 30_000,
      staleTime:       15_000,
    },
  });

  const { data: balance, isLoading: l2 } = useReadContract({
    address:      resolvedAddress,
    abi:          TREASURY_ABI,
    functionName: 'getTreasuryBalance',
    query: {
      enabled:         Boolean(resolvedAddress),
      refetchInterval: 30_000,
      staleTime:       15_000,
    },
  });

  const { data: fundCount, isLoading: l3 } = useReadContract({
    address:      resolvedAddress,
    abi:          TREASURY_ABI,
    functionName: 'getFundCount',
    query: {
      enabled:         Boolean(resolvedAddress),
      refetchInterval: 30_000,
      staleTime:       15_000,
    },
  });

  const s = stats as { totalDeposited?: bigint } | undefined;

  return {
    totalDeposited: s?.totalDeposited,
    fundCount:      fundCount as bigint | undefined,
    balance:        balance   as bigint | undefined,
    isLoading:      l1 || l2 || l3,
    refetch,
  };
}