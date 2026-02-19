import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './index.css';
import './i18n/config';
import { wagmiConfig, queryClient } from './config/web3';
import { RetirementProvider } from '@/components/context/RetirementContext';

if (import.meta.env['DEV']) {
  const id = import.meta.env['VITE_WALLETCONNECT_PROJECT_ID'];

  console.log(
    [
      '🚀 Ethernal Frontend Starting...',
      `📍 Mode: ${import.meta.env['MODE']}`,
      `🔗 API URL: ${import.meta.env['VITE_API_URL']}`,
      `⛓️  WalletConnect Project ID: ${id ? '✅ Set' : '❌ Missing'}`,
    ].join('\n')
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RetirementProvider>
          <App />
        </RetirementProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </HelmetProvider>
);