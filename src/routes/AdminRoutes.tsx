import React, { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';

const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminTreasury = lazy(() => import('../pages/admin/AdminTreasury'));
// const ContractsManagement = lazy(() => import('../../docs/stand-by-docs/ContractsManagement'));
// const TokenManagement = lazy(() => import('../../docs/stand-by-docs/TokenManagement'));
const ContactMessages = lazy(() => import('../pages/admin/ContactMessages'));

interface AdminRoute {
  path: string;
  component: React.ComponentType<any>;
  title: string;
  description?: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  requiredRole?: 'admin' | 'superadmin';
}

export const ADMIN_PATHS = {
  ADMIN_DASHBOARD: '/admin_dashboard',
  TREASURY: '/admin/treasury',
  CONTRACTS: '/admin/contracts',
  TOKENS: '/admin/tokens',
  ADMIN_CONTACT: '/admin/admin_contact',
} as const;

export const adminRoutes: AdminRoute[] = [
  {
    path: ADMIN_PATHS.ADMIN_DASHBOARD,
    component: AdminDashboard,
    title: 'Admin Dashboard',
    description: 'Manage and monitor the PersonalFund protocol on the Ethernal Fund ecosystem',
    requiresAuth: true,
    requiresAdmin: true,
    requiredRole: 'admin',
  },
  {
    path: ADMIN_PATHS.TREASURY,
    component: AdminTreasury,
    title: 'Admin Treasury',
    description: 'Manage Ethernaltreasury and fees',
    requiresAuth: true,
    requiresAdmin: true,
    requiredRole: 'admin',
  },
  /*
  {
    path: ADMIN_PATHS.CONTRACTS,
    component: ContractsManagement,
    title: 'Contracts Management',
    description: 'View and manage PersonalFund contracts',
    requiresAuth: true,
    requiresAdmin: true,
    requiredRole: 'admin',
  },
  {
    path: ADMIN_PATHS.TOKENS,
    component: TokenManagement,
    title: 'Token Management',
    description: 'Manage Geras token supply and cycles',
    requiresAuth: true,
    requiresAdmin: true,
    requiredRole: 'admin',
  },
  */
  {
    path: ADMIN_PATHS.ADMIN_CONTACT,
    component: ContactMessages,
    title: 'Contact Messages',
    description: 'View and respond to user messages',
    requiresAuth: true,
    requiresAdmin: true,
    requiredRole: 'admin',
  },
];

export const getAdminRoute = (path: string): AdminRoute | undefined => {
  return adminRoutes.find((route) => route.path === path);
};

export const isValidAdminRoute = (path: string): boolean => {
  return adminRoutes.some((route) => route.path === path);
};

export type AdminTab = 'admin_dashboard' | 'treasury' | 'contracts' | 'tokens' | 'admin_contact';

export const getAdminTabFromPath = (path: string): AdminTab => {
  switch (path) {
    case ADMIN_PATHS.TREASURY:
      return 'treasury';
    case ADMIN_PATHS.CONTRACTS:
      return 'contracts';
    case ADMIN_PATHS.TOKENS:
      return 'tokens';
    case ADMIN_PATHS.ADMIN_CONTACT:
      return 'admin_contact';
    default:
      return 'admin_dashboard';
  }
};

export const useAdminAuth = () => {
  const hasAdminAccess = (walletAddress?: string): boolean => {
    return !!walletAddress;
  };

  return { hasAdminAccess };
};

interface AdminRouterProps {
  currentPage: string;
  wallet: {
    address: string | null;
    isConnected: boolean;
    chainId?: number;
  };
  contracts: {
    factory?: string;
    treasury?: string;
    token?: string;
    protocolRegistry?: string;
    userPreferences?: string;
  };
}

export const AdminRouter: React.FC<AdminRouterProps> = ({ currentPage, wallet, contracts }) => {
  const route = getAdminRoute(currentPage);

  if (!route) {
    return <Navigate to={ADMIN_PATHS.ADMIN_DASHBOARD} replace />;
  }

  if (route.requiresAuth && !wallet.isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet with admin privileges</p>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (route.requiresAdmin && !wallet.isConnected) {
    return <Navigate to="/" replace />;
  }

  const Component = route.component;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <Component wallet={wallet} contracts={contracts} />
    </Suspense>
  );
};

export default {
  routes: adminRoutes,
  paths: ADMIN_PATHS,
  getRoute: getAdminRoute,
  isValid: isValidAdminRoute,
  Router: AdminRouter,
  getTabFromPath: getAdminTabFromPath,
  useAuth: useAdminAuth,
};
