import { useEffect } from 'react';
import { useCreatePersonalFund } from '@/hooks/useCreatePersonalFund';
import { usePersonalFundFactory }  from '@/hooks/funds/usePersonalFundFactory';
import { parseUnits } from 'viem';

const PROTOCOL_ADDRESS = '0x...' as `0x${string}`; // dirección del protocolo DeFi

export function CreateFundForm() {
  const { createFund, isPending, isConfirming, isSuccess, error, receipt } = useCreatePersonalFund();
  const { refetch } = usePersonalFundFactory();

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess, refetch]);

  const handleCreate = () => {
    createFund({
      principal:        parseUnits('1000', 6), // 1000 USDC (6 decimales)
      monthlyDeposit:   parseUnits('100', 6),  // 100 USDC por mes
      currentAge:       30n,
      retirementAge:    65n,
      desiredMonthly:   parseUnits('2000', 6), // 2000 USDC/mes en retiro
      yearsPayments:    20n,
      interestRate:     500n,                  // 5.00%
      timelockYears:    10n,
      selectedProtocol: PROTOCOL_ADDRESS,
    });
  };

  return (
    <div>
      <button onClick={handleCreate} disabled={isPending || isConfirming}>
        {isPending    ? 'Confirmá en tu wallet...' :
         isConfirming ? 'Minando transacción...'   :
                        'Crear mi fondo'}
      </button>

      {isSuccess && (
        <p>✅ Fondo creado con éxito! Tx: {receipt?.transactionHash}</p>
      )}
      {error && (
        <p>❌ Error: {error.message}</p>
      )}
    </div>
  );
}