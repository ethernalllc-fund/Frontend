import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LoadingScreen from './components/common/LoadingScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';

const HomePage           = lazy(() => import('./pages/public/HomePage'));
const CalculatorPage     = lazy(() => import('./pages/public/CalculatorPage'));
const ContactPage        = lazy(() => import('./pages/public/ContactPage'));
const DashboardPage      = lazy(() => import('./pages/user/DashboardPage'));
const CreateContractPage = lazy(() => import('./pages/user/CreateContractPage'));
const ContractCreatedPage= lazy(() => import('./pages/user/ContractCreatedPage'));
const AdminDashboard     = lazy(() => import('./pages/admin/AdminDashboard'));
const ContactMessages    = lazy(() => import('./pages/admin/ContactMessages'));
const AdminTreasury      = lazy(() => import('./pages/admin/AdminTreasury'));

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingScreen />}>
        <AppContent />
      </Suspense>
    </Router>
  );
}

function AppContent() {

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public */}
            <Route path="/"           element={<HomePage />} />
            <Route path="/calculator" element={<CalculatorPage />} />
            <Route path="/contact"    element={<ContactPage />} />

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
              path="/create-contract"
              element={
                <ProtectedRoute requireAuth>
                  <CreateContractPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contract-created"
              element={
                <ProtectedRoute requireAuth>
                  <ContractCreatedPage />
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
          
            {/* Redirects & 404 */}
            <Route path="/governance" element={<Navigate to="/dashboard"       replace />} />
            <Route path="/fund"       element={<Navigate to="/create-contract" replace />} />
            <Route path="*"           element={<Navigate to="/"                replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default App;
