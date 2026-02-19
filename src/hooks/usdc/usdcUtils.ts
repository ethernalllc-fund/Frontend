import { formatUnits, parseUnits } from 'viem';
import { useChainId }               from 'wagmi';
import { getContractAddress }       from '@/config/addresses';
import { env }                      from '@/lib/env';

export const USDC_DECIMALS = 6 as const;
export const USDC_MIN_AMOUNT: bigint = parseUnits('0.01', USDC_DECIMALS);
export const USDC_MAX_AMOUNT: bigint = parseUnits('1000000000', USDC_DECIMALS);
export const USDC_PRESETS = {
  tiny:   parseUnits('10',     USDC_DECIMALS),
  small:  parseUnits('100',    USDC_DECIMALS),
  medium: parseUnits('1000',   USDC_DECIMALS),
  large:  parseUnits('10000',  USDC_DECIMALS),
  huge:   parseUnits('100000', USDC_DECIMALS),
} as const;

export type USDCPreset = keyof typeof USDC_PRESETS;
export function getUSDCAddress(chainId: number): `0x${string}` | undefined {
  return getContractAddress(chainId, 'usdc');
}

export function useUSDCAddress(): `0x${string}` | undefined {
  const chainId = useChainId();
  return getUSDCAddress(chainId);
}

export function getFaucetAddress(chainId: number): `0x${string}` | undefined {
  const MAINNET_CHAIN_IDS = new Set([1, 137, 42161, 8453, 10]);
  if (MAINNET_CHAIN_IDS.has(chainId)) return undefined;
  const addr = env.contracts.usdc; // Reutiliza el mismo contrato mock en testnets
  return addr ? (addr as `0x${string}`) : undefined;
}

export function useFaucetAddress(): `0x${string}` | undefined {
  const chainId = useChainId();
  return getFaucetAddress(chainId);
}

export function formatUSDC(amount: bigint | undefined | null): string {
  if (!amount && amount !== 0n) return '0.00';
  if (amount === 0n) return '0.00';
  return parseFloat(formatUnits(amount, USDC_DECIMALS)).toFixed(2);
}

export function formatUSDCWithSymbol(amount: bigint | undefined | null): string {
  if (!amount && amount !== 0n) return '$0.00 USDC';
  const value = parseFloat(formatUnits(amount, USDC_DECIMALS));
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDC`;
}

export function formatUSDCDisplay(amount: bigint | undefined | null): string {
  if (!amount && amount !== 0n) return '0';
  if (amount === 0n) return '0';
  const value = parseFloat(formatUnits(amount, USDC_DECIMALS));
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
}

export function parseUSDC(amount: string | number): bigint {
  const str = typeof amount === 'number' ? amount.toString() : amount.trim();
  if (!str || str === '') {
    throw new Error('[parseUSDC] Cannot parse empty amount');
  }
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) {
    throw new Error(`[parseUSDC] Invalid amount: "${str}"`);
  }
  return parseUnits(str, USDC_DECIMALS);
}

export function usdcToNumber(amount: bigint): number {
  return parseFloat(formatUnits(amount, USDC_DECIMALS));
}

export function isValidUSDCAmount(amount: string): boolean {
  if (!amount || amount.trim() === '') return false;

  const trimmed = amount.trim();
  const num = parseFloat(trimmed);
  if (isNaN(num) || num <= 0) return false;

  const parts = trimmed.split('.');
  if (parts.length > 2) return false;
  if (parts.length === 2 && parts[1] && parts[1].length > USDC_DECIMALS) return false;

  return true;
}

export function needsApproval(
  currentAllowance: bigint | undefined,
  requiredAmount: bigint,
): boolean {
  if (currentAllowance === undefined) return true;
  return currentAllowance < requiredAmount;
}

export function hasEnoughBalance(
  balance: bigint | undefined,
  required: bigint,
): boolean {
  if (balance === undefined) return false;
  return balance >= required;
}

export function compareUSDC(a: bigint, b: bigint): -1 | 0 | 1 {
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

export const minUSDC      = (a: bigint, b: bigint): bigint => (a < b ? a : b);
export const maxUSDC      = (a: bigint, b: bigint): bigint => (a > b ? a : b);
export const addUSDC      = (a: bigint, b: bigint): bigint => a + b;
export const subtractUSDC = (a: bigint, b: bigint): bigint => a - b;
export function multiplyUSDC(amount: bigint, multiplier: number): bigint {
  const factor = Math.round(multiplier * 10_000);
  return (amount * BigInt(factor)) / BigInt(10_000);
}

export function percentageOfUSDC(amount: bigint, percentage: number): bigint {
  const factor = Math.round(percentage * 100);
  return (amount * BigInt(factor)) / BigInt(10_000);
}

export function isUSDCAddress(address: string, chainId: number): boolean {
  const usdcAddr = getUSDCAddress(chainId);
  if (!usdcAddr) return false;
  return address.toLowerCase() === usdcAddr.toLowerCase();
}

export function isFaucetAddress(address: string, chainId: number): boolean {
  const faucetAddr = getFaucetAddress(chainId);
  if (!faucetAddr) return false;
  return address.toLowerCase() === faucetAddr.toLowerCase();
}