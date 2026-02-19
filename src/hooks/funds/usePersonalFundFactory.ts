import { useReadContract, useAccount } from 'wagmi';
import type { Address } from 'viem';
import { PERSONAL_FUND_FACTORY_ABI } from '@/contracts/abis';
import { PERSONAL_FUND_FACTORY_ADDRESS } from '@/contracts/addresses';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface PersonalFundFactoryState {
  userFund:  `0x${string}` | undefined;
  hasFund:   boolean;
  isLoading: boolean;
  refetch:   () => void;
}

export function usePersonalFundFactory(address?: Address): PersonalFundFactoryState {
  const resolvedAddress          = address ?? PERSONAL_FUND_FACTORY_ADDRESS;
  const { address: userAddress } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address:      resolvedAddress,
    abi:          PERSONAL_FUND_FACTORY_ABI,
    functionName: 'getUserFund',
    args:         userAddress ? [userAddress] : undefined,
    query: {
      enabled:         Boolean(userAddress && resolvedAddress),
      refetchInterval: 30_000,
      staleTime:       20_000,
    },
  });

  const userFund = data;
  const hasFund  = !!userFund && userFund !== ZERO_ADDRESS;

  return {
    userFund:  hasFund ? userFund : undefined,
    hasFund,
    isLoading,
    refetch,
  };
}