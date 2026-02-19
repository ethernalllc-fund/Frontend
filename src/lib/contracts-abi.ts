import { useReadContract, useAccount } from 'wagmi';
import { erc20Abi, type Address } from 'viem';
import { useUSDCAddress, USDC_DECIMALS, formatUSDC, parseUSDC } from '@/hooks/usdc/usdcUtils';

export {
  DATETIME_ABI,
  TREASURY_ABI,
  PROTOCOL_REGISTRY_ABI,
  TOKEN_ABI,
  GOVERNANCE_ABI,
  USER_PREFERENCES_ABI,
  PERSONAL_FUND_ABI,
  PERSONAL_FUND_FACTORY_ABI,
} from '@/contracts/abis';

export const RISK_LEVELS = {
  LOW:    0,
  MEDIUM: 1,
  HIGH:   2,
} as const;

export type RiskLevel = typeof RISK_LEVELS[keyof typeof RISK_LEVELS];
export const RISK_LABELS: Record<RiskLevel, string> = {
  [RISK_LEVELS.LOW]:    'Bajo',
  [RISK_LEVELS.MEDIUM]: 'Medio',
  [RISK_LEVELS.HIGH]:   'Alto',
};

export const STRATEGY_TYPES = {
  MANUAL:           0,
  AUTO_BEST_APY:    1,
  AUTO_LOWEST_RISK: 2,
  DIVERSIFIED:      3,
} as const;

export type StrategyType = typeof STRATEGY_TYPES[keyof typeof STRATEGY_TYPES];
export const STRATEGY_LABELS: Record<StrategyType, string> = {
  [STRATEGY_TYPES.MANUAL]:           'Manual',
  [STRATEGY_TYPES.AUTO_BEST_APY]:    'Mejor APY automático',
  [STRATEGY_TYPES.AUTO_LOWEST_RISK]: 'Menor riesgo automático',
  [STRATEGY_TYPES.DIVERSIFIED]:      'Diversificado',
};

export interface UserConfig {
  selectedProtocol: Address;
  autoCompound:     boolean;
  riskTolerance:    RiskLevel;
  lastUpdate:       bigint;
  totalDeposited:   bigint;
  totalWithdrawn:   bigint;
}

export interface RoutingStrategy {
  strategyType:           StrategyType;
  diversificationPercent: bigint;
  rebalanceThreshold:     bigint;
}

export interface ProtocolComparison {
  protocolAddress: Address;
  apy:             bigint;
  riskLevel:       RiskLevel;
  score:           bigint;
}

export interface ProtocolStats {
  protocolAddress: Address;
  name:            string;
  apy:             bigint;
  isActive:        boolean;
  totalDeposited:  bigint;
  riskLevel:       RiskLevel;
  addedTimestamp:  bigint;
  lastUpdated:     bigint;
  verified:        boolean;
}

export interface ReadContractResult<T> {
  data:       T | undefined;
  isLoading:  boolean;
  isFetching: boolean;
  isError:    boolean;
  error:      Error | null;
  refetch:    () => void;
}

export function useUSDC() {
  const address = useUSDCAddress();

  return {
    address,
    decimals:    USDC_DECIMALS,
    isAvailable: !!address,
    formatUSDC,
    parseUSDC,
    isApproving: false as boolean,
  };
}

export function useUSDCBalance(
  address?: Address,
  refetchInterval = 15_000,
): ReadContractResult<bigint> {
  const usdcAddress = useUSDCAddress();
  const { address: connectedAddress } = useAccount();
  const target = address ?? connectedAddress;

  const result = useReadContract({
    address:      usdcAddress,
    abi:          erc20Abi,
    functionName: 'balanceOf',
    args:         target ? [target] : undefined,
    query: {
      enabled:         Boolean(target && usdcAddress),
      refetchInterval: refetchInterval > 0 ? refetchInterval : false,
      staleTime:       10_000,
    },
  });

  return {
    data:       result.data,
    isLoading:  result.isLoading,
    isFetching: result.isFetching,
    isError:    result.isError,
    error:      result.error as Error | null,
    refetch:    () => { void result.refetch(); },
  };
}

export function useUSDCAllowance(
  owner?: Address,
  spender?: Address,
): ReadContractResult<bigint> {
  const usdcAddress = useUSDCAddress();
  const result = useReadContract({
    address:      usdcAddress,
    abi:          erc20Abi,
    functionName: 'allowance',
    args:         owner && spender ? [owner, spender] : undefined,
    query: {
      enabled:   Boolean(owner && spender && usdcAddress),
      staleTime: 10_000,
    },
  });

  return {
    data:       result.data,
    isLoading:  result.isLoading,
    isFetching: result.isFetching,
    isError:    result.isError,
    error:      result.error as Error | null,
    refetch:    () => { void result.refetch(); },
  };
}

export function useUSDCSymbol(): ReadContractResult<string> {
  const usdcAddress = useUSDCAddress();
  const result = useReadContract({
    address:      usdcAddress,
    abi:          erc20Abi,
    functionName: 'symbol',
    query: {
      enabled:   Boolean(usdcAddress),
      staleTime: 1_000 * 60 * 60,
    },
  });

  return {
    data:       result.data,
    isLoading:  result.isLoading,
    isFetching: result.isFetching,
    isError:    result.isError,
    error:      result.error as Error | null,
    refetch:    () => { void result.refetch(); },
  };
}

export function useUSDCName(): ReadContractResult<string> {
  const usdcAddress = useUSDCAddress();
  const result = useReadContract({
    address:      usdcAddress,
    abi:          erc20Abi,
    functionName: 'name',
    query: {
      enabled:   Boolean(usdcAddress),
      staleTime: 1_000 * 60 * 60,
    },
  });

  return {
    data:       result.data,
    isLoading:  result.isLoading,
    isFetching: result.isFetching,
    isError:    result.isError,
    error:      result.error as Error | null,
    refetch:    () => { void result.refetch(); },
  };
}

export function useUSDCDecimals(): ReadContractResult<number> {
  const usdcAddress = useUSDCAddress();
  const result = useReadContract({
    address:      usdcAddress,
    abi:          erc20Abi,
    functionName: 'decimals',
    query: {
      enabled:   Boolean(usdcAddress),
      staleTime: 1_000 * 60 * 60,
    },
  });

  return {
    data:       result.data,
    isLoading:  result.isLoading,
    isFetching: result.isFetching,
    isError:    result.isError,
    error:      result.error as Error | null,
    refetch:    () => { void result.refetch(); },
  };
}

export function useUSDCTotalSupply(): ReadContractResult<bigint> {
  const usdcAddress = useUSDCAddress();
  const result = useReadContract({
    address:      usdcAddress,
    abi:          erc20Abi,
    functionName: 'totalSupply',
    query: {
      enabled:         Boolean(usdcAddress),
      refetchInterval: 60_000,
    },
  });

  return {
    data:       result.data,
    isLoading:  result.isLoading,
    isFetching: result.isFetching,
    isError:    result.isError,
    error:      result.error as Error | null,
    refetch:    () => { void result.refetch(); },
  };
}

export function useUSDCInfo() {
  const address               = useUSDCAddress();
  const { data: symbol }      = useUSDCSymbol();
  const { data: name }        = useUSDCName();
  const { data: decimals }    = useUSDCDecimals();
  const { data: totalSupply } = useUSDCTotalSupply();

  return {
    address,
    symbol,
    name,
    decimals,
    totalSupply,
    isAvailable: Boolean(address),
  };
}