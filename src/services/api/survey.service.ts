import { z }           from 'zod';
import { ApiError }    from '@/lib/api';
import { API_URL }     from '@/lib/env';
import { API_ENDPOINTS, API_CONFIG } from '@/config/api.config';

export const SurveyCreateSchema = z.object({
  age:                      z.string(),
  trust_traditional:        z.number().int().min(-2).max(2),
  blockchain_familiarity:   z.number().int().min(-2).max(2),
  retirement_concern:       z.number().int().min(-2).max(2),
  has_retirement_plan:      z.number().int().min(-2).max(2),
  values_in_retirement:     z.number().int().min(-2).max(2),
  interested_in_blockchain: z.number().int().min(-2).max(2),
});

export const FollowUpCreateSchema = z.object({
  wants_more_info: z.boolean(),
  email:           z.string().email().optional(),
  survey_id:       z.number().int().optional(),
});

export type SurveyCreate  = z.infer<typeof SurveyCreateSchema>;
export type FollowUpCreate = z.infer<typeof FollowUpCreateSchema>;
export interface SurveyResponse {
  success:   boolean;
  survey_id: number;
  synced?:   boolean;
}

export interface FollowUpResponse {
  success: boolean;
  synced?: boolean;
}

interface PendingItem {
  id:          string;
  type:        'survey' | 'followup';
  data:        SurveyCreate | FollowUpCreate;
  timestamp:   number;
  attempts:    number;
  lastAttempt?: number;
}

const STORAGE_KEY  = 'ethernal_pending_surveys';
const MAX_ATTEMPTS = 10;
const SYNC_INTERVAL = 5 * 60_000;  

const pendingStore = {
  getAll(): PendingItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  },
  add(type: PendingItem['type'], data: PendingItem['data']): PendingItem {
    const item: PendingItem = {
      id:        `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type, data,
      timestamp: Date.now(),
      attempts:  0,
    };
    const all = [...this.getAll(), item];
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* noop */ }
    return item;
  },
  remove(id: string): void {
    try {
      const filtered = this.getAll().filter(i => i.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch { /* noop */ }
  },
  update(id: string, patch: Partial<Pick<PendingItem, 'attempts' | 'lastAttempt'>>): void {
    try {
      const all = this.getAll().map(i => i.id === id ? { ...i, ...patch } : i);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch { /* noop */ }
  },
};

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const url  = `${API_URL}${endpoint}`;
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), API_CONFIG.TIMEOUT);

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  ctrl.signal,
    });
    clearTimeout(tid);

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(json.detail ?? `HTTP ${res.status}`, res.status, json);
    }
    return json as T;
  } catch (err) {
    clearTimeout(tid);
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : 'Network error';
    throw new ApiError(msg, 0);
  }
}

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let syncRunning = false;

async function syncPending(): Promise<{ synced: number; failed: number }> {
  if (syncRunning) return { synced: 0, failed: 0 };
  const pending = pendingStore.getAll();
  if (!pending.length) return { synced: 0, failed: 0 };

  syncRunning = true;
  let synced = 0, failed = 0;

  for (const item of pending) {
    try {
      if (item.type === 'survey') {
        await post(API_ENDPOINTS.SURVEY.BASE, item.data);
      } else {
        await post(API_ENDPOINTS.SURVEY.FOLLOWUP, item.data);
      }
      pendingStore.remove(item.id);
      synced++;
    } catch {
      failed++;
      const attempts = item.attempts + 1;
      if (attempts > MAX_ATTEMPTS) {
        pendingStore.remove(item.id);
      } else {
        pendingStore.update(item.id, { attempts, lastAttempt: Date.now() });
      }
    }
  }

  syncRunning = false;
  return { synced, failed };
}

export const surveyService = {

  async createSurvey(data: SurveyCreate): Promise<SurveyResponse> {
    const validated = SurveyCreateSchema.parse(data);
    try {
      const res = await post<SurveyResponse>(API_ENDPOINTS.SURVEY.BASE, validated);
      return { ...res, synced: true };
    } catch {
      pendingStore.add('survey', validated);
      return { success: true, survey_id: 0, synced: false };
    }
  },

  async createFollowUp(data: FollowUpCreate): Promise<FollowUpResponse> {
    const validated = FollowUpCreateSchema.parse(data);
    try {
      const res = await post<FollowUpResponse>(API_ENDPOINTS.SURVEY.FOLLOWUP, validated);
      return { ...res, synced: true };
    } catch {
      pendingStore.add('followup', validated);
      return { success: true, synced: false };
    }
  },

  getPendingCount(): number {
    return pendingStore.getAll().length;
  },

  async syncPending() {
    return syncPending();
  },

  startAutoSync(): void {
    if (syncIntervalId) return;
    void syncPending();
    syncIntervalId = setInterval(() => void syncPending(), SYNC_INTERVAL);
  },

  stopAutoSync(): void {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
    }
  },
};

if (typeof window !== 'undefined') {
  surveyService.startAutoSync();
  window.addEventListener('beforeunload', () => surveyService.stopAutoSync());
}

export default surveyService;