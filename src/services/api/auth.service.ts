import { apiClient } from './base.client';
import { API_ENDPOINTS } from '@/config/api.config';

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  access_token: string;
}

export interface TokenPayload {
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

const STORAGE_KEYS = {
  ADMIN_TOKEN: 'admin_token',
  TOKEN_EXPIRY: 'token_expiry',
  ADMIN_EMAIL: 'admin_email',
  REMEMBER_ME: 'remember_admin',
} as const;

const TOKEN_EXPIRY_TIME = 30 * 60 * 1000;

export const authService = {
  async adminLogin(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<AdminLoginResponse> {
    try {
      const response = await apiClient.post<AdminLoginResponse>(
        API_ENDPOINTS.AUTH.ADMIN_LOGIN,
        { email, password }
      );

      if (response.access_token) {
        this.setToken(response.access_token, email, rememberMe);
        console.log('✅ Admin logged in successfully');
      }

      return response;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  },

  setToken(token: string, email?: string, rememberMe: boolean = false): void {
    apiClient.setAuthToken(token);
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token);
      if (email) {
        localStorage.setItem(STORAGE_KEYS.ADMIN_EMAIL, email);
      }
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, rememberMe.toString());
      const expiryTime = Date.now() + TOKEN_EXPIRY_TIME;
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
      
      console.log('✅ Token saved successfully');
    } catch (error) {
      console.warn('⚠️ Could not save token to localStorage:', error);
    }
  },

  getToken(): string | null {
    return apiClient.getAuthToken();
  },

  getStoredToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
    } catch (error) {
      console.warn('⚠️ Could not read token from localStorage:', error);
      return null;
    }
  },

  loadToken(): void {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
      const expiryTime = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
      
      if (!token) {
        console.log('ℹ️ No token found in localStorage');
        return;
      }

      if (expiryTime) {
        const now = Date.now();
        const expiry = parseInt(expiryTime);
        if (now > expiry) {
          console.warn('⚠️ Token has expired');
          if (!rememberMe) {
            this.logout();
            return;
          }
          console.log('ℹ️ Remember me enabled, keeping expired token');
        }
      }

      apiClient.setAuthToken(token);
      console.log('✅ Token loaded from localStorage');
    } catch (error) {
      console.warn('⚠️ Could not load token from localStorage:', error);
    }
  },

  logout(): void {
    apiClient.setAuthToken(null);
    
    try {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
      localStorage.removeItem(STORAGE_KEYS.ADMIN_EMAIL);
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.warn('⚠️ Could not clear localStorage:', error);
    }
  },

  isAuthenticated(): boolean {
    return !!apiClient.getAuthToken();
  },

  isTokenExpired(): boolean {
    try {
      const expiryTime = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      if (!expiryTime) {
        return true;
      }
      const now = Date.now();
      const expiry = parseInt(expiryTime);
      
      return now > expiry;
    } catch (error) {
      return true;
    }
  },

  getAdminEmail(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ADMIN_EMAIL);
    } catch (error) {
      return null;
    }
  },

  isRememberMeEnabled(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
    } catch (error) {
      return false;
    }
  },

  renewToken(): void {
    const token = this.getToken();
    if (token) {
      const expiryTime = Date.now() + TOKEN_EXPIRY_TIME;
      try {
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
        console.log('✅ Token renewed');
      } catch (error) {
        console.warn('⚠️ Could not renew token:', error);
      }
    }
  },

  getTokenTimeRemaining(): number {
    try {
      const expiryTime = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      if (!expiryTime) {
        return 0;
      }

      const now = Date.now();
      const expiry = parseInt(expiryTime);
      const remaining = expiry - now;

      if (remaining <= 0) {
        return 0;
      }

      return Math.floor(remaining / (60 * 1000));
    } catch (error) {
      return 0;
    }
  },
  getFormattedTimeRemaining(): string {
    const minutes = this.getTokenTimeRemaining();
    if (minutes === 0) {
      return 'Expired';
    }
    if (minutes < 1) {
      return 'Less than 1 min';
    }
    return `${minutes} min`;
  },

  isTokenExpiringSoon(thresholdMinutes: number = 5): boolean {
    const remaining = this.getTokenTimeRemaining();
    return remaining > 0 && remaining <= thresholdMinutes;
  },
  decodeToken(token?: string): TokenPayload | null {
    try {
      const tokenToUse = token || this.getToken();
      if (!tokenToUse) {
        return null;
      }

      const parts = tokenToUse.split('.');
      if (parts.length !== 3) {
        console.warn('⚠️ Invalid JWT format');
        return null;
      }

      const payload = parts[1];
      if (!payload) {
        console.warn('⚠️ JWT payload is missing');
        return null;
      }

      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded) as TokenPayload;
    } catch (error) {
      console.warn('⚠️ Could not decode token:', error);
      return null;
    }
  },
  getUserRole(): string | null {
    const payload = this.decodeToken();
    return payload?.role || null;
  },
  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  },
  validateToken(): boolean {
    if (!this.isAuthenticated()) {
      return false;
    }
    if (this.isTokenExpired()) {
      return false;
    }

    const payload = this.decodeToken();
    if (!payload) {
      return false;
    }
    return true;
  },

  startAutoRenew(): () => void {
    const intervalId = setInterval(() => {
      if (this.isAuthenticated() && !this.isTokenExpired()) {
        this.renewToken();
      }
    }, 10 * 60 * 1000);
    console.log('✅ Auto-renew started');
    return () => {
      clearInterval(intervalId);
      console.log('🛑 Auto-renew stopped');
    };
  },

  cleanupExpiredSessions(): void {
    if (this.isTokenExpired() && !this.isRememberMeEnabled()) {
      this.logout();
      console.log('🧹 Cleaned up expired session');
    }
  },

  getSessionInfo() {
    return {
      isAuthenticated: this.isAuthenticated(),
      isExpired: this.isTokenExpired(),
      isExpiringSoon: this.isTokenExpiringSoon(),
      timeRemaining: this.getFormattedTimeRemaining(),
      email: this.getAdminEmail(),
      role: this.getUserRole(),
      rememberMe: this.isRememberMeEnabled(),
      isValid: this.validateToken(),
    };
  },
};
authService.loadToken();
authService.cleanupExpiredSessions();

export default authService;