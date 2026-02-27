/**
 * CreateFundPage.tsx
 *
 * Flujo completo de creación del fondo en una sola página multi-step.
 * Reemplaza CreateContractPage + ContractCreatedPage.
 *
 * STEPS:
 *   0 → GUARD         – verificar que ya no tiene fondo / red correcta
 *   1 → REVIEW        – revisar parámetros del plan + elegir protocolo de inversión
 *   2 → BALANCE CHECK – leer balance USDC on-chain (lectura pura, 0 gas)
 *   3 → APPROVE       – ERC-20 approve (1 tx) — solo si allowance < importe
 *   4 → CREATE        – llamada a factory.createFund (1 tx)
 *   5 → SUCCESS       – animación + resumen + redirect a dashboard
 *
 * Patrón "approve → execute" (como Uniswap, Aave, Curve):
 *   · Balance check sin gas: useReadContract(balanceOf)
 *   · Allowance check sin gas: useReadContract(allowance)
 *   · Si allowance >= importe → salta el paso APPROVE
 *   · Feedback granular en cada transacción (pending / confirming / confirmed)
 */

import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { useNavigate }              from 'react-router-dom';
import { useChainId, useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { formatUnits }              from 'viem';

import { useRetirementPlan }        from '@/components/context/RetirementContext';
import { useWallet }                from '@/hooks/web3';
import { useHasFund }               from '@/hooks/funds/useHasFund';
import { useUSDCApproval }          from '@/hooks/usdc/useUSDCApproval';
import { useUSDCBalance, useUSDCAllowance } from '@/hooks/usdc/useUSDC';
import { getContractAddress }       from '@/config';
import { derivePlanValues, requiredApprovalAmount, buildCreateFundArgs } from '@/types/retirement_types';
import type { RetirementPlan }      from '@/types/retirement_types';
import { InvestmentSelector }       from '@/components/retirement/InvestmentSelector';
import type { InvestmentSelection } from '@/components/retirement/InvestmentSelector';
import { PERSONAL_FUND_FACTORY_ABI }                   from '@/contracts/abis';

import {
  ArrowLeft, ArrowRight, CheckCircle, AlertCircle,
  Wallet, RefreshCw, Sparkles, ShieldCheck,
  Clock, Info, Lock,
  TrendingUp, Zap, BarChart3,
} from 'lucide-react';


const EXPECTED_CHAIN_ID  = 421614;
const ZERO_ADDR          = '0x0000000000000000000000000000000000000000' as const;
const ARBISCAN           = 'https://sepolia.arbiscan.io/tx/';
const SUCCESS_REDIRECT   = 4000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function fmtYrs(n: number): string {
  return `${n} año${n !== 1 ? 's' : ''}`;
}

// ─── Step types ───────────────────────────────────────────────────────────────

type Step = 'review' | 'balance' | 'approve' | 'create' | 'success';

const STEPS: { id: Step; label: string }[] = [
  { id: 'review',  label: 'Revisión'  },
  { id: 'balance', label: 'Balance'   },
  { id: 'approve', label: 'Aprobar'   },
  { id: 'create',  label: 'Crear'     },
  { id: 'success', label: '¡Listo!'   },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Stepper bar at the top */
const StepBar: React.FC<{ current: Step }> = ({ current }) => {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const done    = i < idx;
        const active  = i === idx;
        const future  = i > idx;
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center font-black text-sm
                  transition-all duration-500
                  ${done   ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'  : ''}
                  ${active ? 'bg-indigo-600  text-white shadow-lg shadow-indigo-200 scale-110' : ''}
                  ${future ? 'bg-gray-200    text-gray-400'                            : ''}
                `}
              >
                {done ? <CheckCircle size={18} /> : i + 1}
              </div>
              <p className={`
                mt-1.5 text-xs font-semibold hidden sm:block
                ${done   ? 'text-emerald-600' : ''}
                ${active ? 'text-indigo-700'  : ''}
                ${future ? 'text-gray-400'    : ''}
              `}>{s.label}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`
                flex-1 h-1 mx-1 rounded transition-all duration-500
                ${i < idx ? 'bg-emerald-400' : 'bg-gray-200'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
};

/** Pill badge */
const Pill: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${color}`}>
    {children}
  </span>
);

/** Labelled value row */
const Row: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
    <span className="text-gray-500 text-sm">{label}</span>
    <strong className={`text-sm ${accent ? 'text-indigo-700 text-base' : 'text-gray-800'}`}>{value}</strong>
  </div>
);

// ─── Tx progress indicator (reutilizable en Approve y Create) ─────────────────

interface TxStageProps {
  isWalletPending:  boolean;
  isConfirming:     boolean;
  isConfirmed:      boolean;
  error:            Error | null;
  label:            string;
  hash?:            `0x${string}`;
}

const TxStage: React.FC<TxStageProps> = ({
  isWalletPending, isConfirming, isConfirmed, error, label, hash,
}) => (
  <div className="space-y-3">
    {/* Status badge */}
    <div className={`
      flex items-center gap-3 p-4 rounded-2xl border-2 transition-all
      ${isConfirmed ? 'bg-emerald-50 border-emerald-300'
        : error     ? 'bg-red-50    border-red-300'
        : 'bg-indigo-50 border-indigo-200'
      }
    `}>
      {isConfirmed
        ? <CheckCircle className="text-emerald-500 shrink-0" size={24} />
        : error
        ? <AlertCircle className="text-red-500 shrink-0" size={24} />
        : <RefreshCw className="animate-spin text-indigo-500 shrink-0" size={24} />
      }
      <div>
        <p className={`font-bold text-sm ${isConfirmed ? 'text-emerald-800' : error ? 'text-red-800' : 'text-indigo-800'}`}>
          {isConfirmed ? `${label} confirmada ✓`
            : error    ? 'Transacción rechazada'
            : isConfirming   ? 'Confirmando en la red…'
            : isWalletPending ? 'Esperando firma en tu wallet…'
            : label
          }
        </p>
        {error && <p className="text-xs text-red-600 mt-0.5 line-clamp-2">{error.message}</p>}
      </div>
    </div>

    {/* Progress bar */}
    {(isWalletPending || isConfirming) && (
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-700"
          style={{ width: isConfirming ? '75%' : '35%' }}
        />
      </div>
    )}

    {/* Explorer link */}
    {hash && (
      <a
        href={`${ARBISCAN}${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 transition"
      >
        <Zap size={12} />
        Ver en Arbiscan
        <ArrowRight size={10} />
      </a>
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const CreateFundPage: React.FC = () => {
  const navigate                      = useNavigate();
  const { address }                   = useAccount();
  const publicClient                  = usePublicClient();
  const chainId                       = useChainId();
  const { planData }                  = useRetirementPlan();
  const { isConnected }               = useWallet();
  const { hasFund, fundAddress, isLoading: loadingFund } = useHasFund();

  const factoryAddress = getContractAddress(chainId, 'personalFundFactory') as `0x${string}` | undefined;

  // ─── Local state ────────────────────────────────────────────────────────
  const [step,               setStep]               = useState<Step>('review');
  const [plan,               setPlan]               = useState<RetirementPlan | null>(null);
  const [investmentSel,      setInvestmentSel]      = useState<InvestmentSelection | null>(null);
  const [selError,           setSelError]           = useState<string | null>(null);

  // Step: balance


  // Step: approve
  const [approveDone,        setApproveDone]        = useState(false);
  const [approveHash,        setApproveHash]        = useState<`0x${string}` | undefined>();
  const [approveError,       setApproveError]       = useState<Error | null>(null);
  const [approveWallet,      setApproveWallet]      = useState(false);
  const [approveConfirming,  setApproveConfirming]  = useState(false);

  // Step: create
  const [createHash,         setCreateHash]         = useState<`0x${string}` | undefined>();
  const [createError,        setCreateError]        = useState<Error | null>(null);
  const [createWallet,       setCreateWallet]       = useState(false);
  const [createConfirming,   setCreateConfirming]   = useState(false);
  const [createDone,         setCreateDone]         = useState(false);


  const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Sync planData from context ────────────────────────────────────────
  useEffect(() => {
    if (!planData) { void navigate('/calculator', { replace: true }); return; }
    if (isConnected) startTransition(() => setPlan(planData));
  }, [planData, isConnected, navigate]);

  useEffect(() => () => { if (redirectRef.current) clearTimeout(redirectRef.current); }, []);

  // ─── Derived plan values ────────────────────────────────────────────────
  const derived = useMemo(() => plan ? derivePlanValues(plan) : null, [plan]);

  /** Amount en micro-USDC que el usuario necesita aprobar.
   *  requiredApprovalAmount() = principal + monthlyDeposit + fee 5%, todo en wei (6 decimales).
   *  plan.principal/monthlyDeposit están en dólares → toUSDCWei los convierte internamente. */
  const requiredUsdc: bigint = useMemo(
    () => plan ? requiredApprovalAmount(plan) : 0n,
    [plan],
  );

  // ─── On-chain reads (balance & allowance) — NO gas, just RPC calls ─────
  // Usa los hooks existentes que leen la dirección USDC desde usdcUtils.getUSDCAddress(chainId)
  // sin cascada — una sola llamada por dato, siempre activas mientras hay wallet conectada.

  const {
    data:    usdcBalanceWei,
    isLoading: loadingBalance,
    refetch: refetchBalance,
  } = useUSDCBalance(address);

  const {
    data:    currentAllowanceWei,
    isLoading: loadingAllowance,
    refetch: refetchAllowance,
  } = useUSDCAllowance(address, factoryAddress ?? undefined);

  const usdcBalanceNum   = usdcBalanceWei        ? Number(formatUnits(usdcBalanceWei, 6))        : 0;
  const allowanceNum     = currentAllowanceWei   ? Number(formatUnits(currentAllowanceWei, 6))   : 0;
  const requiredNum      = derived?.initialDepositUsdc ?? 0;
  const hasEnoughBalance = usdcBalanceNum >= requiredNum;
  const needsApproval    = allowanceNum < requiredNum;

  // ─── Step APPROVE — useUSDCApproval acepta wei directamente ─────────────
  // usdcAmount (bigint wei) → formatUnits(, 6) → string dólares que espera el hook
  const approvalAmountStr = useMemo(
    () => formatUnits(requiredUsdc, 6),
    [requiredUsdc],
  );

  const approval = useUSDCApproval({
    amount:  approvalAmountStr,
    spender: factoryAddress ?? ZERO_ADDR,
    onSuccess: (hash) => {
      setApproveHash(hash);
      setApproveDone(true);
      setApproveConfirming(false);
    },
    onError: (e) => {
      setApproveError(e);
      setApproveWallet(false);
      setApproveConfirming(false);
    },
  });

  // ─── Step CREATE — useWriteContract nativo, sin capa USDC ────────────────
  const {
    writeContract:  writeCreate,
    data:           createTxHash,
    error:          createWriteError,
  } = useWriteContract();

  const { isSuccess: isCreateSuccess } =
    useWaitForTransactionReceipt({
      hash:  createTxHash,
      query: { enabled: !!createTxHash },
    });

  // Cuando la tx de create confirma on-chain
  useEffect(() => {
    if (!isCreateSuccess || !createTxHash) return;
    setCreateHash(createTxHash);
    setCreateDone(true);
    setCreateConfirming(false);
    startTransition(() => setStep('success'));
    redirectRef.current = setTimeout(() => navigate('/dashboard'), SUCCESS_REDIRECT);
  }, [isCreateSuccess, createTxHash, navigate]);

  // Errores de create
  useEffect(() => {
    if (!createWriteError) return;
    setCreateError(createWriteError as Error);
    setCreateWallet(false);
    setCreateConfirming(false);
  }, [createWriteError]);

  // ─── Guard: wrong network ───────────────────────────────────────────────
  if (!loadingFund && chainId !== EXPECTED_CHAIN_ID) {
    return (
      <Guard icon={<AlertCircle className="w-20 h-20 text-red-500 mx-auto" />} color="red"
        title="Red Incorrecta"
        body={<>Cambia a <strong>Arbitrum Sepolia</strong> (Chain ID 421614) para continuar.</>}
        cta={{ label: 'Volver a la Calculadora', onClick: () => navigate('/calculator') }}
      />
    );
  }

  // ─── Guard: already has fund ────────────────────────────────────────────
  if (!loadingFund && hasFund && fundAddress && step !== 'success') {
    return (
      <Guard icon={<Info className="w-20 h-20 text-amber-500 mx-auto" />} color="amber"
        title="Ya Tienes un Fondo"
        body={<>Solo puedes tener un fondo por wallet. Tu fondo: <code className="text-xs break-all block mt-2 bg-amber-50 p-2 rounded">{fundAddress}</code></>}
        cta={{ label: 'Ir al Dashboard', onClick: () => navigate('/dashboard') }}
        secondary={{ label: 'Volver a la Calculadora', onClick: () => navigate('/calculator') }}
      />
    );
  }

  if (loadingFund || !plan || !derived) {
    return (
      <div className="min-h-screen bg-linear-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <RefreshCw className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleReviewContinue = () => {
    setSelError(null);
    if (!investmentSel) { setSelError('Selecciona un método de inversión para continuar.'); return; }
    setStep('balance');
    // refetch on entering balance step
    setTimeout(() => { void refetchBalance(); void refetchAllowance(); }, 100);
  };

  const handleBalanceContinue = () => {
    setStep(needsApproval ? 'approve' : 'create');
  };

  const handleApprove = async () => {
    setApproveError(null);
    setApproveWallet(true);
    try {
      await approval.approve();
      setApproveConfirming(true);
    } catch (e) {
      setApproveError(e as Error);
      setApproveWallet(false);
    }
  };

  const handleApproveNext = () => {
    void refetchAllowance();
    setStep('create');
  };

  const handleCreate = async () => {
    if (!plan || !investmentSel || !factoryAddress) return;
    setCreateError(null);
    setCreateWallet(true);
    try {
      const createArgs = buildCreateFundArgs({ ...plan, selectedProtocol: investmentSel.protocolAddress });

      // Gas: precio real clampeado al máximo por chain
      let gasOverrides: { gasPrice: bigint } | undefined;
      if (publicClient) {
        try {
          const chainId = publicClient.chain?.id ?? 421614;
          const caps: Record<number, bigint> = {
            421614: 2_000_000_000n, 42161: 10_000_000_000n,
            137: 500_000_000_000n,  1: 300_000_000_000n,
          };
          const cap = caps[chainId] ?? 10_000_000_000n;
          const gp  = await publicClient.getGasPrice();
          gasOverrides = { gasPrice: gp > cap ? cap : gp };
          if (import.meta.env.DEV) console.log('[handleCreate] gasPrice:', gasOverrides.gasPrice.toString());
        } catch { /* usar defaults de wagmi */ }
      }

      writeCreate({
        address:      factoryAddress,
        abi:          PERSONAL_FUND_FACTORY_ABI,
        functionName: 'createPersonalFund',
        args:         createArgs,
        ...gasOverrides,
      });
      setCreateConfirming(true);
    } catch (e) {
      setCreateError(e as Error);
      setCreateWallet(false);
    }
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back button */}
        {step !== 'success' && (
          <button
            onClick={() => {
              if (step === 'review')  navigate('/calculator');
              else if (step === 'balance') setStep('review');
              else if (step === 'approve') setStep('balance');
              else if (step === 'create')  setStep(needsApproval ? 'approve' : 'balance');
            }}
            className="mb-6 flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm transition"
          >
            <ArrowLeft size={18} />
            {step === 'review' ? 'Volver a la Calculadora' : 'Paso anterior'}
          </button>
        )}

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-100 overflow-hidden">

          {/* Header */}
          <div className="bg-linear-to-r from-indigo-600 to-purple-700 p-8 text-white">
            <div className="flex items-center gap-4 mb-2">
              <Sparkles size={32} className="opacity-90" />
              <h1 className="text-3xl font-black">Crear mi Fondo</h1>
            </div>
            <p className="text-indigo-100 text-sm">Plan calculado · Arbitrum Sepolia</p>
          </div>

          <div className="p-6 sm:p-8">
            <StepBar current={step} />

            {/* ══════════════════════════════════════════════════════════
                STEP 1 — REVIEW
            ══════════════════════════════════════════════════════════ */}
            {step === 'review' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Parámetros del Plan</h2>
                  <div className="bg-gray-50 rounded-2xl p-5">
                    <Row label="Depósito inicial"           value={fmtUSD(derived.initialDepositUsdc)} accent />
                    <Row label="Ahorro mensual"             value={fmtUSD(plan.monthlyDeposit)} />
                    <Row label="Edad actual / retiro"       value={`${plan.currentAge} → ${plan.retirementAge} años`} />
                    <Row label="Ingreso mensual deseado"    value={fmtUSD(plan.desiredMonthlyIncome)} />
                    <Row label="Años recibiendo ingresos"   value={fmtYrs(plan.yearsPayments)} />
                    <Row label="Tasa anual esperada"        value={`${plan.interestRate}%`} />
                    <Row label="Timelock de seguridad"      value={fmtYrs(plan.timelockYears)} />
                  </div>
                </div>

                {/* Fee breakdown */}
                <div className="bg-linear-to-br from-emerald-50 to-green-50 rounded-2xl p-5 border-2 border-emerald-200">
                  <h3 className="font-bold text-emerald-800 text-sm uppercase tracking-wide mb-3">
                    Breakdown del primer depósito
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sale de tu wallet:</span>
                      <strong className="text-gray-800">{fmtUSD(derived.initialDepositUsdc)}</strong>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Fee Ethernal (5%):</span>
                      <strong>− {fmtUSD(derived.feeUsdc)}</strong>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200 pt-2 text-base">
                      <span className="font-bold text-emerald-800">Neto en tu fondo DeFi:</span>
                      <strong className="text-emerald-700">{fmtUSD(derived.netToFundUsdc)}</strong>
                    </div>
                  </div>
                </div>

                {/* Investment selector */}
                <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border-2 border-purple-200">
                  <h3 className="font-bold text-purple-800 mb-1 flex items-center gap-2">
                    <BarChart3 size={20} />
                    Método de Inversión
                  </h3>
                  <p className="text-gray-500 text-xs mb-4">
                    Elige cómo quieres hacer crecer tus ahorros de retiro
                  </p>
                  <InvestmentSelector
                    onSelectionComplete={setInvestmentSel}
                    currentSelection={investmentSel ?? undefined}
                  />
                  {selError && (
                    <p className="mt-3 text-red-600 text-sm flex items-center gap-1.5">
                      <AlertCircle size={14} /> {selError}
                    </p>
                  )}
                </div>

                {/* Immutability notice */}
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-amber-800 text-sm">
                    Una vez creado el contrato, <strong>estos parámetros no podrán modificarse</strong>.
                    El timelock de {fmtYrs(plan.timelockYears)} es permanente.
                  </p>
                </div>

                <button
                  onClick={handleReviewContinue}
                  className="w-full bg-linear-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-black text-lg py-5 rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  Verificar Balance
                  <ArrowRight size={22} />
                </button>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 2 — BALANCE CHECK
                Lectura on-chain sin gas (eth_call). El usuario ve su
                balance real antes de autorizar cualquier movimiento.
            ══════════════════════════════════════════════════════════ */}
            {step === 'balance' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-800 mb-1">Verificación de Balance</h2>
                  <p className="text-gray-500 text-sm">
                    Consultamos tu wallet on-chain. Sin gas, sin transacción.
                  </p>
                </div>

                {(loadingBalance || loadingAllowance) ? (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <RefreshCw className="animate-spin text-indigo-500" size={40} />
                    <p className="text-gray-500 text-sm">Leyendo balance y allowance…</p>
                  </div>
                ) : (
                  <>
                    {/* Balance card */}
                    <div className={`
                      rounded-2xl p-5 border-2 transition-all
                      ${hasEnoughBalance
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-red-50    border-red-300'}
                    `}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Wallet size={22} className={hasEnoughBalance ? 'text-emerald-600' : 'text-red-500'} />
                          <span className="font-bold text-gray-700">Tu Balance USDC</span>
                        </div>
                        <Pill color={hasEnoughBalance ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                          {hasEnoughBalance ? <><CheckCircle size={12} />Suficiente</> : <><AlertCircle size={12} />Insuficiente</>}
                        </Pill>
                      </div>
                      <p className={`text-3xl font-black ${hasEnoughBalance ? 'text-emerald-700' : 'text-red-700'}`}>
                        {fmtUSD(usdcBalanceNum)}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Requerido: <strong>{fmtUSD(requiredNum)}</strong>
                        {!hasEnoughBalance && (
                          <span className="text-red-600 ml-2">
                            · Te faltan {fmtUSD(requiredNum - usdcBalanceNum)}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Allowance card */}
                    <div className={`
                      rounded-2xl p-5 border-2
                      ${!needsApproval
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-blue-50    border-blue-200'}
                    `}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={22} className={!needsApproval ? 'text-emerald-600' : 'text-blue-500'} />
                          <span className="font-bold text-gray-700">Allowance Actual</span>
                        </div>
                        <Pill color={!needsApproval ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}>
                          {!needsApproval
                            ? <><CheckCircle size={12} />Ya aprobado</>
                            : <><Clock size={12} />Requiere aprobación</>
                          }
                        </Pill>
                      </div>
                      <p className={`text-2xl font-black ${!needsApproval ? 'text-emerald-700' : 'text-blue-700'}`}>
                        {!needsApproval
                          ? fmtUSD(requiredNum)
                          : fmtUSD(allowanceNum)
                        }
                      </p>
                      {needsApproval && (
                        <p className="text-blue-600 text-xs mt-1">
                          Necesitarás firmar una tx de aprobación (1 vez).
                        </p>
                      )}
                    </div>

                    {/* Steps preview */}
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
                        Próximos pasos requeridos
                      </p>
                      {needsApproval && (
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">1</div>
                          <span><strong>Aprobar</strong> — ERC-20 approve para el Factory</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <div className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${needsApproval ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {needsApproval ? 2 : 1}
                        </div>
                        <span><strong>Crear fondo</strong> — factory.createFund + depósito inicial</span>
                      </div>
                    </div>

                    {!hasEnoughBalance && (
                      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-red-700">
                          <strong>Balance insuficiente.</strong> Obtén más USDC en el faucet de la
                          calculadora antes de continuar.
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => { void refetchBalance(); void refetchAllowance(); }}
                        className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-3 rounded-xl text-sm transition"
                      >
                        <RefreshCw size={14} />
                        Refrescar
                      </button>
                      <button
                        onClick={handleBalanceContinue}
                        disabled={!hasEnoughBalance}
                        className="flex-1 bg-linear-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        {needsApproval ? 'Continuar a Aprobación' : 'Continuar a Crear Fondo'}
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 3 — APPROVE
                Firma ERC-20 approve(factory, amount). Solo muestra si
                allowance < requiredAmount (verificado en el paso anterior).
            ══════════════════════════════════════════════════════════ */}
            {step === 'approve' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={32} className="text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Autorizar USDC</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Permite que el Factory mueva tus tokens una única vez
                  </p>
                </div>

                {/* What is an approval — educational */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-2 text-sm text-blue-800">
                  <p className="font-bold flex items-center gap-2">
                    <Info size={16} />
                    ¿Qué es el Approve?
                  </p>
                  <p>
                    En Ethereum, los tokens ERC-20 (como USDC) requieren que
                    <strong> autorices explícitamente</strong> a un contrato antes de que pueda
                    moverlos. Es un estándar de seguridad: el contrato sólo puede gastar hasta
                    el importe que apruebas.
                  </p>
                  <p className="text-blue-600 text-xs">
                    Esta aprobación no mueve ningún fondo. El movimiento ocurre en el siguiente paso.
                  </p>
                </div>

                {/* Amount being approved */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                  <Row label="Contrato receptor"  value="PersonalFundFactory" />
                  <Row label="Token"               value="USDC (6 decimales)" />
                  <Row label="Importe a autorizar" value={fmtUSD(requiredNum)} accent />
                </div>

                <TxStage
                  isWalletPending={approveWallet && !approveDone}
                  isConfirming={approveConfirming && !approveDone}
                  isConfirmed={approveDone}
                  error={approveError}
                  label="Aprobación USDC"
                  hash={approveHash}
                />

                {!approveDone ? (
                  <button
                    onClick={handleApprove}
                    disabled={approveWallet || approveConfirming}
                    className="w-full bg-linear-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-black text-lg py-5 rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                  >
                    {approveWallet || approveConfirming
                      ? <><RefreshCw className="animate-spin" size={22} />Esperando…</>
                      : <><ShieldCheck size={22} />Aprobar USDC</>
                    }
                  </button>
                ) : (
                  <button
                    onClick={handleApproveNext}
                    className="w-full bg-linear-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-lg py-5 rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                  >
                    Continuar a Crear Fondo
                    <ArrowRight size={22} />
                  </button>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 4 — CREATE
                factory.createFund(...) — mueve USDC + crea el contrato.
            ══════════════════════════════════════════════════════════ */}
            {step === 'create' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={32} className="text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Crear el Fondo</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    La factory desplegará tu contrato personal y realizará el depósito inicial
                  </p>
                </div>

                {/* Final summary */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                    Resumen de la transacción
                  </p>
                  <Row label="Depósito inicial" value={fmtUSD(derived.initialDepositUsdc)} accent />
                  <Row label="Fee Ethernal (5%)" value={`− ${fmtUSD(derived.feeUsdc)}`} />
                  <Row label="Neto en tu fondo"  value={fmtUSD(derived.netToFundUsdc)} />
                  <Row label="Protocolo DeFi"    value={investmentSel?.provider ?? '—'} />
                  <Row label="Timelock"          value={fmtYrs(plan.timelockYears)} />
                </div>

                <TxStage
                  isWalletPending={createWallet && !createDone}
                  isConfirming={createConfirming && !createDone}
                  isConfirmed={createDone}
                  error={createError}
                  label="Creación del fondo"
                  hash={createHash}
                />

                {!createDone && (
                  <button
                    onClick={handleCreate}
                    disabled={createWallet || createConfirming}
                    className="w-full bg-linear-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-black text-lg py-5 rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                  >
                    {createWallet || createConfirming
                      ? <><RefreshCw className="animate-spin" size={22} />Procesando…</>
                      : <><Sparkles size={22} />Crear mi Fondo</>
                    }
                  </button>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 5 — SUCCESS
            ══════════════════════════════════════════════════════════ */}
            {step === 'success' && (
              <div className="space-y-6 text-center">
                {/* Animated check */}
                <div className="py-4">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <CheckCircle size={52} className="text-emerald-500" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-800 mb-2">¡Fondo Creado!</h2>
                  <p className="text-gray-500">Tu contrato personal vive en la blockchain.</p>
                </div>

                {/* Tx hash + address */}
                <div className="bg-emerald-50 rounded-2xl p-5 border-2 border-emerald-200 text-left space-y-3">
                  {createHash && (
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-1">Transaction Hash</p>
                      <a href={`${ARBISCAN}${createHash}`} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs text-indigo-600 hover:text-indigo-800 break-all">
                        {createHash}
                      </a>
                    </div>
                  )}
                  {fundAddress && (
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-1">Dirección del Fondo</p>
                      <p className="font-mono text-xs text-gray-700 break-all">{fundAddress}</p>
                    </div>
                  )}
                </div>

                {/* What's next */}
                <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-200 text-left">
                  <p className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
                    <TrendingUp size={18} />
                    Próximos pasos
                  </p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      Realiza depósitos mensuales de <strong>{fmtUSD(plan.monthlyDeposit)}</strong> para alcanzar tu meta.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      Monitorea tu progreso y el rendimiento DeFi desde el Dashboard.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      Al cumplir el timelock, podrás iniciar el retiro programado.
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-linear-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-black text-xl py-6 rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  Ir al Dashboard
                  <ArrowRight size={24} />
                </button>
                <p className="text-xs text-gray-400">
                  Redirigiendo automáticamente en {SUCCESS_REDIRECT / 1000}s…
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFundPage;

// ─── Guard component (used for error states) ─────────────────────────────────

interface GuardProps {
  icon:       React.ReactNode;
  color:      'red' | 'amber';
  title:      string;
  body:       React.ReactNode;
  cta:        { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}

const Guard: React.FC<GuardProps> = ({ icon, color, title, body, cta, secondary }) => {
  const bg  = color === 'red' ? 'from-red-50 to-orange-50'   : 'from-amber-50 to-orange-50';
  const btn = color === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700';
  return (
    <div className={`min-h-screen bg-linear-to-br ${bg} flex items-center justify-center px-4`}>
      <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-md border border-gray-200">
        <div className="mb-6">{icon}</div>
        <h1 className="text-3xl font-black text-gray-800 mb-4">{title}</h1>
        <div className="text-gray-700 mb-8 text-sm">{body}</div>
        <button onClick={cta.onClick} className={`${btn} text-white font-bold py-4 px-8 rounded-2xl text-lg transition w-full mb-3`}>
          {cta.label}
        </button>
        {secondary && (
          <button onClick={secondary.onClick} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-2xl text-base transition w-full">
            {secondary.label}
          </button>
        )}
      </div>
    </div>
  );
};