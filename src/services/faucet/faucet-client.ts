export interface FaucetRequest {
  wallet_address: string;
  current_age: number;
  retirement_age: number;
  desired_monthly_payment: number;
  monthly_deposit: number;
  initial_amount: number;
}

export interface FaucetResponse {
  success: boolean;
  usdc_transaction_hash: string | null;
  eth_transaction_hash: string | null;
  message: string;
  usdc_amount_sent: string | null;
  eth_amount_sent: string | null;
  contract_type: string | null;
  explorer_usdc_url: string | null;
  explorer_eth_url: string | null;
}

export interface HealthResponse {
  status: string;
  database: string;
  blockchain: string;
  block_number: number;
  faucet_address: string;
  contract_address: string;
  faucet_usdc_balance: string;
  faucet_eth_balance: string;
  usdc_per_request: string;
  eth_per_request: string;
  total_requests: number;
}

export interface HistoryItem {
  id: number;
  usdc_transaction_hash: string | null;
  eth_transaction_hash: string | null;
  usdc_amount_sent: number | null;
  eth_amount_sent: number | null;
  status: string;
  created_at: string;
  contract_type: string;
}

export interface Stats {
  total_requests: number;
  successful: number;
  failed: number;
  total_usdc: number;
  total_eth: number;
  unique_wallets: number;
}

export interface ConfigResponse {
  network: {
    name: string;
    rpc_url: string;
    chain_id: number;
    explorer: string;
  };
  contract: {
    address: string;
    type: string;
  };
  faucet: {
    address: string;
    usdc_per_request: string;
    eth_per_request: string;
    rate_limit_hours: number;
  };
}

export class FaucetAPIClient {
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || import.meta.env.VITE_FAUCET_API_URL || 'http://localhost:8000';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  async requestTokens(data: FaucetRequest): Promise<FaucetResponse> {
    return this.request<FaucetResponse>('/api/request-tokens', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getHistory(walletAddress: string): Promise<HistoryItem[]> {
    return this.request<HistoryItem[]>(`/api/history/${walletAddress}`);
  }

  async getStats(): Promise<Stats> {
    return this.request<Stats>('/api/stats');
  }

  async getConfig(): Promise<ConfigResponse> {
    return this.request<ConfigResponse>('/api/config');
  }
}

export default FaucetAPIClient;