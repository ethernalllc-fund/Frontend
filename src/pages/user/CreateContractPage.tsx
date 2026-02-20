import { useEffect, useState, useMemo, useCallback, startTransition } from 'react';
import { useNavigate }               from 'react-router-dom';
import { useAuth }                   from '@/hooks/auth/useAuth';
import { useRetirementPlan }         from '@/components/context/RetirementContext';
import { useChainId }                from 'wagmi';
import { useHasFund }                from '@/hooks/funds/useHasFund';
import { getContractAddress }        from '@/config';
import { VerificationStep }          from '@/components/retirement/VerificationStep';
import { InvestmentSelector }        from '@/components/retirement/InvestmentSelector';
import type { InvestmentSelection }  from '@/components/retirement/InvestmentSelector';
import {
  ArrowLeft, ArrowRight, Sparkles, Edit3,
  AlertCircle, CheckCircle, Info, Briefcase,
} from 'lucide-react';
import type { RetirementPlan }       from '@/types/retirement_types';
import { derivePlanValues }          from '@/types/retirement_types';

const EXPECTED_CHAIN_ID = 421614;
const ZERO_ADDRESS      = '0x0000000000000000000000000000000000000000';

function getFactoryAddress(chainId: number): `0x${string}` | undefined {
  return getContractAddress(chainId, 'personalFundFactory');
}

function formatNumber(num: string | number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Number(num));
}

const CreateContractPage = () => {
  const navigate                              = useNavigate();
  const { isConnected: authConnected }        = useAuth();
  const chainId                               = useChainId();
  const { planData }                          = useRetirementPlan();
  const { hasFund, fundAddress, isLoading: isLoadingFund } = useHasFund();

  const [formData,            setFormData]            = useState<RetirementPlan | null>(null);
  const [isEditing,           setIsEditing]           = useState(false);
  const [verificationPassed,  setVerificationPassed]  = useState(false);
  const [needsApproval,       setNeedsApproval]       = useState(true);
  // FIX: usamos el tipo completo de InvestmentSelector que incluye protocolAddress
  const [investmentSelection, setInvestmentSelection] = useState<InvestmentSelection | null>(null);
  const [validationError,     setValidationError]     = useState<string | null>(null);

  const factoryAddress = getFactoryAddress(chainId);

  useEffect(() => {
    if (!planData || !authConnected) {
      void navigate('/calculator', { replace: true });
    } else {
      startTransition(() => {
        setFormData(planData);
      });
    }
  }, [planData, authConnected, navigate]);

  useEffect(() => {
    if (import.meta.env.DEV && hasFund && fundAddress) {
      console.warn('[CreateContractPage] User already has a fund:', fundAddress);
    }
  }, [hasFund, fundAddress]);

  const retirementPlan = useMemo<RetirementPlan | null>(() => {
    if (!formData) return null;
    return {
      principal:            Number(formData.principal),
      monthlyDeposit:       Number(formData.monthlyDeposit),
      currentAge:           formData.currentAge,
      retirementAge:        formData.retirementAge,
      desiredMonthlyIncome: formData.desiredMonthlyIncome,
      yearsPayments:        formData.yearsPayments,
      interestRate:         formData.interestRate,
      timelockYears:        formData.timelockYears,
      selectedProtocol:     formData.selectedProtocol,
    };
  }, [formData]);

  const planDerived = retirementPlan ? derivePlanValues(retirementPlan) : null;
  const handleVerificationComplete = useCallback((requiresApproval: boolean) => {
    setVerificationPassed(true);
    setNeedsApproval(requiresApproval);
  }, []);

  const handleContinueToConfirmation = useCallback(() => {
    setValidationError(null);
    if (!formData || !factoryAddress || !retirementPlan) return;
    if (!investmentSelection) {
      setValidationError('Selecciona un método de inversión antes de continuar.');
      return;
    }
    if (hasFund) {
      void navigate('/dashboard');
      return;
    }
    void navigate('/contract-created', {
      state: {
        planData:         retirementPlan,
        factoryAddress,
        needsApproval,
        selectedProtocol: investmentSelection.protocolAddress,
        investmentMethod: {
          method:   investmentSelection.method,
          provider: investmentSelection.provider,
        },
      },
    });
  }, [formData, factoryAddress, retirementPlan, investmentSelection, hasFund, needsApproval, navigate]);

  if (!formData || isLoadingFund) return null;

  if (!factoryAddress || factoryAddress === ZERO_ADDRESS) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-lg border border-red-200">
          <AlertCircle className="w-24 h-24 text-red-600 mx-auto mb-6" />
          <h1 className="text-4xl font-black text-red-700 mb-4">Configuración Faltante</h1>
          <p className="text-xl text-gray-700 mb-6">
            La dirección del contrato Factory no está configurada para esta red.
          </p>
          <button
            onClick={() => { void navigate('/calculator'); }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-5 px-10 rounded-2xl text-xl transition"
          >
            Volver a la Calculadora
          </button>
        </div>
      </div>
    );
  }

  if (chainId !== EXPECTED_CHAIN_ID) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-lg border border-red-200">
          <AlertCircle className="w-24 h-24 text-red-600 mx-auto mb-6 animate-pulse" />
          <h1 className="text-4xl font-black text-red-700 mb-4">Red Incorrecta</h1>
          <p className="text-xl text-gray-700 mb-4">
            Por favor cambia a <strong>Arbitrum Sepolia</strong> para continuar.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-left">
            <p className="text-gray-500 mb-1">Red actual:</p>
            <p className="font-mono font-bold text-gray-800">Chain ID: {chainId}</p>
            <p className="text-gray-500 mt-3 mb-1">Red requerida:</p>
            <p className="font-mono font-bold text-emerald-600">Arbitrum Sepolia (421614)</p>
          </div>
          <button
            onClick={() => { void navigate('/calculator'); }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-5 px-10 rounded-2xl text-xl transition"
          >
            Volver a la Calculadora
          </button>
        </div>
      </div>
    );
  }

  if (hasFund && fundAddress) {
    return (
      <div className="min-h-screen bg-linear-to-br from-amber-50 to-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-lg border border-amber-300">
          <Info className="w-24 h-24 text-amber-600 mx-auto mb-6" />
          <h1 className="text-4xl font-black text-amber-700 mb-4">Ya Tienes un Fondo</h1>
          <p className="text-xl text-gray-700 mb-6">Solo puedes tener un fondo de retiro por wallet.</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
            <p className="text-gray-500 mb-2">Tu fondo existente:</p>
            <p className="font-mono text-xs text-gray-800 break-all">{fundAddress}</p>
          </div>
          <button
            onClick={() => { void navigate('/dashboard'); }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-5 px-10 rounded-2xl text-xl transition w-full mb-3"
          >
            Ir al Dashboard
          </button>
          <button
            onClick={() => { void navigate('/calculator'); }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 px-8 rounded-2xl text-lg transition w-full"
          >
            Volver a la Calculadora
          </button>
        </div>
      </div>
    );
  }

  const canContinue  = verificationPassed && !isEditing && !hasFund && !!investmentSelection;
  const pendingLabel = (() => {
    if (hasFund)              return 'Ya tienes un fondo';
    if (!investmentSelection) return 'Selecciona un Método de Inversión';
    if (!verificationPassed)  return 'Completa la Verificación';
    if (isEditing)            return 'Guarda los cambios primero';
    return null;
  })();

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 py-16 px-4">
      <div className="max-w-5xl mx-auto">

        <button
          onClick={() => { void navigate('/calculator'); }}
          className="mb-8 flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold transition"
        >
          <ArrowLeft size={22} />
          Volver a la Calculadora
        </button>

        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-purple-100 overflow-hidden">

          {/* Header */}
          <div className="bg-linear-to-r from-indigo-600 to-purple-700 p-10 text-white text-center">
            <h1 className="text-5xl font-black mb-4 flex items-center justify-center gap-5">
              <Sparkles className="w-14 h-14 animate-pulse" />
              Revisión del Plan
            </h1>
            <p className="text-xl opacity-90">Verifica que todo esté correcto antes de continuar</p>
          </div>

          <div className="p-8 sm:p-10">
            <div className="grid lg:grid-cols-2 gap-10">

              {/* Columna izquierda — parámetros */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold text-gray-800">Parámetros del Fondo</h2>
                  <button
                    onClick={() => { setIsEditing(!isEditing); }}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    <Edit3 size={20} />
                    {isEditing ? 'Guardar' : 'Editar'}
                  </button>
                </div>

                <div className="space-y-1 bg-gray-50 rounded-2xl p-6">
                  {[
                    { label: 'Depósito Inicial (principal + mes 1)', value: `$${formatNumber(planDerived?.initialDepositUsdc ?? 0)}` },
                    { label: 'Ahorro Mensual',                        value: `$${formatNumber(formData.monthlyDeposit)}`            },
                    { label: 'Edad Actual',                           value: `${formData.currentAge} años`                         },
                    { label: 'Edad de Retiro',                        value: `${formData.retirementAge} años`                      },
                    { label: 'Ingreso Mensual Deseado',               value: `$${formatNumber(formData.desiredMonthlyIncome)}`      },
                    { label: 'Años Recibiendo Ingresos',              value: `${formData.yearsPayments} años`                      },
                    { label: 'Tasa de Rendimiento',                   value: `${formData.interestRate}% anual`                     },
                    { label: 'Timelock de Seguridad',                 value: `${formData.timelockYears} años`                      },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between py-3 border-b border-gray-200 last:border-0 text-lg"
                    >
                      <span className="text-gray-600 font-medium">{item.label}:</span>
                      <strong className="text-gray-800">{item.value}</strong>
                    </div>
                  ))}
                </div>

                {/* Resumen del Depósito */}
                {planDerived && (
                  <div className="mt-6 bg-linear-to-br from-emerald-50 to-green-50 rounded-3xl p-8 border-2 border-emerald-200">
                    <h3 className="text-2xl font-bold text-emerald-800 mb-6">Resumen del Depósito</h3>
                    <div className="space-y-4 text-lg">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total a depositar:</span>
                        <strong className="text-3xl font-black text-emerald-700">
                          ${formatNumber(planDerived.initialDepositUsdc)}
                        </strong>
                      </div>
                      <div className="flex justify-between text-orange-600">
                        <span>Fee Ethernal (5%):</span>
                        <strong>-${formatNumber(planDerived.feeUsdc)}</strong>
                      </div>
                      <div className="flex justify-between text-emerald-700 text-2xl font-bold pt-4 border-t-2 border-emerald-200">
                        <span>Neto a tu fondo:</span>
                        <strong>${formatNumber(planDerived.netToFundUsdc)}</strong>
                      </div>
                    </div>
                  </div>
                )}l-to-br 
              </div>

              {/* Columna derecha — verificación e inversión */}
              <div className="space-y-6">
                <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <Briefcase className="text-purple-600" size={28} />
                    Método de Inversión
                  </h2>
                  <p className="text-gray-500 text-sm mb-4">
                    Elige cómo quieres hacer crecer tus ahorros de retiro
                  </p>
                  <InvestmentSelector
                    onSelectionComplete={setInvestmentSelection}
                    currentSelection={investmentSelection ?? undefined}
                  />
                </div>

                {retirementPlan && (
                  <VerificationStep
                    plan={retirementPlan}
                    onVerificationComplete={handleVerificationComplete}
                  />
                )}

                {verificationPassed && (
                  <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                    <div className="flex items-start gap-4 mb-3">
                      <CheckCircle className="text-blue-600 shrink-0 mt-0.5" size={32} />
                      <div>
                        <h3 className="text-xl font-bold text-blue-800 mb-1">Verificación Completada</h3>
                        <p className="text-blue-700 text-sm">
                          Todos los requisitos han sido cumplidos. Puedes continuar a la confirmación final.
                        </p>
                      </div>
                    </div>
                    {needsApproval && (
                      <div className="bg-amber-50 rounded-xl p-3 mt-3 border border-amber-200">
                        <p className="text-sm text-amber-800">
                          Se requerirán <strong>2 transacciones</strong>: aprobación de USDC y creación del contrato.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-12 space-y-3">
              {validationError && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertCircle className="text-red-500 shrink-0" size={20} />
                  <p className="text-red-700 text-sm font-medium">{validationError}</p>
                </div>
              )}

              <button
                onClick={handleContinueToConfirmation}
                disabled={!canContinue}
                className={`
                  w-full font-black text-2xl sm:text-3xl px-8 py-7 rounded-3xl shadow-2xl
                  transition-all transform flex items-center justify-center gap-4 sm:gap-6
                  ${canContinue
                    ? 'bg-linear-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white hover:scale-105'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {pendingLabel
                  ? <><AlertCircle size={36} />{pendingLabel}</>
                  : <>Continuar a Confirmación<ArrowRight size={36} /></>
                }
              </button>

              {pendingLabel && !hasFund && (
                <p className="text-center text-gray-500 text-sm">
                  {!investmentSelection
                    ? 'Selecciona cómo quieres invertir tus ahorros para continuar'
                    : !verificationPassed
                    ? 'Asegúrate de tener suficiente balance de USDC y gas'
                    : 'Guarda los cambios antes de continuar'
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateContractPage;