import { apiClient }    from './base.client';
import { API_ENDPOINTS } from '@/config/api.config';

export interface SurveyAverages {
  trust_traditional:        number;
  blockchain_familiarity:   number;
  retirement_concern:       number;
  has_retirement_plan:      number;
  values_in_retirement:     number;
  interested_in_blockchain: number;
}

export interface AgeCount {
  age:   string;
  count: number;
}

export interface AdminStats {
  users: {
    total:            number;
    survey_completed: number;
    [key: string]:    unknown;
  };
  funds: {
    total?:           number;
    [key: string]:    unknown;
  };
  treasury: {
    [key: string]: unknown;
  };
  surveys: {
    total:            number;
    wanting_more_info: number;
    averages:         SurveyAverages;
    by_age:           AgeCount[];
  };
  contacts: {
    total: number;
    new:   number;
  };
}

export const statsService = {

  async getAdminStats(): Promise<AdminStats> {
    return apiClient.get<AdminStats>(API_ENDPOINTS.ADMIN.STATS);
  },

  summarize(stats: AdminStats) {
    const { users, surveys, contacts } = stats;
    const surveyRate = users.total > 0
      ? ((users.survey_completed / users.total) * 100).toFixed(1)
      : '0';

    return {
      users: {
        total:           users.total.toLocaleString(),
        surveyCompleted: users.survey_completed.toLocaleString(),
        surveyRate:      `${surveyRate}%`,
      },
      surveys: {
        total:            surveys.total.toLocaleString(),
        wantingMoreInfo:  surveys.wanting_more_info.toLocaleString(),
        conversionRate:   surveys.total > 0
          ? `${((surveys.wanting_more_info / surveys.total) * 100).toFixed(1)}%`
          : '0%',
        averages:         surveys.averages,
        byAge:            surveys.by_age,
      },
      contacts: {
        total: contacts.total.toLocaleString(),
        new:   contacts.new.toLocaleString(),
        readRate: contacts.total > 0
          ? `${(((contacts.total - contacts.new) / contacts.total) * 100).toFixed(1)}%`
          : '0%',
      },
    };
  },
};

export default statsService;