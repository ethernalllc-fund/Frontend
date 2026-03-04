import React from 'react';
import { WagmiProvider, cookieStorage, createStorage, http, fallback } from 'wagmi';
import { WagmiAdapter }        from '@reown/appkit-adapter-wagmi';
import { createAppKit }        from '@reown/appkit/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  arbitrumSepolia,
  polygonAmoy,
  arbitrum,
  polygon,
  mainnet,
} from 'wagmi/chains';
import type { Chain } from 'wagmi/chains';
import { queryClient } from '@/lib/queryClient';
import env             from '@/lib/env';

const projectId   = env.walletConnectProjectId;
const ALCHEMY_KEY = env.alchemyApiKey ?? '';
const INFURA_KEY  = env.infuraApiKey  ?? '';

if (!projectId) {
  throw new Error('[web3] VITE_WALLETCONNECT_PROJECT_ID is required — https://cloud.reown.com');
}
if (!ALCHEMY_KEY && import.meta.env.PROD) {
  throw new Error('[web3] VITE_ALCHEMY_API_KEY is required in production.');
}
if (!ALCHEMY_KEY) {
  console.warn('[web3] VITE_ALCHEMY_API_KEY not set — using public RPCs (rate-limited)');
}

export const IS_TESTNET: boolean = import.meta.env.VITE_NETWORK !== 'mainnet';

const TESTNET_CHAINS = [arbitrumSepolia, polygonAmoy] as const satisfies Chain[];
const MAINNET_CHAINS = [arbitrum, polygon, mainnet]   as const satisfies Chain[];

export const ACTIVE_CHAINS: readonly Chain[] = IS_TESTNET ? TESTNET_CHAINS : MAINNET_CHAINS;
export const DEFAULT_CHAIN: Chain            = IS_TESTNET ? arbitrumSepolia : arbitrum;

const wagmiChains = ACTIVE_CHAINS as unknown as [Chain, ...Chain[]];

type Transport = ReturnType<typeof fallback>;

function rpc(alchemyBase: string, infuraBase: string, publicUrl: string): Transport {
  const providers: ReturnType<typeof http>[] = [];
  if (ALCHEMY_KEY) providers.push(http(`${alchemyBase}${ALCHEMY_KEY}`));
  if (INFURA_KEY)  providers.push(http(`${infuraBase}${INFURA_KEY}`));
  providers.push(http(publicUrl));
  return fallback(providers);
}

const TRANSPORT_MAP: Record<number, Transport> = {
  [arbitrumSepolia.id]: rpc('https://arb-sepolia.g.alchemy.com/v2/',     'https://arbitrum-sepolia.infura.io/v3/', 'https://sepolia-rollup.arbitrum.io/rpc'),
  [polygonAmoy.id]:     rpc('https://polygon-amoy.g.alchemy.com/v2/',    'https://polygon-amoy.infura.io/v3/',    'https://rpc-amoy.polygon.technology'),
  [arbitrum.id]:        rpc('https://arb-mainnet.g.alchemy.com/v2/',     'https://arbitrum-mainnet.infura.io/v3/', 'https://arb1.arbitrum.io/rpc'),
  [polygon.id]:         rpc('https://polygon-mainnet.g.alchemy.com/v2/', 'https://polygon-mainnet.infura.io/v3/', 'https://polygon-rpc.com'),
  [mainnet.id]:         rpc('https://eth-mainnet.g.alchemy.com/v2/',     'https://mainnet.infura.io/v3/',         'https://eth.llamarpc.com'),
};

const activeTransports = Object.fromEntries(
  ACTIVE_CHAINS.map(c => [c.id, TRANSPORT_MAP[c.id]!]),
) as Record<number, Transport>;

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://ethernal.fund';
const APP_METADATA = {
  name:        'Ethernal Foundation',
  description: 'Personal retirement fund management protocol',
  url:         APP_URL,
  icons:       [`${APP_URL}/icon-512.png`] as string[],
};

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks:   wagmiChains,
  transports: activeTransports,
  storage:    createStorage({ storage: cookieStorage }),
  ssr:        false,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
export const modal = createAppKit({
  adapters:       [wagmiAdapter],
  projectId,
  networks:       wagmiChains,
  defaultNetwork: DEFAULT_CHAIN,
  metadata:       APP_METADATA,
  features: {
    analytics:        env.features.analytics,
    email:            false,
    socials:          [],
    emailShowWallets: true,
    allWallets:       true,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent':               '#1B5E20',
    '--w3m-border-radius-master': '8px',
    '--w3m-font-family':          'Inter, system-ui, -apple-system, sans-serif',
  },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export const isActiveChain  = (chainId: number): boolean       => ACTIVE_CHAINS.some(c => c.id === chainId);
export const getActiveChain = (chainId: number): Chain | undefined => ACTIVE_CHAINS.find(c => c.id === chainId);

if (import.meta.env.DEV) {
  console.group('[web3] Config');
  console.log('Network :', IS_TESTNET ? '🟡 TESTNET' : '🟢 MAINNET');
  console.log('Alchemy :', ALCHEMY_KEY ? '✅ SET' : '⚠️  not set');
  console.log('Infura  :', INFURA_KEY  ? '✅ SET' : '⚠️  not set');
  console.log('Chains  :', ACTIVE_CHAINS.map(c => c.name).join(', '));
  console.log('Default :', DEFAULT_CHAIN.name);
  console.groupEnd();
}

export { queryClient };