import { useReadContract } from 'wagmi';
import { PERSONAL_FUND_ABI } from '@/contracts/abis';

export interface FundInfo {
  principal:            bigint;
  monthlyDeposit:       bigint;
  retirementAge:        bigint;
  desiredMonthlyIncome: bigint;
  yearsPayments:        bigint;
  retirementStarted:    boolean;
}

export interface TimelockInfo {
  timelockEnd:   bigint;
  remainingTime: bigint;
  isUnlocked:    boolean;
}

export interface DepositStats {
  monthlyDepositCount: bigint;
  totalNetToFund:      bigint;
  totalFeesPaid:       bigint;
}

export interface PersonalFundState {
  balance:      bigint | undefined;
  fundInfo:     FundInfo | undefined;
  timelockInfo: TimelockInfo | undefined;
  depositStats: DepositStats | undefined;
  isLoading:    boolean;
  refetch:      () => void;
}

export function usePersonalFund(fundAddress: `0x${string}` | undefined): PersonalFundState {
  const enabled = Boolean(fundAddress);
  const base    = { address: fundAddress!, abi: PERSONAL_FUND_ABI } as const;

  const { data: balanceData, isLoading: l1, refetch } = useReadContract({
    ...base,
    functionName: 'getContractBalance',
    query: { enabled, refetchInterval: 15_000, staleTime: 10_000 },
  });

  const { data: fundInfoData, isLoading: l2 } = useReadContract({
    ...base,
    functionName: 'getFundInfo',
    query: { enabled, refetchInterval: 30_000, staleTime: 20_000 },
  });

  const { data: timelockData, isLoading: l3 } = useReadContract({
    ...base,
    functionName: 'getTimelockInfo',
    query: { enabled, refetchInterval: 30_000, staleTime: 20_000 },
  });

  const { data: depositData, isLoading: l4 } = useReadContract({
    ...base,
    functionName: 'getDepositStats',
    query: { enabled, refetchInterval: 30_000, staleTime: 20_000 },
  });

  return {
    balance:      balanceData,
    fundInfo:     fundInfoData as FundInfo | undefined,
    timelockInfo: timelockData as TimelockInfo | undefined,
    depositStats: depositData  as DepositStats | undefined,
    isLoading:    l1 || l2 || l3 || l4,
    refetch,
  };
}