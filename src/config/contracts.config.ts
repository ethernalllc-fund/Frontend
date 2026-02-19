export const MOCK_USDC_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "mint",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" },
    ],
    name: "mintTo",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getMintLimit",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const USDC_DECIMALS = 6;
export const MINT_AMOUNT = 1000;
export const MAX_MINT_PER_TX = 10000;

export const toUSDCUnits = (amount: number): bigint => {
  return BigInt(Math.floor(amount * 10 ** USDC_DECIMALS));
};
export const fromUSDCUnits = (amount: bigint): number => {
  return Number(amount) / 10 ** USDC_DECIMALS;
};
export const formatUSDC = (amount: bigint | number, decimals: number = 2): string => {
  const value = typeof amount === 'bigint' ? fromUSDCUnits(amount) : amount;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
export const isValidMintAmount = (amount: number): boolean => {
  return amount > 0 && amount <= MAX_MINT_PER_TX;
};

export const MINT_PRESETS = {
  small: 100, 
  medium: 1000,
  large: 5000,
  max: 10000,
} as const;

export type MintPreset = keyof typeof MINT_PRESETS;