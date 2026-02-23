// src/services/api/contact.service.ts

import { apiClient } from './base.client';
import { API_ENDPOINTS } from '../../config/api.config';

/**
 * Contact Types
 */
export interface ContactCreate {
  name: string;
  email: string;
  subject: string;
  message: string;
  wallet_address?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ContactResponse {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  wallet_address?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  is_read: boolean;
}

export interface ContactAdmin extends ContactResponse {
  created_at: string;
  updated_at?: string;
}

export interface ContactMarkRead {
  is_read: boolean;
}

export interface ContactReply {
  reply_content: string;
  admin_name: string;
}

export interface ContactStats {
  total_messages: number;
  unread_messages: number;
  messages_last_7_days: number;
  read_percentage: number;
}

export const contactService = {
  async submitContact(data: ContactCreate): Promise<ContactResponse> {
    return apiClient.post<ContactResponse>(
      API_ENDPOINTS.CONTACT.BASE,
      data
    );
  },

  async getAllMessages(
    skip: number = 0,
    limit: number = 100,
    unreadOnly: boolean = false
  ): Promise<ContactAdmin[]> {
    return apiClient.get<ContactAdmin[]>(
      API_ENDPOINTS.CONTACT.MESSAGES,
      { skip, limit, unread_only: unreadOnly }
    );
  },

  async getMessage(contactId: number): Promise<ContactAdmin> {
    return apiClient.get<ContactAdmin>(
      API_ENDPOINTS.CONTACT.MESSAGE(contactId)
    );
  },

  async markAsRead(
    contactId: number,
    isRead: boolean
  ): Promise<ContactAdmin> {
    return apiClient.patch<ContactAdmin>(
      API_ENDPOINTS.CONTACT.MARK_READ(contactId),
      { is_read: isRead }
    );
  },

  async deleteMessage(contactId: number): Promise<void> {
    return apiClient.delete<void>(
      API_ENDPOINTS.CONTACT.MESSAGE(contactId)
    );
  },

  async replyToContact(
    contactId: number,
    replyContent: string,
    adminName: string
  ): Promise<{ message: string; contact_id: number; recipient: string }> {
    return apiClient.post(
      API_ENDPOINTS.CONTACT.REPLY(contactId),
      { reply_content: replyContent, admin_name: adminName }
    );
  },

  async getStats(): Promise<ContactStats> {
    return apiClient.get<ContactStats>(
      API_ENDPOINTS.CONTACT.STATS
    );
  },
};

export default contactService;