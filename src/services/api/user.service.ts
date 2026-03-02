import { apiClient }    from './base.client';
import { API_ENDPOINTS } from '@/config/api.config';

export interface UserOut {
  wallet_address:           string;
  survey_completed:         boolean;
  survey_completed_at?:     string | null;
  age_range?:               string | null;
  risk_tolerance?:          number | null;
  crypto_experience?:       string | null;
  retirement_goal?:         string | null;
  investment_horizon_years?: number | null;
  monthly_income_range?:    string | null;
  country?:                 string | null;
  first_seen_at:            string;
  last_active_at?:          string | null;
  is_active?:               boolean | null;
}

export interface SurveySubmit {
  age_range:                string;
  risk_tolerance:           number;
  crypto_experience:        string;
  retirement_goal:          string;
  investment_horizon_years: number;
  monthly_income_range:     string;
  country?:                 string;
}

export const userService = {
  async getMe(): Promise<UserOut> {
    return apiClient.get<UserOut>(API_ENDPOINTS.USERS.ME);
  },

  async submitSurvey(data: SurveySubmit): Promise<UserOut> {
    return apiClient.post<UserOut>(API_ENDPOINTS.USERS.SURVEY, data);
  },
};

export default userService;