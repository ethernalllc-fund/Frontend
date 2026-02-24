import { useEffect } from 'react';
import { formatUnits } from 'viem';
import { useChainId } from 'wagmi';
import { useBalanceVerification } from '@/hooks/funds/useBalanceVerification';
import { CheckCircle, XCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import type { RetirementPlan } from '@/types/retirement_types';
import { initialDepositAmount, calcFee } from '@/types/retirement_types';

interface VerificationStepProps {
  plan:                   RetirementPlan;
  onVerificationComplete: (needsApproval: boolean) => void;
}

interface CheckItemProps {
  passed:   boolean;
  title:    string;
  children: React.ReactNode;
}

function CheckItem({ passed, title, children }: CheckItemProps) {
  return (
    <div className={`rounded-xl p-5 border-2 transition-all ${
      passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-300'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`shrink-0 mt-1 ${passed ? 'text-green-600' : 'text-red-600'}`}>
          {passed ? <CheckCircle size={28} /> : <XCircle size={28} />}
        </div>
        <div className="flex-1">
          <h4 className={`font-bold text-lg mb-2 ${passed ? 'text-green-800' : 'text-red-800'}`}>
            {title}
          </h4>
          {children}
        </div>
      </div>
    </div>
  );
}

export function VerificationStep({ plan, onVerificationComplete }: VerificationStepProps) {
  const chainId = useChainId();
  const {
    hasEnoughUSDC,
    hasEnoughGas,
    hasEnoughAllowance,
    usdcBalance,
    gasBalance,
    allowance,
    requiredUSDC,
    requiredGas,
    isLoading,
  } = useBalanceVerification(plan);

  const allChecksPass = hasEnoughUSDC && hasEnoughGas;
  const gasToken      = chainId === 421614 ? 'ETH' : 'POL';
  const depositAmountWei = initialDepositAmount(plan);
  const feeAmountWei     = calcFee(depositAmountWei);

  useEffect(() => {
    if (allChecksPass) {
      onVerificationComplete(!hasEnoughAllowance);
    }
  }, [allChecksPass, hasEnoughAllowance, onVerificationComplete]);

  if (isLoading) {
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 text-center">
        <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
        <p className="text-lg text-blue-800 font-semibold">Verificando balances...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <AlertCircle className="text-indigo-600" size={28} />
          Verificación de Requisitos
        </h3>

        <div className="space-y-4">

          {/* Check 1: Balance USDC */}
          <CheckItem passed={hasEnoughUSDC} title="Balance USDC">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Requerido:</span>
                <strong className={hasEnoughUSDC ? 'text-green-700' : 'text-red-700'}>
                  {formatUnits(requiredUSDC, 6)} USDC
                </strong>
              </div>
              <div className="bg-white/60 rounded-lg p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Depósito (principal + mes 1):</span>
                  <span className="font-mono">{formatUnits(depositAmountWei, 6)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fee Ethernal (5%):</span>
                  <span className="font-mono">{formatUnits(feeAmountWei, 6)} USDC</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-gray-700">Tu balance:</span>
                <strong className={hasEnoughUSDC ? 'text-green-700' : 'text-red-700'}>
                  {formatUnits(usdcBalance, 6)} USDC
                </strong>
              </div>
              {!hasEnoughUSDC && (
                <div className="mt-3 bg-red-100 rounded-lg p-3">
                  <p className="text-red-800 font-semibold text-xs mb-2">⚠ Balance insuficiente</p>
                  <p className="text-red-700 text-xs mb-3">
                    Te faltan {formatUnits(requiredUSDC - usdcBalance, 6)} USDC
                  </p>
                  <a
                    href="https://faucet.quicknode.com/arbitrum/sepolia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    <ExternalLink size={14} />
                    Obtener USDC en Faucet
                  </a>
                </div>
              )}
            </div>
          </CheckItem>

          <CheckItem passed={hasEnoughGas} title={`Balance de Gas (${gasToken})`}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Requerido (estimado):</span>
                <strong className={hasEnoughGas ? 'text-green-700' : 'text-red-700'}>
                  {formatUnits(requiredGas, 18)} {gasToken}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Tu balance:</span>
                <strong className={hasEnoughGas ? 'text-green-700' : 'text-red-700'}>
                  {formatUnits(gasBalance, 18)} {gasToken}
                </strong>
              </div>
              {!hasEnoughGas && (
                <div className="mt-3 bg-red-100 rounded-lg p-3">
                  <p className="text-red-800 font-semibold text-xs mb-2">⚠ Gas insuficiente</p>
                  <p className="text-red-700 text-xs mb-3">
                    Necesitas {gasToken} para pagar el gas de las transacciones
                  </p>
                  <a
                    href={chainId === 421614
                      ? 'https://faucet.quicknode.com/arbitrum/sepolia'
                      : 'https://faucet.polygon.technology/'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    <ExternalLink size={14} />
                    Obtener {gasToken} en Faucet
                  </a>
                </div>
              )}
            </div>
          </CheckItem>

          <CheckItem passed={hasEnoughAllowance} title="Aprobación USDC">
            <div className="space-y-2 text-sm">
              {hasEnoughAllowance ? (
                <div className="text-green-700">
                  <p className="font-semibold">✓ Contrato autorizado</p>
                  <p className="text-xs text-green-600 mt-1">
                    Allowance actual: {formatUnits(allowance, 6)} USDC
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-amber-800 font-semibold">⚠ Necesitas aprobar el contrato</p>
                  <div className="bg-amber-50 rounded-lg p-3 text-xs">
                    <p className="text-amber-700 mb-1">
                      Allowance actual: {formatUnits(allowance, 6)} USDC
                    </p>
                    <p className="text-amber-600">
                      Se requerirá una transacción de aprobación antes del depósito.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CheckItem>
        </div>

        {/* Summary — falla */}
        {!allChecksPass && (
          <div className="mt-6 bg-red-100 border-2 border-red-300 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={24} />
              <div className="flex-1">
                <h4 className="font-bold text-red-800 mb-2">
                  Debes resolver los problemas antes de continuar
                </h4>
                <ul className="space-y-1 text-sm text-red-700">
                  {!hasEnoughUSDC && <li>• Balance USDC insuficiente</li>}
                  {!hasEnoughGas  && <li>• Balance de {gasToken} insuficiente para gas</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Aprobación pendiente */}
        {allChecksPass && !hasEnoughAllowance && (
          <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={24} />
              <div className="flex-1">
                <h4 className="font-bold text-blue-800 mb-1">Aprobación requerida</h4>
                <p className="text-sm text-blue-700">
                  Se necesitarán <strong>2 transacciones</strong>: una para aprobar USDC y otra para crear el contrato.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Todo OK */}
        {allChecksPass && hasEnoughAllowance && (
          <div className="mt-6 bg-green-100 border-2 border-green-300 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600 shrink-0" size={24} />
              <div className="flex-1">
                <h4 className="font-bold text-green-800">✓ Todo listo para crear tu contrato</h4>
                <p className="text-sm text-green-700 mt-1">
                  Puedes proceder directamente con <strong>1 transacción</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
