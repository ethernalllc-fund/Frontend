import { useReadContract } from 'wagmi';
import type { Address } from 'viem';
import { GOVERNANCE_ABI } from '@/contracts/abis';
import { GOVERNANCE_ADDRESS } from '@/contracts/addresses';

export interface GovernanceState {
  admin:     string | undefined;
  isLoading: boolean;
  refetch:   () => void;
}

export function useGovernance(address?: Address): GovernanceState {
  const resolvedAddress = address ?? GOVERNANCE_ADDRESS;

  const { data: admin, isLoading, refetch } = useReadContract({
    address:      resolvedAddress,
    abi:          GOVERNANCE_ABI,
    functionName: 'admin',
    query: {
      enabled:   Boolean(resolvedAddress),
      staleTime: 60_000,
    },
  });

  return {
    admin:     admin as string | undefined,
    isLoading,
    refetch,
  };
}