/**
 * config/index.ts — Public API of the config layer.
 *
 * Import from here in the rest of the app:
 *   import { wagmiConfig, Web3Provider, FACTORY_ADDRESS } from '@/config'
 *
 * Naming convention for collisions:
 *   - web3.tsx  → ACTIVE_CHAINS / DEFAULT_CHAIN are the wagmi-ready chain tuples
 *   - chains.ts → DEFAULT_CHAIN / ACTIVE_CHAINS are the full metadata-rich arrays
 *   Since both are useful, web3 versions are aliased with WEB3_ prefix.
 */

export {
  wagmiAdapter,
  wagmiConfig,
  modal,
  queryClient,
  Web3Provider,
  IS_TESTNET,
  isActiveChain,
  getActiveChain,
  ACTIVE_CHAINS as WEB3_ACTIVE_CHAINS,
  DEFAULT_CHAIN as WEB3_DEFAULT_CHAIN,
} from './web3';

export {
  SUPPORTED_CHAINS,
  TESTNET_CHAINS,
  MAINNET_CHAINS,
  ACTIVE_CHAINS,
  DEFAULT_CHAIN,
  ACTIVE_CHAIN_IDS,
  CHAIN_IDS,
  TESTNET_CHAIN_IDS,
  MAINNET_CHAIN_IDS,
  CHAIN_METADATA,
  getChainById,
  getChainMetadata,
  getChainName,
  getChainShortName,
  getChainInfo,
  getChainStatus,
  getChainErrorMessage,
  isChainSupported,
  isChainActive,
  isTestnet,
  hasContracts,
  getFaucets,
  getBridge,
  getExplorerUrl,
  getExplorerAddressUrl,
  getExplorerTokenUrl,
  getActiveChains,
  getTestnetChains,
  getMainnetChains,
  getDeployedChains,
  getPendingChains,
  getChainsByPriority,
  getDeploymentSummary as getChainDeploymentSummary,
  validateChainConfig,
} from './chains';

export type {
  ChainMetadata,
  SupportedChainId,
  ActiveChainId,
  TestnetChainId,
  MainnetChainId,
} from './chains';

export {
  CONTRACT_ADDRESSES,
  DEPLOYMENT_STATUS,
  CONTRACT_CATEGORIES,
  ZERO_ADDRESS,
  TREASURY_ADDRESS,
  FACTORY_ADDRESS,
  USDC_ADDRESS,
  TOKEN_ADDRESS,
  PROTOCOL_REGISTRY_ADDRESS,
  USER_PREFERENCES_ADDRESS,
  DATETIME_ADDRESS,
  PERSONAL_FUND_ADDRESS,
  MOCK_USDC_ADDRESS,
  OFFICIAL_USDC_ADDRESS,
  getCurrentUSDCType,
  getOfficialUSDC,
  getMockUSDC,
  getUSDCForChain,
  hasUSDC,
  hasMockUSDC,
  getContractAddresses,
  getContractAddress,
  getContractsByCategory,
  getCategoryContracts,
  hasChainConfig,
  isValidAddress,
  isContractDeployed,
  isTestnetChain,
  areMainContractsDeployed,
  getDeployedContracts,
  getPendingContracts,
  getDeploymentProgress,
  getDeploymentStatus,
  getDeploymentSummary as getAddressDeploymentSummary,
  updateChainAddresses,
} from './addresses';

export type {
  ContractAddresses,
  ContractName,
  ChainId,
} from './addresses';

export {
  MOCK_USDC_ABI,
  USDC_DECIMALS,
  MINT_AMOUNT,
  MAX_MINT_PER_TX,
  MINT_PRESETS,
  toUSDCUnits,
  fromUSDCUnits,
  formatUSDC,
  isValidMintAmount,
} from './contracts.config';

export type { MintPreset } from './contracts.config';

export {
  appConfig,
  isValidChain,
  getFaucetUrl,
  isTestnet as isTestnetEnv,
} from './app';

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
} from '@/lib/env';

export type { AppConfig } from '@/lib/env';