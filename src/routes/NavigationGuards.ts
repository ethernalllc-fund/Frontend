import { useAccount, useChainId } from 'wagmi';
import { PUBLIC_PATHS } from './PublicRoutes';
import { USER_PATHS } from './UserRoutes';
import { ADMIN_PATHS } from './AdminRoutes';
import { ACTIVE_CHAIN_IDS, getChainName, ACTIVE_CHAINS } from '@/config/chains';

export type RouteType = 'public' | 'user' | 'admin';
export type AppPath = string;
export interface NavigationGuards {
  requiresWallet: boolean;
  requiresCorrectNetwork: boolean;
  requiresAdmin?: boolean;
  requiredRole?: 'admin' | 'superadmin';
  redirectTo: string;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  redirectTo?: string;
}

export const ALL_PATHS = {
  ...PUBLIC_PATHS,
  ...USER_PATHS,
  ...ADMIN_PATHS,
} as const;

export type AllPaths = typeof ALL_PATHS;
export type PathKey = keyof AllPaths;

const guardsMap: Record<string, NavigationGuards> = {
  [PUBLIC_PATHS.HOME]: {
    requiresWallet: false,
    requiresCorrectNetwork: false,
    redirectTo: PUBLIC_PATHS.HOME,
  },
  [PUBLIC_PATHS.CALCULATOR]: {
    requiresWallet: false,
    requiresCorrectNetwork: false,
    redirectTo: PUBLIC_PATHS.HOME,
  },
  [PUBLIC_PATHS.CONTACT]: {
    requiresWallet: false,
    requiresCorrectNetwork: false,
    redirectTo: PUBLIC_PATHS.HOME,
  },
  [PUBLIC_PATHS.SURVEY]: {
    requiresWallet: false,
    requiresCorrectNetwork: false,
    redirectTo: PUBLIC_PATHS.HOME,
  },

  [USER_PATHS.DASHBOARD]: {
    requiresWallet:         true,
    requiresCorrectNetwork: true,
    redirectTo:             PUBLIC_PATHS.HOME,
  },
  [USER_PATHS.CREATE_FUND]: {
    requiresWallet:         true,
    requiresCorrectNetwork: true,
    redirectTo:             PUBLIC_PATHS.CALCULATOR,
  },
  // 🔒 Guards de rutas desconectadas temporalmente
  // [USER_PATHS.CREATE_CONTRACT]:  { requiresWallet: true, requiresCorrectNetwork: true, redirectTo: PUBLIC_PATHS.CALCULATOR },
  // [USER_PATHS.CONTRACT_CREATED]: { requiresWallet: true, requiresCorrectNetwork: true, redirectTo: USER_PATHS.CREATE_CONTRACT },

  [ADMIN_PATHS.ADMIN_DASHBOARD]: {
    requiresWallet: true,
    requiresCorrectNetwork: true,
    requiresAdmin: true,
    requiredRole: 'admin',
    redirectTo: PUBLIC_PATHS.HOME,
  },
  [ADMIN_PATHS.TREASURY]: {
    requiresWallet: true,
    requiresCorrectNetwork: true,
    requiresAdmin: true,
    requiredRole: 'admin',
    redirectTo: ADMIN_PATHS.ADMIN_DASHBOARD, 
  },
  [ADMIN_PATHS.CONTRACTS]: {
    requiresWallet: true,
    requiresCorrectNetwork: true,
    requiresAdmin: true,
    requiredRole: 'admin',
    redirectTo: ADMIN_PATHS.ADMIN_DASHBOARD,
  },
  [ADMIN_PATHS.TOKENS]: {
    requiresWallet: true,
    requiresCorrectNetwork: true,
    requiresAdmin: true,
    requiredRole: 'admin',
    redirectTo: ADMIN_PATHS.ADMIN_DASHBOARD,
  },
  [ADMIN_PATHS.ADMIN_CONTACT]: {
    requiresWallet: true,
    requiresCorrectNetwork: true,
    requiresAdmin: true,
    requiredRole: 'admin',
    redirectTo: ADMIN_PATHS.ADMIN_DASHBOARD,
  },
};

export const getRouteType = (path: string): RouteType => {
  if (Object.values(PUBLIC_PATHS).includes(path as any)) return 'public';
  if (Object.values(USER_PATHS).includes(path as any))   return 'user';
  if (Object.values(ADMIN_PATHS).includes(path as any))  return 'admin';
  return 'public';
};

export const getGuard = (path: string): NavigationGuards => {
  return guardsMap[path] ?? guardsMap[PUBLIC_PATHS.HOME]!;
};

export const requiresWallet = (path: string): boolean => {
  return getGuard(path).requiresWallet;
};

export const requiresCorrectNetwork = (path: string): boolean => {
  return getGuard(path).requiresCorrectNetwork;
};

export const getNavigationGuards = (path: string) => {
  const guard = getGuard(path);
  const routeType = getRouteType(path);
  return {
    ...guard,
    routeType,
    isPublic:    routeType === 'public',
    isProtected: guard.requiresWallet || !!guard.requiresAdmin,
  };
};

export const useNavigationGuards = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isCorrectNetwork = ACTIVE_CHAIN_IDS.includes(chainId as any);
  const validate = (
    targetPath: string,
    adminCheck?: { hasAccess: boolean | null; loading: boolean }
  ): ValidationResult => {
    const guard = getGuard(targetPath);

    if (guard.requiresWallet && !isConnected) {
      return { allowed: false, reason: 'Wallet connection required', redirectTo: guard.redirectTo };
    }

    if (guard.requiresCorrectNetwork && !isCorrectNetwork) {
      const currentChainName = getChainName(chainId);
      const supportedNames   = ACTIVE_CHAINS.map(c => c.name).join(', ');
      return {
        allowed: false,
        reason:  `Wrong network. Current: ${currentChainName}. Please switch to: ${supportedNames}`,
        redirectTo: guard.redirectTo,
      };
    }

    if (guard.requiresAdmin) {
      if (adminCheck?.loading) {
        return { allowed: false, reason: 'Checking admin access...' };
      }
      if (!adminCheck?.hasAccess) {
        return {
          allowed: false,
          reason:  `Requires ${guard.requiredRole || 'admin'} role`,
          redirectTo: guard.redirectTo,
        };
      }
    }
    return { allowed: true };
  };

  return {
    validate,
    isConnected,
    isCorrectNetwork,
    address,
    chainId,
    supportedChainIds: ACTIVE_CHAIN_IDS,
    supportedChains:   ACTIVE_CHAINS,
  };
};

export const validateNavigation = (
  targetPath: string,
  wallet: { isConnected: boolean; isCorrectNetwork: boolean },
  adminCheck?: { hasAccess: boolean | null; loading: boolean }
): ValidationResult => {
  const guard = getGuard(targetPath);
  if (guard.requiresWallet && !wallet.isConnected) {
    return { allowed: false, reason: 'Wallet required', redirectTo: guard.redirectTo };
  }
  if (guard.requiresCorrectNetwork && !wallet.isCorrectNetwork) {
    return { allowed: false, reason: 'Wrong network', redirectTo: guard.redirectTo };
  }
  if (guard.requiresAdmin && adminCheck) {
    if (adminCheck.loading)      return { allowed: false, reason: 'Loading...' };
    if (!adminCheck.hasAccess)   return { allowed: false, reason: 'Admin access denied', redirectTo: guard.redirectTo };
  }
  return { allowed: true };
};

export const getNavigationErrorMessage = (validation: ValidationResult): string => {
  if (validation.allowed) return '';

  const messages: Record<string, string> = {
    'Wallet connection required': '🔗 Please connect your wallet to continue',
    'Wallet required':            '🔗 Connect your wallet to access this page',
    'Wrong network':              '🌐 Please switch to a supported network',
    'Checking admin access...':   '⏳ Verifying your permissions...',
    'Admin access denied':        '🚫 You need admin privileges to access this page',
    'Loading...':                 '⏳ Loading...',
  };

  if (validation.reason?.includes('Wrong network')) {
    return `🌐 ${validation.reason}`;
  }

  return messages[validation.reason || ''] || validation.reason || 'Access denied';
};

export const getAllGuards = (): Record<string, NavigationGuards> => ({ ...guardsMap });
export const hasGuard     = (path: string): boolean => path in guardsMap;
export const getActiveChains    = () => ACTIVE_CHAINS;
export const getActiveChainIds  = () => ACTIVE_CHAIN_IDS;