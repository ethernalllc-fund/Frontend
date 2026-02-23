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
  isChainSupported,
  isChainActive,
  isTestnet,
  hasContracts,
  getFaucets,
  getBridge,
  getExplorerUrl,
  getExplorerAddressUrl,
  getExplorerTokenUrl,
  getChainName,
  getChainShortName,
  getChainsByPriority,
  getActiveChains,
  getTestnetChains,
  getMainnetChains,
  getDeployedChains,
  getPendingChains,
  getChainErrorMessage,
  getChainStatus,
  getChainInfo,
  getDeploymentSummary as getChainDeploymentSummary,
  validateChainConfig,
} from './chains'

export type {
  ChainMetadata,
  SupportedChainId,
  ActiveChainId,
  TestnetChainId,
  MainnetChainId,
} from './chains'

export {
  wagmiConfig,
  wagmiAdapter,
  modal,
  queryClient,
  chains,
  isActiveChain,
  getActiveChain,
} from './web3'

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
} from './contracts.config'

export type { MintPreset } from './contracts.config'

export {

  CONTRACT_ADDRESSES,

  TREASURY_ADDRESS,
  FACTORY_ADDRESS,
  USDC_ADDRESS,
  TOKEN_ADDRESS,
  PROTOCOL_REGISTRY_ADDRESS,
  USER_PREFERENCES_ADDRESS,
  DATETIME_ADDRESS,
  PERSONAL_FUND_ADDRESS,

  // USDC helpers
  ZERO_ADDRESS,
  MOCK_USDC_ADDRESS,
  OFFICIAL_USDC_ADDRESS,
  getCurrentUSDCType,
  getOfficialUSDC,
  getMockUSDC,
  hasUSDC,
  hasMockUSDC,
  getUSDCForChain,

  // Helpers de contratos
  getContractAddresses,
  getContractAddress,
  hasChainConfig,
  isValidAddress,
  isContractDeployed,
  areMainContractsDeployed,
  isTestnetChain,
  getDeployedContracts,
  getPendingContracts,
  getDeploymentProgress,
  getDeploymentSummary as getAddressDeploymentSummary,
  getDeploymentStatus,
  updateChainAddresses,

  // Categorías
  CONTRACT_CATEGORIES,
  getCategoryContracts,
  getContractsByCategory,

  // Estado de deploy
  DEPLOYMENT_STATUS,
} from './addresses'

export type {
  ContractAddresses,
  ContractName,
  ChainId,
} from './addresses'

export {
  appConfig,
  isValidChain,
  getFaucetUrl,
  isTestnet as isTestnetEnv,
} from './app'

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
} from '@/lib/env'

export type { AppConfig } from '@/lib/env'