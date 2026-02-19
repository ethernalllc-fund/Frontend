import { useReadContract, useAccount } from 'wagmi';
import { PERSONAL_FUND_FACTORY_ABI } from '@/contracts/abis';
import { PERSONAL_FUND_FACTORY_ADDRESS } from '@/contracts/addresses';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface UseHasFundResult {
  hasFund:     boolean;
  fundAddress: `0x${string}` | undefined;
  isLoading:   boolean;
  isError:     boolean;
  refetch:     () => void;
}

export function useHasFund(): UseHasFundResult {
  const { address } = useAccount();

  const { data, isLoading, isError, refetch } = useReadContract({
    address:      PERSONAL_FUND_FACTORY_ADDRESS,
    abi:          PERSONAL_FUND_FACTORY_ABI,
    functionName: 'getUserFund',
    args:         address ? [address] : undefined,
    query: {
      enabled:         Boolean(address),
      refetchInterval: 30_000,
      staleTime:       20_000,
    },
  });

  const fundAddress = data as `0x${string}` | undefined;
  const hasFund     = !!fundAddress && fundAddress !== ZERO_ADDRESS;

  return {
    hasFund,
    fundAddress: hasFund ? fundAddress : undefined,
    isLoading,
    isError,
    refetch,
  };
}