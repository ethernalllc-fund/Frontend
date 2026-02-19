import { useAccount, useBalance, useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { useUSDCAddress } from '@/hooks/usdc/usdcUtils';
import { PERSONAL_FUND_FACTORY_ADDRESS } from '@/contracts/addresses';
import type { RetirementPlan } from '@/types/retirement_types';
import { initialDepositAmount, calcFee } from '@/types/retirement_types';

/** Minimum ETH/native gas required (0.005 ETH ~= enough for 2 tx on Arbitrum) */
const REQUIRED_GAS = 5_000_000_000_000_000n; // 0.005 ether in wei

export interface BalanceVerification {
  /** USDC balance of the connected wallet */
  usdcBalance:        bigint;
  /** Native gas balance */
  gasBalance:         bigint;
  /** Current USDC allowance granted to the factory */
  allowance:          bigint;
  /** Total USDC needed (deposit + fee) */
  requiredUSDC:       bigint;
  /** Minimum native gas needed */
  requiredGas:        bigint;
  /** True when usdcBalance >= requiredUSDC */
  hasEnoughUSDC:      boolean;
  /** True when gasBalance >= requiredGas */
  hasEnoughGas:       boolean;
  /** True when allowance >= requiredUSDC */
  hasEnoughAllowance: boolean;
  /** True while any query is still loading */
  isLoading:          boolean;
}

export function useBalanceVerification(plan: RetirementPlan): BalanceVerification {
  const { address } = useAccount();
  const usdcAddress = useUSDCAddress();

  // Required USDC: principal + first month deposit + protocol fee
  const depositWei   = initialDepositAmount(plan);   // bigint
  const feeWei       = calcFee(depositWei);           // bigint
  const requiredUSDC = depositWei + feeWei;

  // ── USDC balance ────────────────────────────────────────────────────────────
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

  // ── USDC allowance to factory ───────────────────────────────────────────────
  const {
    data:      allowanceRaw,
    isLoading: loadingAllowance,
  } = useReadContract({
    address:      usdcAddress,
    abi:          erc20Abi,
    functionName: 'allowance',
    args:         address ? [address, PERSONAL_FUND_FACTORY_ADDRESS] : undefined,
    query: {
      enabled:         Boolean(address && usdcAddress),
      refetchInterval: 15_000,
      staleTime:       10_000,
    },
  });

  // ── Native gas balance ──────────────────────────────────────────────────────
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
  const isLoading   = loadingUSDC || loadingAllowance || loadingGas;

  return {
    usdcBalance,
    gasBalance,
    allowance,
    requiredUSDC,
    requiredGas:        REQUIRED_GAS,
    hasEnoughUSDC:      usdcBalance  >= requiredUSDC,
    hasEnoughGas:       gasBalance   >= REQUIRED_GAS,
    hasEnoughAllowance: allowance    >= requiredUSDC,
    isLoading,
  };
}