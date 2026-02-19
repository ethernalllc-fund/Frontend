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
import { formatCurrency, formatYears } from '@/lib/formatters';
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

type ContributionFrequency = 'monthly' | 'quarterly' | 'annual';

interface Inputs {
  initialCapital: number;
  currentAge: number;
  retirementAge: number;
  desiredMonthlyIncome: number;
  annualRate: number;
  contributionFrequency: ContributionFrequency;
  yearsInRetirement: number;
}

interface Result {
  monthlyDeposit: number;
  totalContributed: number;
  totalInterest: number;
  futureValue: number;
  yearsToRetirement: number;
  principal: number;
  firstMonthlyDeposit: number;
  initialDeposit: number;
  feeAmount: number;
  netToOwner: number;
}

interface ChartPoint { year: number; balance: number }

const FormField: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  icon?: React.ReactNode;
  step?: number;
  min?: number;
  error?: string;
}> = ({ label, value, onChange, icon, step = 1, min = 0, error }) => (
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
      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 transition ${
        error
          ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
          : 'border-gray-300 focus:ring-purple-300 focus:border-purple-500'
      }`}
      aria-describedby={error ? `${label}-error` : undefined}
    />
    {error && (
      <p id={`${label}-error`} className="mt-1 text-sm text-red-600 flex items-center gap-1">
        <AlertCircle size={14} />
        {error}
      </p>
    )}
  </div>
);

const FEE_PERCENTAGE = 0.05;
const getPeriodsPerYear = (freq: ContributionFrequency): number => {
  switch (freq) {
    case 'monthly':   return 12;
    case 'quarterly': return 4;
    case 'annual':    return 1;
  }
};

const CalculatorPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const chainId = useChainId();
  const { setPlanData } = useRetirementPlan();
  const { isConnected, openModal } = useWallet();

  const factoryAddress = CONTRACT_ADDRESSES[chainId]?.personalFundFactory;

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError]             = useState('');
  const [result, setResult]           = useState<Result | null>(null);
  const [chartData, setChartData]     = useState<ChartPoint[]>([]);

  const [inputs, setInputs] = useState<Inputs>({
    initialCapital:       0,
    currentAge:           30,
    retirementAge:        65,
    desiredMonthlyIncome: 4000,
    annualRate:           7,
    contributionFrequency: 'monthly',
    yearsInRetirement:    25,
  });

  useEffect(() => {
    calculatePlan();
  }, [inputs]);

  const calculatePlan = () => {
    setError('');

    const s = {
      ...inputs,
      initialCapital:       inputs.initialCapital || 0,
      currentAge:           inputs.currentAge || 0,
      retirementAge:        inputs.retirementAge || 0,
      desiredMonthlyIncome: inputs.desiredMonthlyIncome || 0,
      annualRate:           inputs.annualRate || 0,
      yearsInRetirement:    inputs.yearsInRetirement || 0,
    };

    if (s.currentAge <= 0)  return bail(t('calculator.validation.ageRequired'));
    if (s.currentAge >= 100) return bail(t('calculator.validation.ageTooHigh'));

    const yearsToRetirement = s.retirementAge - s.currentAge;
    if (yearsToRetirement <= 0) return bail(t('calculator.validation.retirementAgeTooLow'));
    if (yearsToRetirement < 5)  return bail(t('calculator.validation.minYears'));
    if (s.desiredMonthlyIncome <= 0) return bail(t('calculator.validation.contributionRequired'));
    if (s.annualRate <= 0 || s.annualRate > 30) return bail(t('calculator.validation.rateRange'));

    const periodsPerYear = getPeriodsPerYear(s.contributionFrequency);
    const r = s.annualRate / 100 / periodsPerYear;
    const n = yearsToRetirement * periodsPerYear;
    const totalNeeded = s.desiredMonthlyIncome * 12 * s.yearsInRetirement;
    const fvInitial   = s.initialCapital * Math.pow(1 + r, n);
    const requiredPMT =
      r > 0
        ? (totalNeeded - fvInitial) * (r / (Math.pow(1 + r, n) - 1))
        : (totalNeeded - fvInitial) / n;

    const monthlyDeposit =
      s.contributionFrequency === 'monthly'
        ? requiredPMT
        : requiredPMT / (periodsPerYear / 12);

    let balance = s.initialCapital;
    const data: ChartPoint[] = [];
    const contributions: number[] = [];

    for (let year = 0; year <= yearsToRetirement; year++) {
      data.push({ year: s.currentAge + year, balance: Math.round(balance) });
      for (let p = 0; p < periodsPerYear; p++) {
        balance = balance * (1 + r) + requiredPMT;
        contributions.push(requiredPMT);
      }
    }

    const totalContributed  = s.initialCapital + contributions.reduce((a, b) => a + b, 0);
    const totalInterest     = balance - totalContributed;
    const firstMonthly      = Math.max(0, monthlyDeposit);
    const initialDeposit    = s.initialCapital + firstMonthly;
    const feeAmount         = initialDeposit * FEE_PERCENTAGE;

    setResult({
      monthlyDeposit:     firstMonthly,
      totalContributed,
      totalInterest,
      futureValue:        balance,
      yearsToRetirement,
      principal:          s.initialCapital,
      firstMonthlyDeposit: firstMonthly,
      initialDeposit,
      feeAmount,
      netToOwner:         initialDeposit - feeAmount,
    });
    setChartData(data);
  };

  const bail = (msg: string) => {
    setError(msg);
    setResult(null);
    setChartData([]);
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
      Math.floor((inputs.retirementAge - inputs.currentAge) * 0.3)
    );
    setPlanData({
      principal:            result.principal,
      monthlyDeposit:       result.monthlyDeposit,
      currentAge:           inputs.currentAge,
      retirementAge:        inputs.retirementAge,
      desiredMonthlyIncome: inputs.desiredMonthlyIncome,
      yearsPayments:        inputs.yearsInRetirement,
      interestRate:         inputs.annualRate,
      timelockYears,
    });
    navigate('/create-contract');
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

            {/* Config card */}
            <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-6 sm:p-8 border border-purple-100">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8 flex items-center gap-3">
                <Sparkles className="text-purple-600" />
                {t('calculator.configurePlan')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  label={t('calculator.initialCapital')}
                  value={inputs.initialCapital}
                  onChange={(val) => setInputs((p) => ({ ...p, initialCapital: val }))}
                  icon={<DollarSign className="w-5 h-5" />}
                  min={0}
                />
                <FormField
                  label={t('calculator.currentAge')}
                  value={inputs.currentAge}
                  onChange={(val) => setInputs((p) => ({ ...p, currentAge: val }))}
                  icon={<Calendar className="w-5 h-5" />}
                  min={18}
                />
                <FormField
                  label={t('calculator.retirementAge')}
                  value={inputs.retirementAge}
                  onChange={(val) => setInputs((p) => ({ ...p, retirementAge: val }))}
                  icon={<Calendar className="w-5 h-5" />}
                  min={inputs.currentAge + 1}
                />
                <FormField
                  label={t('calculator.monthlyContribution')}
                  value={inputs.desiredMonthlyIncome}
                  onChange={(val) => setInputs((p) => ({ ...p, desiredMonthlyIncome: val }))}
                  icon={<DollarSign className="w-5 h-5" />}
                  min={0}
                />
                <FormField
                  label={t('calculator.expectedReturn')}
                  value={inputs.annualRate}
                  onChange={(val) => setInputs((p) => ({ ...p, annualRate: val }))}
                  step={0.1}
                  icon={<Percent className="w-5 h-5" />}
                  min={0.1}
                />

                {/* Frequency select */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <TrendingUp className="w-5 h-5" />
                    {t('calculator.frequency')}
                  </label>
                  <select
                    value={inputs.contributionFrequency}
                    onChange={(e) =>
                      setInputs((p) => ({
                        ...p,
                        contributionFrequency: e.target.value as ContributionFrequency,
                      }))
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition"
                  >
                    <option value="monthly">{t('calculator.frequencyMonthly')}</option>
                    <option value="quarterly">{t('calculator.frequencyQuarterly')}</option>
                    <option value="annual">{t('calculator.frequencyAnnual')}</option>
                  </select>
                </div>

                {/* Years slider */}
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Calendar className="w-5 h-5" />
                    {t('calculator.yearsReceivingIncome')}
                  </label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="range"
                      min="10"
                      max="40"
                      value={inputs.yearsInRetirement}
                      onChange={(e) =>
                        setInputs((p) => ({ ...p, yearsInRetirement: parseInt(e.target.value) }))
                      }
                      className="flex-1 h-3 bg-gray-200 rounded-lg cursor-pointer accent-purple-600"
                      aria-label={t('calculator.yearsReceivingIncome')}
                      aria-valuemin={10}
                      aria-valuemax={40}
                      aria-valuenow={inputs.yearsInRetirement}
                    />
                    <span className="bg-purple-100 text-purple-800 font-bold px-4 sm:px-5 py-2 sm:py-3 rounded-xl text-base sm:text-lg min-w-24 sm:min-w-32 text-center">
                      {formatYears(inputs.yearsInRetirement)}
                    </span>
                  </div>
                </div>
              </div>
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
                    { step: 4, icon: <CheckCircle className="w-5 h-5" />,titleKey: 'calculator.step4Title', descKey: 'calculator.step4Desc' },
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
                    <p className="text-2xl sm:text-3xl font-black text-gray-800 break-words">
                      {formatCurrency(result.initialDeposit)}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg text-center">
                    <p className="text-gray-600 text-xs sm:text-sm">{t('calculator.daoFee')}</p>
                    <p className="text-2xl sm:text-3xl font-black text-orange-600 break-words">
                      {formatCurrency(result.feeAmount)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{t('calculator.goesToTreasury')}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg text-center">
                    <p className="text-gray-600 text-xs sm:text-sm">{t('calculator.netToFund')}</p>
                    <p className="text-2xl sm:text-3xl font-black text-green-600 break-words">
                      {formatCurrency(result.netToOwner)}
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
                    {formatCurrency(result.monthlyDeposit)}
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

export default CalculatorPage;