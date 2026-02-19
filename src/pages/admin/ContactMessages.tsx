import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactAPI, type ContactMessage } from '@/lib/supabase';
import { formatTimestamp } from '@/lib/formatters';
import { Mail, Eye, Trash2, RefreshCw, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let toastId = 0;

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
          <p className="text-gray-800 font-medium">{message}</p>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ContactMessages() {
  const navigate = useNavigate();
  const [messages, setMessages]     = useState<ContactMessage[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<'all' | 'unread'>('all');
  const [toasts, setToasts]         = useState<Toast[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      void navigate('/admin/login');
    }
  }, [navigate]);

  // ── Toast helpers ───────────────────────────────────────────────────────────
  const showToast = (type: Toast['type'], message: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contactAPI.getAll(filter === 'unread');
      setMessages(data);
    } catch (err) {
      console.error('[ContactMessages] fetch error:', err);
      setError('No se pudieron cargar los mensajes. Verificá tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleMarkAsRead = async (id: number) => {
    try {
      await contactAPI.markAsRead(id);
      setMessages(prev =>
        prev.map(m => m.id === id ? { ...m, read: true } : m)
      );
      showToast('success', 'Mensaje marcado como leído.');
    } catch (err) {
      console.error('[ContactMessages] markAsRead error:', err);
      showToast('error', 'No se pudo marcar como leído.');
    }
  };

  const handleDeleteConfirmed = async () => {
    if (confirmDelete === null) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      await contactAPI.delete(id);
      setMessages(prev => prev.filter(m => m.id !== id));
      showToast('success', 'Mensaje eliminado correctamente.');
    } catch (err) {
      console.error('[ContactMessages] delete error:', err);
      showToast('error', 'No se pudo eliminar el mensaje.');
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${
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

      {/* Modal confirmación delete */}
      {confirmDelete !== null && (
        <ConfirmModal
          message="¿Estás seguro que querés eliminar este mensaje? Esta acción no se puede deshacer."
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { void navigate('/admin'); }}
              className="p-2 rounded-lg hover:bg-gray-200 transition text-gray-600"
              title="Volver al dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Mensajes de Contacto</h1>
              {!loading && unreadCount > 0 && (
                <p className="text-sm text-indigo-600 font-medium mt-1">
                  {unreadCount} mensaje{unreadCount !== 1 ? 's' : ''} sin leer
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => { void fetchMessages(); }}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex gap-3">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-lg font-medium transition ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
              }`}
            >
              {f === 'all' ? 'Todos los mensajes' : 'Sin leer'}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && !loading && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => { void fetchMessages(); }}
              className="ml-auto text-sm font-medium underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && messages.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {filter === 'unread' ? 'No hay mensajes sin leer.' : 'No hay mensajes aún.'}
            </p>
          </div>
        )}

        {/* Messages list */}
        {!loading && !error && messages.length > 0 && (
          <div className="space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`bg-white rounded-2xl p-6 shadow transition-all ${
                  !msg.read
                    ? 'border-l-4 border-indigo-500 shadow-indigo-100'
                    : 'border border-gray-100'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      {!msg.read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      )}
                      <h3 className="text-xl font-bold text-gray-900 truncate">{msg.subject}</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      De: <strong>{msg.name}</strong>{' '}
                      <a
                        href={`mailto:${msg.email}`}
                        className="text-indigo-600 hover:underline"
                      >
                        ({msg.email})
                      </a>
                    </p>
                    {msg.wallet_address && (
                      <p className="text-xs text-gray-400 font-mono mt-1 truncate">
                        Wallet: {msg.wallet_address}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!msg.read && (
                      <button
                        onClick={() => { void handleMarkAsRead(msg.id!); }}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                        title="Marcar como leído"
                      >
                        <Eye size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDelete(msg.id!)}
                      className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"
                      title="Eliminar mensaje"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <p className="text-gray-700 mb-4 whitespace-pre-wrap leading-relaxed">
                  {msg.message}
                </p>

                <p className="text-xs text-gray-400">
                  {formatTimestamp(msg.created_at || '', { includeTime: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}