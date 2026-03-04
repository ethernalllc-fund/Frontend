import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { 
  mainnet, 
  arbitrum, 
  arbitrumSepolia, 
  polygon, 
  polygonAmoy, 
  baseSepolia, 
  optimismSepolia,
  sepolia  
} from '@reown/appkit/networks'
import { createConfig, http } from 'wagmi'
import { cookieStorage, createStorage } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import React from 'react'

const projectId = process.env.VITE_WALLETCONNECT_PROJECT_ID || 'a49b39e0cf8adcda42be429efd6217f2'

const metadata = {
  name: 'Tu App Nombre',
  description: 'Descripción breve de tu dApp',
  url: 'https://ethernal.fund',        
  icons: ['https://ethernal.fund/icon-512.png'], // al menos 512x512
}

export const appNetworks = [
  mainnet,              // Ethereum Mainnet
  arbitrum,             // Arbitrum One (mainnet)
  polygon,              // Polygon Mainnet
  arbitrumSepolia,      // Arbitrum Sepolia (testnet)
  polygonAmoy,          // Polygon Amoy (testnet)
  // baseSepolia,     
  // optimismSepolia,
  // sepolia,
] as const

export const mutableNetworks = [...appNetworks]

const transports = {
  [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${process.env.VITE_PUBLIC_ALCHEMY_KEY || ''}`),
  [arbitrum.id]: http(`https://arb-mainnet.g.alchemy.com/v2/${process.env.VITE_PUBLIC_ALCHEMY_KEY || ''}`),
  [polygon.id]: http(`https://polygon-mainnet.g.alchemy.com/v2/${process.env.VITE_PUBLIC_ALCHEMY_KEY || ''}`),
  [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'), // o Alchemy si tenés key
  [polygonAmoy.id]: http('https://rpc-amoy.polygon.technology'),       // o Alchemy si tenés key
}

export const config = createConfig({
  chains: mutableNetworks,         
  transports,
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : cookieStorage,
  }),
  ssr: true, 
})

export const wagmiAdapter = new WagmiAdapter({
  networks: mutableNetworks,        
  projectId,
  ssr: true,
})

createAppKit({
  adapters: [wagmiAdapter],
  networks: mutableNetworks,      
  projectId,
  metadata,
  allWallets: 'SHOW',               // 'SHOW' | 'HIDE' | 'ONLY_MOBILE'
  
  features: {
    analytics: process.env.NODE_ENV === 'production',
    email: false,              
    socials: false,
  },
  
  themeVariables: {
    '--w3m-accent': '#your-brand-color', // personaliza el color de acento
  },
  
  connectorImages: {
    'io.metamask': '/icons/metamask.png',

  },
})

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient()

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}