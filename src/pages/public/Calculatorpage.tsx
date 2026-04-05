import { useState, useEffect } from 'react';
import {
  VictoryChart,
  VictoryLine,
  VictoryArea,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useChainId } from 'wagmi';

import { useRetirementPlan } from '@/components/context/RetirementContext';
import { useWallet } from '@/hooks/web3';
import { CONTRACT_ADDRESSES } from '@/config/addresses';
import { formatCurrency } from '@/lib/formatters';
import { FaucetButton } from '@/components/web3/FaucetButton';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Calendar,
  Percent,
  Wallet,
  ArrowRight,
  CheckCircle,
  Info,
  Sparkles,
  AlertCircle,
  Droplets,
  ChevronRight,
} from 'lucide-react';

// ── Fee model (from Treasury.vy) ──
// DEFAULT_FEE = 500 bps = 5% on every deposit
// net_to_fund = gross * 0.95
//
// PMT_net  = formula result (what actually compounds)
// PMT_gross = PMT_net / 0.95 ← what user pays
//
// Corpus needed to pay D/mo for Y years at rate r:
//   PV = D * (1 - (1+r)^-n) / r
// Monthly net PMT to accumulate corpus C in N months at rate r:
//   PMT_net = (C - P_net*(1+r)^N) * r / ((1+r)^N - 1)
//   where P_net = principal * 0.95
const DEPOSIT_FEE = 0.05; // 5%

interface Inputs {
  principal:    number;  // lump-sum (USDC)
  currentAge:   number;
  retirementAge: number;
  desiredMonthly: number; // desired monthly income at retirement (USDC)
  annualRate:   number;   // APY % (display)
  yearsInRetirement: number;
}

interface Result {
  corpus:          number; // PV of annuity = required fund at retirement
  pmtGross:        number; // monthly deposit the user must send (gross, includes fee)
  pmtNet:          number; // monthly net that enters the fund
  totalGross:      number; // total USDC out of wallet over accumulation period
  fundValue:       number; // estimated fund value at retirement
  feePerDeposit:   number; // fee per monthly deposit
  totalFeesPaid:   number; // total fees over all deposits
  yearsToRet:      number;
  initialDeposit:  number; // principal + 1st monthly gross (what user approves)
}

interface ChartPoint { year: number; balance: number }

// ── Validation (mirrors ethernal.html validateStep1) ──
function validate(inputs: Inputs): string | null {
  const yearsToRet = inputs.retirementAge - inputs.currentAge;
  if (inputs.currentAge < 18 || inputs.currentAge > 80)
    return 'Current age must be 18–80';
  if (inputs.retirementAge < 55)
    return 'Retirement age must be at least 55';
  if (inputs.retirementAge <= inputs.currentAge)
    return 'Retirement age must be greater than current age';
  if (yearsToRet < 15)
    return 'At least 15 years required until retirement';
  if (inputs.desiredMonthly <= 0)
    return 'Desired monthly income must be greater than 0';
  if (inputs.principal > 100_000)
    return 'Principal cannot exceed 100,000 USDC';
  if (inputs.annualRate < 0 || inputs.annualRate > 100)
    return 'Expected annual return must be between 0 and 100%';
  if (inputs.yearsInRetirement <= 0)
    return 'Years receiving payments must be greater than 0';
  return null;
}

// ── Core calculation (mirrors ethernal.html runCalculator) ──
function runCalculator(inputs: Inputs): { result: Result; chartData: ChartPoint[] } | null {
  const { principal, currentAge, retirementAge, desiredMonthly, annualRate, yearsInRetirement } = inputs;

  const yearsToRet = retirementAge - currentAge;
  const N   = yearsToRet * 12;       // accumulation months
  const n   = yearsInRetirement * 12; // payout months
  const r   = annualRate / 100 / 12;  // monthly rate
  const netRate = 1 - DEPOSIT_FEE;    // 0.95

  if (yearsToRet < 15 || retirementAge < 55 || desiredMonthly <= 0 || yearsInRetirement <= 0) {
    return null;
  }

  // Step 1: corpus needed at retirement (PV of annuity)
  const corpus = r === 0
    ? desiredMonthly * n
    : desiredMonthly * (1 - Math.pow(1 + r, -n)) / r;

  // Step 2: PMT_net to reach corpus
  const principalNet = principal * netRate;
  let pmtNet: number;
  if (N <= 0) {
    pmtNet = 0;
  } else if (r === 0) {
    pmtNet = Math.max(0, (corpus - principalNet) / N);
  } else {
    const fvFactor   = Math.pow(1 + r, N);
    const principalFV = principalNet * fvFactor;
    const remaining   = corpus - principalFV;
    pmtNet = remaining <= 0 ? 0 : remaining * r / (fvFactor - 1);
  }

  // Step 3: gross PMT (contract minimum 50 USDC gross)
  let pmtGross = Math.max(pmtNet / netRate, 50);
  pmtNet = pmtGross * netRate; // recalc net after enforcing minimum

  // Fees & totals
  const feePerDeposit = pmtGross * DEPOSIT_FEE;
  const totalFeesPaid = feePerDeposit * N + principal * DEPOSIT_FEE;
  const totalGross    = principal + pmtGross * N;

  // Actual fund value at retirement
  let fundValue: number;
  if (r === 0) {
    fundValue = principalNet + pmtNet * N;
  } else {
    const fvFactor = Math.pow(1 + r, N);
    fundValue = principalNet * fvFactor + pmtNet * (fvFactor - 1) / r;
  }

  // Initial deposit to approve (principal + 1st monthly gross)
  const initialDeposit = principal + pmtGross;

  // Build chart data (balance by age)
  const chartData: ChartPoint[] = [];
  let balance = principalNet;
  for (let year = 0; year <= yearsToRet; year++) {
    chartData.push({ year: currentAge + year, balance: Math.round(balance) });
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + r) + pmtNet;
    }
  }

  return {
    result: {
      corpus,
      pmtGross,
      pmtNet,
      totalGross,
      fundValue,
      feePerDeposit,
      totalFeesPaid,
      yearsToRet,
      initialDeposit,
    },
    chartData,
  };
}

// ── FormField (unchanged) ──
const FormField: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  icon?: React.ReactNode;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  error?: string;
}> = ({ label, value, onChange, icon, step = 1, min = 0, max, hint, error }) => (
  <div>
    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
      {icon}
      {label}
    </label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      step={step}
      min={min}
      max={max}
      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 transition ${
        error
          ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
          : 'border-gray-300 focus:ring-purple-300 focus:border-purple-500'
      }`}
      aria-describedby={error ? `${label}-error` : undefined}
    />
    {hint && !error && (
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    )}
    {error && (
      <p id={`${label}-error`} className="mt-1 text-sm text-red-600 flex items-center gap-1">
        <AlertCircle size={14} />
        {error}
      </p>
    )}
  </div>
);

const Calculatorpage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const chainId = useChainId();
  const { setPlanData } = useRetirementPlan();
  const { isConnected, openModal } = useWallet();
  const factoryAddress = CONTRACT_ADDRESSES[chainId]?.personalFundFactory;

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError]   = useState('');
  const [warning, setWarning] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [inputs, setInputs] = useState<Inputs>({
    principal:         0,
    currentAge:        30,
    retirementAge:     65,
    desiredMonthly:    3000,
    annualRate:        5,
    yearsInRetirement: 20,
  });

  useEffect(() => {
    recalculate();
  }, [inputs]);

  const recalculate = () => {
    setError('');
    setWarning('');

    const validationError = validate(inputs);
    if (validationError) {
      setError(validationError);
      setResult(null);
      setChartData([]);
      return;
    }

    const calc = runCalculator(inputs);
    if (!calc) {
      setResult(null);
      setChartData([]);
      return;
    }

    const { result: r, chartData: cd } = calc;
    setResult(r);
    setChartData(cd);

    // Warnings (mirrors ethernal.html)
    const warnings: string[] = [];
    if (r.pmtGross > 100_000)
      warnings.push('⚠ Monthly deposit exceeds $100,000 — consider a higher APY, longer accumulation, or lower desired income.');
    if (r.yearsToRet < 20)
      warnings.push('⚠ Less than 20 years to retirement — results are aggressive.');
    if (warnings.length) setWarning(warnings.join(' · '));
  };

  const handleCreateContract = async () => {
    if (!result) return;

    if (!factoryAddress || factoryAddress === '0x0000000000000000000000000000000000000000') {
      setError(t('createContract.factoryAddressNotConfigured'));
      return;
    }

    if (!isConnected) {
      setIsConnecting(true);
      try {
        await openModal();
      } catch {
        setError(t('errors.somethingWrong'));
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    proceedToCreateContract();
  };

  const proceedToCreateContract = () => {
    if (!result) return;
    const timelockYears = Math.max(
      15,
      Math.floor(result.yearsToRet * 0.3)
    );

    setPlanData({
      principal:            inputs.principal,
      monthlyDeposit:       result.pmtGross, // gross amount the user approves
      currentAge:           inputs.currentAge,
      retirementAge:        inputs.retirementAge,
      desiredMonthlyIncome: inputs.desiredMonthly,
      yearsPayments:        inputs.yearsInRetirement,
      interestRate:         inputs.annualRate,
      timelockYears,
    });
    navigate('/create-fund');
  };

  const victoryData = chartData.map((d) => ({ x: d.year, y: d.balance }));

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 sm:py-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-800 mb-4 flex items-center justify-center gap-3 sm:gap-4">
            <Calculator className="text-indigo-600" size={40} />
            <span className="hidden sm:inline">{t('calculator.titleFull')}</span>
            <span className="sm:hidden">{t('calculator.titleShort')}</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            {t('calculator.subtitle')}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-red-800 mb-1">{t('calculator.dataError')}</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-10">

          <div className="space-y-6">

            {/* ── CALCULATOR SECTION (ethernal.html logic) ── */}
            <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-6 sm:p-8 border border-purple-100">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8 flex items-center gap-3">
                <Sparkles className="text-purple-600" />
                {t('calculator.configurePlan')}
              </h2>

              <p className="text-sm text-gray-500 mb-6">
                Enter your retirement goal — we calculate the monthly deposit needed.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

                {/* Desired monthly income */}
                <FormField
                  label="Desired Monthly at Retirement (USDC)"
                  value={inputs.desiredMonthly}
                  onChange={(val) => setInputs((p) => ({ ...p, desiredMonthly: val }))}
                  icon={<DollarSign className="w-5 h-5" />}
                  min={1}
                  hint="How much you want to receive per month"
                />

                {/* Years receiving payments */}
                <FormField
                  label={t('calculator.yearsReceivingIncome')}
                  value={inputs.yearsInRetirement}
                  onChange={(val) => setInputs((p) => ({ ...p, yearsInRetirement: val }))}
                  icon={<Calendar className="w-5 h-5" />}
                  min={1}
                  max={50}
                  hint="Duration of your retirement income"
                />

                {/* Current age */}
                <FormField
                  label={t('calculator.currentAge')}
                  value={inputs.currentAge}
                  onChange={(val) => setInputs((p) => ({ ...p, currentAge: val }))}
                  icon={<Calendar className="w-5 h-5" />}
                  min={18}
                  max={80}
                  hint="18 – 80"
                />

                {/* Retirement age */}
                <FormField
                  label={t('calculator.retirementAge')}
                  value={inputs.retirementAge}
                  onChange={(val) => setInputs((p) => ({ ...p, retirementAge: val }))}
                  icon={<Calendar className="w-5 h-5" />}
                  min={55}
                  hint="≥ 55, at least 15 yrs ahead"
                />

                {/* Expected APY */}
                <FormField
                  label={t('calculator.expectedReturn')}
                  value={inputs.annualRate}
                  onChange={(val) => setInputs((p) => ({ ...p, annualRate: val }))}
                  step={0.1}
                  icon={<Percent className="w-5 h-5" />}
                  min={0}
                  max={100}
                  hint="Use the protocol APY — e.g. 5 for 5%"
                />

                {/* Principal */}
                <FormField
                  label={t('calculator.initialCapital')}
                  value={inputs.principal}
                  onChange={(val) => setInputs((p) => ({ ...p, principal: val }))}
                  icon={<DollarSign className="w-5 h-5" />}
                  min={0}
                  max={100_000}
                  hint="Optional lump-sum deposit (max 100,000 USDC)"
                />
              </div>

              {/* ── RESULT BOX ── */}
              {result && (
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Result</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Required Corpus</p>
                      <p className="font-mono font-bold text-gray-800">{formatCurrency(result.corpus)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Monthly Deposit Needed</p>
                      <p className="font-mono font-bold text-purple-600 text-lg">{formatCurrency(result.pmtGross)} / mo</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total You Will Deposit</p>
                      <p className="font-mono font-bold text-gray-800">{formatCurrency(result.totalGross)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Years to Retirement</p>
                      <p className="font-mono font-bold text-gray-800">{result.yearsToRet} years</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Est. Fund at Retirement</p>
                      <p className="font-mono font-bold text-gray-800">{formatCurrency(result.fundValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Monthly Income For</p>
                      <p className="font-mono font-bold text-gray-800">{inputs.yearsInRetirement} years</p>
                    </div>

                    {/* Fee row */}
                    <div className="col-span-2 sm:col-span-3 border-t border-gray-200 pt-3 mt-1">
                      <p className="text-xs font-semibold text-amber-600 mb-1">5% Protocol Fee (included in deposit)</p>
                      <p className="font-mono text-sm text-amber-700">
                        {formatCurrency(result.feePerDeposit)}/mo · {formatCurrency(result.totalFeesPaid)} total
                      </p>
                    </div>
                  </div>

                  {/* Warning */}
                  {warning && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="font-mono text-xs text-amber-700">{warning}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── DEPOSIT PREVIEW ── */}
              {result && (
                <div className="mt-4 grid grid-cols-3 gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Principal</p>
                    <p className="font-mono text-sm font-bold text-purple-600">{formatCurrency(inputs.principal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">+ 1st Monthly</p>
                    <p className="font-mono text-sm font-bold text-purple-600">{formatCurrency(result.pmtGross)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">= Total to Approve</p>
                    <p className="font-mono text-sm font-bold text-purple-600">{formatCurrency(result.initialDeposit)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Faucet */}
            <div className="bg-linear-to-br from-blue-50 to-cyan-50 rounded-3xl shadow-2xl p-6 sm:p-8 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 p-3 rounded-xl">
                  <Droplets className="text-white" size={24} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
                  {t('calculator.getTestTokens')}
                </h3>
              </div>
              <p className="text-gray-700 mb-6">{t('calculator.getTestTokensDesc')}</p>
              <FaucetButton />
            </div>

            {/* Step-by-step guide */}
            <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-3xl shadow-2xl p-6 sm:p-8 border-2 border-purple-200">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <Info className="text-purple-600" />
                {t('calculator.howToStart')}
              </h3>

              <div className="space-y-4">
                {(
                  [
                    { step: 1, icon: <Wallet className="w-5 h-5" />,     titleKey: 'calculator.step1Title', descKey: 'calculator.step1Desc' },
                    { step: 2, icon: <Droplets className="w-5 h-5" />,   titleKey: 'calculator.step2Title', descKey: 'calculator.step2Desc' },
                    { step: 3, icon: <Calculator className="w-5 h-5" />, titleKey: 'calculator.step3Title', descKey: 'calculator.step3Desc' },
                    { step: 4, icon: <CheckCircle className="w-5 h-5" />, titleKey: 'calculator.step4Title', descKey: 'calculator.step4Desc' },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.step}
                    className="bg-white rounded-xl p-4 flex items-start gap-4 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="bg-purple-100 text-purple-700 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-purple-600">{item.icon}</span>
                        <h4 className="font-semibold text-gray-800">{t(item.titleKey)}</h4>
                      </div>
                      <p className="text-sm text-gray-600">{t(item.descKey)}</p>
                    </div>
                    <ChevronRight className="text-gray-400 shrink-0" size={20} />
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">{t('calculator.testnetOnly')}</h4>
                    <p className="text-sm text-amber-800">{t('calculator.testnetOnlyDesc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {result && (
            <div className="space-y-6 sm:space-y-8">

              {/* Chart — Victory */}
              <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-6 sm:p-8 border border-purple-100">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
                  {t('calculator.growthProjection')}
                </h3>
                {victoryData.length > 0 ? (
                  <VictoryChart
                    height={300}
                    containerComponent={
                      <VictoryVoronoiContainer
                        labels={({ datum }: { datum: { x: number; y: number } }) =>
                          `${t('calculator.ageLabel')} ${datum.x}: $${datum.y.toLocaleString()}`
                        }
                        labelComponent={
                          <VictoryTooltip
                            style={{ fontSize: 11 }}
                            flyoutStyle={{ fill: 'white', stroke: '#e2e8f0' }}
                          />
                        }
                      />
                    }
                  >
                    <VictoryAxis
                      tickFormat={(t: number) => `${t}`}
                      label={t('calculator.ageLabel')}
                      style={{
                        axisLabel: { padding: 30, fontSize: 11, fill: '#6b7280' },
                        tickLabels: { fontSize: 10, fill: '#6b7280' },
                        grid: { stroke: '#f3f4f6' },
                      }}
                    />
                    <VictoryAxis
                      dependentAxis
                      tickFormat={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                      style={{
                        tickLabels: { fontSize: 10, fill: '#6b7280' },
                        grid: { stroke: '#f3f4f6', strokeDasharray: '4,4' },
                      }}
                    />
                    <VictoryArea
                      data={victoryData}
                      style={{
                        data: {
                          fill: 'rgba(34, 197, 94, 0.12)',
                          stroke: 'rgb(34, 197, 94)',
                          strokeWidth: 2.5,
                        },
                      }}
                      interpolation="monotoneX"
                    />
                    <VictoryLine
                      data={victoryData}
                      style={{
                        data: { stroke: 'rgb(34, 197, 94)', strokeWidth: 2.5 },
                      }}
                      interpolation="monotoneX"
                    />
                  </VictoryChart>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                    {t('calculator.fillFormToSeeChart')}
                  </div>
                )}
              </div>

              {/* Deposit summary */}
              <div className="bg-linear-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-6 sm:p-8">
                <h3 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4 sm:mb-6 flex items-center gap-3">
                  <Info className="w-6 h-6 sm:w-8 sm:h-8" />
                  {t('calculator.depositSummary')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg text-center">
                    <p className="text-gray-600 text-xs sm:text-sm">{t('calculator.totalDeposit')}</p>
                    <p className="text-2xl sm:text-3xl font-black text-gray-800 break-word">
                      {formatCurrency(result.initialDeposit)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Sale de tu wallet</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg text-center">
                    <p className="text-gray-600 text-xs sm:text-sm">{t('calculator.daoFee')}</p>
                    <p className="text-2xl sm:text-3xl font-black text-orange-600 break-word">
                      {formatCurrency(result.feePerDeposit)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{t('calculator.goesToTreasury')}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg text-center">
                    <p className="text-gray-600 text-xs sm:text-sm">{t('calculator.netToFund')}</p>
                    <p className="text-2xl sm:text-3xl font-black text-green-600 break-word">
                      {formatCurrency(result.pmtNet)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{t('calculator.forDefi')}</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-linear-to-r from-indigo-600 to-purple-700 rounded-3xl shadow-2xl p-6 sm:p-10 text-white text-center">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-4 sm:mb-6">
                  {isConnected ? t('calculator.fundReady') : t('calculator.lastStep')}
                </h2>
                <p className="text-base sm:text-xl mb-6 sm:mb-8">
                  {t('calculator.monthlySavingsRequired')}{' '}
                  <strong className="text-2xl sm:text-3xl block sm:inline mt-2 sm:mt-0">
                    {formatCurrency(result.pmtGross)} / mo
                  </strong>
                </p>

                <button
                  onClick={handleCreateContract}
                  disabled={isConnecting}
                  className="w-full sm:w-auto bg-white text-indigo-700 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed px-6 sm:px-12 py-4 sm:py-6 rounded-2xl font-black text-lg sm:text-2xl transition-all transform hover:scale-105 shadow-2xl flex items-center justify-center gap-3 sm:gap-4 mx-auto"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-indigo-700" />
                      <span className="text-base sm:text-2xl">{t('common.loading')}</span>
                    </>
                  ) : isConnected ? (
                    <>
                      <CheckCircle size={32} className="hidden sm:block" />
                      <CheckCircle size={24} className="sm:hidden" />
                      <span className="text-base sm:text-2xl">{t('calculator.createContract')}</span>
                      <ArrowRight size={32} className="hidden sm:block" />
                      <ArrowRight size={24} className="sm:hidden" />
                    </>
                  ) : (
                    <>
                      <Wallet size={32} className="hidden sm:block" />
                      <Wallet size={24} className="sm:hidden" />
                      <span className="text-base sm:text-2xl">{t('nav.connectWallet')}</span>
                      <ArrowRight size={32} className="hidden sm:block" />
                      <ArrowRight size={24} className="sm:hidden" />
                    </>
                  )}
                </button>

                <p className="mt-4 sm:mt-6 text-indigo-100 text-sm sm:text-base">
                  {isConnected
                    ? t('calculator.createOnArbitrum')
                    : t('calculator.walletWillOpen')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calculatorpage;