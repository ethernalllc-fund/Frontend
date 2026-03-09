import { useEffect } from "react";
import { useCreatePersonalFund } from "@/hooks/useCreatePersonalFund";
import { usePersonalFundFactory } from "@/hooks/funds/usePersonalFundFactory";
import { useProtocolStatus } from "@/hooks/funds/useProtocolStatus";
import { parseUnits } from "viem";

const PROTOCOL_ADDRESS = "0x6e1371974d923397ece9ee7525ac50ad7087c77f" as `0x${string}`;

export function CreateFundForm() {
  const { createFund, isPending, isConfirming, isSuccess, error, receipt } =
    useCreatePersonalFund();
  const { refetch } = usePersonalFundFactory();
  const {
    data: isProtocolActive,
    isLoading: isCheckingProtocol,
    isError: isProtocolError,
  } = useProtocolStatus(PROTOCOL_ADDRESS);

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess, refetch]);

  const handleCreate = () => {
    if (!isProtocolActive) return;

    createFund({
      principal:        parseUnits("1000", 6),
      monthlyDeposit:   parseUnits("100", 6),
      currentAge:       30n,
      retirementAge:    65n,
      desiredMonthly:   parseUnits("2000", 6),
      yearsPayments:    20n,
      interestRate:     500n,
      timelockYears:    10n,
      selectedProtocol: PROTOCOL_ADDRESS,
    });
  };

  const isButtonDisabled = isPending || isConfirming || !isProtocolActive || isCheckingProtocol;

  const buttonLabel = isPending
    ? "Confirmá en tu wallet..."
    : isConfirming
    ? "Minando transacción..."
    : isCheckingProtocol
    ? "Verificando protocolo..."
    : !isProtocolActive
    ? "Protocolo no disponible"
    : "Crear mi fondo";

  return (
    <div className="flex flex-col gap-3">
      {/* Protocol status badge */}
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
      {isProtocolActive === false && !isCheckingProtocol && (
        <p className="text-sm text-red-500 font-medium">
          🚫 Protocolo inactivo — contactá al administrador.
        </p>
      )}
      {isProtocolActive === true && !isCheckingProtocol && (
        <p className="text-sm text-green-500">
          ✅ Protocolo activo
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
          ✅ Fondo creado con éxito! Tx:{" "}
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