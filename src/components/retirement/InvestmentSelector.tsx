import React, { useState } from 'react';
import { useChainId } from 'wagmi';
import {
  Building2, TrendingUp, Briefcase, Coins,
  Check, CheckCircle, Info, Zap, Globe,
} from 'lucide-react';

type InvestmentMethodType = 'defi' | 'bank' | 'broker' | 'stockAgent';

interface InvestmentMethod {
  id: InvestmentMethodType;
  name: string;
  description: string;
  icon: React.ReactNode;
  avgReturn: string;
  risk: 'Low' | 'Medium' | 'High' | 'Variable';
  riskTolerance: 1 | 2 | 3; // RISK_LOW | RISK_MEDIUM | RISK_HIGH (para UserPreferences)
}

interface Provider {
  id: string;
  name: string;
  rating: number;
  fees: string;
  description: string;
  supported: boolean;
  addresses: Partial<Record<number, `0x${string}`>>;
}

export interface InvestmentSelection {
  method: InvestmentMethodType;
  provider: string;
  protocolAddress: `0x${string}`;
  /** Risk tolerance numérica para UserPreferences (1=Low, 2=Medium, 3=High) */
  riskTolerance: 1 | 2 | 3;
}

const ZERO = '0x0000000000000000000000000000000000000000' as `0x${string}`;

const PROTOCOL_ADDRESSES: Record<string, Partial<Record<number, `0x${string}`>>> = {
  aave: {
    421614: '0x6e1371974D923397ecE9eE7525ac50ad7087c77f',                                
    42161:  '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  },
  compound: {
    421614: '0x6e1371974D923397ecE9eE7525ac50ad7087c77f',                                       
    42161:  '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf',
  },
};

const INVESTMENT_METHODS: InvestmentMethod[] = [
  {
    id: 'defi',
    name: 'DeFi Protocols',
    description: 'Decentralized finance with high yields',
    icon: <Coins className="w-6 h-6" />,
    avgReturn: '5-15%',
    risk: 'High',
    riskTolerance: 3,
  },
  {
    id: 'bank',
    name: 'Traditional Bank',
    description: 'Secure savings with guaranteed returns',
    icon: <Building2 className="w-6 h-6" />,
    avgReturn: '2-4%',
    risk: 'Low',
    riskTolerance: 1,
  },
  {
    id: 'broker',
    name: 'Online Broker',
    description: 'Trade stocks and ETFs',
    icon: <TrendingUp className="w-6 h-6" />,
    avgReturn: '7-10%',
    risk: 'Medium',
    riskTolerance: 2,
  },
  {
    id: 'stockAgent',
    name: 'Wealth Management',
    description: 'Professional portfolio management',
    icon: <Briefcase className="w-6 h-6" />,
    avgReturn: '6-12%',
    risk: 'Variable',
    riskTolerance: 2,
  },
];

const PROVIDERS: Record<InvestmentMethodType, Provider[]> = {
  defi: [
    {
      id: 'aave',
      name: 'Aave',
      rating: 4.8,
      fees: '0%',
      description: 'Leading lending protocol with competitive yields',
      supported: true,
      addresses: PROTOCOL_ADDRESSES.aave ?? {},
    },
    {
      id: 'compound',
      name: 'Compound',
      rating: 4.7,
      fees: '0%',
      description: 'Algorithmic money market protocol',
      supported: true,
      addresses: PROTOCOL_ADDRESSES.compound ?? {},
    },
  ],
  bank: [
    { id: 'bbva',      name: 'BBVA',           rating: 4.2, fees: '0.1-0.3%',  description: 'Open Banking API available', supported: false, addresses: {} },
    { id: 'santander', name: 'Banco Santander', rating: 4.1, fees: '0.15-0.4%', description: 'Global banking',            supported: false, addresses: {} },
  ],
  broker: [
    { id: 'alpaca', name: 'Alpaca', rating: 4.4, fees: '$0', description: 'API-first trading', supported: false, addresses: {} },
  ],
  stockAgent: [
    { id: 'betterment', name: 'Betterment', rating: 4.3, fees: '0.25% AUM', description: 'Automated investing', supported: false, addresses: {} },
  ],
};

interface InvestmentSelectorProps {
  onSelectionComplete: (selection: InvestmentSelection) => void;
  currentSelection?: { method: InvestmentMethodType; provider: string };
}

export const InvestmentSelector: React.FC<InvestmentSelectorProps> = ({
  onSelectionComplete,
  currentSelection,
}) => {
  const chainId = useChainId();

  const [selectedMethod, setSelectedMethod] = useState<InvestmentMethodType | null>(
    currentSelection?.method ?? null
  );
  const [selectedProvider, setSelectedProvider] = useState<string | null>(
    currentSelection?.provider ?? null
  );

  const handleMethodSelect = (id: InvestmentMethodType) => {
    setSelectedMethod(id);
    setSelectedProvider(null);
  };

  const handleProviderSelect = (provider: Provider) => {
    if (!selectedMethod) return;
    setSelectedProvider(provider.id);
    const method = INVESTMENT_METHODS.find(m => m.id === selectedMethod)!;
    const protocolAddress = (provider.addresses[chainId] ?? ZERO) as `0x${string}`;

    if (provider.supported && protocolAddress === ZERO) {
      console.warn(
        `⚠️ ${provider.name} no tiene address configurada en la red ${chainId}. ` +
        'Actualizá PROTOCOL_ADDRESSES en InvestmentSelector.tsx.'
      );
    }

    onSelectionComplete({
      method: selectedMethod,
      provider: provider.id,
      protocolAddress,
      riskTolerance: method.riskTolerance,
    });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low':      return 'text-green-600 bg-green-100';
      case 'Medium':   return 'text-yellow-600 bg-yellow-100';
      case 'High':     return 'text-red-600 bg-red-100';
      case 'Variable': return 'text-blue-600 bg-blue-100';
      default:         return 'text-gray-600 bg-gray-100';
    }
  };

  const selectedMethodData = selectedMethod
    ? INVESTMENT_METHODS.find(m => m.id === selectedMethod)
    : null;
  const availableProviders = selectedMethod ? PROVIDERS[selectedMethod] : [];

  return (
    <div className="space-y-6">

      {/* ── Step 1: Método ─────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
            1
          </span>
          Select Investment Type
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {INVESTMENT_METHODS.map((method) => (
            <button
              key={method.id}
              onClick={() => handleMethodSelect(method.id)}
              className={`relative bg-white rounded-xl p-4 shadow hover:shadow-lg transition text-left ${
                selectedMethod === method.id
                  ? 'ring-2 ring-indigo-600'
                  : 'hover:ring-2 hover:ring-indigo-300'
              }`}
            >
              {selectedMethod === method.id && (
                <div className="absolute top-2 right-2 bg-indigo-600 rounded-full p-0.5">
                  <Check className="text-white w-3 h-3" />
                </div>
              )}
              <div className="text-indigo-600 mb-2">{method.icon}</div>
              <h4 className="font-bold text-gray-900 mb-1 text-sm">{method.name}</h4>
              <p className="text-xs text-gray-600 mb-2">{method.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Return:</span>
                <span className="font-semibold text-green-600">{method.avgReturn}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-gray-500">Risk:</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${getRiskColor(method.risk)}`}>
                  {method.risk}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Step 2: Proveedor ──────────────────────────────────────────── */}
      {selectedMethod && (
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
              2
            </span>
            Select Provider
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {availableProviders.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderSelect(provider)}
                className={`relative bg-white rounded-xl p-4 shadow hover:shadow-lg transition text-left ${
                  selectedProvider === provider.id
                    ? 'ring-2 ring-indigo-600'
                    : 'hover:ring-2 hover:ring-indigo-300'
                }`}
              >
                {selectedProvider === provider.id && (
                  <div className="absolute top-3 right-3 bg-indigo-600 rounded-full p-0.5">
                    <Check className="text-white w-4 h-4" />
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{provider.name}</h4>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-xs ${i < Math.floor(provider.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                          ★
                        </span>
                      ))}
                      <span className="text-xs text-gray-600 ml-1">{provider.rating}</span>
                    </div>
                  </div>

                  {provider.supported && (
                    <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Zap size={12} />
                      Ready
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-600 mb-3">{provider.description}</p>

                <div className="flex items-center gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Fees: </span>
                    <span className="font-semibold">{provider.fees}</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <Globe size={12} />
                    <span>API</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Warning proveedores no integrados */}
          {selectedProvider && !availableProviders.find(p => p.id === selectedProvider)?.supported && (
            <div className="mt-3 bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Info className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm mb-1">Coming Soon</h4>
                  <p className="text-xs text-amber-800">
                    This provider is not yet integrated. For now, please select a DeFi provider (Aave or Compound).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedMethod && selectedProvider && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-indigo-600" size={20} />
            <h4 className="font-bold text-indigo-800">Investment Method Selected</h4>
          </div>
          <p className="text-sm text-gray-700">
            <strong>{selectedMethodData?.name}</strong>
            {' via '}
            <strong>{availableProviders.find(p => p.id === selectedProvider)?.name}</strong>
          </p>
        </div>
      )}
    </div>
  );
};