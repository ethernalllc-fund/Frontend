export { surveyService, default as surveyServiceDefault }   from './survey.service';
export { contactService, default as contactServiceDefault }  from './contact.service';
export { authService,   default as authServiceDefault }      from './auth.service';
export { statsService,  default as statsServiceDefault }     from './stats.service';
export { apiClient }                                         from './base.client';

export type { SurveyCreate, FollowUpCreate, SurveyResponse, FollowUpResponse } from './survey.service';
export type { ContactCreate, ContactResponse }                                  from './contact.service';
export type { NonceResponse, AuthResponse }                                     from './auth.service';
export type { AdminStats, SurveyAverages, AgeCount }                           from './stats.service';