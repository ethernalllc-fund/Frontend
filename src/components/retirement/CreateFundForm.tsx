import { useEffect } from 'react';
import { usePersonalFundFactory } from '@/hooks/funds/usePersonalFundFactory';
import { useProtocolStatus }      from '@/hooks/funds/useProtocolStatus';
import { getContractAddresses }   from '@/config/addresses';
import { useChainId }             from 'wagmi';
import type { RetirementPlan }    from '@/types/retirement_types';

interface CreateFundFormProps {
  plan:      RetirementPlan;
  onReady?:  (protocolAddress: `0x${string}`) => void;
  onSuccess?: (txHash: string) => void;
}

export function CreateFundForm({ plan, onReady, onSuccess: _onSuccess }: CreateFundFormProps) {
  const chainId   = useChainId();
  const addresses = getContractAddresses(chainId);

  const PROTOCOL_ADDRESS = (
    plan.selectedProtocol ?? addresses?.mockDeFiProtocol
  ) as `0x${string}` | undefined;

  const { refetch }                        = usePersonalFundFactory();
  const { status: protocolStatus, isVerified } = useProtocolStatus(PROTOCOL_ADDRESS);

  const isCheckingProtocol = protocolStatus === 'loading';
  const isProtocolError    = protocolStatus === 'error';
  const isProtocolActive   = protocolStatus === 'active';
  const isUnavailable      = protocolStatus === 'unavailable';

  useEffect(() => {
    if (isProtocolActive && PROTOCOL_ADDRESS) {
      onReady?.(PROTOCOL_ADDRESS);
    }
  }, [isProtocolActive, PROTOCOL_ADDRESS, onReady]);

  useEffect(() => {
    if (_onSuccess) refetch();
  }, [_onSuccess, refetch]);

  return (
    <div className="flex flex-col gap-2">
      {isCheckingProtocol && (
        <p className="text-sm text-yellow-500">
          🔄 Verificando estado del protocolo...
        </p>
      )}

      {isProtocolError && (
        <p className="text-sm text-red-400">
          ⚠️ No se pudo verificar el protocolo. Intentá de nuevo.
        </p>
      )}

      {isUnavailable && (
        <p className="text-sm text-amber-500">
          ⚠️ Registry no disponible en esta red.
        </p>
      )}

      {protocolStatus === 'inactive' && (
        <p className="text-sm text-red-500 font-medium">
          🚫 Protocolo inactivo — contactá al administrador.
        </p>
      )}

      {isProtocolActive && (
        <p className="text-sm text-green-500">
          ✅ Protocolo activo
          {isVerified && (
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
              Verificado
            </span>
          )}
        </p>
      )}
    </div>
  );
}