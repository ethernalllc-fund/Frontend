import { Suspense, lazy, Component, useEffect } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LoadingScreen from './components/common/LoadingScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';

const HomePage            = lazy(() => import('./pages/public/HomePage'));
const CalculatorPage      = lazy(() => import('./pages/public/CalculatorPage'));
const ContactPage         = lazy(() => import('./pages/public/ContactPage'));
const SurveyPage          = lazy(() => import('./pages/public/SurveyPage'));
const DashboardPage       = lazy(() => import('./pages/user/DashboardPage'));
const CreateFundPage      = lazy(() => import('./pages/user/CreateFundPage'));
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard'));
const ContactMessages     = lazy(() => import('./pages/admin/ContactMessages'));
const AdminTreasury       = lazy(() => import('./pages/admin/AdminTreasury'));
const ContractsManagement = lazy(() => import('./pages/admin/ContractsManagement'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// ─── 404 Page ─────────────────────────────────────────────────────────────────
function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h1 className="text-7xl font-bold text-gray-200 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">Page not found</h2>
      <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
      <a
        href="/"
        className="px-6 py-3 bg-forest-green text-white rounded-lg font-semibold hover:opacity-90 transition"
      >
        Go home
      </a>
    </div>
  );
}

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
          <p className="text-gray-500 mb-6 max-w-md text-sm">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 bg-forest-green text-white rounded-lg font-semibold hover:opacity-90 transition mr-3"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Go home
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingScreen />}>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </Suspense>
    </Router>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ScrollToTop />
      <Navbar />
      <main className="grow">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public */}
            <Route path="/"           element={<HomePage />} />
            <Route path="/calculator" element={<CalculatorPage />} />
            <Route path="/contact"    element={<ContactPage />} />
            <Route path="/survey"     element={<SurveyPage />} />

            {/* User */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireAuth>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-fund"
              element={
                <ProtectedRoute requireAuth>
                  <CreateFundPage />
                </ProtectedRoute>
              }
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAuth requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/contact"
              element={
                <ProtectedRoute requireAuth requireAdmin>
                  <ContactMessages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/treasury"
              element={
                <ProtectedRoute requireAuth requireAdmin>
                  <AdminTreasury />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/contracts"
              element={
                <ProtectedRoute requireAuth requireAdmin>
                  <ContractsManagement />
                </ProtectedRoute>
              }
            />

            {/* Redirects */}
            <Route path="/governance" element={<Navigate to="/dashboard"  replace />} />
            <Route path="/fund"       element={<Navigate to="/create-fund" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <Analytics />
    </div>
  );
}

export default App;