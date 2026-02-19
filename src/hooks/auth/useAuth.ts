import { useWallet } from '@/hooks/web3/useWallet';
import { useSecureAdmin } from '@/hooks';

export function useAuth() {
  const { isConnected, openModal } = useWallet();
  const { isAdmin, isLoading: isCheckingRole } = useSecureAdmin();

  return {
    isConnected,
    connect: openModal,

    isAdmin,
    isCheckingRole,

    isAuthenticated: isConnected,
    isAuthorized: (requireAdmin: boolean) => {
      if (requireAdmin) return isConnected && isAdmin;
      return isConnected;
    },
  };
}
