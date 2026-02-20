import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContractsManagement() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md border border-gray-100">
        <Construction className="w-20 h-20 text-amber-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-3">Gestión de Contratos</h1>
        <p className="text-gray-500 mb-2">Esta sección está en desarrollo.</p>
        <p className="text-sm text-gray-400 mb-8">
          Próximamente podrás ver y gestionar todos los contratos PersonalFund creados en la plataforma.
        </p>
        <button
          onClick={() => { void navigate('/admin'); }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl transition"
        >
          <ArrowLeft size={18} />
          Volver al Dashboard
        </button>
      </div>
    </div>
  );
}