import { createAppKit } from '@reown/appkit/react'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import {
  mainnet,
  arbitrum,
  arbitrumSepolia,
  polygon,
  polygonAmoy,
} from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import React from 'react'

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || ''

const metadata = {
  name: 'Ethernal Foundation',
  description: 'Personal retirement fund management protocol',
  url: 'https://ethernal.fund',
  icons: ['https://ethernal.fund/icon-512.png'],
}

export const networks = [
  mainnet,
  arbitrum,
  polygon,
  arbitrumSepolia,
  polygonAmoy,
] satisfies [AppKitNetwork, ...AppKitNetwork[]]

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
})

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  allWallets: 'SHOW',

  features: {
    analytics: import.meta.env.PROD,
    email: false,
    socials: false,
  },

  themeVariables: {
    '--w3m-accent': '#your-brand-color',
  },
})

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}