import { apiClient }    from './base.client';
import { API_ENDPOINTS } from '@/config/api.config';

export interface ContactCreate {
  name:          string;
  email:         string;
  subject?:      string;
  message:       string;
  walletAddress?: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
}

export const contactService = {
  async submitContact(data: ContactCreate): Promise<ContactResponse> {
    return apiClient.post<ContactResponse>(API_ENDPOINTS.CONTACT.BASE, data);
  },
};

export default contactService;