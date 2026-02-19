import { useWallet } from './useWallet';
import { useNetwork } from './useNetwork';

export function useRequireCorrectNetwork() {
  const { isConnected } = useWallet();
  const {
    network,
    switchToDefaultNetwork,
    isSwitching,
    error: networkError,
  } = useNetwork();

  const isCorrectNetwork = isConnected && network.isCorrectNetwork;
  const isWrongNetwork = isConnected && !network.isCorrectNetwork;

  return {
    isReady: isCorrectNetwork,      
    isWrongNetwork,
    isConnected,
    currentNetwork: network.networkName,
    expectedNetwork: 'Arbitrum Sepolia',

    switchToCorrectNetwork: switchToDefaultNetwork,
    isSwitchingNetwork: isSwitching,

    networkError,
  };
}