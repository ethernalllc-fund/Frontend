import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
  useAccount, useReadContracts,
} from 'wagmi';
import { parseUnits, formatUnits, isAddress } from 'viem';
import {
  ArrowLeft, RefreshCw, AlertCircle, CheckCircle,
  XCircle, Clock, DollarSign, Users, FileText,
  ShieldCheck, ShieldX, Send, Settings, ChevronDown, ChevronUp,
} from 'lucide-react';

import { TREASURY_ABI }     from '@/contracts/abis';
import { TREASURY_ADDRESS } from '@/config/addresses';

const USDC_DECIMALS = 6;

interface TreasuryStats {
  totalFeesCollectedUSDC:       bigint;
  totalFeesCollectedAllTime:    bigint;
  totalFundsRegistered:         bigint;
  activeFundsCount:             bigint;
  totalEarlyRetirementRequests: bigint;
  approvedEarlyRetirements:     bigint;
  rejectedEarlyRetirements:     bigint;
}

interface EarlyRetirementRequest {
  fundAddress:        `0x${string}`;
  requester:          `0x${string}`;
  reason:             string;
  approved:           boolean;
  rejected:           boolean;
  processed:          boolean;
  requestTimestamp:   bigint;
  processedTimestamp: bigint;
}

interface Toast { id: number; type: 'success' | 'error'; message: string; }
let _toastId = 0;

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = (type: Toast['type'], message: string) => {
    const id = ++_toastId;
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  };
  return { toasts, showToast: show };
}

const fmt = (val: bigint | undefined) =>
  val !== undefined
    ? Number(formatUnits(val, USDC_DECIMALS)).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '—';

const fmtDate = (ts: bigint) =>
  ts === 0n ? '—' : new Date(Number(ts) * 1000).toLocaleString('es-AR');

const shortAddr = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />
        }
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100">{children}</div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl p-5 ${color}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminTreasury() {
  const navigate                    = useNavigate();
  const { address: walletAddress }  = useAccount();
  const { toasts, showToast }       = useToasts();

  const [withdrawRecipient, setWithdrawRecipient] = useState('');
  const [withdrawAmount,    setWithdrawAmount]    = useState('');
  const [newFeeValue,       setNewFeeValue]       = useState('');
  const [newManager,        setNewManager]        = useState('');
  const [removeManager,     setRemoveManager]     = useState('');
  const [pendingAddresses,  setPendingAddresses]  = useState<`0x${string}`[]>([]);
  const [requests,          setRequests]          = useState<Record<string, EarlyRetirementRequest>>({});

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) navigate('/admin/login');
  }, [navigate]);

  const base = { address: TREASURY_ADDRESS, abi: TREASURY_ABI } as const;

  const { data: stats,        refetch: refetchStats   } = useReadContract({ ...base, functionName: 'getTreasuryStats' });
  const { data: balance,      refetch: refetchBalance } = useReadContract({ ...base, functionName: 'getTreasuryBalance' });
  const { data: feePercentage, refetch: refetchFee    } = useReadContract({ ...base, functionName: 'feePercentage' });
  const { data: totalWithdrawn }                        = useReadContract({ ...base, functionName: 'totalFeesWithdrawn' });
  const { data: managerCount  }                         = useReadContract({ ...base, functionName: 'getManagerCount' });
  const { data: requestStats, refetch: refetchRequestStats } = useReadContract({ ...base, functionName: 'getRequestStats' });
  const { data: pendingRaw,   refetch: refetchPending }      = useReadContract({ ...base, functionName: 'getPendingRequests' });

  const pendingContracts = (pendingRaw as `0x${string}`[] ?? []).map(addr => ({
    ...base,
    functionName: 'getEarlyRetirementRequest' as const,
    args: [addr] as const,
  }));

  const { data: pendingDetails, refetch: refetchDetails } = useReadContracts({
    contracts: pendingContracts,
    query: { enabled: pendingContracts.length > 0 },
  });

  useEffect(() => {
    if (!pendingRaw) return;
    setPendingAddresses(pendingRaw as `0x${string}`[]);
  }, [pendingRaw]);

  useEffect(() => {
    if (!pendingDetails || !pendingAddresses.length) return;
    const map: Record<string, EarlyRetirementRequest> = {};
    pendingDetails.forEach((res, i) => {
      const addr = pendingAddresses[i];
      // Guard: addr must be defined (it always will be, but satisfies TS)
      if (res.status === 'success' && addr !== undefined) {
        map[addr] = res.result as EarlyRetirementRequest;
      }
    });
    setRequests(map);
  }, [pendingDetails, pendingAddresses]);

  const refetchAll = () => {
    refetchStats();
    refetchBalance();
    refetchFee();
    refetchRequestStats();
    refetchPending();
    refetchDetails();
  };

  const { writeContract, data: txHash, isPending: isSending, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txConfirmed) {
      showToast('success', 'Transacción confirmada en la blockchain.');
      resetWrite();
      refetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txConfirmed]);

  const isLoading = isSending || isConfirming;

  const handleWithdrawFees = () => {
    if (!isAddress(withdrawRecipient)) return showToast('error', 'Dirección de destino inválida.');
    const parsed = parseFloat(withdrawAmount);
    if (isNaN(parsed) || parsed <= 0) return showToast('error', 'Monto inválido.');
    writeContract({
      ...base,
      functionName: 'withdrawFees',
      args: [withdrawRecipient as `0x${string}`, parseUnits(withdrawAmount, USDC_DECIMALS)],
    });
  };

  const handleUpdateFee = () => {
    const val = parseInt(newFeeValue);
    if (isNaN(val) || val <= 0 || val > 5000)
      return showToast('error', 'Fee debe estar entre 1 y 5000 bps.');
    writeContract({ ...base, functionName: 'updateFeePercentage', args: [BigInt(val)] });
  };

  const handleAddManager = () => {
    if (!isAddress(newManager)) return showToast('error', 'Dirección inválida.');
    writeContract({ ...base, functionName: 'addTreasuryManager', args: [newManager as `0x${string}`] });
    setNewManager('');
  };

  const handleRemoveManager = () => {
    if (!isAddress(removeManager)) return showToast('error', 'Dirección inválida.');
    writeContract({ ...base, functionName: 'removeTreasuryManager', args: [removeManager as `0x${string}`] });
    setRemoveManager('');
  };

  const handleProcessRetirement = (fundAddress: `0x${string}`, approve: boolean) => {
    writeContract({
      ...base,
      functionName: 'processEarlyRetirement',
      args: [fundAddress, approve],
    });
  };

  const s          = stats as TreasuryStats | undefined;
  const currentFee = feePercentage !== undefined ? Number(feePercentage as bigint) : null;
  const feeDisplay = currentFee !== null ? `${(currentFee / 100).toFixed(2)}%` : '—';
  const [totalReqs, pendingCount, approvedCount, rejectedCount] =
    (requestStats ?? [0n, 0n, 0n, 0n]) as bigint[];

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20">

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium pointer-events-auto ${
              t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            {t.type === 'success'
              ? <CheckCircle className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            {t.message}
          </div>
        ))}
      </div>

      {/* TX en curso */}
      {isLoading && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 shadow-2xl flex items-center gap-4">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <div>
              <p className="font-bold text-gray-800">
                {isSending ? 'Esperando firma…' : 'Confirmando transacción…'}
              </p>
              <p className="text-sm text-gray-500">No cerrés esta ventana</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-700 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Gestión Treasury</h1>
              <p className="text-emerald-100 text-sm">Ethernity DAO — Fondo de Retiro Blockchain</p>
            </div>
          </div>
          <button
            onClick={refetchAll}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-10 space-y-8">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Balance USDC"
            value={`$${fmt(balance as bigint | undefined)}`}
            sub="Disponible en contrato"
            color="bg-emerald-600 text-white"
          />
          <StatCard
            label="Fees totales (alltime)"
            value={`$${fmt(s?.totalFeesCollectedAllTime)}`}
            sub={`Retirado: $${fmt(totalWithdrawn as bigint | undefined)}`}
            color="bg-indigo-600 text-white"
          />
          <StatCard
            label="Fondos registrados"
            value={s?.totalFundsRegistered?.toString() ?? '—'}
            sub={`Activos: ${s?.activeFundsCount?.toString() ?? '—'}`}
            color="bg-amber-500 text-white"
          />
          <StatCard
            label="Fee actual"
            value={feeDisplay}
            sub={currentFee !== null ? `${currentFee} bps` : undefined}
            color="bg-purple-600 text-white"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total solicitudes" value={totalReqs?.toString()    ?? '—'} color="bg-gray-700 text-white" />
          <StatCard label="Pendientes"        value={pendingCount?.toString()  ?? '—'} color="bg-orange-500 text-white" />
          <StatCard label="Aprobadas"         value={approvedCount?.toString() ?? '—'} color="bg-emerald-500 text-white" />
          <StatCard label="Rechazadas"        value={rejectedCount?.toString() ?? '—'} color="bg-red-500 text-white" />
        </div>

        <Section title="Retirar Fees (withdrawFees)" icon={DollarSign}>
          <p className="text-sm text-gray-500 mb-4">
            Transfiere USDC acumulado en el contrato a una dirección. Solo admin.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección destino</label>
              <input
                className="input"
                placeholder="0x..."
                value={withdrawRecipient}
                onChange={e => setWithdrawRecipient(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto USDC</label>
              <input
                className="input"
                placeholder="ej: 500.00"
                type="number"
                min="0"
                step="0.01"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleWithdrawFees}
              disabled={isLoading || !withdrawRecipient || !withdrawAmount}
              className="btn btn-primary"
            >
              <Send className="w-4 h-4" />
              Ejecutar retiro
            </button>
            <p className="text-xs text-gray-400">
              Balance disponible:{' '}
              <strong className="text-gray-700">${fmt(balance as bigint | undefined)} USDC</strong>
            </p>
          </div>
        </Section>

        {/* Solicitudes de retiro anticipado */}
        <Section
          title={`Solicitudes de Retiro Anticipado${pendingAddresses.length > 0 ? ` (${pendingAddresses.length} pendientes)` : ''}`}
          icon={Clock}
        >
          {pendingAddresses.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400">No hay solicitudes pendientes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAddresses.map(addr => {
                const req = requests[addr];
                return (
                  <div key={addr} className="border border-orange-200 bg-orange-50 rounded-xl p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                          <span className="text-xs font-semibold text-orange-700 uppercase">Pendiente</span>
                        </div>
                        <p className="text-sm font-mono text-gray-700 mb-1">
                          Fondo: <strong>{shortAddr(addr)}</strong>
                        </p>
                        {req && (
                          <>
                            <p className="text-sm text-gray-600 mb-1">
                              Solicitante: <span className="font-mono">{shortAddr(req.requester)}</span>
                            </p>
                            <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{req.reason}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              Solicitado: {fmtDate(req.requestTimestamp)}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <button
                          onClick={() => handleProcessRetirement(addr, true)}
                          disabled={isLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleProcessRetirement(addr, false)}
                          disabled={isLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                        >
                          <ShieldX className="w-4 h-4" />
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Gestión de fee */}
        <Section title="Actualizar Fee de Protocolo (updateFeePercentage)" icon={Settings} defaultOpen={false}>
          <p className="text-sm text-gray-500 mb-4">
            Fee actual: <strong>{feeDisplay}</strong>. El valor se expresa en basis points (100 bps = 1%).{' '}
            El contrato tiene un default de 500 bps (5%) y un fee de retiro anticipado de 700 bps (7%).
          </p>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nuevo fee (bps)</label>
              <input
                className="input w-48"
                placeholder="ej: 500"
                type="number"
                min="1"
                max="5000"
                value={newFeeValue}
                onChange={e => setNewFeeValue(e.target.value)}
              />
              {newFeeValue && !isNaN(parseInt(newFeeValue)) && (
                <p className="text-xs text-gray-400 mt-1">
                  = {(parseInt(newFeeValue) / 100).toFixed(2)}%
                </p>
              )}
            </div>
            <button
              onClick={handleUpdateFee}
              disabled={isLoading || !newFeeValue}
              className="btn btn-primary"
            >
              <Settings className="w-4 h-4" />
              Actualizar fee
            </button>
          </div>
        </Section>

        {/* Gestión de managers */}
        <Section
          title={`Managers del Treasury (${managerCount?.toString() ?? '—'} activos)`}
          icon={Users}
          defaultOpen={false}
        >
          <p className="text-sm text-gray-500 mb-6">
            Los managers pueden aprobar solicitudes. Solo el admin puede agregar o remover managers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agregar */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <h3 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Agregar manager
              </h3>
              <input
                className="input mb-3"
                placeholder="0x..."
                value={newManager}
                onChange={e => setNewManager(e.target.value)}
              />
              <button
                onClick={handleAddManager}
                disabled={isLoading || !newManager}
                className="btn btn-primary w-full sm:w-auto"
              >
                Agregar
              </button>
            </div>
            {/* Remover */}
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Remover manager
              </h3>
              <input
                className="input mb-3"
                placeholder="0x..."
                value={removeManager}
                onChange={e => setRemoveManager(e.target.value)}
              />
              <button
                onClick={handleRemoveManager}
                disabled={isLoading || !removeManager}
                className="btn btn-danger w-full sm:w-auto"
              >
                Remover
              </button>
            </div>
          </div>
        </Section>

        {/* Info del contrato */}
        <Section title="Información del Contrato" icon={FileText} defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              {[
                { label: 'Contrato Treasury', value: shortAddr(TREASURY_ADDRESS) },
                { label: 'Wallet conectada',  value: walletAddress ? shortAddr(walletAddress) : '—' },
                { label: 'Fee actual',        value: feeDisplay, bold: true },
                { label: 'Managers activos',  value: managerCount?.toString() ?? '—', bold: true },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">{row.label}</span>
                  <span className={row.bold ? 'font-bold text-gray-800' : 'font-mono text-gray-700'}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                { label: 'Total fees recaudados (USDC)', value: `$${fmt(s?.totalFeesCollectedUSDC)}` },
                { label: 'Total fees retirados',         value: `$${fmt(totalWithdrawn as bigint | undefined)}` },
                { label: 'Fondos registrados',           value: s?.totalFundsRegistered?.toString() ?? '—' },
                { label: 'Fondos activos',               value: s?.activeFundsCount?.toString() ?? '—' },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-bold text-gray-800">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}