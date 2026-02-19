import { useChainId } from 'wagmi';
import { ExternalLink, Droplets } from 'lucide-react';

interface FaucetButtonProps {
  className?: string;
  label?:     string;
}

interface FaucetEntry { name: string; usdc: string; gas: string; }

const DEFAULT_FAUCET: FaucetEntry = {
  name: 'Arbitrum Sepolia',
  usdc: 'https://faucet.quicknode.com/arbitrum/sepolia',
  gas:  'https://faucet.quicknode.com/arbitrum/sepolia',
};

const FAUCETS = new Map<number, FaucetEntry>([
  [421614, DEFAULT_FAUCET],
  [80002, {
    name: 'Polygon Amoy',
    usdc: 'https://faucet.polygon.technology/',
    gas:  'https://faucet.polygon.technology/',
  }],
]);

export function FaucetButton({ className = '', label }: FaucetButtonProps) {
  const chainId = useChainId();
  const faucet: FaucetEntry = FAUCETS.get(chainId) ?? DEFAULT_FAUCET;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a
        href={faucet.gas}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
      >
        <Droplets size={16} />
        {label ?? `Get testnet ETH — ${faucet.name}`}
        <ExternalLink size={14} />
      </a>
      <a
        href={faucet.usdc}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition"
      >
        <Droplets size={16} />
        Get testnet USDC
        <ExternalLink size={14} />
      </a>
    </div>
  );
}

export default FaucetButton;