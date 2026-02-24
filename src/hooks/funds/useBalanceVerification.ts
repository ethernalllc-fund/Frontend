import { useAccount, useBalance, useReadContract, useChainId } from 'wagmi';
import { useState, useEffect } from 'react';
import { erc20Abi } from 'viem';
import { useUSDCAddress } from '@/hooks/usdc/usdcUtils';
import { getContractAddresses } from '@/config/addresses';
import type { RetirementPlan } from '@/types/retirement_types';
import { requiredApprovalAmount } from '@/types/retirement_types';

const REQUIRED_GAS = 5_000_000_000_000_000n; // 0.005 ether in wei

export interface BalanceVerification {
  usdcBalance:        bigint;
  gasBalance:         bigint;
  allowance:          bigint;
  requiredUSDC:       bigint;
  requiredGas:        bigint;
  hasEnoughUSDC:      boolean;
  hasEnoughGas:       boolean;
  hasEnoughAllowance: boolean;
  isLoading:          boolean;
}

export function useBalanceVerification(plan: RetirementPlan): BalanceVerification {
  const { address } = useAccount();
  const chainId     = useChainId();
  const usdcAddress = useUSDCAddress();
  const factoryAddress = getContractAddresses(chainId)?.personalFundFactory;

  // Total que debe salir de la wallet: depósito + fee — fuente única de verdad
  const requiredUSDC = requiredApprovalAmount(plan);

  const {
    data:      usdcBalanceRaw,
    isLoading: loadingUSDC,
  } = useReadContract({
    address:      usdcAddress,
    abi:          erc20Abi,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    query: {
      enabled:         Boolean(address && usdcAddress),
      refetchInterval: 15_000,
      staleTime:       10_000,
    },
  });

  const {
    data:      allowanceRaw,
    isLoading: loadingAllowance,
  } = useReadContract({
    address:      usdcAddress,
    abi:          erc20Abi,
    functionName: 'allowance',
    args:         address && factoryAddress ? [address, factoryAddress] : undefined,
    query: {
      enabled:         Boolean(address && usdcAddress && factoryAddress),
      refetchInterval: 5_000,   // refetch más frecuente para el allowance
      staleTime:       0,       // nunca usar cache — siempre leer on-chain
    },
  });

  const {
    data:      gasData,
    isLoading: loadingGas,
  } = useBalance({
    address,
    query: {
      enabled:         Boolean(address),
      refetchInterval: 15_000,
    },
  });

  const usdcBalance = (usdcBalanceRaw as bigint | undefined) ?? 0n;
  const allowance   = (allowanceRaw   as bigint | undefined) ?? 0n;
  const gasBalance  = gasData?.value ?? 0n;

  const [timedOut, setTimedOut] = useState(false);
  const rawLoading = loadingUSDC || loadingAllowance || loadingGas;
  useEffect(() => {
    if (!rawLoading) { setTimedOut(false); return; }
    const t = setTimeout(() => setTimedOut(true), 8_000);
    return () => clearTimeout(t);
  }, [rawLoading]);
  const isLoading = rawLoading && !timedOut;

  return {
    usdcBalance,
    gasBalance,
    allowance,
    requiredUSDC,
    requiredGas:        REQUIRED_GAS,
    hasEnoughUSDC:      usdcBalance >= requiredUSDC,
    hasEnoughGas:       gasBalance  >= REQUIRED_GAS,
    hasEnoughAllowance: allowance   >= requiredUSDC,
    isLoading,
  };
}