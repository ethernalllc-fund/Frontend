import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useSignMessage, usePublicClient } from 'wagmi';
import { z } from 'zod';
import { useOnChainAdminRole, DEFAULT_ADMIN_ROLE } from './web3/useCorrectChain';
import { getContractAddresses } from './../config/addresses';

const AdminSessionSchema = z.object({
  address:   z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().min(132).max(132),
  timestamp: z.number().positive(),
  expiresAt: z.number().positive(),
  message:   z.string(),
});

type AdminSession = z.infer<typeof AdminSessionSchema>;

const ADMIN_SESSION_KEY = 'admin_session';
const SESSION_DURATION  = 24 * 60 * 60 * 1000; // 24 horas
const ON_CHAIN_TIMEOUT_MS = 6_000;

function getStoredSession(): AdminSession | null {
  try {
    const stored = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!stored) return null;
    const validated = AdminSessionSchema.parse(JSON.parse(stored));
    if (Date.now() > validated.expiresAt) {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }
    return validated;
  } catch {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

function saveSession(session: AdminSession): void {
  AdminSessionSchema.parse(session);
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

function clearSession(): void {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

function generateLoginMessage(address: string, chainId: number): string {
  const timestamp = Date.now();
  const nonce     = crypto.randomUUID();

  return [
    '🔒 ETHERNAL ADMIN LOGIN — READ CAREFULLY 🔒',
    '',
    '⚠️  SECURITY NOTICE:',
    '   · This signature does NOT authorize transactions',
    '   · This signature does NOT give access to your funds',
    '   · This ONLY authenticates you in the admin panel',
    '   · This session expires in 24 hours',
    '',
    `Address:   ${address}`,
    `Chain ID:  ${chainId}`,
    `Domain:    ${window.location.hostname}`,
    `Timestamp: ${timestamp}`,
    `Nonce:     ${nonce}`,
    '',
    'By signing you confirm you are authenticating as an Ethernal admin.',
  ].join('\n');
}

interface UseSecureAdminResult {
  isAdmin:         boolean;
  isLoading:       boolean;
  isAuthenticated: boolean;
  login:           () => Promise<void>;
  logout:          () => void;
  error:           string | null;
  clearError:      () => void;
}

export const useSecureAdmin = (): UseSecureAdminResult => {
  const [isAdmin,         setIsAdmin        ] = useState<boolean>(false);
  const [isLoading,       setIsLoading      ] = useState<boolean>(false);
  const [error,           setError          ] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const onChainTimedOut = useRef<boolean>(false);
  const navigate                        = useNavigate();
  const { address, isConnected, chain } = useAccount();
  const { signMessageAsync }            = useSignMessage();
  const publicClient                    = usePublicClient();
  const {
    isAdmin:   isOnChainAdmin,
    isLoading: isCheckingOnChain,
    isError:   onChainCheckFailed,
  } = useOnChainAdminRole(address);

  const applyStoredSession = useCallback((session: AdminSession | null) => {
    if (session) {
      setIsAdmin(true);
      setIsAuthenticated(true);
    } else {
      setIsAdmin(false);
      setIsAuthenticated(false);
    }
  }, []);

  const checkStoredSession = useCallback((): AdminSession | null => {
    if (!address || !isConnected) {
      setIsAdmin(false);
      setIsAuthenticated(false);
      return null;
    }

    const session = getStoredSession();
    if (!session) {
      setIsAdmin(false);
      setIsAuthenticated(false);
      return null;
    }

    if (session.address.toLowerCase() !== address.toLowerCase()) {
      console.warn('[useSecureAdmin] Session address mismatch — clearing');
      clearSession();
      setIsAdmin(false);
      setIsAuthenticated(false);
      return null;
    }
    return session;
  }, [address, isConnected]);

  const login = useCallback(async () => {
    if (!address || !isConnected || !chain) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const addresses = getContractAddresses(chain.id);
      if (!addresses?.treasury) {
        throw new Error('Treasury contract not configured for this network');
      }

      const hasRole = await publicClient?.readContract({
        address: addresses.treasury,
        abi: [
          {
            name: 'hasRole',
            type: 'function',
            stateMutability: 'view',
            inputs: [
              { name: 'role',    type: 'bytes32' },
              { name: 'account', type: 'address' },
            ],
            outputs: [{ name: '', type: 'bool' }],
          },
        ] as const,
        functionName: 'hasRole',
        args: [DEFAULT_ADMIN_ROLE, address],
      });

      if (!hasRole) {
        throw new Error('Address is not authorized as admin');
      }

      const message   = generateLoginMessage(address, chain.id);
      const signature = await signMessageAsync({ message });
      const session: AdminSession = {
        address:   address.toLowerCase(),
        signature,
        timestamp: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION,
        message,
      };

      saveSession(session);
      setIsAdmin(true);
      setIsAuthenticated(true);

      if (import.meta.env.DEV) {
        console.log('[useSecureAdmin] ✅ Admin login successful', {
          address:   `${address.slice(0, 6)}...${address.slice(-4)}`,
          chainId:   chain.id,
          expiresAt: new Date(session.expiresAt).toISOString(),
        });
      }

      void navigate('/admin/dashboard');

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to login. Please try again.';

      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        setError('Signature rejected. Please approve the signature to login.');
      } else if (msg.includes('not authorized')) {
        setError('Your address is not authorized as admin.');
      } else if (msg.includes('not configured')) {
        setError('Admin login is not available on this network.');
      } else {
        setError(msg);
      }

      setIsAdmin(false);
      setIsAuthenticated(false);
      console.error('[useSecureAdmin] ❌ Admin login failed:', err);

    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, chain, publicClient, signMessageAsync, navigate]);

  const logout = useCallback(() => {
    clearSession();
    setIsAdmin(false);
    setIsAuthenticated(false);
    setError(null);
    void navigate('/admin/login');

    if (import.meta.env.DEV) {
      console.log('[useSecureAdmin] 🔓 Admin logout');
    }
  }, [navigate]);
  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    onChainTimedOut.current = false;
    checkStoredSession();
  }, [address, isConnected, checkStoredSession]);

  useEffect(() => {
    if (!isCheckingOnChain) return;

    const timer = setTimeout(() => {
      if (isCheckingOnChain) {
        onChainTimedOut.current = true;
        console.warn(
          `[useSecureAdmin] ⏱️ On-chain check timed out after ${ON_CHAIN_TIMEOUT_MS}ms — falling back to stored session`,
        );
        const session = checkStoredSession();
        applyStoredSession(session);
      }
    }, ON_CHAIN_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isCheckingOnChain, checkStoredSession, applyStoredSession]);

  useEffect(() => {
    if (isCheckingOnChain) return;
    if (onChainTimedOut.current) return;
    if (onChainCheckFailed) {
      if (import.meta.env.DEV) {
        console.warn('[useSecureAdmin] ⚠️ On-chain role check failed — falling back to stored session');
      }
      const session = checkStoredSession();
      applyStoredSession(session);
      return;
    }

    const session = getStoredSession();

    if (session && !isOnChainAdmin) {
      console.warn('[useSecureAdmin] ⚠️ Admin role revoked on-chain — clearing session');
      clearSession();
      setIsAdmin(false);
      setIsAuthenticated(false);
    } else if (session && isOnChainAdmin) {
      setIsAdmin(true);
      setIsAuthenticated(true);
    } else {
      setIsAdmin(false);
      setIsAuthenticated(false);
    }
  }, [isOnChainAdmin, isCheckingOnChain, onChainCheckFailed, checkStoredSession, applyStoredSession]);

  useEffect(() => {
    if (isLoading || isCheckingOnChain) return;
    if (!isAdmin) {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/admin') && currentPath !== '/admin/login') {
        console.warn('[useSecureAdmin] ⚠️ Unauthorized admin route access');
        void navigate('/admin/login', { replace: true });
      }
    }
  }, [isAdmin, isLoading, isCheckingOnChain, navigate]);

  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      clearSession();
      setIsAdmin(false);
      setIsAuthenticated(false);
      setError(null);
      void navigate('/admin/login');
    }
  }, [isConnected, isAuthenticated, navigate]);

  return {
    isAdmin,
    isLoading: isLoading || isCheckingOnChain,
    isAuthenticated,
    login,
    logout,
    error,
    clearError,
  };
};