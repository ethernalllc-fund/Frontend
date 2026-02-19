export {
  publicRoutes,
  PUBLIC_PATHS,
  getPublicRoute,
  isValidPublicRoute,
  PublicRouter,
} from './PublicRoutes';

export {
  userRoutes,
  USER_PATHS,
  getUserRoute,
  isValidUserRoute,
  UserRouter,
} from './UserRoutes';

export {
  adminRoutes,
  ADMIN_PATHS,
  getAdminRoute,
  isValidAdminRoute,
  AdminRouter,
  getAdminTabFromPath,
  useAdminAuth,
} from './AdminRoutes';

export type { AdminTab } from './AdminRoutes';

export {
  ALL_PATHS,
  getRouteType,
  requiresWallet,
  requiresCorrectNetwork,
  getNavigationGuards,
  validateNavigation,
  useNavigationGuard,
  getNavigationErrorMessage,
  getGuard,
  getAllGuards,
  hasGuard,
  getActiveChains,
  getActiveChainIds,
} from './navigationGuards';

export type { 
  NavigationGuard, 
  ValidationResult, 
  RouteType,
  AppPath,
  AllPaths,
  PathKey,
} from './navigationGuards';

import type { AllPaths } from './navigationGuards';

export type AppRoutePath = AllPaths[keyof AllPaths];
