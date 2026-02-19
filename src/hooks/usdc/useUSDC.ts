import { useReadContract, useAccount } from 'wagmi';
import { erc20Abi, type Address } from 'viem';
import { useUSDCAddress, USDC_DECIMALS, formatUSDC, parseUSDC } from './usdcUtils';

export interface ReadContractResult<T> {
  data:       T | undefined;
  isLoading:  boolean;
  isFetching: boolean;
  isError:    boolean;
  error:      Error | null;
  refetch:    () => void;
}

/**
 * Core USDC hook. Exposes address, helpers, and isApproving state
 * so that useEthernal and other composites can consume it uniformly.
 */
export function useUSDC() {
  const address = useUSDCAddress();

  return {
    address,
    decimals:    USDC_DECIMALS,
    isAvailable: !!address,
    formatUSDC,
    parseUSDC,
    /** Placeholder — set to true while an ERC-20 approve tx is pending.
     *  Override at the call-site with the real isPending value from
     *  useWriteContract when you need live status. */
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