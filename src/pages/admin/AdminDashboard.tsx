import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, Wallet, FileText, Users, TrendingUp, Mail,
  DollarSign, Layers, LogOut, RefreshCw, AlertCircle,
  Clock, Construction,
} from 'lucide-react';
import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { supabase } from '@/lib/supabase';
import { TREASURY_ABI, PERSONAL_FUND_FACTORY_ABI as FACTORY_ABI } from '@/contracts/abis';
import { TREASURY_ADDRESS, FACTORY_ADDRESS } from '@/config/addresses';

const USDC_DECIMALS = 6;
const TVL_TABLE     = 'treasury_snapshots'; // TODO: confirmar nombre real de tabla

interface OffchainStats {
  pendingMessages: number;
  tvlTotal: string | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [offchain, setOffchain]           = useState<OffchainStats>({ pendingMessages: 0, tvlTotal: null });
  const [loadingOff, setLoadingOff]       = useState(true);
  const [offchainError, setOffchainError] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) void navigate('/admin/login');
  }, [navigate]);

  const { data: onchain, isLoading: loadingOn, refetch: refetchOnchain } = useReadContracts({
    contracts: [
      // [0] Balance USDC disponible en el contrato Treasury
      { address: TREASURY_ADDRESS, abi: TREASURY_ABI, functionName: 'getTreasuryBalance' },
      // [1] Stats completas del Treasury
      { address: TREASURY_ADDRESS, abi: TREASURY_ABI, functionName: 'getTreasuryStats' },
      // [2] (total, pending, approved, rejected) de early retirements
      { address: TREASURY_ADDRESS, abi: TREASURY_ABI, functionName: 'getRequestStats' },
      // [3] Total fondos creados desde Factory
      { address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: 'getFundCount' },
    ],
  });

  const usdcBalance   = onchain?.[0].status === 'success' ? onchain[0].result as bigint : undefined;
  const treasuryStats = onchain?.[1].status === 'success' ? onchain[1].result as {
    totalFeesCollectedUSDC:       bigint;
    totalFeesCollectedAllTime:    bigint;
    totalFundsRegistered:         bigint;
    activeFundsCount:             bigint;
    totalEarlyRetirementRequests: bigint;
    approvedEarlyRetirements:     bigint;
    rejectedEarlyRetirements:     bigint;
  } : undefined;
  const requestStats  = onchain?.[2].status === 'success' ? onchain[2].result as [bigint, bigint, bigint, bigint] : undefined;
  const fundCount     = onchain?.[3].status === 'success' ? onchain[3].result as bigint : undefined;
  const pendingRetirements = requestStats ? Number(requestStats[1]) : 0;
  const fetchOffchain = useCallback(async () => {
    setLoadingOff(true);
    setOffchainError(null);
    try {
      const [messagesRes, tvlRes] = await Promise.all([
        supabase
          .from('contact_messages')
          .select('id', { count: 'exact', head: true })
          .eq('read', false),
        supabase
          .from(TVL_TABLE)
          .select('tvl_usd')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (messagesRes.error) console.error('[Dashboard] contact_messages:', messagesRes.error.message);
      if (tvlRes.error)      console.error('[Dashboard] tvl:', tvlRes.error.message);

      const tvlRaw = tvlRes.data?.tvl_usd as number | null;
      setOffchain({
        pendingMessages: messagesRes.count ?? 0,
        tvlTotal: tvlRaw
          ? tvlRaw >= 1_000_000
            ? `${(tvlRaw / 1_000_000).toFixed(2)}M USD`
            : `${tvlRaw.toLocaleString()} USD`
          : null,
      });
    } catch (err) {
      console.error('[Dashboard] fetchOffchain failed:', err);
      setOffchainError('Error al cargar estadísticas. Intentá de nuevo.');
    } finally {
      setLoadingOff(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('admin_token')) void fetchOffchain();
  }, [fetchOffchain]);

  const refetchAll = () => { void refetchOnchain(); void fetchOffchain(); };
  const isLoading  = loadingOn || loadingOff;
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    void navigate('/admin/login');
  };

  const fmtUSDC = (val: bigint | undefined) =>
    val !== undefined
      ? `$${Number(formatUnits(val, USDC_DECIMALS)).toLocaleString('es-AR', {
          minimumFractionDigits: 2, maximumFractionDigits: 2,
        })} USDC`
      : '—';

  const statCards = [
    {
      title: 'Balance Treasury',
      value: isLoading ? '…' : fmtUSDC(usdcBalance),
      sub:   '🔗 on-chain · USDC',
      icon:  Wallet,
      color: 'bg-emerald-500',
      link:  '/admin/treasury',
      stub:  false,
    },
    {
      title: 'Fondos Creados',
      value: isLoading ? '…' : (fundCount !== undefined ? Number(fundCount).toLocaleString() : '—'),
      sub:   '🔗 on-chain · Factory',
      icon:  FileText,
      color: 'bg-purple-500',
      link:  '/admin/contracts',
      stub:  false,
    },
    {
      title: 'Token Holders',
      value: 'Próximamente',
      sub:   '🚧 Token.vy en desarrollo',
      icon:  Users,
      color: 'bg-gray-400',
      link:  '/admin/tokens',
      stub:  true,
    },
    {
      title: 'Mensajes Pendientes',
      value: isLoading ? '…' : String(offchain.pendingMessages),
      sub:   '🗄️ Supabase · sin leer',
      icon:  Mail,
      color: offchain.pendingMessages > 0 ? 'bg-red-500' : 'bg-gray-400',
      link:  '/admin/contact',
      stub:  false,
    },
    {
      title: 'Retiros Anticipados',
      value: isLoading ? '…' : String(pendingRetirements),
      sub:   `🔗 on-chain · ${pendingRetirements > 0 ? 'requieren atención' : 'al día'}`,
      icon:  Clock,
      color: pendingRetirements > 0 ? 'bg-orange-500' : 'bg-gray-400',
      link:  '/admin/treasury',
      stub:  false,
    },
    {
      title: 'TVL Total',
      value: isLoading ? '…' : (offchain.tvlTotal ?? '—'),
      sub:   '🗄️ Supabase · última snapshot',
      icon:  DollarSign,
      color: 'bg-cyan-500',
      link:  '/admin/treasury',
      stub:  false,
    },
  ];

  const quickActions = [
    { title: 'Gestión Treasury',     desc: 'Retiros, fees y balances',   icon: Wallet,     color: 'bg-emerald-600', link: '/admin/treasury',   stub: false },
    { title: 'Mensajes de Usuarios', desc: 'Soporte y consultas',         icon: Mail,       color: 'bg-orange-600',  link: '/admin/contact',    stub: false },
    { title: 'Contratos',            desc: 'Fondos personales creados',   icon: FileText,   color: 'bg-blue-600',    link: '/admin/contracts',  stub: false },
    { title: 'Token Geras',          desc: 'En desarrollo',               icon: Layers,     color: 'bg-gray-500',    link: '/admin/tokens',     stub: true  },
    { title: 'Gobernanza',           desc: 'En desarrollo',               icon: Shield,     color: 'bg-gray-500',    link: '/admin/governance', stub: true  },
    { title: 'Protocolos DeFi',      desc: 'Integraciones activas',       icon: TrendingUp, color: 'bg-teal-600',    link: '/admin/protocols',  stub: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-700 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Shield className="w-12 h-12 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">Treasury Panel</h1>
              <p className="text-purple-100">Ethernity DAO – Fondo de Retiro Blockchain</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refetchAll}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl transition backdrop-blur"
            >
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-10">

        {/* Error banner */}
        {offchainError && (
          <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{offchainError}</span>
            <button onClick={() => { void fetchOffchain(); }} className="ml-auto text-sm font-medium underline hover:no-underline">
              Reintentar
            </button>
          </div>
        )}

        {/* Banner alerta retiros anticipados */}
        {!isLoading && pendingRetirements > 0 && (
          <div className="mb-6 flex items-center gap-3 bg-orange-50 border border-orange-200 text-orange-700 px-5 py-4 rounded-xl">
            <Clock className="w-5 h-5 shrink-0" />
            <span>
              Hay <strong>{pendingRetirements}</strong> solicitud{pendingRetirements !== 1 ? 'es' : ''} de retiro anticipado pendiente{pendingRetirements !== 1 ? 's' : ''} de revisión.
            </span>
            <Link to="/admin/treasury" className="ml-auto text-sm font-semibold underline hover:no-underline text-orange-700">
              Revisar →
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {statCards.map((stat, i) => (
            <Link
              key={i}
              to={stat.link}
              className={`bg-white rounded-2xl shadow-xl transition-all p-8 group relative overflow-hidden ${
                stat.stub ? 'opacity-60 pointer-events-none' : 'hover:shadow-2xl'
              }`}
            >
              {stat.stub && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  <Construction className="w-3 h-3" /> WIP
                </span>
              )}
              <div className="flex items-center justify-between mb-5">
                <div className={`${stat.color} p-4 rounded-2xl text-white group-hover:scale-110 transition`}>
                  <stat.icon className="w-9 h-9" />
                </div>
                <RefreshCw className={`w-5 h-5 text-gray-300 group-hover:text-indigo-400 group-hover:rotate-180 transition ${isLoading && !stat.stub ? 'animate-spin text-indigo-300' : ''}`} />
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.sub}</p>
            </Link>
          ))}
        </div>

        {/* Métricas secundarias del Treasury — solo cuando hay datos */}
        {treasuryStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Fees recaudados (alltime)', value: fmtUSDC(treasuryStats.totalFeesCollectedAllTime) },
              { label: 'Fondos activos',            value: Number(treasuryStats.activeFundsCount).toLocaleString() },
              { label: 'Retiros aprobados',         value: Number(treasuryStats.approvedEarlyRetirements).toLocaleString() },
              { label: 'Retiros rechazados',        value: Number(treasuryStats.rejectedEarlyRetirements).toLocaleString() },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">{m.label}</p>
                <p className="text-xl font-bold text-gray-800">{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              to={action.link}
              className={`${action.color} text-white rounded-2xl p-8 transition group relative overflow-hidden ${
                action.stub ? 'opacity-50 pointer-events-none' : 'hover:opacity-90'
              }`}
            >
              {action.stub && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                  <Construction className="w-3 h-3" /> WIP
                </span>
              )}
              <action.icon className="w-12 h-12 mb-4 group-hover:scale-110 transition" />
              <h3 className="text-2xl font-bold mb-1">{action.title}</h3>
              <p className="text-white/80 text-sm">{action.desc}</p>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}