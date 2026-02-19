import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { useWallet } from './useWallet';

interface UseTokenBalanceParams {
  tokenAddress?: `0x${string}`;
  tokenAbi: any;
  decimals?: number;
  enabled?: boolean;
}

interface UseTokenBalanceReturn {
  balance: string;
  balanceRaw: bigint;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTokenBalance = ({
  tokenAddress,
  tokenAbi,
  decimals = 6,
  enabled = true,
}: UseTokenBalanceParams): UseTokenBalanceReturn => {
  const { address, isConnected } = useWallet();
  const publicClient = usePublicClient();
  const [balance, setBalance] = useState<string>('0');
  const [balanceRaw, setBalanceRaw] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchBalance = useCallback(async () => {
    if (!enabled || !isConnected || !address || !tokenAddress || !publicClient || !decimals || !tokenAbi) {
      setBalance('0');
      setBalanceRaw(0n);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await publicClient.readContract({
        address: tokenAddress,
        abi: tokenAbi,
        functionName: 'balanceOf',
        args: [address],
      }) as bigint;

      setBalanceRaw(result);

      const balanceInTokens = Number(result) / Math.pow(10, decimals);
      setBalance(balanceInTokens.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }));
    } catch (err: any) {
      console.error('Error fetching token balance:', err);
      setError(err.message || 'Failed to fetch balance');
      setBalance('0');
      setBalanceRaw(0n);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isConnected, address, tokenAddress, publicClient, decimals, tokenAbi]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]); 

  return {
    balance,
    balanceRaw,
    isLoading,
    error,
    refetch: fetchBalance,
  };
};