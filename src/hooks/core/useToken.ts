import { useReadContract, useAccount } from 'wagmi';
import type { Address } from 'viem';
import { TOKEN_ABI } from '@/contracts/abis';
import { TOKEN_ADDRESS } from '@/contracts/addresses';

export function useToken(address?: Address) {
  const resolvedAddress          = address ?? TOKEN_ADDRESS;
  const { address: userAddress } = useAccount();

  const { data: balance, isLoading: loadingBalance, refetch: refetchBalance } = useReadContract({
    address:      resolvedAddress,
    abi:          TOKEN_ABI,
    functionName: 'balanceOf',
    args:         userAddress ? [userAddress] : undefined,
    query: {
      enabled:         Boolean(userAddress && resolvedAddress),
      refetchInterval: 30_000,
      staleTime:       15_000,
    },
  });

  const { data: totalSupply, isLoading: loadingSupply } = useReadContract({
    address:      resolvedAddress,
    abi:          TOKEN_ABI,
    functionName: 'totalSupply',
    query: {
      enabled:   Boolean(resolvedAddress),
      staleTime: 60_000,
    },
  });

  const { data: canVote, isLoading: loadingVote } = useReadContract({
    address:      resolvedAddress,
    abi:          TOKEN_ABI,
    functionName: 'canVote',
    args:         userAddress ? [userAddress] : undefined,
    query: {
      enabled:   Boolean(userAddress && resolvedAddress),
      staleTime: 15_000,
    },
  });

  return {
    address:     resolvedAddress,
    balance:     balance     as bigint | undefined,
    totalSupply: totalSupply as bigint | undefined,
    canVote:     canVote     as boolean | undefined,
    isLoading:   loadingBalance || loadingSupply || loadingVote,
    refetch:     refetchBalance,
  };
}