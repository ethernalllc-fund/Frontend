export {
  SUPPORTED_CHAINS,
  ACTIVE_CHAINS,
  ACTIVE_CHAIN_IDS,
  DEFAULT_CHAIN,
  CHAIN_IDS,
  CHAIN_METADATA,
  TRANSPORT_MAP,
  getChainById,
  getChainMetadata,
  isChainSupported,
  isChainActive,
  isTestnetChain,
  hasContracts,
  getFaucets,
  getBridge,
  getExplorerUrl,
  getExplorerAddressUrl,
  getChainName,
  getChainShortName,
  getChainErrorMessage,
} from './chains'

export type {
  ChainMetadata,
  SupportedChain,
  SupportedChainId,
} from './chains'

export {
  wagmiConfig,
  wagmiAdapter,
  modal,
  queryClient,
  Web3Provider,
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
  ZERO_ADDRESS,
  // Named Arbitrum Sepolia addresses (for admin pages and legacy consumers)
  TREASURY_ADDRESS,
  FACTORY_ADDRESS,
  USDC_ADDRESS,
  PROTOCOL_REGISTRY_ADDRESS,
  USER_PREFERENCES_ADDRESS,
  DATETIME_ADDRESS,
  MOCK_USDC_ADDRESS,
  OFFICIAL_USDC_ADDRESS,
  // USDC helpers
  getOfficialUSDC,
  getMockUSDC,
  getUSDCForChain,
  hasMockUSDC,
  getCurrentUSDCType,
  // Contract address resolution
  getContractAddresses,
  getContractAddress,
  isValidAddress,
  isContractDeployed,
  areMainContractsDeployed,
  // Deployment introspection
  getDeployedContracts,
  getPendingContracts,
  getDeploymentProgress,
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
  isTestnet,
} from './app'