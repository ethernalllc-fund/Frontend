import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-forest-green to-dark-blue">
      <div className="text-center">
        <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Loading Ethernal</h2>
        <p className="text-gray-300">Connecting to blockchain...</p>
      </div>
    </div>
  );
}