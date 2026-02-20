import { useEffect, useState, useCallback, useRef } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { parseUnits } from 'viem';
import type { Abi } from 'viem';
import type { RetirementPlan } from '@/types/retirement_types';
import { initialDepositAmount } from '@/types/retirement_types';
import { getContractAddresses } from '@/config';
import { PERSONAL_FUND_FACTORY_ABI } from '@/contracts/abis';

const ERC20_APPROVE_ABI = [
  {
    name:            'approve',
    type:            'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

type TransactionStep =
  | 'idle'
  | 'approving'
  | 'approved'
  | 'creating'
  | 'confirming'
  | 'success'
  | 'error';

interface ErrorDisplay {
  title:        string;
  message:      string;
  details?:     string;
  suggestions?: string[];
}

export interface ExecutionStepProps {
  plan:             RetirementPlan;
  factoryAddress:   `0x${string}`;
  needsApproval:    boolean;
  selectedProtocol: `0x${string}`;
  onSuccess:        (txHash: `0x${string}`, fundAddress?: string) => void;
}

const parseUSDC = (value: string | number): bigint =>
  parseUnits(
    (typeof value === 'string' ? parseFloat(value) : value).toString(),
    6,
  );

function enrichGasError(display: ErrorDisplay, rawError: unknown): ErrorDisplay {
  const msg = String(rawError);
  if (
    msg.includes('max fee per gas less than block base fee') ||
    msg.includes('maxFeePerGas') ||
    msg.includes('baseFee')
  ) {
    return {
      ...display,
      title:   'Gas Fee Insuficiente',
      message: 'El gas fee configurado es menor que el fee base de la red en este momento.',
      suggestions: [
        'Espera 30-60 segundos y reintenta (el base fee fluctúa constantemente)',
        'Al confirmar en tu wallet, aumenta manualmente el "Max fee" y "Max priority fee"',
        'Asegúrate de tener suficiente ETH para pagar el gas',
      ],
    };
  }
  return display;
}

function formatErrorForUI(error: unknown): ErrorDisplay {
  const msg = String(error);

  if (msg.includes('User rejected') || msg.includes('user rejected'))
    return { title: 'Transacción Rechazada', message: 'Rechazaste la transacción en tu wallet.' };

  if (msg.includes('insufficient funds'))
    return {
      title:       'Fondos Insuficientes',
      message:     'No tienes suficiente ETH para pagar el gas.',
      suggestions: ['Obtén ETH de un faucet de testnet'],
    };

  return {
    title:   'Error en la Transacción',
    message: 'Ocurrió un error inesperado.',
    details: msg.slice(0, 300),
    suggestions: ['Intenta nuevamente', 'Verifica tu wallet y saldo'],
  };
}

export function ExecutionStep({
  plan,
  factoryAddress,
  needsApproval,
  selectedProtocol,
  onSuccess,
}: ExecutionStepProps) {
  const { address: account, chain } = useAccount();
  const [step,         setStep        ] = useState<TransactionStep>('idle');
  const [errorDisplay, setErrorDisplay] = useState<ErrorDisplay | null>(null);

  // Ref para evitar que onSuccess se dispare más de una vez aunque el effect
  // se re-ejecute (por ejemplo si el padre no memoizó la función).
  const successFiredRef = useRef(false);

  const chainId     = chain?.id ?? 421614;
  const addresses   = getContractAddresses(chainId);
  const usdcAddress = addresses?.usdc;
  const explorerUrl = chainId === 421614
    ? 'https://sepolia.arbiscan.io'
    : 'https://amoy.polygonscan.com';

  const principalWei      = parseUSDC(plan.principal);
  const monthlyDepositWei = parseUSDC(plan.monthlyDeposit);
  const approvalAmountWei = initialDepositAmount(plan);

  // ─── Approval tx ────────────────────────────────────────────────────────────
  const {
    writeContract: writeApproval,
    data:          approvalHash,
    isPending:     isApprovalPending,
    error:         approvalWriteError,
  } = useWriteContract();

  const { isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approvalHash });

  // ─── Create fund tx ─────────────────────────────────────────────────────────
  const {
    writeContract: writeCreateFund,
    data:          txHash,
    isPending:     isCreatePending,
    error:         createWriteError,
  } = useWriteContract();

  const {
    isSuccess: isTxSuccess,
    data:      receipt,
    error:     receiptError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const handleCreateFund = useCallback(() => {
    if (!account || !chain) {
      setErrorDisplay({
        title:       'Wallet no conectada',
        message:     'La wallet se desconectó durante el proceso',
        suggestions: ['Reconecta tu wallet e intenta nuevamente'],
      });
      setStep('error');
      return;
    }

    setStep('creating');

    if (import.meta.env.DEV) {
      console.log('[ExecutionStep] createPersonalFund params:', {
        principal:            `${plan.principal} USDC → ${principalWei} wei`,
        monthlyDeposit:       `${plan.monthlyDeposit} USDC → ${monthlyDepositWei} wei`,
        currentAge:           plan.currentAge,
        retirementAge:        plan.retirementAge,
        desiredMonthlyIncome: plan.desiredMonthlyIncome,
        yearsPayments:        plan.yearsPayments,
        interestRate:         `${plan.interestRate}% → ${Math.round(plan.interestRate * 100)} bps`,
        timelockYears:        plan.timelockYears,
      });
    }

    writeCreateFund({
      address:      factoryAddress,
      abi:          PERSONAL_FUND_FACTORY_ABI as Abi,
      functionName: 'createPersonalFund',
      args: [
        principalWei,
        monthlyDepositWei,
        BigInt(plan.currentAge),
        BigInt(plan.retirementAge),
        BigInt(Math.round(plan.desiredMonthlyIncome)),
        BigInt(plan.yearsPayments),
        BigInt(Math.round(plan.interestRate * 100)),
        BigInt(plan.timelockYears === 0 ? 15 : plan.timelockYears),
        selectedProtocol,
      ],
      account,
      chain,
      gas: 500_000n,
    });
  }, [
    account, chain, factoryAddress, selectedProtocol,
    plan, principalWei, monthlyDepositWei, writeCreateFund,
  ]);

  // ─── Effects ─────────────────────────────────────────────────────────────────

  // Approval confirmed → move to 'approved' step
  useEffect(() => {
    if (isApprovalSuccess && approvalHash && step === 'approving') {
      setStep('approved');
    }
  }, [isApprovalSuccess, approvalHash, step]);

  // TX confirmed → success
  // FIX: usamos queueMicrotask para asegurarnos que React termine el render actual
  // antes de llamar onSuccess, que puede navegar y desmontar este componente.
  useEffect(() => {
    if (!isTxSuccess || !receipt || step !== 'confirming') return;
    if (successFiredRef.current) return;

    if (!Array.isArray(receipt.logs)) {
      setErrorDisplay({
        title:       'Error de Receipt',
        message:     'Error procesando la confirmación de la transacción',
        suggestions: ['Recarga la página y verifica en el explorador de bloques'],
      });
      setStep('error');
      return;
    }

    successFiredRef.current = true;
    setStep('success');

    // Diferimos onSuccess para que React termine de commitear el estado 'success'
    // antes de que el padre navegue/desmonte este componente.
    // Esto elimina el "Node cannot be found in the current page".
    const hash = txHash as `0x${string}`;
    queueMicrotask(() => {
      onSuccess(hash);
    });
  }, [isTxSuccess, receipt, step, txHash, onSuccess]);

  // Approval write error
  useEffect(() => {
    if (approvalWriteError && step === 'approving') {
      const display = enrichGasError(formatErrorForUI(approvalWriteError), approvalWriteError);
      setErrorDisplay(display);
      setStep('error');
    }
  }, [approvalWriteError, step]);

  // Create write error
  useEffect(() => {
    if (createWriteError && (step === 'creating' || step === 'approved')) {
      const display = enrichGasError(formatErrorForUI(createWriteError), createWriteError);
      setErrorDisplay(display);
      setStep('error');
    }
  }, [createWriteError, step]);

  // Receipt error
  useEffect(() => {
    if (receiptError && step === 'confirming') {
      const display = enrichGasError(formatErrorForUI(receiptError), receiptError);
      setErrorDisplay(display);
      setStep('error');
    }
  }, [receiptError, step]);

  // Cuando writeCreateFund setea isPending=false y hay hash, pasamos a 'confirming'
  useEffect(() => {
    if (txHash && step === 'creating' && !isCreatePending) {
      setStep('confirming');
    }
  }, [txHash, step, isCreatePending]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleStart = () => {
    setErrorDisplay(null);
    successFiredRef.current = false;

    if (!account || !chain) {
      setErrorDisplay({
        title:       'Wallet no conectada',
        message:     'Por favor conecta tu wallet para continuar',
        suggestions: ['Conecta tu wallet usando el botón de la barra superior'],
      });
      setStep('error');
      return;
    }

    if (!usdcAddress) {
      setErrorDisplay({
        title:       'Red no soportada',
        message:     `USDC no está configurado para la red ${chainId}`,
        suggestions: ['Cambia a Arbitrum Sepolia o Polygon Amoy'],
      });
      setStep('error');
      return;
    }

    if (import.meta.env.DEV) {
      console.log('[ExecutionStep] Starting with amounts:', {
        usdcAddress,
        factoryAddress,
        principal:      principalWei.toString(),
        monthlyDeposit: monthlyDepositWei.toString(),
        approvalAmount: approvalAmountWei.toString(),
        chainId,
      });
    }

    if (needsApproval) {
      setStep('approving');
      writeApproval({
        address:      usdcAddress,
        abi:          ERC20_APPROVE_ABI,
        functionName: 'approve',
        args:         [factoryAddress, approvalAmountWei],
        account,
        chain,
        gas:          100_000n,
      });
    } else {
      handleCreateFund();
    }
  };

  const reset = () => {
    setStep('idle');
    setErrorDisplay(null);
    successFiredRef.current = false;
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const showApprovedPanel = step === 'approved';
  const showProgressPanel = step !== 'idle' && step !== 'approved' && step !== 'error';

  return (
    <div className="space-y-6">

      {/* Aprobación completada */}
      {showApprovedPanel && (
        <div className="bg-amber-50 rounded-xl p-6 border-2 border-amber-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-amber-600 shrink-0 mt-1" size={24} />
            <div>
              <h3 className="text-lg font-bold text-amber-800 mb-2">
                Aprobación Completada ✅
              </h3>
              <p className="text-amber-700 mb-4">
                Ahora procederemos a crear tu contrato de retiro.
              </p>
              <button
                onClick={handleCreateFund}
                disabled={isCreatePending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:opacity-50"
              >
                {isCreatePending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    Procesando...
                  </span>
                ) : (
                  'Crear Contrato Ahora'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {errorDisplay && (
        <div className="bg-red-100 rounded-xl p-6 border-2 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 mb-2">{errorDisplay.title}</h3>
              <p className="text-red-700 mb-3">{errorDisplay.message}</p>

              {errorDisplay.details && (
                <details className="text-xs text-red-600 mb-3">
                  <summary className="cursor-pointer font-semibold">Detalles técnicos</summary>
                  <p className="mt-2 font-mono bg-red-50 p-2 rounded">{errorDisplay.details}</p>
                </details>
              )}

              {errorDisplay.suggestions && errorDisplay.suggestions.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3 mt-3">
                  <p className="text-sm font-semibold text-red-800 mb-2">💡 Sugerencias:</p>
                  <ul className="space-y-1 text-sm text-red-700">
                    {errorDisplay.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2 pl-9">
            <a
              href={`${explorerUrl}/address/${factoryAddress}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              <ExternalLink size={16} />
              Verificar Factory en explorador
            </a>
            {usdcAddress && (
              <a
                href={`${explorerUrl}/address/${usdcAddress}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                <ExternalLink size={16} />
                Verificar USDC en explorador
              </a>
            )}
            <button
              onClick={reset}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl mt-2 transition"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Progreso */}
      {showProgressPanel && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800 text-center">
            Ejecutando transacciones...
          </h3>

          <div className="space-y-3">
            {needsApproval && (
              <StepRow
                active={['approving', 'approved', 'creating', 'confirming', 'success'].includes(step)}
                done={['approved', 'creating', 'confirming', 'success'].includes(step)}
                spinning={step === 'approving'}
                label="Paso 1: Aprobar USDC"
                txHash={approvalHash}
                explorerUrl={explorerUrl}
              />
            )}
            <StepRow
              active={['creating', 'confirming', 'success'].includes(step)}
              done={step === 'success'}
              spinning={step === 'creating' || step === 'confirming'}
              label={`Paso ${needsApproval ? '2' : '1'}: Crear Contrato`}
              txHash={txHash}
              explorerUrl={explorerUrl}
            />
          </div>

          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              {step === 'approving'  && '⏳ Confirma la aprobación en tu wallet'}
              {step === 'creating'   && '⏳ Confirma la transacción en tu wallet'}
              {step === 'confirming' && '⏳ Esperando confirmación en la blockchain...'}
              {step === 'success'    && '✅ ¡Contrato creado exitosamente!'}
            </p>
          </div>
        </div>
      )}

      {/* Idle — botón de inicio */}
      {step === 'idle' && (
        <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Listo para crear tu contrato
          </h3>
          <p className="text-gray-700 mb-6">
            {needsApproval
              ? 'Se ejecutarán 2 transacciones: aprobación de USDC y creación del contrato.'
              : 'Se ejecutará 1 transacción para crear tu contrato.'}
          </p>
          <button
            onClick={handleStart}
            disabled={isApprovalPending || isCreatePending}
            className="w-full bg-linear-to-r from-purple-600 to-pink-600
                       hover:from-purple-700 hover:to-pink-700 text-white font-bold
                       text-xl py-4 rounded-xl shadow-lg transition-all transform
                       hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                       disabled:scale-100"
          >
            {isApprovalPending || isCreatePending ? (
              <span className="flex items-center justify-center gap-3">
                <Loader2 className="animate-spin" size={24} />
                Procesando...
              </span>
            ) : (
              'Iniciar Creación'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

interface StepRowProps {
  active:      boolean;
  done:        boolean;
  spinning:    boolean;
  label:       string;
  txHash:      `0x${string}` | undefined;
  explorerUrl: string;
}

function StepRow({ active, done, spinning, label, txHash, explorerUrl }: StepRowProps) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
      active ? 'bg-green-100' : 'bg-gray-100'
    }`}>
      {done ? (
        <CheckCircle className="text-green-600 shrink-0" size={24} />
      ) : spinning ? (
        <Loader2 className="animate-spin text-blue-600 shrink-0" size={24} />
      ) : (
        <div className="w-6 h-6 rounded-full border-2 border-gray-400 shrink-0" />
      )}

      <div className="flex-1">
        <p className="font-semibold text-gray-800">{label}</p>
        {txHash && (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-gray-600 font-mono">
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
            <a
              href={`${explorerUrl}/tx/${txHash}`}
              target="_blank" rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}