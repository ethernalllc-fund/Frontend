const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000,           // 30s timeout default
  RETRY_ATTEMPTS: 3,        // Reintentos por defecto
  RETRY_DELAY: 1000,        // 1s entre reintentos
} as const;

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    ADMIN_LOGIN: '/auth/admin/login',
  },

  SURVEYS: {
    BASE: '/surveys',
    FOLLOW_UP: '/surveys/follow-up',
    STATS: '/surveys/stats',
    FOLLOW_UPS: '/surveys/follow-ups',
    EMAILS: '/surveys/emails',
  },

  CONTACT: {
    BASE: '/contact',
    MESSAGES: '/contact/messages',
    MESSAGE: (id: number) => `/contact/messages/${id}`,
    MARK_READ: (id: number) => `/contact/messages/${id}/read`,
    REPLY: (id: number) => `/contact/messages/${id}/reply`,
    STATS: '/contact/stats',
  },

  USERS: {
    BASE: '/users',
    REGISTER: '/users/register',
    EMAIL: '/users/email',
    WALLET: (address: string) => `/users/wallet/${address}`,
    LOGIN: (address: string) => `/users/${address}/login`,
    MAILING_LIST: '/users/mailing-list',
    SEARCH: '/users/search',
    BY_ID: (id: number) => `/users/${id}`,
  },

  STATS: {
    ADMIN: '/admin/stats',
  },
} as const;

export const buildApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const cleanBaseUrl = API_CONFIG.BASE_URL.endsWith('/') 
    ? API_CONFIG.BASE_URL.slice(0, -1) 
    : API_CONFIG.BASE_URL;
  return `${cleanBaseUrl}/api/v1/${cleanEndpoint}`;
};

export const BackendStatus = {
  UNKNOWN:     'unknown',     
  HEALTHY:     'healthy',      
  WARMING_UP:  'warming_up',   
  UNAVAILABLE: 'unavailable',  
} as const;
export type BackendStatus = typeof BackendStatus[keyof typeof BackendStatus];

interface WarmupMetrics {
  totalPings: number;
  successfulPings: number;
  failedPings: number;
  averageResponseTime: number;
  uptime: number; 
  lastCheck: number | null;
}

const WARMUP_CONFIG = {
  PING_INTERVAL: 600000, 
  HEALTH_CHECK_TIMEOUT: 15000, // 15s
  INITIAL_WARMUP_PINGS: 3,
  INITIAL_WARMUP_INTERVAL: 5000, // 5s entre pings iniciales
  VERBOSE: import.meta.env.DEV, // Solo en desarrollo
} as const;

class WarmupManager {
  private intervalId: NodeJS.Timeout | null = null;
  private currentStatus: BackendStatus = BackendStatus.UNKNOWN;
  private metrics: WarmupMetrics = {
    totalPings: 0,
    successfulPings: 0,
    failedPings: 0,
    averageResponseTime: 0,
    uptime: 0,
    lastCheck: null,
  };
  private responseTimes: number[] = [];
  private listeners = new Set<(status: BackendStatus) => void>();

  async start(immediate = true): Promise<void> {
    if (this.intervalId) {
      this.log(' Warmup already running');
      return;
    }
    
    this.log(' Starting warmup system...');
    if (immediate) {
      await this.initialWarmup();
    }

    this.intervalId = setInterval(() => {
      this.ping();
    }, WARMUP_CONFIG.PING_INTERVAL);
    
    const minutes = WARMUP_CONFIG.PING_INTERVAL / 60000;
    this.log(` Warmup scheduled: every ${minutes} minutes`);
    this.log(` Overhead: ~${this.estimateOverhead()}`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.log(' Warmup stopped');
    }
  }
 
  private async initialWarmup(): Promise<void> {
    this.log(` Initial warmup: ${WARMUP_CONFIG.INITIAL_WARMUP_PINGS} pings`);
    this.updateStatus(BackendStatus.WARMING_UP);
    
    for (let i = 1; i <= WARMUP_CONFIG.INITIAL_WARMUP_PINGS; i++) {
      this.log(` Ping ${i}/${WARMUP_CONFIG.INITIAL_WARMUP_PINGS}`);
      
      const success = await this.ping();
      
      if (success) {
        this.log(' Backend ready!');
        this.updateStatus(BackendStatus.HEALTHY);
        return;
      }

      if (i < WARMUP_CONFIG.INITIAL_WARMUP_PINGS) {
        await this.sleep(WARMUP_CONFIG.INITIAL_WARMUP_INTERVAL);
      }
    }
    
    this.log(' Initial warmup completed, backend may still be waking up');
    this.updateStatus(BackendStatus.UNAVAILABLE);
  }

  private async ping(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        WARMUP_CONFIG.HEALTH_CHECK_TIMEOUT
      );
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        this.recordSuccess(responseTime);
        this.updateStatus(BackendStatus.HEALTHY);
        this.log(` Ping OK (${responseTime}ms)`);
        return true;
      } else {
        this.recordFailure();
        this.log(` Ping returned ${response.status}`);
        this.updateStatus(BackendStatus.UNAVAILABLE);
        return false;
      }
      
    } catch (error) {
      this.recordFailure();
      
      const responseTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown';
      if (errorMsg.includes('aborted')) {
        this.updateStatus(BackendStatus.WARMING_UP);
        this.log(` Ping timeout (${responseTime}ms) - possible cold start`);
      } else {
        this.updateStatus(BackendStatus.UNAVAILABLE);
        this.log(` Ping failed: ${errorMsg}`);
      }
      
      return false;
    }
  }

  private recordSuccess(responseTime: number): void {
    this.metrics.totalPings++;
    this.metrics.successfulPings++;
    this.metrics.lastCheck = Date.now();
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
    this.updateMetrics();
  }

  private recordFailure(): void {
    this.metrics.totalPings++;
    this.metrics.failedPings++;
    this.metrics.lastCheck = Date.now();
    this.updateMetrics();
  }

  private updateMetrics(): void {
    if (this.metrics.totalPings > 0) {
      this.metrics.uptime = 
        (this.metrics.successfulPings / this.metrics.totalPings) * 100;
    }

    if (this.responseTimes.length > 0) {
      const sum = this.responseTimes.reduce((a, b) => a + b, 0);
      this.metrics.averageResponseTime = Math.round(sum / this.responseTimes.length);
    }
  }

  private estimateOverhead(): string {
    const pingsPerDay = (24 * 60 * 60 * 1000) / WARMUP_CONFIG.PING_INTERVAL;
    const bytesPerPing = 1024; // ~1KB por ping (request + response)
    const totalBytes = pingsPerDay * bytesPerPing;
    
    return `${totalBytes / 1024}KB/ <0.1% CPU`;
  }

  private updateStatus(newStatus: BackendStatus): void {
    if (this.currentStatus !== newStatus) {
      const oldStatus = this.currentStatus;
      this.currentStatus = newStatus;
      this.log(` Status: ${oldStatus} → ${newStatus}`);
      this.listeners.forEach(listener => {
        try {
          listener(newStatus);
        } catch (error) {
          console.error(' Error in status listener:', error);
        }
      });
    }
  }

  onStatusChange(listener: (status: BackendStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus); 
    return () => this.listeners.delete(listener);
  }

  getStatus(): BackendStatus {
    return this.currentStatus;
  }
  
  getMetrics(): Readonly<WarmupMetrics> {
    return { ...this.metrics };
  }
  
  isHealthy(): boolean {
    return this.currentStatus === BackendStatus.HEALTHY;
  }
  
  async forcePing(): Promise<boolean> {
    this.log(' Forcing immediate ping...');
    return await this.ping();
  }

  private log(message: string): void {
    if (WARMUP_CONFIG.VERBOSE) {
      console.log(message);
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const warmupManager = new WarmupManager();
const COLD_START_REQUEST_TIMEOUT = 15_000;  // 15s por request
const COLD_START_RETRY_DELAY = 20_000;      // 20s entre reintentos
const COLD_START_MAX_WAIT = 120_000;   

export const testApiConnection = async (): Promise<boolean> => {
  const startedAt = Date.now();
  let attempt = 0;
  
  console.log(' Checking API connection (cold-start aware)...');

  while (Date.now() - startedAt < COLD_START_MAX_WAIT) {
    attempt++;
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(COLD_START_REQUEST_TIMEOUT),
      });
      
      if (response.ok) {
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(` API connection successful (attempt ${attempt}, ${elapsed}s)`);
        return true;
      }

      console.warn(` API responded with status ${response.status} (attempt ${attempt})`);
      
      if (response.status >= 400 && response.status < 500) {
        return false;
      }

    } catch (error) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      const remaining = Math.max(
        0, 
        (COLD_START_MAX_WAIT - (Date.now() - startedAt)) / 1000
      ).toFixed(0);
      
      console.warn(
        ` API not yet available (attempt ${attempt}, ${elapsed}s elapsed, ${remaining}s remaining) retrying...`
      );
    }
    const timeRemaining = COLD_START_MAX_WAIT - (Date.now() - startedAt);
    if (timeRemaining <= COLD_START_RETRY_DELAY) {
      console.error(' Cannot connect to API after retries.');
      console.error('   Backend URL:', API_CONFIG.BASE_URL);
      console.error('   ¡ Tip: Backend is on Render.com free tier (cold starts expected)');
      console.error('   ¡ The backend will be available once it fully wakes up');
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, COLD_START_RETRY_DELAY));
  }

  return false;
};

export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
      
    } catch (error: any) {
      lastError = error;
      
      if (
        (error.name === 'AbortError' || 
         error.name === 'TypeError' ||
         error.message?.includes('fetch')) &&
        i < maxRetries - 1
      ) {
        console.warn(` Request failed (attempt ${i + 1}/${maxRetries}), retrying in 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

if (import.meta.env.DEV) {
  console.log(' API Configuration:');
  console.log('  Base URL:', API_BASE_URL);
  console.log('  Mode:', import.meta.env.MODE);
  console.log('  Warmup: Enabled');

  testApiConnection().catch(error => {
    console.warn(' Initial API connection check failed:', error);
    console.info(' The app will continue to work. API calls will retry when needed.');
  });

  warmupManager.start().catch(error => {
    console.error(' Failed to start warmup:', error);
  });
}

if (!import.meta.env.DEV && typeof window !== 'undefined') {
  warmupManager.start();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    warmupManager.stop();
  });
}

export const apiWarmup = {
  getStatus: () => warmupManager.getStatus(),
  getMetrics: () => warmupManager.getMetrics(),
  isHealthy: () => warmupManager.isHealthy(),
  onStatusChange: (listener: (status: BackendStatus) => void) => 
    warmupManager.onStatusChange(listener),
  forcePing: () => warmupManager.forcePing(),
  start: () => warmupManager.start(),
  stop: () => warmupManager.stop(),
};
