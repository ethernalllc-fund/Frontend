import { z } from 'zod';
import { ApiError, isApiError } from '@/lib/api';
import { API_URL } from '@/lib/env';

export const SurveyCreateSchema = z.object({
  age: z.string(),
  trust_traditional: z.number().min(-2).max(2),
  blockchain_familiarity: z.number().min(-2).max(2),
  retirement_concern: z.number().min(-2).max(2),
  has_retirement_plan: z.number().min(-2).max(2),
  values_in_retirement: z.number().min(-2).max(2),
  interested_in_blockchain: z.number().min(-2).max(2),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

export const FollowUpCreateSchema = z.object({
  wants_more_info: z.boolean(),
  email: z.string().email().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

export type SurveyCreate = z.infer<typeof SurveyCreateSchema>;
export type FollowUpCreate = z.infer<typeof FollowUpCreateSchema>;
export interface SurveyResponse {
  id: number;
  age: string;
  trust_traditional: number;
  blockchain_familiarity: number;
  retirement_concern: number;
  has_retirement_plan: number;
  values_in_retirement: number;
  interested_in_blockchain: number;
  created_at: string;
  synced?: boolean; 
}

export interface FollowUpResponse {
  id: number;
  wants_more_info: boolean;
  email?: string;
  created_at: string;
  synced?: boolean;
}

interface PendingSurvey {
  id: string;
  type: 'survey' | 'followup';
  data: SurveyCreate | FollowUpCreate;
  timestamp: number;
  attempts: number;
  lastAttempt?: number; // Único campo opcional
}

interface FetchWithRetryOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface PendingStats {
  count: number;
  oldestTimestamp: number | null;
  totalAttempts: number;
  byType: {
    survey: number;
    followup: number;
  };
}

const CONFIG = {
  COLD_START_TIMEOUT: 180000,    // 3 minutos para primer intento (cold start)
  NORMAL_TIMEOUT: 60000,          // 60 segundos para reintentos
  MAX_RETRIES: 5,                 // Número máximo de reintentos
  BASE_RETRY_DELAY: 2000,         // Delay base entre reintentos (2s)
  BACKOFF_FACTOR: 1.5,            // Factor de incremento exponencial
  SYNC_INTERVAL: 300000,          // Intervalo de auto-sync (5 minutos)
  MAX_SYNC_ATTEMPTS: 10,          // Abandonar después de 10 intentos
  STORAGE_KEY: 'ethernity_pending_surveys',
  VERBOSE: true,
} as const;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 60000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    console.log('🌐 API Request:', { url, method: options.method || 'GET' });
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error('⌛ Request timeout:', url);
      throw new ApiError(
        `Request timeout - Server took longer than ${timeoutMs}ms to respond. Backend may be cold-starting.`,
        408
      );
    }
    
    throw error;
  }
}

async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = CONFIG.NORMAL_TIMEOUT,
    retries = CONFIG.MAX_RETRIES,
    retryDelay = CONFIG.BASE_RETRY_DELAY,
    ...fetchOptions
  } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt + 1}/${retries + 1}...`);
      const currentTimeout = attempt === 0 ? CONFIG.COLD_START_TIMEOUT : timeout;
      const response = await fetchWithTimeout(url, fetchOptions, currentTimeout);

      if (response.ok || response.status < 500) {
        if (!response.ok && response.status >= 400) {
          throw new ApiError(
            `Client error: ${response.status}`,
            response.status
          );
        }
        return response;
      }

      throw new ApiError(
        `Server error: ${response.status}`,
        response.status
      );
      
    } catch (error: any) {
      lastError = error;
      if (attempt === retries) {
        break;
      }
      
      // Solo reintentar en errores recuperables
      if (
        isApiError(error) && 
        (error.status === 408 || (error.status && error.status >= 500))
      ) {
        // Calcular delay con backoff exponencial
        const delay = retryDelay * Math.pow(CONFIG.BACKOFF_FACTOR, attempt);
        console.log(`⏳ Retrying in ${delay}ms... (${retries - attempt} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Error no recuperable, lanzar inmediatamente
      throw error;
    }
  }
  
  throw lastError || new ApiError('All retry attempts failed');
}

async function request<T>(
  endpoint: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetchWithRetry(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type');
  
  // Si no es JSON, verificar si es error
  if (!contentType?.includes('application/json')) {
    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }
    return {} as T;
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new ApiError(
      data.detail || data.message || `HTTP ${response.status}`,
      response.status,
      data
    );
  }
  
  return data;
}

class PendingSurveysStore {
  private readonly storageKey = CONFIG.STORAGE_KEY;
  getAll(): PendingSurvey[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      // Asegurar que es un array válido
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('❌ Error reading pending surveys:', error);
      return [];
    }
  }

  save(
    survey: {
      type: 'survey' | 'followup';
      data: SurveyCreate | FollowUpCreate;
    }
  ): PendingSurvey {
    const pending: PendingSurvey = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: survey.type,
      data: survey.data,
      timestamp: Date.now(),
      attempts: 0,
    };
    
    const all: PendingSurvey[] = this.getAll();
    const newAll: PendingSurvey[] = [...all, pending];
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(newAll));
      console.log('💾 Survey saved locally:', pending.id);
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
    
    return pending;
  }

  remove(id: string): void {
    try {
      const all: PendingSurvey[] = this.getAll();
      const filtered: PendingSurvey[] = all.filter(s => s.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('❌ Error removing survey:', error);
    }
  }

  update(id: string, updates: Partial<Pick<PendingSurvey, 'attempts' | 'lastAttempt'>>): void {
    try {
      const all: PendingSurvey[] = this.getAll();
      const index = all.findIndex(s => s.id === id);
      
      if (index !== -1) {
        const current = all[index];
        
        // Verificación extra para TypeScript (aunque index !== -1 ya lo garantiza)
        if (!current) {
          console.error('❌ Survey not found at index:', index);
          return;
        }

        const updated: PendingSurvey = {
          id: current.id,
          type: current.type,
          data: current.data,
          timestamp: current.timestamp,
          attempts: updates.attempts !== undefined ? updates.attempts : current.attempts,
          lastAttempt: updates.lastAttempt !== undefined ? updates.lastAttempt : current.lastAttempt,
        };
        
        all[index] = updated;
        localStorage.setItem(this.storageKey, JSON.stringify(all));
      }
    } catch (error) {
      console.error('❌ Error updating survey:', error);
    }
  }

  getStats(): PendingStats {
    const all: PendingSurvey[] = this.getAll();
    
    return {
      count: all.length,
      oldestTimestamp: all.length > 0 
        ? Math.min(...all.map(s => s.timestamp))
        : null,
      totalAttempts: all.reduce((sum, s) => sum + s.attempts, 0),
      byType: {
        survey: all.filter(s => s.type === 'survey').length,
        followup: all.filter(s => s.type === 'followup').length,
      },
    };
  }
}

const store = new PendingSurveysStore();

class SyncManager {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.intervalId) {
      console.warn('⚠️ Sync already running');
      return;
    }
    
    console.log('🔄 Starting auto-sync...');
    
    // Sync inmediato al iniciar
    this.syncNow();
    
    // Programar syncs periódicos
    this.intervalId = setInterval(() => {
      this.syncNow();
    }, CONFIG.SYNC_INTERVAL);
    
    const minutes = CONFIG.SYNC_INTERVAL / 60000;
    console.log(`⏰ Auto-sync scheduled every ${minutes} minutes`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Auto-sync stopped');
    }
  }

  async syncNow(): Promise<{ synced: number; failed: number }> {
    if (this.isRunning) {
      console.log('⏭️ Sync already in progress, skipping...');
      return { synced: 0, failed: 0 };
    }
    
    const pending = store.getAll();
    
    if (pending.length === 0) {
      return { synced: 0, failed: 0 };
    }
    
    this.isRunning = true;
    console.log(`🔄 Syncing ${pending.length} pending items...`);
    
    let synced = 0;
    let failed = 0;
    
    for (const item of pending) {
      try {
        // Intentar enviar al servidor (sin reintentos agresivos)
        if (item.type === 'survey') {
          await request<SurveyResponse>('/api/v1/surveys/', {
            method: 'POST',
            body: JSON.stringify(item.data),
            timeout: CONFIG.NORMAL_TIMEOUT,
            retries: 1, // Solo 1 reintento en sync automático
          });
        } else if (item.type === 'followup') {
          await request<FollowUpResponse>('/api/v1/surveys/follow-up', {
            method: 'POST',
            body: JSON.stringify(item.data),
            timeout: CONFIG.NORMAL_TIMEOUT,
            retries: 1,
          });
        }
        
        // Éxito: eliminar de pendientes
        store.remove(item.id);
        synced++;
        console.log(`✅ Synced ${item.type} ${item.id}`);
        
      } catch (error) {
        // Fallo: incrementar intentos
        const newAttempts = item.attempts + 1;
        failed++;
        
        console.warn(`⚠️ Failed to sync ${item.id} (attempt ${newAttempts})`);
        
        // Abandonar si superó max intentos
        if (newAttempts > CONFIG.MAX_SYNC_ATTEMPTS) {
          console.error(`❌ Giving up on ${item.id} after ${newAttempts} attempts`);
          store.remove(item.id);
        } else {
          // Actualizar intentos
          store.update(item.id, { 
            attempts: newAttempts,
            lastAttempt: Date.now(),
          });
        }
      }
    }
    
    this.isRunning = false;
    
    if (synced > 0 || failed > 0) {
      console.log(`📊 Sync complete: ${synced} synced, ${failed} failed`);
    }
    
    return { synced, failed };
  }
}

const syncManager = new SyncManager();

export const surveyService = {
  async createSurvey(data: SurveyCreate): Promise<SurveyResponse> {
    console.log('📊 Creating survey...', data);
    const validated = SurveyCreateSchema.parse(data);
    
    try {
      // Intentar enviar a API
      const response = await request<SurveyResponse>('/api/v1/surveys/', {
        method: 'POST',
        body: JSON.stringify(validated),
        timeout: CONFIG.NORMAL_TIMEOUT,
        retries: CONFIG.MAX_RETRIES,
        retryDelay: CONFIG.BASE_RETRY_DELAY,
      });
      
      console.log('✅ Survey created successfully:', response.id);
      return { ...response, synced: true };
      
    } catch (error) {
      console.warn('⚠️ API unavailable, saving survey locally');
      const pending = store.save({
        type: 'survey',
        data: validated,
      });

      return {
        id: parseInt(pending.id.replace(/\D/g, ''), 10) || 0,
        ...validated,
        created_at: new Date(pending.timestamp).toISOString(),
        synced: false, // Marca como NO sincronizada
      };
    }
  },

  async createFollowUp(data: FollowUpCreate): Promise<FollowUpResponse> {
    console.log('📧 Creating follow-up...', data);
    
    const validated = FollowUpCreateSchema.parse(data);
    
    try {
      const response = await request<FollowUpResponse>('/api/v1/surveys/follow-up', {
        method: 'POST',
        body: JSON.stringify(validated),
        timeout: CONFIG.NORMAL_TIMEOUT,
        retries: CONFIG.MAX_RETRIES,
        retryDelay: CONFIG.BASE_RETRY_DELAY,
      });
      
      console.log('✅ Follow-up created successfully:', response.id);
      return { ...response, synced: true };
      
    } catch (error) {
      console.warn('⚠️ API unavailable, saving follow-up locally');
      
      const pending = store.save({
        type: 'followup',
        data: validated,
      });
      
      return {
        id: parseInt(pending.id.replace(/\D/g, ''), 10) || 0,
        wants_more_info: validated.wants_more_info,
        email: validated.email,
        created_at: new Date(pending.timestamp).toISOString(),
        synced: false,
      };
    }
  },

  async getSurveys(limit = 100, offset = 0): Promise<SurveyResponse[]> {
    return request<SurveyResponse[]>(
      `/api/v1/surveys/?limit=${limit}&offset=${offset}`,
      { timeout: 30000 }
    );
  },

  getPendingStats(): PendingStats {
    return store.getStats();
  },

  async syncPending(): Promise<{ synced: number; failed: number }> {
    return syncManager.syncNow();
  },

  startAutoSync(): void {
    syncManager.start();
  },

  stopAutoSync(): void {
    syncManager.stop();
  },
};

export async function wakeUpBackend(): Promise<boolean> {
  try {
    console.log('☕ Waking up backend...');
    await fetchWithTimeout(`${API_URL}/health`, {
      method: 'GET',
    }, 60000);
    
    console.log('✅ Backend is awake!');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to wake up backend:', error);
    return false;
  }
}

export interface ContactCreate {
  name: string;
  email: string;
  subject: string;
  message: string;
  walletAddress?: string;
}

export const contactService = {
  async submitContact(data: ContactCreate): Promise<any> {
    return request('/api/v1/contact/', {
      method: 'POST',
      body: JSON.stringify(data),
      timeout: 30000,
      retries: 2,
    });
  },
};

if (typeof window !== 'undefined') {
  surveyService.startAutoSync();
  window.addEventListener('beforeunload', () => {
    surveyService.stopAutoSync();
  });
}

export default surveyService;