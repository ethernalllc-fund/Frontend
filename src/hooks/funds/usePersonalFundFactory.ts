import { useReadContract, useConnection, useChainId } from 'wagmi';
import type { Address } from 'viem';
import { PersonalFundFactoryABI } from '@/contracts/abis';
import { getContractAddress } from '@/config';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface PersonalFundFactoryState {
  userFund:  `0x${string}` | undefined;
  hasFund:   boolean;
  isLoading: boolean;
  refetch:   () => void;
}

export function usePersonalFundFactory(address?: Address): PersonalFundFactoryState {
  const chainId                  = useChainId();
  const resolvedAddress          = address ?? getContractAddress(chainId, 'personalFundFactory');
  const { address: userAddress } = useConnection();

  const { data, isLoading, refetch } = useReadContract({
    address:      resolvedAddress,
    abi:          PersonalFundFactoryABI,
    functionName: 'getUserFund',
    args:         userAddress ? [userAddress] : undefined,
    query: {
      enabled:         Boolean(userAddress && resolvedAddress),
      refetchInterval: 30_000,
      staleTime:       20_000,
    },
  });

  const userFund = data as `0x${string}` | undefined;
  const hasFund  = !!userFund && userFund !== ZERO_ADDRESS;

  return {
    userFund:  hasFund ? userFund : undefined,
    hasFund,
    isLoading,
    refetch,
  };
}