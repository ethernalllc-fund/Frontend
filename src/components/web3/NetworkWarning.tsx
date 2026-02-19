import { AlertTriangle, Loader2 } from 'lucide-react';
import { useRequireCorrectNetwork } from '@/hooks/web3/useRequireCorrectNetwork';

interface NetworkWarningProps {
  expectedChainId?: number;
}

export function NetworkWarning({ expectedChainId }: NetworkWarningProps) {
  const {
    isWrongNetwork,
    currentNetwork,
    expectedNetwork,
    switchToCorrectNetwork,
    isSwitchingNetwork,
    networkError,
  } = useRequireCorrectNetwork();

  void expectedChainId;

  if (!isWrongNetwork) return null;

  return (
    <div
      role="alert"
      className="bg-linear-to-r from-orange-500 to-red-600 text-white py-4 px-6 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">

        {/* Info */}
        <div className="flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 flex-shrink-0 animate-pulse" />
          <div>
            <p className="font-bold text-lg leading-tight">Wrong Network Detected</p>
            <p className="text-sm opacity-90">
              You're on <strong>{currentNetwork}</strong>.
              Please switch to <strong>{expectedNetwork}</strong>.
            </p>
            {networkError && (
              <p className="text-xs opacity-75 mt-1">
                {networkError.message}
              </p>
            )}
          </div>
        </div>

        {/* Switch button */}
        <button
          onClick={switchToCorrectNetwork}
          disabled={isSwitchingNetwork}
          className="bg-white text-red-600 font-bold py-3 px-6 rounded-xl
                     hover:bg-gray-100 transition
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2 flex-shrink-0"
        >
          {isSwitchingNetwork ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Switching...
            </>
          ) : (
            `Switch to ${expectedNetwork}`
          )}
        </button>

      </div>
    </div>
  );
}

export default NetworkWarning;