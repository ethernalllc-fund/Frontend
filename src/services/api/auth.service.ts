import { apiClient }    from './base.client';
import { API_ENDPOINTS } from '@/config/api.config';

export interface NonceResponse {
  nonce:   string;
  message: string;  
}

export interface AuthResponse {
  access_token:   string;
  wallet_address: string;
  expires_in:     number;   
}

const KEYS = {
  TOKEN:   'ethernal_token',
  WALLET:  'ethernal_wallet',
  EXPIRY:  'ethernal_token_expiry',
} as const;

function saveSession(token: string, wallet: string, expiresIn: number): void {
  try {
    const expiry = Date.now() + expiresIn * 1_000;
    localStorage.setItem(KEYS.TOKEN,  token);
    localStorage.setItem(KEYS.WALLET, wallet);
    localStorage.setItem(KEYS.EXPIRY, expiry.toString());
    apiClient.setAuthToken(token);
  } catch {
    apiClient.setAuthToken(token);
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(KEYS.TOKEN);
    localStorage.removeItem(KEYS.WALLET);
    localStorage.removeItem(KEYS.EXPIRY);
  } catch { /* noop */ }
  apiClient.setAuthToken(null);
}

function loadSession(): void {
  try {
    const token  = localStorage.getItem(KEYS.TOKEN);
    const expiry = localStorage.getItem(KEYS.EXPIRY);
    if (!token) return;
    if (expiry && Date.now() > parseInt(expiry)) {
      clearSession();
      return;
    }
    apiClient.setAuthToken(token);
  } catch { /* noop */ }
}

export const authService = {

  async getNonce(walletAddress: string): Promise<NonceResponse> {
    return apiClient.post<NonceResponse>(API_ENDPOINTS.AUTH.NONCE, {
      wallet_address: walletAddress,
    });
  },

  async authenticate(
    walletAddress: string,
    nonce: string,
    signature: string,
  ): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      wallet_address: walletAddress,
      nonce,
      signature,
    });
    saveSession(response.access_token, response.wallet_address, response.expires_in);
    return response;
  },

  logout(): void {
    clearSession();
  },

  isAuthenticated(): boolean {
    return !!apiClient.getAuthToken();
  },

  isTokenExpired(): boolean {
    try {
      const expiry = localStorage.getItem(KEYS.EXPIRY);
      if (!expiry) return true;
      return Date.now() > parseInt(expiry);
    } catch {
      return true;
    }
  },

  getToken():         string | null { return apiClient.getAuthToken(); },
  getWalletAddress(): string | null {
    try { return localStorage.getItem(KEYS.WALLET); } catch { return null; }
  },

  getMinutesRemaining(): number {
    try {
      const expiry = localStorage.getItem(KEYS.EXPIRY);
      if (!expiry) return 0;
      return Math.max(0, Math.floor((parseInt(expiry) - Date.now()) / 60_000));
    } catch {
      return 0;
    }
  },

  isExpiringSoon(thresholdMinutes = 5): boolean {
    const rem = this.getMinutesRemaining();
    return rem > 0 && rem <= thresholdMinutes;
  },
};

loadSession();
export default authService;