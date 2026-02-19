import { useAccount, useSwitchChain, useReadContract } from 'wagmi';
import { DEFAULT_CHAIN } from '@/config/chains';
import { getContractAddresses } from '@/config/addresses';
import type { Address } from 'viem';

const ACCESS_CONTROL_ABI = [
  {
    name: 'hasRole',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const DEFAULT_ADMIN_ROLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

export function useCorrectChain() {
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const isCorrectChain = chain?.id === DEFAULT_CHAIN.id;
  const switchToCorrectChain = () => {
    if (!isCorrectChain) {
      switchChain({ chainId: DEFAULT_CHAIN.id });
    }
  };

  return {
    isCorrectChain,
    currentChain: chain,
    switchToCorrectChain,
    expectedChain: DEFAULT_CHAIN,
  };
}

export function useOnChainAdminRole(address: Address | undefined) {
  const { chain } = useAccount();
  const chainId = chain?.id ?? DEFAULT_CHAIN.id;
  const addresses = getContractAddresses(chainId);
  const treasuryAddress = addresses?.treasury as Address | undefined;

  const {
    data: isAdmin,
    isLoading,
    isError,
    refetch,
  } = useReadContract({
    address: treasuryAddress,
    abi: ACCESS_CONTROL_ABI,
    functionName: 'hasRole',
    args: address && treasuryAddress
      ? [DEFAULT_ADMIN_ROLE, address]
      : undefined,
    query: {
      enabled: !!address && !!treasuryAddress,
      staleTime: 10 * 60 * 1000,   // 10 minutos
      gcTime:    30 * 60 * 1000,   // 30 minutos en cache
      retry: 2,
    },
  });

  return {
    isAdmin:   !!isAdmin,
    isLoading,
    isError,
    refetch,
    treasuryAddress,
    checkedAddress: address,
  };
}