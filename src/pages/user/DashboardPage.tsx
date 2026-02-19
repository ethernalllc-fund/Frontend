import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate }    from 'react-router-dom';
import { useEthernal }    from '@/hooks/useEthernal';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { format }         from 'date-fns';
import {
  Wallet, Shield, TrendingUp, DollarSign, Clock,
  CheckCircle, AlertCircle, ArrowRight, RefreshCw, Sparkles,
  Target, MessageCircle, ExternalLink, PieChart, X,
  Settings, Zap, BarChart3, BookOpen, ChevronRight, Activity,
  AlertTriangle, Info,
} from 'lucide-react';
import { formatUSDCWithSymbol, formatUSDC, isValidUSDCAmount, parseUSDC } from '@/hooks/usdc/usdcUtils';
import { useUSDCTransaction } from '@/hooks/usdc/useUSDCTransaction';
import { PERSONAL_FUND_ABI, USER_PREFERENCES_ABI } from '@/contracts/abis';
import { USER_PREFERENCES_ADDRESS } from '@/contracts/addresses';

const ZERO_ADDRESS  = '0x0000000000000000000000000000000000000000';
const ARBISCAN_BASE = 'https://sepolia.arbiscan.io/address/';

// ─── Risk level metadata ───────────────────────────────────────────────────
const RISK_LEVELS = [
  {
    value: 0,
    label: 'Conservador',
    description: 'Bajo riesgo, rendimientos estables y protección del capital',
    color: 'emerald',
    icon: Shield,
    gradient: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800',
    btnActive: 'bg-emerald-600 text-white shadow-lg shadow-emerald-200',
    btnInactive: 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50',
  },
  {
    value: 1,
    label: 'Moderado',
    description: 'Balance entre crecimiento y estabilidad, ideal para largo plazo',
    color: 'blue',
    icon: BarChart3,
    gradient: 'from-blue-50 to-indigo-50',
    border: 'border-blue-300',
    badge: 'bg-blue-100 text-blue-800',
    btnActive: 'bg-blue-600 text-white shadow-lg shadow-blue-200',
    btnInactive: 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50',
  },
  {
    value: 2,
    label: 'Agresivo',
    description: 'Máximo potencial de rendimiento con mayor exposición al riesgo',
    color: 'violet',
    icon: Zap,
    gradient: 'from-violet-50 to-purple-50',
    border: 'border-violet-300',
    badge: 'bg-violet-100 text-violet-800',
    btnActive: 'bg-violet-600 text-white shadow-lg shadow-violet-200',
    btnInactive: 'bg-white text-violet-700 border border-violet-200 hover:bg-violet-50',
  },
] as const;

// ─── Strategy type metadata ────────────────────────────────────────────────
const STRATEGY_TYPES = [
  {
    value: 0,
    label: 'Concentrado',
    description: 'Todo en el mejor protocolo disponible según tu perfil',
    icon: Target,
  },
  {
    value: 1,
    label: 'Diversificado',
    description: 'Distribución entre múltiples protocolos para reducir riesgo',
    icon: PieChart,
  },
  {
    value: 2,
    label: 'Híbrido',
    description: 'Combinación dinámica ajustada al rendimiento del mercado',
    icon: Activity,
  },
] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatTimestamp(ts: bigint | undefined): string {
  if (!ts || ts === 0n) return 'Nunca';
  return format(new Date(Number(ts) * 1000), 'MMM dd, yyyy – HH:mm');
}

function formatUSDCDisplay(amount: bigint | undefined): string {
  if (!amount) return '$0.00';
  return `$${formatUSDC(amount)}`;
}

function shortAddr(addr: string | undefined): string {
  if (!addr || addr.length < 10) return addr ?? '—';
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function riskLevelColor(level: number): string {
  if (level === 0) return 'text-emerald-600';
  if (level === 1) return 'text-blue-600';
  return 'text-violet-600';
}

function riskLevelLabel(level: number): string {
  return RISK_LEVELS[level]?.label ?? 'Desconocido';
}

// ─── Admin content mock (replace with real API/contract data) ─────────────
const ADMIN_CONTENT = [
  {
    id: 1,
    type: 'recommendation' as const,
    title: 'Estrategia recomendada para Q1 2025',
    summary: 'Dados los indicadores macroeconómicos actuales, el equipo de análisis recomienda aumentar exposición a Aave v3 en Arbitrum.',
    date: 'Feb 15, 2025',
    icon: TrendingUp,
    color: 'indigo',
  },
  {
    id: 2,
    type: 'course' as const,
    title: 'Módulo 3: Fundamentos de DeFi',
    summary: 'Aprende cómo funcionan los protocolos de lending descentralizado y cómo evaluar su seguridad antes de invertir.',
    date: 'Feb 10, 2025',
    icon: BookOpen,
    color: 'pink',
  },
  {
    id: 3,
    type: 'recommendation' as const,
    title: 'Alerta: Actualización de riesgo',
    summary: 'Compound Finance actualizó sus parámetros de colateral. Usuarios con estrategia Agresiva deben revisar su exposición.',
    date: 'Feb 8, 2025',
    icon: AlertTriangle,
    color: 'amber',
  },
];

// ══════════════════════════════════════════════════════════════════════════
const DashboardPage: React.FC = () => {
  const navigate    = useNavigate();
  const { address } = useAccount();
  const {
    personalFund,
    factory,
    protocolRegistry,
    userPreferences,
    isLoading,
    refetchAll,
  } = useEthernal();

  // ─── Deposit modal state ────────────────────────────────────────────────
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount,      setDepositAmount]      = useState('');
  const [depositAmountError, setDepositAmountError] = useState<string | null>(null);
  const [depositMode,        setDepositMode]        = useState<'monthly' | 'custom'>('monthly');

  // ─── User Preferences local state ──────────────────────────────────────
  const currentRisk     = userPreferences.userConfig?.riskTolerance ?? 0;
  const currentStrategy = userPreferences.routingStrategy?.strategyType ?? 0;
  const currentProtocol = userPreferences.userConfig?.selectedProtocol ?? ZERO_ADDRESS;

  const [pendingRisk,     setPendingRisk]     = useState<number | null>(null);
  const [pendingStrategy, setPendingStrategy] = useState<number | null>(null);
  const [pendingProtocol, setPendingProtocol] = useState<`0x${string}` | null>(null);
  const [prefSaveError,   setPrefSaveError]   = useState<string | null>(null);
  const [prefSaveOk,      setPrefSaveOk]      = useState(false);
  const [stratSaveOk,     setStratSaveOk]     = useState(false);

  const effectiveRisk     = pendingRisk     ?? currentRisk;
  const effectiveStrategy = pendingStrategy ?? currentStrategy;
  const effectiveProtocol = pendingProtocol ?? (currentProtocol !== ZERO_ADDRESS ? currentProtocol : null);

  // ─── Write: setUserConfig ───────────────────────────────────────────────
  const {
    writeContract:   writeConfig,
    isPending:       isWritingConfig,
    data:            configTxHash,
  } = useWriteContract();

  const { isLoading: isConfirmingConfig } = useWaitForTransactionReceipt({
    hash: configTxHash,
    query: {
      enabled: Boolean(configTxHash),
    },
  });

  // ─── Write: setRoutingStrategy ──────────────────────────────────────────
  const {
    writeContract:   writeStrategy,
    isPending:       isWritingStrategy,
    data:            stratTxHash,
  } = useWriteContract();

  const { isLoading: isConfirmingStrategy } = useWaitForTransactionReceipt({
    hash: stratTxHash,
    query: {
      enabled: Boolean(stratTxHash),
    },
  });

  const isSavingPrefs    = isWritingConfig    || isConfirmingConfig;
  const isSavingStrategy = isWritingStrategy  || isConfirmingStrategy;

  // ─── Fund basics ────────────────────────────────────────────────────────
  const hasFund     = !!factory.userFund && factory.userFund !== ZERO_ADDRESS;
  const fundAddress = factory.userFund;

  const monthlyDepositAmount = personalFund.fundInfo?.monthlyDeposit
    ? (Number(personalFund.fundInfo.monthlyDeposit) / 1e6).toFixed(2)
    : '0';

  const activeDepositAmount = depositMode === 'monthly' ? monthlyDepositAmount : depositAmount;

  const activeDepositAmountBigInt = useMemo<bigint | undefined>(() => {
    if (!activeDepositAmount || parseFloat(activeDepositAmount) <= 0) return undefined;
    try { return parseUSDC(activeDepositAmount); } catch { return undefined; }
  }, [activeDepositAmount]);

  const depositTx = useUSDCTransaction({
    contractAddress:          fundAddress as `0x${string}`,
    abi:                      PERSONAL_FUND_ABI,
    functionName:             'deposit',
    args:                     [],
    usdcAmount:               activeDepositAmountBigInt,
    enabled:                  hasFund && isDepositModalOpen && parseFloat(activeDepositAmount) > 0,
    autoExecuteAfterApproval: true,
    onTransactionSuccess: (_txHash: string) => {
      refetchAll();
      setIsDepositModalOpen(false);
      setDepositAmount('');
      setDepositMode('monthly');
    },
    onError: (_err: unknown) => {},
  });

  // ─── Progress calc ──────────────────────────────────────────────────────
  const progress = useMemo(() => {
    if (!personalFund.fundInfo || !personalFund.balance) return null;
    const currentBalance  = Number(personalFund.balance) / 1e6;
    const monthlyDeposit  = Number(personalFund.fundInfo.monthlyDeposit ?? 0n) / 1e6;
    const desiredIncome   = Number(personalFund.fundInfo.desiredMonthlyIncome ?? 0n) / 1e6;
    const yearsPayments   = Number(personalFund.fundInfo.yearsPayments ?? 0);
    const timelockEnd     = personalFund.timelockInfo?.timelockEnd;
    const nowSec          = BigInt(Math.floor(Date.now() / 1000));
    const remainingSec    = timelockEnd && timelockEnd > nowSec ? timelockEnd - nowSec : 0n;
    const remainingMonths = Number(remainingSec) / (30 * 24 * 3600);
    const neededBalance   = desiredIncome > 0 && yearsPayments > 0
      ? desiredIncome * 12 * yearsPayments
      : monthlyDeposit * 12 * 25;
    const projectedBalance   = currentBalance + monthlyDeposit * remainingMonths;
    const progressPercentage = neededBalance > 0
      ? Math.min((currentBalance / neededBalance) * 100, 100) : 0;
    return {
      currentBalance,
      projectedBalance:    Math.max(projectedBalance, currentBalance),
      neededBalance,
      progressPercentage,
      onTrack:             projectedBalance >= neededBalance,
      monthsRemaining:     Math.floor(remainingMonths),
    };
  }, [personalFund]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleOpenDepositModal  = useCallback(() => {
    setDepositMode('monthly');
    setDepositAmount('');
    setDepositAmountError(null);
    setIsDepositModalOpen(true);
  }, []);

  const handleCloseDepositModal = useCallback(() => {
    if (depositTx.isLoading) return;
    setIsDepositModalOpen(false);
    setDepositAmount('');
    setDepositAmountError(null);
    depositTx.reset();
  }, [depositTx]);

  const handleDepositAmountChange = (value: string) => {
    setDepositAmount(value);
    setDepositAmountError(
      value && !isValidUSDCAmount(value) ? 'Ingresa un monto válido (máximo 6 decimales)' : null
    );
  };

  const handleExecuteDeposit = useCallback(() => {
    if (depositMode === 'custom' && !isValidUSDCAmount(depositAmount)) {
      setDepositAmountError('Ingresa un monto válido antes de continuar');
      return;
    }
    depositTx.executeAll();
  }, [depositMode, depositAmount, depositTx]);

  const handleStartRetirement = useCallback(() => {
    console.log('[DashboardPage] Start retirement – pending implementation');
  }, []);

  const handleSaveUserConfig = useCallback(() => {
    if (!address) return;
    setPrefSaveError(null);
    setPrefSaveOk(false);
    try {
      writeConfig({
        address:      USER_PREFERENCES_ADDRESS,
        abi:          USER_PREFERENCES_ABI,
        functionName: 'setUserConfig',
        args: [
          (effectiveProtocol ?? ZERO_ADDRESS) as `0x${string}`,
          userPreferences.userConfig?.autoCompound ?? false,
          effectiveRisk as 0 | 1 | 2,
        ],
      });
      setPendingRisk(null);
      setPendingProtocol(null);
      setPrefSaveOk(true);
      setTimeout(() => setPrefSaveOk(false), 3000);
    } catch (e) {
      setPrefSaveError((e as Error).message);
    }
  }, [address, effectiveRisk, effectiveProtocol, userPreferences.userConfig, writeConfig]);

  const handleSaveStrategy = useCallback(() => {
    if (!address) return;
    setStratSaveOk(false);
    try {
      writeStrategy({
        address:      USER_PREFERENCES_ADDRESS,
        abi:          USER_PREFERENCES_ABI,
        functionName: 'setRoutingStrategy',
        args: [
          effectiveStrategy as 0 | 1 | 2,
          50n,   // diversificationPercent default 50%
          10n,   // rebalanceThreshold default 10%
        ],
      });
      setPendingStrategy(null);
      setStratSaveOk(true);
      setTimeout(() => setStratSaveOk(false), 3000);
    } catch (e) {
      console.error(e);
    }
  }, [address, effectiveStrategy, writeStrategy]);

  // ─── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-6 text-indigo-600" size={64} />
          <p className="text-2xl font-bold text-gray-700">Cargando tu Dashboard...</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-800 mb-4 flex items-center justify-center gap-4">
            <Sparkles className="text-purple-600" size={48} />
            Tu Dashboard Ethernal
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Bienvenido,{' '}
            <strong className="text-indigo-600 font-mono">
              {address?.slice(0, 8)}...{address?.slice(-6)}
            </strong>
            <span className="hidden sm:inline"> – </span>
            <span className="block sm:inline">Administra tu futuro financiero en blockchain</span>
          </p>
          <button
            onClick={refetchAll}
            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={20} />
            Actualizar Datos
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">

          {/* ══ LEFT / MAIN COLUMN ══ */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">

            {/* ── Mi Fondo Personal ── */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-100 p-6 sm:p-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                <h2 className="text-3xl sm:text-4xl font-black text-gray-800 flex items-center gap-3">
                  <Shield className="text-emerald-600" size={40} />
                  Mi Fondo Personal
                </h2>
                <span className={`font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base whitespace-nowrap flex items-center gap-2 ${
                  hasFund ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {hasFund
                    ? <><CheckCircle size={18} />Activo</>
                    : <><AlertCircle size={18} />Sin Fondo</>
                  }
                </span>
              </div>

              {hasFund ? (
                <div className="space-y-6 sm:space-y-8">
                  <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
                    <div>
                      <p className="text-gray-500 text-base sm:text-lg mb-2">Balance Actual</p>
                      <p className="text-4xl sm:text-5xl font-black text-emerald-600">
                        {formatUSDCDisplay(personalFund.balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-base sm:text-lg mb-2">Estado del Fondo</p>
                      <p className="text-2xl sm:text-3xl font-bold text-indigo-700">
                        {personalFund.fundInfo?.retirementStarted ? 'Jubilado' : 'Ahorrando'}
                      </p>
                    </div>
                  </div>

                  {progress && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Target size={20} className="text-blue-600" />
                          Progreso hacia la meta
                        </h3>
                        <span className={`font-black text-lg ${progress.onTrack ? 'text-green-600' : 'text-orange-600'}`}>
                          {progress.progressPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                        <div
                          className={`h-4 rounded-full transition-all duration-700 ${progress.onTrack ? 'bg-green-500' : 'bg-orange-500'}`}
                          style={{ width: `${Math.min(progress.progressPercentage, 100)}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 text-xs sm:text-sm text-gray-600 gap-2">
                        <div>
                          <p className="text-gray-400 mb-0.5">Actual</p>
                          <p className="font-bold">{formatUSDCDisplay(BigInt(Math.floor(progress.currentBalance * 1e6)))}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 mb-0.5">Proyectado</p>
                          <p className="font-bold">{formatUSDCDisplay(BigInt(Math.floor(progress.projectedBalance * 1e6)))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400 mb-0.5">Meta</p>
                          <p className="font-bold">{formatUSDCDisplay(BigInt(Math.floor(progress.neededBalance * 1e6)))}</p>
                        </div>
                      </div>
                      {progress.monthsRemaining > 0 && (
                        <p className="text-xs text-gray-400 mt-3 text-center">
                          {progress.monthsRemaining} meses restantes hasta el timelock
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Principal',        value: formatUSDCDisplay(personalFund.fundInfo?.principal)       },
                      { label: 'Depósito Mensual', value: formatUSDCDisplay(personalFund.fundInfo?.monthlyDeposit) },
                      { label: 'Total Depósitos',  value: personalFund.depositStats?.monthlyDepositCount?.toString() ?? '0' },
                      { label: 'Edad de Retiro',   value: `${personalFund.fundInfo?.retirementAge?.toString() ?? '0'} años` },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
                        <p className="text-xl font-bold text-gray-800">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 sm:p-6 border-2 border-indigo-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 font-medium mb-1">Dirección del Contrato</p>
                        <p className="font-mono text-xs sm:text-sm break-all text-indigo-800">{fundAddress}</p>
                      </div>
                      <a
                        href={`${ARBISCAN_BASE}${fundAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition flex-shrink-0"
                        title="Ver en Arbiscan"
                      >
                        <ExternalLink size={20} />
                      </a>
                    </div>
                  </div>

                  {personalFund.timelockInfo?.timelockEnd && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-300">
                      <p className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                        <Clock size={24} className="text-amber-600" />
                        Timelock termina:
                      </p>
                      <p className="text-xl sm:text-2xl font-black text-amber-700">
                        {formatTimestamp(personalFund.timelockInfo.timelockEnd)}
                      </p>
                      {personalFund.timelockInfo.remainingTime && personalFund.timelockInfo.remainingTime > 0n && (
                        <p className="text-sm text-amber-600 mt-2">
                          {Math.floor(Number(personalFund.timelockInfo.remainingTime) / 86400)} días restantes
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <button
                      onClick={handleOpenDepositModal}
                      className="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-3"
                    >
                      <DollarSign size={24} />
                      Realizar Depósito
                    </button>
                    {!personalFund.fundInfo?.retirementStarted && personalFund.timelockInfo?.isUnlocked && (
                      <button
                        onClick={handleStartRetirement}
                        className="bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-3"
                      >
                        <TrendingUp size={24} />
                        Iniciar Retiro
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 sm:py-16">
                  <Wallet className="w-24 h-24 sm:w-32 sm:h-32 text-gray-200 mx-auto mb-6" />
                  <p className="text-xl sm:text-2xl text-gray-600 mb-8">
                    Todavía no tienes un fondo de retiro
                  </p>
                  <button
                    onClick={() => navigate('/calculator')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-black text-lg sm:text-xl py-5 px-10 rounded-2xl shadow-2xl transition transform hover:scale-105 inline-flex items-center gap-3"
                  >
                    <Sparkles size={28} />
                    Crear Mi Fondo
                    <ArrowRight size={28} />
                  </button>
                </div>
              )}
            </div>

            {/* ── Inversiones DeFi ── */}
            {hasFund && (
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-100 p-6 sm:p-10">
                <h3 className="text-2xl sm:text-3xl font-black text-gray-800 mb-6 flex items-center gap-3">
                  <PieChart className="text-blue-600" size={32} />
                  Inversiones DeFi
                </h3>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
                  <p className="text-gray-600 mb-4">
                    Tus fondos pueden invertirse en protocolos DeFi aprobados para generar rendimientos
                  </p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition">
                    Ver Oportunidades
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT SIDEBAR ══ */}
          <div className="space-y-6 sm:space-y-8">

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {/* ── USER PREFERENCES ── */}
            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-100 p-6 sm:p-8">
              <h3 className="text-2xl sm:text-3xl font-black text-gray-800 mb-2 flex items-center gap-3">
                <Settings className="text-indigo-600" size={32} />
                Mis Preferencias
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                Configurá tu perfil de inversión on-chain. Estos parámetros determinan cómo se enrutan tus depósitos.
              </p>

              {/* Current config summary */}
              {userPreferences.userConfig && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                  <Info size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-indigo-800">
                    <span className="font-semibold">Config actual: </span>
                    <span className={`font-bold ${riskLevelColor(currentRisk)}`}>{riskLevelLabel(currentRisk)}</span>
                    {currentProtocol !== ZERO_ADDRESS && (
                      <span className="text-indigo-600"> · Protocolo: {shortAddr(currentProtocol)}</span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Risk Tolerance ── */}
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                  Nivel de Riesgo
                </p>
                <div className="space-y-2">
                  {RISK_LEVELS.map((r) => {
                    const Icon = r.icon;
                    const isSelected = effectiveRisk === r.value;
                    return (
                      <button
                        key={r.value}
                        onClick={() => setPendingRisk(r.value)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                          isSelected
                            ? `bg-gradient-to-r ${r.gradient} border-2 ${r.border} shadow`
                            : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? r.badge : 'bg-gray-100'}`}>
                          <Icon size={18} className={isSelected ? '' : 'text-gray-400'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm ${isSelected ? '' : 'text-gray-600'}`}>{r.label}</p>
                          <p className={`text-xs truncate ${isSelected ? 'text-gray-600' : 'text-gray-400'}`}>{r.description}</p>
                        </div>
                        {isSelected && <CheckCircle size={16} className="text-current flex-shrink-0 opacity-70" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Protocol selector ── */}
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                  Protocolo Preferido
                </p>
                {protocolRegistry.activeProtocols.length > 0 ? (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {protocolRegistry.activeProtocols.filter((p) => !!p?.protocolAddress).map((p) => {
                      const isSelected = effectiveProtocol === p.protocolAddress;
                      return (
                        <button
                          key={p.protocolAddress}
                          onClick={() => setPendingProtocol(p.protocolAddress)}
                          className={`w-full flex items-center justify-between gap-2 p-3 rounded-xl border transition-all text-left ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-50 shadow'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-gray-700 truncate">{shortAddr(p.protocolAddress)}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${RISK_LEVELS[p.riskLevel]?.badge ?? 'bg-gray-100 text-gray-700'}`}>
                                {riskLevelLabel(p.riskLevel)}
                              </span>
                              <span className="text-xs text-emerald-600 font-semibold">
                                APY {(Number(p.apy) / 100).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                          {isSelected && <CheckCircle size={16} className="text-indigo-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4 border border-dashed border-gray-200 rounded-xl">
                    No hay protocolos activos registrados
                  </p>
                )}
              </div>

              {/* Save config feedback */}
              {prefSaveError && (
                <p className="text-red-600 text-xs mb-3 flex items-start gap-1">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  {prefSaveError}
                </p>
              )}
              {prefSaveOk && (
                <p className="text-emerald-600 text-xs mb-3 flex items-center gap-1">
                  <CheckCircle size={14} />
                  Preferencias guardadas on-chain
                </p>
              )}

              <button
                onClick={handleSaveUserConfig}
                disabled={isSavingPrefs || (pendingRisk === null && pendingProtocol === null)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {isSavingPrefs
                  ? <><RefreshCw className="animate-spin" size={16} />Guardando...</>
                  : <><CheckCircle size={16} />Guardar Configuración</>
                }
              </button>
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {/* ── PROTOCOL REGISTRY ── */}
            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-100 p-6 sm:p-8">
              <h3 className="text-2xl sm:text-3xl font-black text-gray-800 mb-2 flex items-center gap-3">
                <Activity className="text-violet-600" size={32} />
                Protocol Registry
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                Estrategia de ruteo de depósitos y métricas de los protocolos verificados.
              </p>

              {/* ── Routing Strategy ── */}
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                  Estrategia de Inversión
                </p>
                <div className="space-y-2">
                  {STRATEGY_TYPES.map((s) => {
                    const Icon = s.icon;
                    const isSelected = effectiveStrategy === s.value;
                    return (
                      <button
                        key={s.value}
                        onClick={() => setPendingStrategy(s.value)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'border-violet-400 bg-violet-50 shadow'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400'}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm ${isSelected ? 'text-violet-800' : 'text-gray-600'}`}>{s.label}</p>
                          <p className="text-xs text-gray-400 truncate">{s.description}</p>
                        </div>
                        {isSelected && <CheckCircle size={16} className="text-violet-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {stratSaveOk && (
                  <p className="text-emerald-600 text-xs mt-2 flex items-center gap-1">
                    <CheckCircle size={14} />
                    Estrategia guardada on-chain
                  </p>
                )}

                <button
                  onClick={handleSaveStrategy}
                  disabled={isSavingStrategy || pendingStrategy === null}
                  className="w-full mt-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {isSavingStrategy
                    ? <><RefreshCw className="animate-spin" size={16} />Guardando...</>
                    : <><CheckCircle size={16} />Guardar Estrategia</>
                  }
                </button>
              </div>

              {/* ── Active protocols overview ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Protocolos Activos
                  </p>
                  <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2 py-1 rounded-full">
                    {protocolRegistry.activeProtocolCount?.toString() ?? '0'} verificados
                  </span>
                </div>

                {protocolRegistry.activeProtocols.length > 0 ? (
                  <div className="space-y-2">
                    {protocolRegistry.activeProtocols.filter((p) => !!p?.protocolAddress).slice(0, 3).map((p) => (
                      <div key={p.protocolAddress} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-gray-600 truncate">{shortAddr(p.protocolAddress)}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${RISK_LEVELS[p.riskLevel]?.badge ?? 'bg-gray-100 text-gray-700'}`}>
                              {riskLevelLabel(p.riskLevel)}
                            </span>
                            {p.isVerified && (
                              <span className="text-xs text-blue-500 font-semibold flex items-center gap-0.5">
                                <CheckCircle size={10} />Verificado
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-emerald-600 font-black text-sm">
                            {(Number(p.apy) / 100).toFixed(2)}%
                          </p>
                          <p className="text-gray-400 text-xs">APY</p>
                        </div>
                      </div>
                    ))}
                    {protocolRegistry.activeProtocols.length > 3 && (
                      <button className="w-full text-center text-sm text-violet-600 hover:text-violet-700 font-medium py-2 flex items-center justify-center gap-1">
                        Ver {protocolRegistry.activeProtocols.length - 3} más
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4 border border-dashed border-gray-200 rounded-xl">
                    Sin protocolos registrados aún
                  </p>
                )}
              </div>
            </div>

            {/* ── Recomendaciones y Educación Financiera ── */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-100 p-6 sm:p-8">
              <h3 className="text-xl sm:text-2xl font-black text-gray-800 mb-2 flex items-center gap-3">
                <BookOpen className="text-pink-600" size={26} />
                Del Equipo Ethernal
              </h3>
              <p className="text-gray-500 text-sm mb-5">
                Recomendaciones financieras y cursos de educación publicados por el Admin.
              </p>
              <div className="space-y-3">
                {ADMIN_CONTENT.map((item) => {
                  const Icon = item.icon;
                  const colorMap: Record<string, string> = {
                    indigo: 'bg-indigo-50 border-indigo-200',
                    pink:   'bg-pink-50 border-pink-200',
                    amber:  'bg-amber-50 border-amber-200',
                  };
                  const iconColorMap: Record<string, string> = {
                    indigo: 'text-indigo-600 bg-indigo-100',
                    pink:   'text-pink-600 bg-pink-100',
                    amber:  'text-amber-600 bg-amber-100',
                  };
                  return (
                    <div
                      key={item.id}
                      className={`border rounded-2xl p-4 ${colorMap[item.color]} transition hover:shadow-md cursor-pointer`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColorMap[item.color]}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <p className="font-bold text-sm text-gray-800 leading-tight">{item.title}</p>
                            <ChevronRight size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed mb-2">{item.summary}</p>
                          <p className="text-xs text-gray-400">{item.date}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Soporte ── */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-3xl shadow-2xl border-2 border-pink-200 p-6 sm:p-8">
              <h3 className="text-xl sm:text-2xl font-black text-gray-800 mb-4 flex items-center gap-3">
                <MessageCircle className="text-pink-600" size={28} />
                ¿Necesitas ayuda?
              </h3>
              <p className="text-gray-700 text-sm sm:text-base mb-6">
                Contacta al equipo de Ethernal para preguntas sobre tu plan de retiro o estrategias de inversión
              </p>
              <div className="space-y-3">
                <button className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl transition">
                  Contactar Ethernal
                </button>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition">
                  Ver Documentación
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ DEPOSIT MODAL ══ */}
      {isDepositModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => e.target === e.currentTarget && handleCloseDepositModal()}
        >
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-gray-800">Realizar Depósito</h3>
              <button
                onClick={handleCloseDepositModal}
                disabled={depositTx.isLoading}
                className="text-gray-400 hover:text-gray-600 transition disabled:opacity-40"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
              {(['monthly', 'custom'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setDepositMode(m)}
                  disabled={depositTx.isLoading}
                  className={`py-2 px-4 rounded-lg font-bold text-sm transition ${
                    depositMode === m ? 'bg-white text-indigo-700 shadow' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {m === 'monthly' ? 'Mensual' : 'Personalizado'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {depositMode === 'monthly' ? (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 text-center">
                  <p className="text-gray-600 text-sm mb-1">Depósito mensual configurado</p>
                  <p className="text-4xl font-black text-emerald-700">
                    {formatUSDCWithSymbol(personalFund.fundInfo?.monthlyDeposit)}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto en USDC</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => handleDepositAmountChange(e.target.value)}
                    disabled={depositTx.isLoading}
                    placeholder="Ej: 500.00"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 text-lg disabled:opacity-50"
                  />
                  {depositAmountError && (
                    <p className="text-red-500 text-sm mt-1">{depositAmountError}</p>
                  )}
                </div>
              )}

              {!depositTx.hasEnoughBalance && parseFloat(activeDepositAmount) > 0 && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-red-700 text-sm">
                    Balance de USDC insuficiente. Necesitas {formatUSDCWithSymbol(depositTx.userBalance)} más.
                  </p>
                </div>
              )}

              {depositTx.requiresApproval && parseFloat(activeDepositAmount) > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-amber-800 text-sm">
                    Se requerirán <strong>2 transacciones</strong>: aprobación de USDC y depósito.
                  </p>
                </div>
              )}

              {depositTx.isLoading && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <RefreshCw className="animate-spin text-indigo-600" size={18} />
                    <p className="text-indigo-700 font-medium text-sm">
                      {depositTx.isApproving            && 'Esperando aprobación en tu wallet...'}
                      {depositTx.isApprovingConfirming   && 'Confirmando aprobación on-chain...'}
                      {depositTx.isExecuting             && 'Esperando depósito en tu wallet...'}
                      {depositTx.isConfirming            && 'Confirmando depósito on-chain...'}
                    </p>
                  </div>
                  <div className="w-full bg-indigo-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${depositTx.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {depositTx.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-700 text-sm">{depositTx.error.message}</p>
                </div>
              )}

              <button
                onClick={handleExecuteDeposit}
                disabled={
                  depositTx.isLoading ||
                  !depositTx.hasEnoughBalance ||
                  (depositMode === 'custom' && !isValidUSDCAmount(depositAmount))
                }
                className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2"
              >
                {depositTx.isLoading ? (
                  <><RefreshCw className="animate-spin" size={18} />Procesando...</>
                ) : depositTx.requiresApproval ? (
                  'Aprobar y Depositar'
                ) : (
                  'Confirmar Depósito'
                )}
              </button>

              <button
                onClick={handleCloseDepositModal}
                disabled={depositTx.isLoading}
                className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-800 font-bold py-4 rounded-xl transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;