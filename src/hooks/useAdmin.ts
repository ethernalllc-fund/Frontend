import { useEffect, useState, useCallback, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  checkAdmin: () => boolean;
}

export const useAdmin = (): UseAdminResult => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const VALID_ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN as string | undefined;
  const checkAdmin = useCallback((): boolean => {
    if (!VALID_ADMIN_TOKEN) {
      console.error('VITE_ADMIN_TOKEN is not defined in .env');
      return false;
    }

    const storedToken = localStorage.getItem('admin_token');
    const valid = storedToken === VALID_ADMIN_TOKEN;

    startTransition(() => {
      setIsAdmin(valid);
    });
    return valid;
  }, [VALID_ADMIN_TOKEN]);

  const login = useCallback((token: string) => {
    if (token === VALID_ADMIN_TOKEN) {
      localStorage.setItem('admin_token', token);
      setIsAdmin(true);
      console.log('Admin login successful');
    } else {
      console.warn('Login attempt with invalid token');
    }
  }, [VALID_ADMIN_TOKEN]);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setIsAdmin(false);
    void navigate('/admin/login');
    console.log('Admin logout');
  }, [navigate]);

  useEffect(() => {
    checkAdmin();
    startTransition(() => {
      setIsLoading(false);
    });
  }, [checkAdmin]);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/admin') && currentPath !== '/admin/login') {
        console.warn('Access denied to admin route');
        void navigate('/admin/login', { replace: true });
      }
    }
  }, [isAdmin, isLoading, navigate]);

  return {
    isAdmin,
    isLoading,
    login,
    logout,
    checkAdmin,
  };
};
