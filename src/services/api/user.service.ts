import { apiClient } from './base.client';
import { API_ENDPOINTS } from '../../config/api.config';

export interface UserCreate {
  wallet_address: string;
  email?: string;
  ip_address?: string;
  user_agent?: string;
  accepts_marketing?: boolean;
  accepts_notifications?: boolean;
}

export interface EmailAssociation {
  address: string;
  email: string;
  accepts_marketing?: boolean;
  accepts_notifications?: boolean;
}

export interface UserResponse {
  id: number;
  wallet_address: string;
  email?: string;
  email_verified: boolean;
  accepts_marketing: boolean;
  accepts_notifications: boolean;
  created_at: string;
  last_login?: string;
}

export interface UserAdmin extends UserResponse {
  ip_address?: string;
  user_agent?: string;
  updated_at?: string;
}

export interface UserUpdate {
  email?: string;
  email_verified?: boolean;
  accepts_marketing?: boolean;
  accepts_notifications?: boolean;
}

export const userService = {
  async register(data: UserCreate): Promise<UserResponse> {
    return apiClient.post<UserResponse>(
      API_ENDPOINTS.USERS.REGISTER,
      data
    );
  },

  async associateEmail(data: EmailAssociation): Promise<UserResponse> {
    return apiClient.post<UserResponse>(
      API_ENDPOINTS.USERS.EMAIL,
      data
    );
  },

  async getByWallet(walletAddress: string): Promise<UserResponse> {
    return apiClient.get<UserResponse>(
      API_ENDPOINTS.USERS.WALLET(walletAddress)
    );
  },

  async updateLogin(walletAddress: string): Promise<UserResponse> {
    return apiClient.post<UserResponse>(
      API_ENDPOINTS.USERS.LOGIN(walletAddress)
    );
  },

  async getAllUsers(
    skip: number = 0,
    limit: number = 100
  ): Promise<UserAdmin[]> {
    return apiClient.get<UserAdmin[]>(
      API_ENDPOINTS.USERS.BASE,
      { skip, limit }
    );
  },

  async getMailingList(
    acceptsMarketing: boolean = true,
    emailVerified: boolean = false
  ): Promise<UserAdmin[]> {
    return apiClient.get<UserAdmin[]>(
      API_ENDPOINTS.USERS.MAILING_LIST,
      { 
        accepts_marketing: acceptsMarketing, 
        email_verified: emailVerified 
      }
    );
  },

  async searchUsers(
    query: string,
    skip: number = 0,
    limit: number = 50
  ): Promise<UserAdmin[]> {
    return apiClient.get<UserAdmin[]>(
      API_ENDPOINTS.USERS.SEARCH,
      { q: query, skip, limit }
    );
  },

  async updateUser(
    userId: number,
    data: UserUpdate
  ): Promise<UserAdmin> {
    return apiClient.patch<UserAdmin>(
      API_ENDPOINTS.USERS.BY_ID(userId),
      data
    );
  },

  async walletExists(walletAddress: string): Promise<boolean> {
    try {
      await this.getByWallet(walletAddress);
      return true;
    } catch (error) {
      return false;
    }
  },

  async getOrCreate(walletAddress: string): Promise<UserResponse> {
    try {
      return await this.getByWallet(walletAddress);
    } catch (error) {
      return await this.register({ wallet_address: walletAddress });
    }
  },

  async getTotalCount(): Promise<number> {
    const allUsers = await this.getAllUsers(0, 10000);
    return allUsers.length;
  },

  async exportMailingListCSV(acceptsMarketing: boolean = true): Promise<string> {
    const users = await this.getMailingList(acceptsMarketing, false);
    const headers = ['Email', 'Wallet Address', 'Created At', 'Email Verified'];
    const rows = users.map(user => [
      user.email || '',
      user.wallet_address,
      user.created_at,
      user.email_verified ? 'Yes' : 'No'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  },
};

export default userService;