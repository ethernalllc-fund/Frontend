import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useCallback, useEffect, useState } from 'react';
import type { Chain } from 'viem/chains';
import { arbitrumSepolia, polygonAmoy, anvil, sepolia, mainnet } from 'viem/chains';
// import { SUPPORTED_CHAINS } from '@/config/chains';

// ⚠️ NOTA: Idealmente esto debería importarse desde @/config/chains
// Por ahora lo dejamos aquí por compatibilidad
export const SUPPORTED_CHAINS = {
  anvil: anvil,
  arbitrumSepolia: arbitrumSepolia,
  polygonAmoy: polygonAmoy,
  sepolia: sepolia,
  mainnet: mainnet,
} as const;

const DEFAULT_CHAIN_ID = import.meta.env.VITE_CHAIN_ID
  ? Number(import.meta.env.VITE_CHAIN_ID)
  : arbitrumSepolia.id;

export interface NetworkState {
  chainId: number | undefined;
  chain: Chain | undefined;
  isSupported: boolean;
  isCorrectNetwork: boolean;
  networkName: string;
  explorerUrl: string | undefined;
}

export interface UseNetworkReturn {
  network: NetworkState;
  switchToNetwork: (chainId: number) => Promise<void>;
  switchToDefaultNetwork: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  isSwitching: boolean;
}

export function useNetwork(): UseNetworkReturn {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching, error: switchError } = useSwitchChain();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const getCurrentChain = useCallback((): Chain | undefined => {
    return Object.values(SUPPORTED_CHAINS).find((chain) => chain.id === chainId);
  }, [chainId]);

  const chain = getCurrentChain();
  const isSupported = useCallback((): boolean => {
    return Object.values(SUPPORTED_CHAINS).some((c) => c.id === chainId);
  }, [chainId]);

  const isCorrectNetwork = chainId === DEFAULT_CHAIN_ID;
  const networkName = chain?.name || `Unknown Network (${chainId})`;
  const explorerUrl = chain?.blockExplorers?.default.url;
  const network: NetworkState = {
    chainId,
    chain,
    isSupported: isSupported(),
    isCorrectNetwork,
    networkName,
    explorerUrl,
  };

  const switchToNetwork = useCallback(
    async (targetChainId: number) => {
      if (!isConnected) {
        setError(new Error('Wallet not connected'));
        return;
      }

      if (chainId === targetChainId) {
        if (import.meta.env.DEV) {
          console.log(`Already on chain ${targetChainId}`);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await switchChainAsync({ chainId: targetChainId });
        if (import.meta.env.DEV) {
          console.log(`✅ Switched to chain ${targetChainId}`);
        }
      } catch (err: any) {
        console.error('Failed to switch network:', err);

        if (err.code === 4902) {
          setError(new Error('Network not found in wallet. Please add it manually.'));
        } else if (err.code === 4001) {
          setError(new Error('User rejected network switch'));
        } else {
          setError(err);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, chainId, switchChainAsync]
  );

  const switchToDefaultNetwork = useCallback(async () => {
    await switchToNetwork(DEFAULT_CHAIN_ID);
  }, [switchToNetwork]);

  useEffect(() => {
    if (switchError) {
      setError(switchError);
    } else if (chainId) {
      setError(null);
    }
  }, [chainId, switchError]);

  return {
    network,
    switchToNetwork,
    switchToDefaultNetwork,
    isLoading: isLoading || isSwitching,
    error,
    isSwitching,
  };
}

export function useIsCorrectNetwork(): boolean {
  const { network } = useNetwork();
  return network.isCorrectNetwork;
}

export function useCurrentChainId(): number | undefined {
  return useChainId();
}

export function useChainInfo(chainId: number): Chain | undefined {
  return Object.values(SUPPORTED_CHAINS).find((chain) => chain.id === chainId);
}

export async function addNetworkToWallet(chain: Chain): Promise<void> {
  const ethereum = window.ethereum as {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    isMetaMask?: boolean;
  } | undefined;

  if (!ethereum) {
    throw new Error('No wallet detected');
  }

  try {
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${chain.id.toString(16)}`,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: chain.rpcUrls.default.http,
          blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : undefined,
        },
      ],
    });
  } catch (error) {
    console.error('Failed to add network:', error);
    throw error;
  }
}