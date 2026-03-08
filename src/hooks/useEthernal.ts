import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { getContractAddresses, isValidAddress } from './../config/addresses';
import { useTreasury }            from './core/useTreasury';
import { usePersonalFundFactory } from './funds/usePersonalFundFactory';
import { usePersonalFund }        from './funds/usePersonalFund';
import { useProtocolRegistry }    from './defi/useProtocolRegistry';
import { useUserPreferences }     from './defi/useUserPreferences';
import { useUSDC }                from './usdc/useUSDC';

export function useEthernal() {
  const chainId   = useChainId();
  const addresses = getContractAddresses(chainId);
  const isConfigured = useMemo(() => {
    if (!addresses) return false;
    return [
      addresses.personalFundFactory,
      addresses.treasury,
      addresses.usdc,
    ].every(addr => isValidAddress(addr));
  }, [addresses]);

  const treasury         = useTreasury(addresses?.treasury);
  const factory          = usePersonalFundFactory(addresses?.personalFundFactory);
  const personalFund     = usePersonalFund(factory.userFund);
  const protocolRegistry = useProtocolRegistry(addresses?.protocolRegistry);
  const userPreferences  = useUserPreferences(addresses?.userPreferences);
  const usdc             = useUSDC();

  const isLoading = useMemo(() => (
    treasury.isLoading         ||
    factory.isLoading          ||
    personalFund.isLoading     ||
    protocolRegistry.isLoading ||
    userPreferences.isLoading  ||
    usdc.isApproving
  ), [
    treasury.isLoading,
    factory.isLoading,
    personalFund.isLoading,
    protocolRegistry.isLoading,
    userPreferences.isLoading,
    usdc.isApproving,
  ]);

  const refetchAll = async () => {
    const results = await Promise.allSettled([
      treasury.refetch?.(),
      factory.refetch?.(),
      personalFund.refetch?.(),
      protocolRegistry.refetch?.(),
      userPreferences.refetch?.(),
    ]);

    if (import.meta.env.DEV) {
      const contractNames = [
        'token', 'treasury', 'factory',
        'personalFund', 'protocolRegistry', 'userPreferences',
      ];
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.warn(`Failed to refetch ${contractNames[i]}:`, result.reason);
        }
      });
    }
  };

  if (import.meta.env.DEV && !isConfigured) {
    console.warn(`⚠️ Ethernal contracts not fully deployed on chain ${chainId}`, {
      chainId,
      addresses,
      hasFactory:  isValidAddress(addresses?.personalFundFactory),
      hasTreasury: isValidAddress(addresses?.treasury),
      hasUSDC:     isValidAddress(addresses?.usdc),
    });
  }

  return {
    treasury,
    factory,
    personalFund,
    protocolRegistry,
    userPreferences,
    usdc,
    addresses,
    chainId,
    isLoading,
    isConfigured,
    refetchAll,
  };
}

export function useContractAddresses() {
  const chainId   = useChainId();
  const addresses = getContractAddresses(chainId);

  const isConfigured = useMemo(() => {
    if (!addresses) return false;
    return [
      addresses.personalFundFactory,
      addresses.treasury,
      addresses.usdc,
    ].every(addr => isValidAddress(addr));
  }, [addresses]);

  return { addresses, chainId, isConfigured };
}

export type EthernalHook          = ReturnType<typeof useEthernal>;
export type ContractAddressesHook = ReturnType<typeof useContractAddresses>;