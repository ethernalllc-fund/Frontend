export {
  default as env,
  API_URL,
  FAUCET_URL,
  SUPABASE_URL,
  SUPABASE_ANON,
  CHAIN_ID,
  EXPLORER_URL,
  ENABLE_DEBUG,
  ENABLE_ANALYTICS,
  ENABLE_FAUCET,
  ENABLE_EXPERIMENTAL,
  ENABLE_MOCKS,
} from './env';

export type { AppConfig } from './env';

export {
  getApiUrl,
  buildApiUrl,
  buildQueryString,
  ApiError,
  isApiError,
} from './api';

export { queryClient } from './queryClient';

export {
  supabase,
  contactAPI,
  protocolsAPI,
  userPreferencesAPI,
  realtimeAPI,
} from './supabase';

export type {
  ContactMessage,
  DeFiProtocol,
  UserPreferenceDB,
  UserProtocolDeposit,
  RoutingHistory,
  GlobalProtocolStats,
} from './supabase';

export {
  formatCurrency,
  formatUSDC,
  formatNumber,
  formatPercentage,
  formatTimestamp,
  formatAddress,
  formatToken,
  formatTokenWithSymbol,
  formatRelativeTime,
  formatDuration,
  formatCompact,
  formatHash,
  parseUSDC,
  parseToken,
  bigIntToNumber,
  isSafeBigInt,
  default as formatters,
} from './formatters';

export {
  validateAge,
  validateRetirementAge,
  validateAmount,
  validateInterestRate,
  validateAll,
  contractValidators,
  safeValidators,
  ContractInputError,
  isContractInputError,
} from './validators';

export type { ValidationResult } from './validators';
export {
  USER_PREFERENCES_ABI,
  PROTOCOL_REGISTRY_ABI,
  RISK_LEVELS,
  STRATEGY_TYPES,
  RISK_LABELS,
  STRATEGY_LABELS,
} from '@/lib/contracts-abi';

export type {
  UserConfig,
  RoutingStrategy,
  ProtocolComparison,
  ProtocolStats,
} from '@/lib/contracts-abi';

export { analytics } from './monitoring/analytics';
