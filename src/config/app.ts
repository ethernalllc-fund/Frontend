import { getFaucets, isChainActive } from './chains'

export const appConfig = {
  isDevelopment: {
    development: import.meta.env.DEV,
    production: import.meta.env.PROD,
  },

  chain: {
    id: 421614 as const,      
    name: 'Arbitrum Sepolia',
    shortName: 'Arb Sepolia',
    nativeCurrency: 'ETH',
    explorer: 'https://sepolia.arbiscan.io',
    blockTime: 0.25,
    isTestnet:true,
  },

  urls: {
    website: 'https://ethernity-dao.com',
    docs: 'https://docs.ethernity-dao.com',
    twitter: 'https://twitter.com/ethernity_dao',
    discord: 'https://discord.gg/ethernity',
  },
} as const

export const isValidChain = (chainId?: number): boolean => {
  if (!chainId) return false
  return chainId === appConfig.chain.id && isChainActive(chainId)
}

export const getFaucetUrl = (chainId?: number): string | null => {
  const id = chainId ?? appConfig.chain.id
  const faucets = getFaucets(id)
  return faucets[0] ?? null
}

export const isTestnet = import.meta.env.VITE_NETWORK === 'testnet' || import.meta.env.DEV