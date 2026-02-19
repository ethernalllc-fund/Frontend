import { 
  arbitrum, 
  arbitrumSepolia, 
  polygon,
  polygonAmoy,
  base,
  baseSepolia,
  optimism,
  optimismSepolia,
  mainnet,
  sepolia 
} from 'wagmi/chains'
import type { Chain } from 'wagmi/chains'

export interface ChainMetadata {
  deployed: boolean
  hasContracts: boolean
  priority: number
  faucets?: string[]
  bridge?: string
  isTestnet: boolean
}

export const CHAIN_METADATA: Record<number, ChainMetadata> = {
  // ✅ ARBITRUM SEPOLIA - DEPLOYED
  421614: {
    deployed: true,
    hasContracts: true,
    priority: 1,
    isTestnet: true,
    faucets: [
      'https://faucet.quicknode.com/arbitrum/sepolia',
      'https://www.alchemy.com/faucets/arbitrum-sepolia',
      'https://faucets.chain.link/arbitrum-sepolia'
    ],
    bridge: 'https://bridge.arbitrum.io/?destinationChain=arbitrum-sepolia',
  },

  // 🟡 POLYGON AMOY - READY TO DEPLOY
  80002: {
    deployed: false,
    hasContracts: false,
    priority: 2,
    isTestnet: true,
    faucets: [
      'https://faucets.chain.link/polygon-amoy',
      'https://faucet.polygon.technology/',
      'https://www.alchemy.com/faucets/polygon-amoy'
    ],
    bridge: 'https://portal.polygon.technology/bridge',
  },

  // 🔴 BASE SEPOLIA - PENDING
  84532: {
    deployed: false,
    hasContracts: false,
    priority: 3,
    isTestnet: true,
    faucets: [
      'https://www.alchemy.com/faucets/base-sepolia',
      'https://docs.base.org/tools/network-faucets',
      'https://faucets.chain.link/base-sepolia'
    ],
    bridge: 'https://bridge.base.org/deposit',
  },

  // 🔴 OPTIMISM SEPOLIA - PENDING
  11155420: {
    deployed: false,
    hasContracts: false,
    priority: 4,
    isTestnet: true,
    faucets: [
      'https://app.optimism.io/faucet',
      'https://www.alchemy.com/faucets/optimism-sepolia',
      'https://faucets.chain.link/optimism-sepolia'
    ],
    bridge: 'https://app.optimism.io/bridge/deposit',
  },

  // 🔴 ETHEREUM SEPOLIA - PENDING
  11155111: {
    deployed: false,
    hasContracts: false,
    priority: 5,
    isTestnet: true,
    faucets: [
      'https://sepoliafaucet.com',
      'https://faucet.quicknode.com/ethereum/sepolia',
      'https://www.alchemy.com/faucets/ethereum-sepolia',
      'https://faucets.chain.link/sepolia'
    ],
    bridge: undefined,
  },

  // 🔴 ARBITRUM ONE (MAINNET) - PENDING
  42161: {
    deployed: false,
    hasContracts: false,
    priority: 10,
    isTestnet: false,
  },

  // 🔴 POLYGON (MAINNET) - PENDING
  137: {
    deployed: false,
    hasContracts: false,
    priority: 11,
    isTestnet: false,
  },

  // 🔴 BASE (MAINNET) - PENDING
  8453: {
    deployed: false,
    hasContracts: false,
    priority: 12,
    isTestnet: false,
  },

  // 🔴 OPTIMISM (MAINNET) - PENDING
  10: {
    deployed: false,
    hasContracts: false,
    priority: 13,
    isTestnet: false,
  },

  // 🔴 ETHEREUM (MAINNET) - PENDING
  1: {
    deployed: false,
    hasContracts: false,
    priority: 14,
    isTestnet: false,
  },
}

export const SUPPORTED_CHAINS = [
  arbitrumSepolia,
  polygonAmoy,
  baseSepolia,
  optimismSepolia,
  sepolia,
  arbitrum,
  polygon,
  base,
  optimism,
  mainnet,
] as const

export const TESTNET_CHAINS = [
  arbitrumSepolia,
  polygonAmoy,
  baseSepolia,
  optimismSepolia,
  sepolia,
] as const

export const MAINNET_CHAINS = [
  arbitrum,
  polygon,
  base,
  optimism,
  mainnet,
] as const

export const ACTIVE_CHAINS = SUPPORTED_CHAINS.filter(
  chain => CHAIN_METADATA[chain.id]?.deployed
)

export const DEFAULT_CHAIN = arbitrumSepolia
export const ACTIVE_CHAIN_IDS = ACTIVE_CHAINS.map(c => c.id)
export const getChainById = (chainId: number): Chain | undefined => {
  return SUPPORTED_CHAINS.find(chain => chain.id === chainId)
}

export const getChainMetadata = (chainId: number): ChainMetadata | undefined => {
  return CHAIN_METADATA[chainId]
}

export const isChainSupported = (chainId: number): boolean => {
  return SUPPORTED_CHAINS.some(chain => chain.id === chainId)
}

export const isChainActive = (chainId: number): boolean => {
  return ACTIVE_CHAINS.some(chain => chain.id === chainId)
}

export const isTestnet = (chainId: number): boolean => {
  return CHAIN_METADATA[chainId]?.isTestnet ?? false
}

export const hasContracts = (chainId: number): boolean => {
  return CHAIN_METADATA[chainId]?.hasContracts ?? false
}

export const getFaucets = (chainId: number): string[] => {
  return CHAIN_METADATA[chainId]?.faucets ?? []
}

export const getBridge = (chainId: number): string | undefined => {
  return CHAIN_METADATA[chainId]?.bridge
}

export const getExplorerUrl = (chainId: number, hash?: string): string => {
  const chain = getChainById(chainId)
  const baseUrl = chain?.blockExplorers?.default?.url || ''
  
  if (!hash) return baseUrl
  return `${baseUrl}/tx/${hash}`
}

export const getExplorerAddressUrl = (chainId: number, address: string): string => {
  const chain = getChainById(chainId)
  const baseUrl = chain?.blockExplorers?.default?.url || ''
  return `${baseUrl}/address/${address}`
}

export const getExplorerTokenUrl = (chainId: number, address: string): string => {
  const chain = getChainById(chainId)
  const baseUrl = chain?.blockExplorers?.default?.url || ''
  
  return `${baseUrl}/token/${address}`
}

export const getChainName = (chainId: number): string => {
  const chain = getChainById(chainId)
  return chain?.name || `Unknown Chain (${chainId})`
}

export const getChainShortName = (chainId: number): string => {
  const chain = getChainById(chainId)
  const shortNames: Record<number, string> = {
    421614: 'Arb Sepolia',
    80002: 'Polygon Amoy',
    84532: 'Base Sepolia',
    11155420: 'OP Sepolia',
    11155111: 'Sepolia',
    42161: 'Arbitrum',
    137: 'Polygon',
    8453: 'Base',
    10: 'Optimism',
    1: 'Ethereum',
  }
  
  return shortNames[chainId] || chain?.name || `Unknown (${chainId})`
}

export const getChainsByPriority = (): Chain[] => {
  return [...SUPPORTED_CHAINS].sort((a, b) => {
    const priorityA = CHAIN_METADATA[a.id]?.priority ?? 999
    const priorityB = CHAIN_METADATA[b.id]?.priority ?? 999
    return priorityA - priorityB
  })
}

export const getActiveChains = (): Chain[] => {
  return SUPPORTED_CHAINS.filter(chain => 
    CHAIN_METADATA[chain.id]?.deployed
  )
}

export const getTestnetChains = (): Chain[] => {
  return SUPPORTED_CHAINS.filter(chain => 
    CHAIN_METADATA[chain.id]?.isTestnet
  )
}

export const getMainnetChains = (): Chain[] => {
  return SUPPORTED_CHAINS.filter(chain => 
    !CHAIN_METADATA[chain.id]?.isTestnet
  )
}

export const getDeployedChains = (): Chain[] => {
  return SUPPORTED_CHAINS.filter(chain => 
    CHAIN_METADATA[chain.id]?.deployed
  )
}

export const getPendingChains = (): Chain[] => {
  return SUPPORTED_CHAINS.filter(chain => 
    !CHAIN_METADATA[chain.id]?.deployed
  )
}

export const getChainErrorMessage = (currentChainId?: number): string => {
  if (!currentChainId) {
    const activeNames = ACTIVE_CHAINS.map(c => c.name).join(', ')
    return `Please connect to one of: ${activeNames}`
  }
  
  const current = getChainById(currentChainId)
  const activeNames = ACTIVE_CHAINS.map(c => c.name).join(', ')
  return `Wrong network. Current: ${current?.name || `Unknown (${currentChainId})`}. Please switch to: ${activeNames}`
}

export const getChainStatus = (chainId: number): {
  deployed: boolean
  hasContracts: boolean
  isTestnet: boolean
  isActive: boolean
  status: 'deployed' | 'pending' | 'unknown'
} => {
  const metadata = CHAIN_METADATA[chainId]
  
  if (!metadata) {
    return {
      deployed: false,
      hasContracts: false,
      isTestnet: false,
      isActive: false,
      status: 'unknown',
    }
  }
  
  return {
    deployed: metadata.deployed,
    hasContracts: metadata.hasContracts,
    isTestnet: metadata.isTestnet,
    isActive: isChainActive(chainId),
    status: metadata.deployed ? 'deployed' : 'pending',
  }
}

export const getChainInfo = (chainId: number) => {
  const chain = getChainById(chainId)
  const metadata = getChainMetadata(chainId)
  const status = getChainStatus(chainId)
  if (!chain || !metadata) return null
  
  return {
    ...chain,
    ...metadata,
    ...status,
    shortName: getChainShortName(chainId),
    explorerUrl: getExplorerUrl(chainId),
    faucetUrls: getFaucets(chainId),
    bridgeUrl: getBridge(chainId),
  }
}

export const getDeploymentSummary = () => {
  const summary: Record<number, {
    chainId: number
    name: string
    shortName: string
    isTestnet: boolean
    deployed: boolean
    hasContracts: boolean
    priority: number
  }> = {}
  
  SUPPORTED_CHAINS.forEach(chain => {
    const metadata = CHAIN_METADATA[chain.id]
    if (!metadata) return
    summary[chain.id] = {
      chainId: chain.id,
      name: chain.name,
      shortName: getChainShortName(chain.id),
      isTestnet: metadata.isTestnet,
      deployed: metadata.deployed,
      hasContracts: metadata.hasContracts,
      priority: metadata.priority,
    }
  })
  return summary
}

export type SupportedChainId = typeof SUPPORTED_CHAINS[number]['id']
export type ActiveChainId = typeof ACTIVE_CHAINS[number]['id']
export type TestnetChainId = typeof TESTNET_CHAINS[number]['id']
export type MainnetChainId = typeof MAINNET_CHAINS[number]['id']
export const CHAIN_IDS = {
  ARBITRUM_SEPOLIA: 421614,
  POLYGON_AMOY: 80002,
  BASE_SEPOLIA: 84532,
  OPTIMISM_SEPOLIA: 11155420,
  ETHEREUM_SEPOLIA: 11155111,
  ARBITRUM: 42161,
  POLYGON: 137,
  BASE: 8453,
  OPTIMISM: 10,
  ETHEREUM: 1,
} as const

export const TESTNET_CHAIN_IDS = [
  CHAIN_IDS.ARBITRUM_SEPOLIA,
  CHAIN_IDS.POLYGON_AMOY,
  CHAIN_IDS.BASE_SEPOLIA,
  CHAIN_IDS.OPTIMISM_SEPOLIA,
  CHAIN_IDS.ETHEREUM_SEPOLIA,
] as const

export const MAINNET_CHAIN_IDS = [
  CHAIN_IDS.ARBITRUM,
  CHAIN_IDS.POLYGON,
  CHAIN_IDS.BASE,
  CHAIN_IDS.OPTIMISM,
  CHAIN_IDS.ETHEREUM,
] as const

export const validateChainConfig = () => {
  const errors: string[] = []
  
  SUPPORTED_CHAINS.forEach(chain => {
    const metadata = CHAIN_METADATA[chain.id]
    
    if (!metadata) {
      errors.push(`Chain ${chain.id} (${chain.name}) missing metadata`)
      return
    }

    if (metadata.isTestnet && (!metadata.faucets || metadata.faucets.length === 0)) {
      errors.push(`Testnet ${chain.name} missing external faucets`)
    }
  })
  
  if (errors.length > 0) {
    console.warn('⚠️ Chain configuration warnings:', errors)
  }
  return errors.length === 0
}

if (import.meta.env.DEV) {
  validateChainConfig()
}