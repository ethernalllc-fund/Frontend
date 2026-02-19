import React, { lazy, Suspense, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useRetirementPlan } from "../components/context/RetirementContext";

const DashboardPage = lazy(() => import("../pages/user/DashboardPage"));
const CreateContractPage = lazy(() => import("../pages/user/CreateContractPage"));
const ContractCreatedPage = lazy(() => import("../pages/user/ContractCreatedPage"));

export const USER_PATHS = {
  DASHBOARD: "/dashboard",
  CREATE_CONTRACT: "/create-contract",
  CONTRACT_CREATED: "/contract-created",
  GOVERNANCE: "/governance",
} as const;

interface UserRoute {
  path: string;
  component: React.ComponentType<Record<string, unknown>>;
  title: string;
  description?: string;
  requiresAuth?: boolean;
}

interface Contracts {
  factory?: string | null;
  treasury?: string | null;
  token?: string | null;
  governance?: string | null;
}

interface WalletProps {
  address: string | null;
  isConnected: boolean;
  chainId?: number;
}

export const userRoutes: UserRoute[] = [
  {
    path: USER_PATHS.DASHBOARD,
    component: DashboardPage,
    title: "Dashboard",
    description: "Manage your retirement fund",
    requiresAuth: true,
  },
  {
    path: USER_PATHS.CREATE_CONTRACT,
    component: CreateContractPage,
    title: "Create Contract",
    description: "Create your retirement savings contract",
    requiresAuth: true,
  },
  {
    path: USER_PATHS.CONTRACT_CREATED,
    component: ContractCreatedPage,
    title: "Contract Created",
    description: "Smart Contract created successfully",
    requiresAuth: true,
  },
];

export const getUserRoute = (path: string): UserRoute | undefined => {
  return userRoutes.find((route) => route.path === path);
};

export const isValidUserRoute = (path: string): boolean => {
  return userRoutes.some((route) => route.path === path);
};

interface UserRouterProps {
  currentPage: string;
  wallet: WalletProps;
  contracts: Contracts;
}

export const UserRouter: React.FC<UserRouterProps> = ({
  currentPage,
  wallet,
  contracts,
}) => {
  const route = getUserRoute(currentPage);
  const { planData } = useRetirementPlan();
  const pageProps = useMemo(() => {
    switch (currentPage) {
      case USER_PATHS.CREATE_CONTRACT:
        return {
          wallet: {
            address: wallet.address as `0x${string}` | undefined,
            isConnected: wallet.isConnected,
            chainId: wallet.chainId,
          },
          contracts: {
            factory: contracts.factory ?? null,
            daoFundAddress: contracts.treasury ?? contracts.factory ?? null,
          },
          calculatedPlan: planData ?? null,
          onSuccess: () => {
            window.location.href = USER_PATHS.CONTRACT_CREATED;
          },
        };

      case USER_PATHS.CONTRACT_CREATED:
        return {
          wallet: {
            address: wallet.address as `0x${string}` | undefined,
            isConnected: wallet.isConnected,
            chainId: wallet.chainId,
          },
          contracts: {
            factory: contracts.factory ?? null,
            daoFundAddress: contracts.treasury ?? contracts.factory ?? null,
          },
          calculatedPlan: planData ?? null,
          onSuccess: () => {
            window.location.href = USER_PATHS.DASHBOARD;
          },
        };

      case USER_PATHS.DASHBOARD:
        return {
          wallet: {
            address: wallet.address as `0x${string}` | undefined,
            isConnected: wallet.isConnected,
            isCorrectNetwork: wallet.chainId === 421614,
          },
          contracts: {
            factory: contracts.factory ?? null,
            tokenAddress: contracts.token ?? null,
            treasuryAddress: contracts.treasury ?? null,
            governanceAddress: contracts.governance ?? null,
            isReady: !!contracts.token && !!contracts.treasury,
          },
        };

      case USER_PATHS.GOVERNANCE:
        return {
          wallet,
          contracts: {
            governanceAddress: contracts.governance ?? null,
            tokenAddress: contracts.token ?? null,
          },
        };

      default:
        return { wallet, contracts };
    }
  }, [currentPage, wallet, contracts, planData]);

  if (!route) {
    return <Navigate to={USER_PATHS.DASHBOARD} replace />;
  }

  if (route.requiresAuth && !wallet.isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <div className="mb-6">
            <svg
              className="w-20 h-20 mx-auto text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Wallet Required
          </h2>
          <p className="text-gray-600 mb-8">
            Connect your wallet to access your retirement dashboard
          </p>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold text-lg hover:opacity-90 transition shadow-lg"
          >
            Go Home & Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  const Component = route.component;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading your dashboard...</p>
          </div>
        </div>
      }
    >
      <Component {...pageProps} />
    </Suspense>
  );
};

export default {
  routes: userRoutes,
  paths: USER_PATHS,
  getRoute: getUserRoute,
  isValid: isValidUserRoute,
  Router: UserRouter,
};