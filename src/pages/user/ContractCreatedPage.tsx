import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation }    from 'react-router-dom';
import { useAccount }                  from 'wagmi';
import {
  ArrowLeft, ArrowRight, DollarSign, Calendar,
  Sparkles, AlertCircle, CheckCircle2, Info,
} from 'lucide-react';
import { ExecutionStep }               from '@/components/retirement/ExecutionStep';
import type { RetirementPlan }         from '@/types/retirement_types';
import { derivePlanValues }            from '@/types/retirement_types';

type InvestmentMethod = 'bank' | 'defi' | 'broker' | 'stockAgent';

interface InvestmentSelection {
  method:   InvestmentMethod;
  provider: string;
}

interface LocationState {
  planData:         RetirementPlan;
  factoryAddress:   `0x${string}`;
  needsApproval:    boolean;
  selectedProtocol: `0x${string}`;
  investmentMethod: InvestmentSelection;
}

const SUCCESS_REDIRECT_MS = 3500;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const ContractCreatedPage = () => {
  const navigate        = useNavigate();
  const location        = useLocation();
  const { isConnected } = useAccount();
  const [confirmed,     setConfirmed]     = useState(false);
  const [txSuccess,     setTxSuccess]     = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<`0x${string}` | ''>('');

  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state = location.state as LocationState | null;
  const { planData, factoryAddress, needsApproval, selectedProtocol, investmentMethod } = state ?? {};
  const hasValidState = !!(planData && factoryAddress && isConnected);

  useEffect(() => {
    if (!hasValidState) {
      if (import.meta.env.DEV) {
        console.warn('[ContractCreatedPage] Missing state, redirecting to calculator');
      }
      navigate('/calculator', { replace: true });
    }
  }, [hasValidState, navigate]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const handleTransactionSuccess = (txHash: `0x${string}`, _fundAddress?: string) => {
    if (import.meta.env.DEV) {
      console.log('[ContractCreatedPage] Transaction confirmed:', { txHash, _fundAddress });
    }
    setTxSuccess(true);
    setSuccessTxHash(txHash);
    redirectTimerRef.current = setTimeout(() => navigate('/dashboard'), SUCCESS_REDIRECT_MS);
  };

  if (!planData || !factoryAddress) return null;

  const {
    initialDepositUsdc,
    feeUsdc,
    netToFundUsdc,
    monthlyDepositUsdc,
    yearsToRetirement,
  } = derivePlanValues(planData);

  if (txSuccess && successTxHash) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center px-4 py-16">
        <div className="max-w-4xl w-full">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border-4 border-emerald-300 overflow-hidden">

            <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-12 text-center text-white">
              <CheckCircle2 className="w-32 h-32 mx-auto mb-6 animate-bounce" />
              <h1 className="text-4xl sm:text-5xl font-black mb-4">¡Contrato Creado Exitosamente!</h1>
              <p className="text-lg sm:text-xl opacity-90">Tu fondo de retiro está ahora en la blockchain</p>
            </div>

            <div className="p-8 sm:p-12 space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border-2 border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="text-emerald-600" size={20} />
                    <p className="text-gray-600 font-semibold">Depósito Inicial Realizado</p>
                  </div>
                  <p className="text-4xl font-black text-emerald-700">
                    {formatCurrency(initialDepositUsdc)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {formatCurrency(netToFundUsdc)} netos en DeFi
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="text-blue-600" size={20} />
                    <p className="text-gray-600 font-semibold">Depósito Mensual</p>
                  </div>
                  <p className="text-4xl font-black text-blue-700">
                    {formatCurrency(monthlyDepositUsdc)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">Requerido cada mes (incluye fee 5%)</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border-2 border-indigo-200">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <Sparkles className="text-purple-600" />
                  Próximos Pasos
                </h3>
                <ul className="space-y-4 text-gray-700">
                  {[
                    { strong: 'Ve al Dashboard',             desc: 'para ver los detalles y balance de tu fondo'                              },
                    { strong: 'Realiza depósitos mensuales', desc: `de ${formatCurrency(monthlyDepositUsdc)} para mantenerte en camino`        },
                    { strong: 'Monitorea tu progreso',       desc: 'y ajusta tu plan según sea necesario'                                      },
                  ].map((item) => (
                    <li key={item.strong} className="flex items-start gap-3 text-base sm:text-lg">
                      <span className="text-emerald-600 font-bold text-xl shrink-0">✓</span>
                      <div><strong>{item.strong}</strong>{' '}{item.desc}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-black text-xl sm:text-2xl py-6 sm:py-8 rounded-2xl shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-4"
              >
                Ir al Dashboard
                <ArrowRight size={32} />
              </button>

              <p className="text-center text-sm text-gray-400">
                Redirigiendo automáticamente en {SUCCESS_REDIRECT_MS / 1000} segundos...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-4xl w-full">
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-indigo-300 overflow-hidden">

          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-8 sm:p-12 text-center text-white">
            <h1 className="text-3xl sm:text-5xl font-black mb-4">Confirmación Final</h1>
            <p className="text-base sm:text-xl opacity-90">Revisa cuidadosamente antes de crear tu contrato</p>
          </div>

          <div className="p-6 sm:p-12 space-y-8">

            {/* Aviso de inmutabilidad */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="text-amber-600 shrink-0 mt-1" size={28} />
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 text-lg mb-2">Última Verificación</h3>
                  <p className="text-amber-800 mb-3">
                    Una vez creado el contrato, <strong>no podrás modificar estos parámetros</strong>.
                  </p>
                  <ul className="space-y-1 text-sm text-amber-700">
                    <li>• El timelock de {planData.timelockYears} años será permanente</li>
                    <li>• Los depósitos mensuales son obligatorios para alcanzar tu meta</li>
                    <li>• El fee del 5% se aplica en cada depósito</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Depósito inicial y mensual */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border-2 border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="text-emerald-600" size={20} />
                  <p className="text-gray-600 font-semibold">Depósito Inicial</p>
                </div>
                <p className="text-4xl font-black text-emerald-700">
                  {formatCurrency(initialDepositUsdc)}
                </p>
                <div className="mt-3 space-y-1 text-sm text-gray-500">
                  <p className="italic">Principal + 1er mes</p>
                  <p>Fee Ethernal (5%): {formatCurrency(feeUsdc)}</p>
                  <p className="font-semibold text-emerald-700">
                    Neto a tu fondo: {formatCurrency(netToFundUsdc)}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-blue-600" size={20} />
                  <p className="text-gray-600 font-semibold">Depósito Mensual</p>
                </div>
                <p className="text-4xl font-black text-blue-700">
                  {formatCurrency(monthlyDepositUsdc)}
                </p>
                <p className="text-sm text-gray-500 mt-3">Durante {yearsToRetirement} años</p>
                <p className="text-xs text-gray-400 mt-1">Fee del 5% aplicado cada mes</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
              <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                <Info className="text-purple-600" size={24} />
                Breakdown del Depósito Inicial
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-purple-200">
                  <span className="text-gray-700">Monto de tu wallet:</span>
                  <strong className="text-2xl text-purple-800">{formatCurrency(initialDepositUsdc)}</strong>
                </div>
                <div className="flex justify-between items-center py-2 bg-orange-50 -mx-2 px-2 rounded">
                  <span className="text-orange-700">Fee Ethernal (5%):</span>
                  <strong className="text-lg text-orange-600">-{formatCurrency(feeUsdc)}</strong>
                </div>
                <div className="flex justify-between items-center py-3 bg-emerald-50 -mx-2 px-2 rounded-lg">
                  <span className="text-emerald-800 font-bold text-lg">Neto a tu fondo DeFi:</span>
                  <strong className="text-2xl text-emerald-700">{formatCurrency(netToFundUsdc)}</strong>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center italic mt-4">
                Los depósitos mensuales de {formatCurrency(monthlyDepositUsdc)} también tendrán un fee del 5%
              </p>
            </div>

            {/* Parámetros del contrato */}
            <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
              <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                <Info size={20} className="text-indigo-600" />
                Parámetros del Contrato
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Edad Actual',             value: `${planData.currentAge} años`                    },
                  { label: 'Edad de Retiro',           value: `${planData.retirementAge} años`                 },
                  { label: 'Ingreso Mensual Deseado',  value: formatCurrency(planData.desiredMonthlyIncome)    },
                  { label: 'Años Recibiendo Ingresos', value: `${planData.yearsPayments} años`                 },
                  { label: 'Tasa de Rendimiento',      value: `${planData.interestRate}% anual`                },
                  { label: 'Timelock de Seguridad',    value: `${planData.timelockYears} años`                 },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">{item.label}:</span>
                    <strong className="text-gray-800">{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Método de inversión */}
            {investmentMethod && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200">
                <h3 className="font-bold text-indigo-800 text-lg mb-2">Método de Inversión</h3>
                <p className="text-indigo-700">
                  <strong>{investmentMethod.method}</strong>
                  {investmentMethod.provider && ` — ${investmentMethod.provider}`}
                </p>
              </div>
            )}

            {/* Confirmación y ejecución */}
            {!confirmed ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-purple-600 rounded"
                    />
                    <span className="text-gray-700 flex-1 select-none">
                      He revisado todos los parámetros y confirmo que son correctos.
                      Entiendo que <strong>no podré modificar estos valores una vez creado el contrato</strong>.
                    </span>
                  </label>
                </div>

                <button
                  onClick={() => setConfirmed(true)}
                  disabled={!confirmed}
                  className={`w-full font-black text-2xl py-6 rounded-2xl shadow-xl transition-all transform ${
                    confirmed
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:scale-105'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {confirmed ? 'Proceder a Crear Contrato' : 'Confirma para Continuar'}
                </button>

                <button
                  onClick={() => navigate('/create-contract')}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={20} />
                  Volver a Revisión
                </button>
              </div>
            ) : (
              <ExecutionStep
                plan={planData}
                factoryAddress={factoryAddress}
                needsApproval={needsApproval ?? true}
                selectedProtocol={selectedProtocol ?? '0x0000000000000000000000000000000000000000'}
                onSuccess={handleTransactionSuccess}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractCreatedPage;