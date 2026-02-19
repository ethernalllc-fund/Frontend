import { useReadContract, useAccount } from 'wagmi';
import type { Address } from 'viem';
import { USER_PREFERENCES_ABI } from '@/contracts/abis';
import { USER_PREFERENCES_ADDRESS } from '@/contracts/addresses';

export interface UserConfig {
  selectedProtocol: `0x${string}`;
  autoCompound:     boolean;
  riskTolerance:    number;
  lastUpdate:       bigint;
  totalDeposited:   bigint;
  totalWithdrawn:   bigint;
}

export interface RoutingStrategy {
  strategyType:           number;
  diversificationPercent: bigint;
  rebalanceThreshold:     bigint;
}

export interface UserPreferencesState {
  userConfig:      UserConfig | undefined;
  routingStrategy: RoutingStrategy | undefined;
  isLoading:       boolean;
  refetch:         () => void;
}

export function useUserPreferences(address?: Address): UserPreferencesState {
  const resolvedAddress          = address ?? USER_PREFERENCES_ADDRESS;
  const { address: userAddress } = useAccount();
  const base = { address: resolvedAddress, abi: USER_PREFERENCES_ABI } as const;

  const { data: config, isLoading: l1, refetch } = useReadContract({
    ...base,
    functionName: 'getUserConfig',
    args:         userAddress ? [userAddress] : undefined,
    query: {
      enabled:   Boolean(userAddress && resolvedAddress),
      staleTime: 30_000,
    },
  });

  const { data: strategy, isLoading: l2 } = useReadContract({
    ...base,
    functionName: 'getUserStrategy',
    args:         userAddress ? [userAddress] : undefined,
    query: {
      enabled:   Boolean(userAddress && resolvedAddress),
      staleTime: 30_000,
    },
  });

  return {
    userConfig:      config   as UserConfig | undefined,
    routingStrategy: strategy as RoutingStrategy | undefined,
    isLoading:       l1 || l2,
    refetch,
  };
}