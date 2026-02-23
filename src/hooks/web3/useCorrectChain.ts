import { useAccount, useSwitchChain, useReadContract } from 'wagmi';
import { DEFAULT_CHAIN } from '@/config/chains';
import { getContractAddresses } from '@/config/addresses';
import type { Address } from 'viem';

// DEFAULT_ADMIN_ROLE mantenido por compatibilidad con imports existentes
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

// Treasury (Vyper) usa admin simple, no AccessControl con hasRole
const TREASURY_ADMIN_ABI = [
  {
    name:            'admin',
    type:            'function',
    stateMutability: 'view',
    inputs:          [],
    outputs:         [{ name: '', type: 'address' }],
  },
] as const;

export function useOnChainAdminRole(address: Address | undefined) {
  const { chain } = useAccount();
  const chainId = chain?.id ?? DEFAULT_CHAIN.id;
  const addresses = getContractAddresses(chainId);
  const treasuryAddress = addresses?.treasury;

  const {
    data: adminAddress,
    isLoading,
    isError,
    refetch,
  } = useReadContract({
    address:      treasuryAddress,
    abi:          TREASURY_ADMIN_ABI,
    functionName: 'admin',
    query: {
      enabled:   !!treasuryAddress,
      staleTime: 10 * 60 * 1000,  // 10 minutos
      gcTime:    30 * 60 * 1000,  // 30 minutos en cache
      retry: 2,
    },
  });

  const isAdmin =
    !!address &&
    typeof adminAddress === 'string' &&
    adminAddress.toLowerCase() === address.toLowerCase();

  return {
    isAdmin,
    isLoading,
    isError,
    refetch,
    treasuryAddress,
    checkedAddress: address,
  };
}