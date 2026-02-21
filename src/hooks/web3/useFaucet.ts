import { useState, useCallback } from 'react';
import type { FaucetRequest, FaucetResponse } from '@/services/faucet/faucet-client';
import { FaucetAPIClient } from '@/services/faucet/faucet-client';

export function useFaucet(backendUrl?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const client                = new FaucetAPIClient(backendUrl);
  const requestTokens = useCallback(async (data: FaucetRequest): Promise<FaucetResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.requestTokens(data);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    requestTokens,
    loading,
    error,
    clearError,
  };
}