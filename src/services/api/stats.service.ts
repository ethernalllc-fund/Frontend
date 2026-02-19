import { apiClient } from './base.client';
import { API_ENDPOINTS } from '../../config/api.config';

export interface UserStats {
  total: number;
  unique_wallets: number;
  with_email: number;
  top_wallet_providers: Record<string, number>;
}

export interface FaucetStats {
  total_requests: number;
  successful: number;
  failed: number;
  total_dispensed_usdc: number;
  average_per_request_usdc: number;
  top_5_receivers: Array<{
    wallet: string;
    total_usdc: number;
    requests: number;
  }>;
}

export interface ContactStats {
  total_messages: number;
  unread: number;
}

export interface AdminStats {
  users: UserStats;
  faucet: FaucetStats;
  contacts: ContactStats;
  generated_at: string;
}

export interface FormattedStats {
  users: {
    total: string;
    uniqueWallets: string;
    withEmail: string;
    emailPercentage: string;
    topProviders: Record<string, number>;
  };
  faucet: {
    totalRequests: string;
    successful: string;
    failed: string;
    successRate: string;
    totalDispensed: string;
    averagePerRequest: string;
    topReceivers: Array<{
      wallet: string;
      total_usdc: number;
      requests: number;
    }>;
  };
  contacts: {
    total: string;
    unread: string;
    readPercentage: string;
  };
  generatedAt: string;
}

export const statsService = {
  async getAdminStats(): Promise<AdminStats> {
    return apiClient.get<AdminStats>(
      API_ENDPOINTS.STATS.ADMIN
    );
  },

  formatStats(stats: AdminStats): FormattedStats {
    return {
      users: {
        total: stats.users.total.toLocaleString(),
        uniqueWallets: stats.users.unique_wallets.toLocaleString(),
        withEmail: stats.users.with_email.toLocaleString(),
        emailPercentage: stats.users.total > 0
          ? ((stats.users.with_email / stats.users.total) * 100).toFixed(1) + '%'
          : '0%',
        topProviders: stats.users.top_wallet_providers,
      },
      faucet: {
        totalRequests: stats.faucet.total_requests.toLocaleString(),
        successful: stats.faucet.successful.toLocaleString(),
        failed: stats.faucet.failed.toLocaleString(),
        successRate: stats.faucet.total_requests > 0
          ? ((stats.faucet.successful / stats.faucet.total_requests) * 100).toFixed(1) + '%'
          : '0%',
        totalDispensed: '$' + stats.faucet.total_dispensed_usdc.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        averagePerRequest: '$' + stats.faucet.average_per_request_usdc.toFixed(6),
        topReceivers: stats.faucet.top_5_receivers,
      },
      contacts: {
        total: stats.contacts.total_messages.toLocaleString(),
        unread: stats.contacts.unread.toLocaleString(),
        readPercentage: stats.contacts.total_messages > 0
          ? (((stats.contacts.total_messages - stats.contacts.unread) / stats.contacts.total_messages) * 100).toFixed(1) + '%'
          : '0%',
      },
      generatedAt: new Date(stats.generated_at).toLocaleString(),
    };
  },

  async getUserStats(): Promise<UserStats> {
    const stats = await this.getAdminStats();
    return stats.users;
  },

  async getFaucetStats(): Promise<FaucetStats> {
    const stats = await this.getAdminStats();
    return stats.faucet;
  },

  async getContactStats(): Promise<ContactStats> {
    const stats = await this.getAdminStats();
    return stats.contacts;
  },

  calculateGrowthRate(oldStats: AdminStats, newStats: AdminStats): number {
    if (oldStats.users.total === 0) return 0;
    
    const growth = ((newStats.users.total - oldStats.users.total) / oldStats.users.total) * 100;
    return parseFloat(growth.toFixed(2));
  },

  calculateEngagementMetrics(stats: AdminStats) {
    return {
      emailCaptureRate: stats.users.total > 0
        ? parseFloat(((stats.users.with_email / stats.users.total) * 100).toFixed(2))
        : 0,
      
      faucetSuccessRate: stats.faucet.total_requests > 0
        ? parseFloat(((stats.faucet.successful / stats.faucet.total_requests) * 100).toFixed(2))
        : 0,
      
      contactResponseRate: stats.contacts.total_messages > 0
        ? parseFloat((((stats.contacts.total_messages - stats.contacts.unread) / stats.contacts.total_messages) * 100).toFixed(2))
        : 0,
      
      averageUsdcPerUser: stats.users.total > 0
        ? parseFloat((stats.faucet.total_dispensed_usdc / stats.users.total).toFixed(2))
        : 0,
    };
  },

  exportToJSON(stats: AdminStats): string {
    return JSON.stringify(stats, null, 2);
  },

  exportToCSV(stats: AdminStats): string {
    const rows = [
      ['Metric', 'Value'],
      ['Generated At', stats.generated_at],
      ['', ''],
      ['USERS', ''],
      ['Total Users', stats.users.total],
      ['Unique Wallets', stats.users.unique_wallets],
      ['Users with Email', stats.users.with_email],
      ['Email Percentage', `${((stats.users.with_email / stats.users.total) * 100).toFixed(2)}%`],
      ['', ''],
      ['FAUCET', ''],
      ['Total Requests', stats.faucet.total_requests],
      ['Successful', stats.faucet.successful],
      ['Failed', stats.faucet.failed],
      ['Success Rate', `${((stats.faucet.successful / stats.faucet.total_requests) * 100).toFixed(2)}%`],
      ['Total USDC Dispensed', stats.faucet.total_dispensed_usdc],
      ['Average per Request', stats.faucet.average_per_request_usdc],
      ['', ''],
      ['CONTACTS', ''],
      ['Total Messages', stats.contacts.total_messages],
      ['Unread', stats.contacts.unread],
      ['Read Percentage', `${(((stats.contacts.total_messages - stats.contacts.unread) / stats.contacts.total_messages) * 100).toFixed(2)}%`],
    ];

    return rows.map(row => row.join(',')).join('\n');
  },

  async getQuickSummary() {
    const stats = await this.getAdminStats();
    
    return {
      totalUsers: stats.users.total,
      usersWithEmail: stats.users.with_email,
      totalFaucetRequests: stats.faucet.total_requests,
      totalUsdcDispensed: stats.faucet.total_dispensed_usdc,
      unreadMessages: stats.contacts.unread,
      successRate: stats.faucet.total_requests > 0
        ? parseFloat(((stats.faucet.successful / stats.faucet.total_requests) * 100).toFixed(1))
        : 0,
    };
  },

  getTopWalletProviders(stats: AdminStats, limit: number = 10) {
    return Object.entries(stats.users.top_wallet_providers)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  checkAlerts(stats: AdminStats) {
    return {
      unreadMessages: {
        active: stats.contacts.unread > 10,
        severity: stats.contacts.unread > 50 ? 'high' : 'medium',
        message: `You have ${stats.contacts.unread} unread messages`,
      },
      faucetFailureRate: {
        active: stats.faucet.total_requests > 0 && 
                (stats.faucet.failed / stats.faucet.total_requests) > 0.2,
        severity: 'high',
        message: `Faucet failure rate is ${((stats.faucet.failed / stats.faucet.total_requests) * 100).toFixed(1)}%`,
      },
      lowEmailCapture: {
        active: stats.users.total > 100 && 
                (stats.users.with_email / stats.users.total) < 0.3,
        severity: 'low',
        message: `Only ${((stats.users.with_email / stats.users.total) * 100).toFixed(1)}% of users have email`,
      },
    };
  },
};

export default statsService;