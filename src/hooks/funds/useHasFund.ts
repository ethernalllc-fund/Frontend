import { useReadContract, useConnection, useChainId } from 'wagmi';
import { PersonalFundFactoryABI } from '@/contracts/abis';
import { getContractAddress } from '@/config';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface UseHasFundResult {
  hasFund:     boolean;
  fundAddress: `0x${string}` | undefined;
  isLoading:   boolean;
  isError:     boolean;
  refetch:     () => void;
}

export function useHasFund(): UseHasFundResult {
  const { address } = useConnection();
  const chainId     = useChainId();
  const factoryAddress = getContractAddress(chainId, 'personalFundFactory');

  const { data, isLoading, isError, refetch } = useReadContract({
    address:      factoryAddress,
    abi:          PersonalFundFactoryABI,
    functionName: 'getUserFund',
    args:         address ? [address] : undefined,
    query: {
      enabled:         Boolean(address && factoryAddress),
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