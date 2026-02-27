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
  useNavigationGuards,
  getNavigationErrorMessage,
  getGuard,
  getAllGuards,
  hasGuard,
  getActiveChains,
  getActiveChainIds,
} from './NavigationGuards';

export type { 
  NavigationGuards, 
  ValidationResult, 
  RouteType,
  AppPath,
  AllPaths,
  PathKey,
} from './NavigationGuards';

import type { AllPaths } from './NavigationGuards';

export type AppRoutePath = AllPaths[keyof AllPaths];
