import { useEffect } from 'react';
import { useCreatePersonalFund }  from '@/hooks/useCreatePersonalFund';
import { usePersonalFundFactory } from '@/hooks/funds/usePersonalFundFactory';
import { useProtocolStatus }      from '@/hooks/funds/useProtocolStatus';
import { getContractAddresses }   from '@/config/addresses';
import { useChainId }             from 'wagmi';
import { parseUnits }             from 'viem';

export function CreateFundForm() {
  const chainId          = useChainId();
  const addresses        = getContractAddresses(chainId);

  const PROTOCOL_ADDRESS = addresses?.mockDeFiProtocol;

  const { createFund, isPending, isConfirming, isSuccess, error, receipt } =
    useCreatePersonalFund();

  const { refetch } = usePersonalFundFactory();
  const { status: protocolStatus, isVerified } = useProtocolStatus(PROTOCOL_ADDRESS);

  const isCheckingProtocol = protocolStatus === 'loading';
  const isProtocolError    = protocolStatus === 'error';
  const isProtocolActive   = protocolStatus === 'active';
  const isUnavailable      = protocolStatus === 'unavailable';

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess, refetch]);

  const handleCreate = () => {
    if (!isProtocolActive || !PROTOCOL_ADDRESS) return;

    createFund({
      principal:        parseUnits('1000', 6),
      monthlyDeposit:   parseUnits('100',  6),
      currentAge:       30n,
      retirementAge:    65n,
      desiredMonthly:   parseUnits('2000', 6),
      yearsPayments:    20n,
      interestRate:     500n,
      timelockYears:    15n,              
      selectedProtocol: PROTOCOL_ADDRESS,
    });
  };

  const isButtonDisabled =
    isPending          ||
    isConfirming       ||
    !isProtocolActive  ||
    isCheckingProtocol ||
    !PROTOCOL_ADDRESS;

  const buttonLabel = isPending
    ? 'Confirmá en tu wallet...'
    : isConfirming
    ? 'Minando transacción...'
    : isCheckingProtocol
    ? 'Verificando protocolo...'
    : !isProtocolActive
    ? 'Protocolo no disponible'
    : 'Crear mi fondo';

  return (
    <div className="flex flex-col gap-3">

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

      <button
        onClick={handleCreate}
        disabled={isButtonDisabled}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded transition-colors"
      >
        {buttonLabel}
      </button>

      {isSuccess && (
        <p className="text-sm text-green-500">
          ✅ Fondo creado con éxito! Tx:{' '}
          <span className="font-mono text-xs break-all">
            {receipt?.transactionHash}
          </span>
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500">
          ❌ Error: {error.message}
        </p>
      )}
    </div>
  );
}