import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n/config';
import { Web3Provider } from './config/web3';
import { RetirementProvider } from '@/components/context/RetirementContext';

if (import.meta.env.DEV) {
  const id = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

  console.log(
    [
      '🚀 Ethernal Frontend Starting...',
      `📍 Mode: ${import.meta.env.MODE}`,
      `🔗 API URL: ${import.meta.env.VITE_API_URL}`,
      `⛓️  WalletConnect Project ID: ${id ? '✅ Set' : '❌ Missing'}`,
    ].join('\n')
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3Provider>
      <RetirementProvider>
        <App />
      </RetirementProvider>
    </Web3Provider>
  </StrictMode>
);