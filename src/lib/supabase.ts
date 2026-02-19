import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export interface ContactMessage {
  id?: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  wallet_address?: string | null;
  created_at?: string;
  read?: boolean;
}

export const contactAPI = {
  async create(data: Omit<ContactMessage, 'id' | 'created_at' | 'read'>) {
    const { data: result, error } = await supabase
      .from('contact_messages')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return result as ContactMessage;
  },

  async getAll(unreadOnly: boolean = false) {
    let query = supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (unreadOnly) {
      query = query.eq('read', false);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as ContactMessage[];
  },

  async markAsRead(id: number) {
    const { error } = await supabase
      .from('contact_messages')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export interface DeFiProtocol {
  id: number;
  protocol_address: string;
  name: string;
  apy: number;
  risk_level: number;                               // 1=Low, 2=Medium, 3=High
  is_active: boolean;
  is_verified: boolean;
  total_deposited: number;
  protocol_type?: string;
  description?: string;
  website_url?: string;
  added_timestamp: string;
  last_updated: string;
  verified_at?: string;
  verified_by?: string;
}

export interface UserPreferenceDB {
  id: number;
  user_address: string;
  selected_protocol?: string;
  auto_compound: boolean;
  risk_tolerance: number;                           // 1=Low, 2=Medium, 3=High
  strategy_type: number;                            // 0=Manual, 1=BestAPY, 2=RiskAdjusted, 3=Diversified
  diversification_percent: number;
  rebalance_threshold: number;
  total_deposited: number;
  total_withdrawn: number;
  lifetime_earnings: number;
  last_config_update: string;
}

export interface UserProtocolDeposit {
  id: number;
  user_address: string;
  protocol_address: string;
  total_deposited: number;
  total_withdrawn: number;
  current_balance: number;
  earned_interest: number;
  first_deposit_at?: string;
  last_deposit_at?: string;
}

export interface RoutingHistory {
  id: number;
  user_address: string;
  protocol_address: string;
  amount: number;
  transaction_hash: string;
  block_number?: number;
  strategy_used?: number;
  protocol_apy_at_time?: number;
  status: 'pending' | 'confirmed' | 'failed';
  routed_at: string;
  confirmed_at?: string;
}

export interface GlobalProtocolStats {
  total_protocols: number;
  active_protocols: number;
  verified_protocols: number;
  total_tvl: number;
  average_apy: number;
}

export const protocolsAPI = {
  async getAll(activeOnly = true) {
    let query = supabase
      .from('defi_protocols')
      .select('*')
      .order('apy', { ascending: false });
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as DeFiProtocol[];
  },

  async getByAddress(protocolAddress: string) {
    const { data, error } = await supabase
      .from('defi_protocols')
      .select('*')
      .eq('protocol_address', protocolAddress.toLowerCase())
      .single();
    if (error) throw error;
    return data as DeFiProtocol;
  },

  async getByRisk(riskLevel: number) {
    const { data, error } = await supabase
      .from('defi_protocols')
      .select('*')
      .eq('is_active', true)
      .eq('risk_level', riskLevel)
      .order('apy', { ascending: false });
    if (error) throw error;
    return data as DeFiProtocol[];
  },

  async getVerified() {
    const { data, error } = await supabase
      .from('defi_protocols')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('apy', { ascending: false });
    if (error) throw error;
    return data as DeFiProtocol[];
  },

  async getGlobalStats() {
    const { data, error } = await supabase.rpc('get_global_protocol_stats');
    if (error) throw error;
    return data as GlobalProtocolStats;
  },

  async syncFromContract(protocol: Omit<DeFiProtocol, 'id'>) {
    const { data, error } = await supabase
      .from('defi_protocols')
      .upsert(protocol, { onConflict: 'protocol_address' })
      .select()
      .single();
    if (error) throw error;
    return data as DeFiProtocol;
  },
};

export const userPreferencesAPI = {
  async get(userAddress: string) {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return data as UserPreferenceDB | null;
  },

  async upsert(
    userAddress: string,
    prefs: Partial<Omit<UserPreferenceDB, 'id' | 'user_address'>>
  ) {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_address: userAddress.toLowerCase(),
          ...prefs,
          last_config_update: new Date().toISOString(),
        },
        { onConflict: 'user_address' }
      )
      .select()
      .single();
    if (error) throw error;
    return data as UserPreferenceDB;
  },

  async getDeposits(userAddress: string) {
    const { data, error } = await supabase
      .from('user_protocol_deposits')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .order('current_balance', { ascending: false });
    if (error) throw error;
    return data as UserProtocolDeposit[];
  },

  async getRoutingHistory(userAddress: string, limit = 50) {
    const { data, error } = await supabase
      .from('routing_history')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .order('routed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as RoutingHistory[];
  },

  async recordRouting(
    userAddress: string,
    protocolAddress: string,
    amount: number,
    txHash: string
  ) {
    const { data, error } = await supabase
      .from('routing_history')
      .insert({
        user_address: userAddress.toLowerCase(),
        protocol_address: protocolAddress.toLowerCase(),
        amount,
        transaction_hash: txHash,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;
    return data as RoutingHistory;
  },

  async confirmRouting(txHash: string) {
    const { data, error } = await supabase
      .from('routing_history')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('transaction_hash', txHash)
      .select()
      .single();
    if (error) throw error;
    return data as RoutingHistory;
  },
};

export const realtimeAPI = {
  onProtocolsChange(callback: () => void) {
    return supabase
      .channel('protocols-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'defi_protocols' },
        callback
      )
      .subscribe();
  },

  onUserDepositsChange(userAddress: string, callback: () => void) {
    return supabase
      .channel(`deposits-${userAddress}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_protocol_deposits',
          filter: `user_address=eq.${userAddress.toLowerCase()}`,
        },
        callback
      )
      .subscribe();
  },

  onNewRouting(
    userAddress: string,
    callback: (payload: { new: RoutingHistory }) => void
  ) {
    return supabase
      .channel(`routing-${userAddress}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'routing_history',
          filter: `user_address=eq.${userAddress.toLowerCase()}`,
        },
        callback
      )
      .subscribe();
  },
};