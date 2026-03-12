import { useReadContract, useChainId } from 'wagmi';
import { getContractAddresses } from '@/config/addresses';

const PROTOCOL_REGISTRY_ABI = [
  {
    stateMutability: 'view',
    type:            'function',
    name:            'isProtocolActive',
    inputs:  [{ name: '_protocolAddress', type: 'address' }],
    outputs: [{ name: '',                 type: 'bool'    }],
  },
  {
    stateMutability: 'view',
    type:            'function',
    name:            'isProtocolVerified',
    inputs:  [{ name: '_protocolAddress', type: 'address' }],
    outputs: [{ name: '',                 type: 'bool'    }],
  },
  {
    stateMutability: 'view',
    type:            'function',
    name:            'getProtocolStats',
    inputs:  [{ name: '_protocolAddress', type: 'address' }],
    outputs: [
      { name: '', type: 'uint256' }, // apy
      { name: '', type: 'uint256' }, // totalDeposited
      { name: '', type: 'bool'    }, // isActive
      { name: '', type: 'bool'    }, // verified
    ],
  },
] as const;

export type ProtocolStatusResult =
  | { status: 'loading';      isActive: undefined; isVerified: undefined; error: null     }
  | { status: 'unavailable';  isActive: undefined; isVerified: undefined; error: null     }
  | { status: 'error';        isActive: undefined; isVerified: undefined; error: Error    }
  | { status: 'inactive';     isActive: false;     isVerified: boolean;   error: null     }
  | { status: 'active';       isActive: true;      isVerified: boolean;   error: null     };

export function useProtocolStatus(
  protocolAddress: `0x${string}` | undefined,
): ProtocolStatusResult {
  const chainId          = useChainId();
  const registryAddress  = getContractAddresses(chainId)?.protocolRegistry;

  const isEnabled =
    Boolean(protocolAddress) &&
    Boolean(registryAddress) &&
    registryAddress !== '0x0000000000000000000000000000000000000000';

  const {
    data:      isActive,
    isLoading: loadingActive,
    error:     errorActive,
  } = useReadContract({
    address:      registryAddress,
    abi:          PROTOCOL_REGISTRY_ABI,
    functionName: 'isProtocolActive',
    args:         protocolAddress ? [protocolAddress] : undefined,
    query: {
      enabled:         isEnabled,
      refetchInterval: 60_000,
      staleTime:       30_000,
      retry:           2,
    },
  });

  const {
    data:      isVerified,
    isLoading: loadingVerified,
    error:     errorVerified,
  } = useReadContract({
    address:      registryAddress,
    abi:          PROTOCOL_REGISTRY_ABI,
    functionName: 'isProtocolVerified',
    args:         protocolAddress ? [protocolAddress] : undefined,
    query: {
      enabled:         isEnabled,
      refetchInterval: 60_000,
      staleTime:       30_000,
      retry:           2,
    },
  });

  if (!isEnabled) {
    return { status: 'unavailable', isActive: undefined, isVerified: undefined, error: null };
  }

  if (loadingActive || loadingVerified) {
    return { status: 'loading', isActive: undefined, isVerified: undefined, error: null };
  }

  const contractError = errorActive ?? errorVerified;
  if (contractError) {
    if (import.meta.env.DEV) {
      console.error('[useProtocolStatus] Registry error:', {
        chainId,
        registryAddress,
        protocolAddress,
        error: contractError,
      });
    }
    return {
      status:     'error',
      isActive:   undefined,
      isVerified: undefined,
      error:      contractError as Error,
    };
  }

  const active   = isActive   ?? false;
  const verified = isVerified ?? false;

  return active
    ? { status: 'active',   isActive: true,  isVerified: verified, error: null }
    : { status: 'inactive', isActive: false, isVerified: verified, error: null };
}