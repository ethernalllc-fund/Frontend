import { cookieStorage, createStorage, http, fallback } from 'wagmi';
import { WagmiAdapter }  from '@reown/appkit-adapter-wagmi';
import { createAppKit } from '@reown/appkit/react';
import { arbitrumSepolia } from 'wagmi/chains';
import type { Chain }    from 'wagmi/chains';
import { queryClient } from '@/lib/queryClient';
import env             from '@/lib/env';

const projectId   = env.walletConnectProjectId;
const ALCHEMY_KEY = env.alchemyApiKey;
const INFURA_KEY  = env.infuraApiKey;

if (!projectId) {
  throw new Error(
    '[web3] VITE_WALLETCONNECT_PROJECT_ID is required. Get one at https://cloud.reown.com',
  );
}

if (!ALCHEMY_KEY && import.meta.env.DEV) {
  console.warn(
    '[web3] VITE_ALCHEMY_API_KEY not set — using public RPCs (may be slow or rate-limited)',
  );
}

const activeChains: readonly Chain[] = [
  arbitrumSepolia,
  // polygonAmoy,
  // baseSepolia,
  // optimismSepolia,
] as const;

export const chains = activeChains as unknown as [Chain, ...Chain[]];

const origin = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://ethernity-dao.com';

const metadata = {
  name:        'Ethernal',
  description: 'Decentralized retirement fund platform on blockchain',
  url:         origin,
  icons:       [`${origin}/ethernity.ico`],
};

function buildTransport(
  alchemyUrl: string,
  infuraUrl:  string,
  publicUrls: string[],
): ReturnType<typeof fallback> {
  const providers: ReturnType<typeof http>[] = [];
  if (ALCHEMY_KEY) providers.push(http(alchemyUrl));
  if (INFURA_KEY)  providers.push(http(infuraUrl));
  publicUrls.forEach(url => providers.push(http(url)));
  // Siempre hay al menos un provider público, nunca lista vacía
  return fallback(providers);
}

function buildTransports(): Record<number, ReturnType<typeof fallback>> {
  return {
    // ── Testnets ──
    421614: buildTransport(
      `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      `https://arbitrum-sepolia.infura.io/v3/${INFURA_KEY}`,
      ['https://sepolia-rollup.arbitrum.io/rpc'],
    ),
    80002: buildTransport(
      `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      `https://polygon-amoy.infura.io/v3/${INFURA_KEY}`,
      ['https://rpc-amoy.polygon.technology'],
    ),
    84532: buildTransport(
      `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      `https://base-sepolia.infura.io/v3/${INFURA_KEY}`,
      ['https://sepolia.base.org'],
    ),
    11155420: buildTransport(
      `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      `https://optimism-sepolia.infura.io/v3/${INFURA_KEY}`,
      ['https://sepolia.optimism.io'],
    ),
    11155111: buildTransport(
      `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      ['https://rpc.sepolia.org'],
    ),

    // ── Mainnets ──
    42161: buildTransport(
      `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      `https://arbitrum-mainnet.infura.io/v3/${INFURA_KEY}`,
      ['https://arb1.arbitrum.io/rpc'],
    ),
    137: buildTransport(
      `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`,
      ['https://polygon-rpc.com'],
    ),
    8453: buildTransport(
      `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      `https://base-mainnet.infura.io/v3/${INFURA_KEY}`,
      ['https://mainnet.base.org'],
    ),
    10: buildTransport(
      `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      `https://optimism-mainnet.infura.io/v3/${INFURA_KEY}`,
      ['https://mainnet.optimism.io'],
    ),
    1: buildTransport(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      ['https://eth.llamarpc.com'],
    ),
  };
}

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks:   chains,
  transports: buildTransports(),
  storage:    createStorage({ storage: cookieStorage }),
  ssr:        false,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
export const modal = createAppKit({
  adapters:       [wagmiAdapter],
  projectId,
  networks:       chains,
  defaultNetwork: arbitrumSepolia,
  metadata,
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

export const isActiveChain = (chainId: number): boolean =>
  chains.some(c => c.id === chainId);

export const getActiveChain = (chainId: number): Chain | undefined =>
  chains.find(c => c.id === chainId);

if (import.meta.env.DEV) {
  console.group('[web3] Config');
  console.log('Alchemy   :', ALCHEMY_KEY ? 'SET' : 'not set (public RPC)');
  console.log('Infura    :', INFURA_KEY  ? 'SET' : 'not set (public RPC)');
  console.log('Chains    :', chains.map(c => c.name).join(', '));
  console.groupEnd();
}

export { queryClient };
export default {
  wagmiConfig,
  wagmiAdapter,
  modal,
  queryClient,
  chains,
  metadata,
  isActiveChain,
  getActiveChain,
};