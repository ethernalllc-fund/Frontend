import { useReadContract } from 'wagmi';
import type { Address } from 'viem';
import { PROTOCOL_REGISTRY_ABI } from '@/contracts/abis';
import { PROTOCOL_REGISTRY_ADDRESS } from '@/contracts/addresses';

export interface ProtocolInfo {
  protocolAddress: `0x${string}`;
  riskLevel:       number;
  isActive:        boolean;
  isVerified:      boolean;
  apy:             bigint;
}

export interface ProtocolRegistryState {
  activeProtocols:     ProtocolInfo[];
  protocolCount:       bigint | undefined;
  activeProtocolCount: bigint | undefined;
  isLoading:           boolean;
  refetch:             () => void;
}

export function useProtocolRegistry(address?: Address): ProtocolRegistryState {
  const resolvedAddress = address ?? PROTOCOL_REGISTRY_ADDRESS;
  const base = { address: resolvedAddress, abi: PROTOCOL_REGISTRY_ABI } as const;

  const { data: active, isLoading: l1, refetch } = useReadContract({
    ...base,
    functionName: 'getActiveProtocols',
    query: { enabled: Boolean(resolvedAddress), refetchInterval: 60_000, staleTime: 30_000 },
  });

  const { data: protocolCount, isLoading: l2 } = useReadContract({
    ...base,
    functionName: 'getProtocolCount',
    query: { enabled: Boolean(resolvedAddress), staleTime: 30_000 },
  });

  const { data: activeCount, isLoading: l3 } = useReadContract({
    ...base,
    functionName: 'activeProtocolCount',
    query: { enabled: Boolean(resolvedAddress), staleTime: 30_000 },
  });

  return {
    activeProtocols:     (active as ProtocolInfo[] | undefined) ?? [],
    protocolCount:       protocolCount as bigint | undefined,
    activeProtocolCount: activeCount,
    isLoading:           l1 || l2 || l3,
    refetch,
  };
}