import React, { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";

const HomePage = lazy(() => import("../pages/public/HomePage"));
const Calculator = lazy(() => import("../pages/public/CalculatorPage"));
const ContactPage = lazy(() => import("../pages/public/ContactPage"));
const SurveyPage = lazy(() => import("../pages/public/SurveyPage"));

interface PublicRoute {
  path: string;
  component: React.ComponentType<any>;
  title: string;
  description?: string;
  guard?: (context: any) => boolean;
  redirectTo?: string;
}

export const PUBLIC_PATHS = {
  HOME: "/",
  CALCULATOR: "/calculator",
  CONTACT: "/contact",
  SURVEY: "/survey",
  // W: '/wallet-test',
} as const;

export const publicRoutes: PublicRoute[] = [
  {
    path: PUBLIC_PATHS.HOME,
    component: HomePage,
    title: "Home",
    description: "Secure your retirement with Ethernity DAO",
  },
  {
    path: PUBLIC_PATHS.CALCULATOR,
    component: Calculator,
    title: "Retirement Calculator",
    description: "Plan your savings with compound interest",
  },
  {
    path: PUBLIC_PATHS.CONTACT,
    component: ContactPage,
    title: "Contact Us",
    description: "Get in touch with the team",
  },
  {
    path: PUBLIC_PATHS.SURVEY,
    component: SurveyPage,
    title: "Survey",
    description: "Take our anonymous survey",
  },
];

export const getPublicRoute = (path: string): PublicRoute | undefined => {
  return publicRoutes.find((route) => route.path === path);
};

export const isValidPublicRoute = (path: string): boolean => {
  return publicRoutes.some((route) => route.path === path);
};

interface PublicRouterProps {
  currentPage: string;
  context?: any;
}

export const PublicRouter: React.FC<PublicRouterProps> = ({ currentPage, context }) => {
  const route = getPublicRoute(currentPage) || getPublicRoute(PUBLIC_PATHS.HOME);
  if (!route) return null;

  if (route.guard && !route.guard(context)) {
    return <Navigate to={route.redirectTo || PUBLIC_PATHS.HOME} replace />;
  }

  const Component = route.component;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-forest-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      }
    >
      <Component />
    </Suspense>
  );
};

export default {
  routes: publicRoutes,
  paths: PUBLIC_PATHS,
  getRoute: getPublicRoute,
  isValid: isValidPublicRoute,
  Router: PublicRouter,
};
