export const formatCurrency = (
  value: number | bigint | string,
  options?: {
    decimals?: number;
    locale?: string;
  }
): string => {
  try {
    const { decimals = 0, locale = 'en-US' } = options || {};
    let num: number;
    if (typeof value === 'bigint') {
      num = Number(value);
    } else if (typeof value === 'string') {
      num = parseFloat(value);
    } else {
      num = value;
    }

    if (isNaN(num) || !isFinite(num)) {
      return '$0';
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '$0';
  }
};

export const formatUSDC = (amount: bigint | number | string): string => {
  try {
    let value: number;
    if (typeof amount === 'bigint') {
      value = Number(amount) / 1_000_000;
    } else if (typeof amount === 'string') {
      value = parseFloat(amount) / 1_000_000;
    } else {
      value = amount / 1_000_000;
    }
    if (isNaN(value)) return '$0.00';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    console.error('Error formatting USDC:', error);
    return '$0.00';
  }
};

export const formatNumber = (
  value: number | bigint | string,
  options?: {
    decimals?: number;
    locale?: string;
  }
): string => {
  try {
    const { decimals = 0, locale = 'en-US' } = options || {};
    let num: number;
    if (typeof value === 'bigint') {
      num = Number(value);
    } else if (typeof value === 'string') {
      num = parseFloat(value);
    } else {
      num = value;
    }
    if (isNaN(num) || !isFinite(num)) {
      return '0';
    }

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch (error) {
    console.error('Error formatting number:', error);
    return '0';
  }
};

export const formatPercentage = (
  value: number | bigint | string,
  decimals: number = 2
): string => {
  try {
    let num: number;
    if (typeof value === 'bigint') {
      num = Number(value);
    } else if (typeof value === 'string') {
      num = parseFloat(value);
    } else {
      num = value;
    }
    if (isNaN(num)) return '0%';

    return `${num.toFixed(decimals)}%`;
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return '0%';
  }
};

export const formatTimestamp = (
  timestamp: bigint | number | string,
  options?: {
    locale?: string;
    includeTime?: boolean;
    format?: 'short' | 'long' | 'full';
  }
): string => {
  try {
    const { 
      locale = 'en-US', 
      includeTime = true,
      format = 'long'
    } = options || {};
    let ts: number;
    if (typeof timestamp === 'bigint') {
      ts = Number(timestamp);
    } else if (typeof timestamp === 'string') {
      ts = parseInt(timestamp);
    } else {
      ts = timestamp;
    }
    if (isNaN(ts) || ts === 0) {
      return 'Never';
    }
    const date = new Date(ts < 10000000000 ? ts * 1000 : ts);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    const dateOptions: Intl.DateTimeFormatOptions = format === 'short' 
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : format === 'full'
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'long', year: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };
    const formattedDate = date.toLocaleDateString(locale, dateOptions);
    if (!includeTime) {
      return formattedDate;
    }
    const formattedTime = date.toLocaleTimeString(locale, timeOptions);
    return `${formattedDate} - ${formattedTime}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Error';
  }
};

export const formatAddress = (
  address: string | undefined,
  startChars: number = 6,
  endChars: number = 4
): string => {
  if (!address || typeof address !== 'string') {
    return '0x0...0';
  }

  const trimmedAddress = address.trim();
  if (trimmedAddress.length === 0) {
    return '0x0...0';
  }

  // Validar que los parámetros sean válidos
  const safeStartChars = Math.max(0, Math.floor(startChars));
  const safeEndChars = Math.max(0, Math.floor(endChars));

  try {
    if (trimmedAddress.length < safeStartChars + safeEndChars) {
      return trimmedAddress;
    }
    return `${trimmedAddress.slice(0, safeStartChars)}...${trimmedAddress.slice(-safeEndChars)}`;
  } catch (error) {
    console.error('Error formatting address:', error);
    return '0x0...0';
  }
};

export const parseUSDC = (value: string | number): bigint => {
  try {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num < 0) {
      return BigInt(0);
    }
    return BigInt(Math.round(num * 1_000_000));
  } catch (error) {
    console.error('Error parsing USDC:', error);
    return BigInt(0);
  }
};

export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const formatYears = (years: number): string => {
  if (years === 1) return '1 year';
  return `${years} years`;
};

export const formatToken = (
  amount: bigint | undefined,
  decimals: number = 18,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string => {
  if (amount === undefined || amount === null) return '0';
  try {
    const value = Number(amount) / 10 ** decimals;

    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: options?.minimumFractionDigits ?? 2,
      maximumFractionDigits: options?.maximumFractionDigits ?? 6,
    }).format(value);
  } catch (error) {
    console.error('Error formatting token:', error);
    return '0';
  }
};

export const formatTokenWithSymbol = (
  amount: bigint | undefined,
  symbol: string,
  decimals: number = 18
): string => {
  const formatted = formatToken(amount, decimals);
  return `${formatted} ${symbol}`;
};

export const formatRelativeTime = (
  timestamp: bigint | number | undefined
): string => {
  if (timestamp === undefined || timestamp === null) return '';
  try {
    const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
    const date = new Date(ts < 10000000000 ? ts * 1000 : ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const isPast = diffMs > 0;
    const absDiffMs = Math.abs(diffMs);
    const seconds = Math.floor(absDiffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (years > 0) {
      const yearStr = years === 1 ? 'year' : 'years';
      return isPast ? `${years} ${yearStr} ago` : `in ${years} ${yearStr}`;
    }
    if (months > 0) {
      const monthStr = months === 1 ? 'month' : 'months';
      return isPast ? `${months} ${monthStr} ago` : `in ${months} ${monthStr}`;
    }
    if (days > 0) {
      const dayStr = days === 1 ? 'day' : 'days';
      return isPast ? `${days} ${dayStr} ago` : `in ${days} ${dayStr}`;
    }
    if (hours > 0) {
      const hourStr = hours === 1 ? 'hour' : 'hours';
      return isPast ? `${hours} ${hourStr} ago` : `in ${hours} ${hourStr}`;
    }
    if (minutes > 0) {
      const minStr = minutes === 1 ? 'minute' : 'minutes';
      return isPast ? `${minutes} ${minStr} ago` : `in ${minutes} ${minStr}`;
    }
    
    return isPast ? 'Just now' : 'In a moment';
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
};

export const formatDuration = (
  seconds: bigint | number | undefined
): string => {
  if (seconds === undefined || seconds === null) return '0s';
  try {
    const sec = typeof seconds === 'bigint' ? Number(seconds) : seconds;
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 && days === 0) parts.push(`${secs}s`);

    return parts.length > 0 ? parts.join(' ') : '0s';
  } catch (error) {
    console.error('Error formatting duration:', error);
    return '0s';
  }
};

export const formatCompact = (
  value: bigint | number | undefined
): string => {
  if (value === undefined || value === null) return '0';
  try {
    const numValue = typeof value === 'bigint' ? Number(value) : value;

    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(numValue);
  } catch (error) {
    console.error('Error formatting compact:', error);
    return '0';
  }
};

export const formatHash = (
  hash: string | undefined,
  startChars: number = 8,
  endChars: number = 6
): string => {
  // Validación explícita y early return
  if (!hash || typeof hash !== 'string') {
    return '';
  }

  // Sanitizar entrada
  const trimmedHash = hash.trim();
  if (trimmedHash.length === 0) {
    return '';
  }

  // Validar que los parámetros sean válidos
  const safeStartChars = Math.max(0, Math.floor(startChars));
  const safeEndChars = Math.max(0, Math.floor(endChars));

  try {
    // En este punto TypeScript sabe que trimmedHash es string
    if (trimmedHash.length < safeStartChars + safeEndChars) {
      return trimmedHash;
    }

    return `${trimmedHash.slice(0, safeStartChars)}...${trimmedHash.slice(-safeEndChars)}`;
  } catch (error) {
    console.error('Error formatting hash:', error);
    return '';
  }
};

export const parseToken = (amount: string, decimals: number = 18): bigint => {
  try {
    const cleaned = amount.replace(/,/g, '');
    const value = parseFloat(cleaned);
    if (isNaN(value) || value < 0) {
      return BigInt(0);
    }

    return BigInt(Math.floor(value * 10 ** decimals));
  } catch (error) {
    console.error('Error parsing token:', error);
    return BigInt(0);
  }
};

export const bigIntToNumber = (value: bigint): number => {
  const num = Number(value);
  if (num === Infinity || num === -Infinity) {
    throw new Error('BigInt value is too large to convert to number');
  }
  return num;
};

export const isSafeBigInt = (value: bigint): boolean => {
  const num = Number(value);
  return num !== Infinity && num !== -Infinity;
};

export const formatters = {
  currency: formatCurrency,
  usdc: formatUSDC,
  number: formatNumber,
  percentage: formatPercentage,
  timestamp: formatTimestamp,
  address: formatAddress,
  years: formatYears,
  token: formatToken,
  tokenWithSymbol: formatTokenWithSymbol,
  relativeTime: formatRelativeTime,
  duration: formatDuration,
  compact: formatCompact,
  hash: formatHash,
  parseUSDC,
  parseToken,
  bigIntToNumber,
  isSafeBigInt,
  isValidAddress,
};

export default formatters;