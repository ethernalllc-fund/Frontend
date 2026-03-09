export interface ContractAddresses {
  personalFundFactory: `0x${string}`
  usdc:                `0x${string}`
  treasury:            `0x${string}`
  protocolRegistry?:   `0x${string}`
  userPreferences?:    `0x${string}`
  dateTime?:           `0x${string}`
  mockDeFiProtocol?:   `0x${string}`
}

const OFFICIAL_USDC: Record<number, `0x${string}`> = {
  // Testnets
  421614:   '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia
  80002:    '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Polygon Amoy
  84532:    '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
  11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Optimism Sepolia
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Ethereum Sepolia
  // Mainnets
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',    // Arbitrum One
  137:   '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',    // Polygon
  8453:  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',    // Base
  10:    '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',    // Optimism
  1:     '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',    // Ethereum
}

const MOCK_USDC: Record<number, `0x${string}`> = {
  421614: '0x6e1371974D923397ecE9eE7525ac50ad7087c77f',  // Arbitrum Sepolia
  80002:  '0xDA7610fD028bA2958d1Bb3dcB43F2d5d2Fb2A29d',  // Polygon Amoy
}

export const ZERO_ADDRESS: `0x${string}` = '0x0000000000000000000000000000000000000000'

const getUSDCAddress = (chainId: number): `0x${string}` => {
  if (chainId === 421614) return MOCK_USDC[421614]!

  const mock = MOCK_USDC[chainId]
  if (mock) return mock

  const official = OFFICIAL_USDC[chainId]
  if (official) return official

  return ZERO_ADDRESS
}

export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // ✅ ARBITRUM SEPOLIA — DEPLOYED 2026-03-09
  421614: {
    personalFundFactory: '0x9105166f0c2Ba72411Ca96f2cDdEE80B49535719',
    usdc:                getUSDCAddress(421614),
    treasury:            '0x0793E6dE6d00C5e4797b27F178758885d3a5d5e6',
    protocolRegistry:    '0x12D247f33D415D495522f34BdDf931CcDF24cd06',
    userPreferences:     '0x79B2168B1914771B54FdfBD92655b908fFF65579',
    dateTime:            '0x0C97086FaA8A93E98cb77649179D8a2A2A3b1954',
    mockDeFiProtocol:    '0x6f250593DabDb4Eb44431AF35eBe9eb49cA08577',
  },

  // ✅ POLYGON AMOY — DEPLOYED 2026-03-08
  80002: {
    personalFundFactory: '0xf7b6b09F99d37dC1338c75EcC02aeA8b6E9686E5',
    usdc:                getUSDCAddress(80002),
    treasury:            '0xFf64f402aaF12f242ebd435656377e5fce30a9E9',
    protocolRegistry:    '0x52240E0A314f538632b9052fB1f3F21dC15E7911',
    userPreferences:     '0x9fa77C672781429f88aD4b8795AC6aa022732f20',
    dateTime:            '0x05c5B4914CF6840f0830feC6D0e1ef828624fB89',
  },

  // 🔴 BASE SEPOLIA — PENDING
  84532: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(84532),
    treasury:            ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
    dateTime:            ZERO_ADDRESS,
  },

  // 🔴 OPTIMISM SEPOLIA — PENDING
  11155420: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(11155420),
    treasury:            ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
    dateTime:            ZERO_ADDRESS,
  },

  // 🔴 ETHEREUM SEPOLIA — PENDING
  11155111: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(11155111),
    treasury:            ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
    dateTime:            ZERO_ADDRESS,
  },

  // 🔴 ARBITRUM ONE (MAINNET) — PENDING
  42161: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(42161),
    treasury:            ZERO_ADDRESS,
  },

  // 🔴 POLYGON (MAINNET) — PENDING
  137: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(137),
    treasury:            ZERO_ADDRESS,
  },

  // 🔴 BASE (MAINNET) — PENDING
  8453: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(8453),
    treasury:            ZERO_ADDRESS,
  },

  // 🔴 OPTIMISM (MAINNET) — PENDING
  10: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(10),
    treasury:            ZERO_ADDRESS,
  },

  // 🔴 ETHEREUM (MAINNET) — PENDING
  1: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(1),
    treasury:            ZERO_ADDRESS,
  },
}

const _arb = CONTRACT_ADDRESSES[421614] as ContractAddresses

export const TREASURY_ADDRESS          = _arb.treasury
export const FACTORY_ADDRESS           = _arb.personalFundFactory
export const USDC_ADDRESS              = _arb.usdc
// TOKEN_ADDRESS removido — no hay token nativo en v1 (IToken.vy es placeholder para v2)
// PERSONAL_FUND_ADDRESS removido — proxy template, el frontend resuelve clones via Factory
export const PROTOCOL_REGISTRY_ADDRESS = _arb.protocolRegistry!
export const USER_PREFERENCES_ADDRESS  = _arb.userPreferences!
export const DATETIME_ADDRESS          = _arb.dateTime!

export const MOCK_USDC_ADDRESS:     `0x${string}` = MOCK_USDC[421614]!
export const OFFICIAL_USDC_ADDRESS: `0x${string}` = OFFICIAL_USDC[421614]!

export const getCurrentUSDCType = (chainId: number): 'mock' | 'official' | 'unknown' => {
  const currentAddress = CONTRACT_ADDRESSES[chainId]?.usdc
  if (!currentAddress)                           return 'unknown'
  if (currentAddress === MOCK_USDC[chainId])     return 'mock'
  if (currentAddress === OFFICIAL_USDC[chainId]) return 'official'
  return 'unknown'
}

export const getOfficialUSDC  = (chainId: number): `0x${string}` | undefined => OFFICIAL_USDC[chainId]
export const getMockUSDC      = (chainId: number): `0x${string}` | undefined => MOCK_USDC[chainId]
export const hasUSDC          = (chainId: number): boolean => chainId in OFFICIAL_USDC || chainId in MOCK_USDC
export const hasMockUSDC      = (chainId: number): boolean => chainId in MOCK_USDC
export const hasChainConfig   = (chainId: number): boolean => chainId in CONTRACT_ADDRESSES
export const isTestnetChain   = (chainId: number): boolean =>
  [421614, 80002, 84532, 11155420, 11155111].includes(chainId)

export const getContractAddresses = (chainId: number): ContractAddresses | undefined =>
  CONTRACT_ADDRESSES[chainId]

export const getContractAddress = (
  chainId:  number,
  contract: keyof ContractAddresses,
): `0x${string}` | undefined =>
  CONTRACT_ADDRESSES[chainId]?.[contract]

export const getUSDCForChain = (chainId: number): `0x${string}` | undefined =>
  CONTRACT_ADDRESSES[chainId]?.usdc

export const isValidAddress = (address: string | undefined): address is `0x${string}` =>
  !!address && address !== ZERO_ADDRESS && /^0x[a-fA-F0-9]{40}$/.test(address)

export const isContractDeployed = (
  chainId:  number,
  contract: keyof ContractAddresses,
): boolean => isValidAddress(CONTRACT_ADDRESSES[chainId]?.[contract])

export const areMainContractsDeployed = (chainId: number): boolean => {
  const addresses = CONTRACT_ADDRESSES[chainId]
  if (!addresses) return false
  const main: (keyof ContractAddresses)[] = [
    'personalFundFactory', 'usdc', 'treasury',
  ]
  return main.every(c => isContractDeployed(chainId, c))
}

export const getDeployedContracts = (chainId: number): (keyof ContractAddresses)[] => {
  const addresses = CONTRACT_ADDRESSES[chainId]
  if (!addresses) return []
  return (Object.entries(addresses) as [keyof ContractAddresses, string][])
    .filter(([, address]) => isValidAddress(address))
    .map(([name]) => name)
}

export const getPendingContracts = (chainId: number): (keyof ContractAddresses)[] => {
  const addresses = CONTRACT_ADDRESSES[chainId]
  if (!addresses) return []
  return (Object.entries(addresses) as [keyof ContractAddresses, string][])
    .filter(([, address]) => !isValidAddress(address))
    .map(([name]) => name)
}

export const getDeploymentProgress = (chainId: number): number => {
  const addresses = CONTRACT_ADDRESSES[chainId]
  if (!addresses) return 0
  const total    = Object.keys(addresses).length
  const deployed = getDeployedContracts(chainId).length
  return Math.round((deployed / total) * 100)
}

export const getDeploymentSummary = () => {
  const chainNames: Record<number, string> = {
    421614: 'Arbitrum Sepolia', 80002: 'Polygon Amoy',   84532: 'Base Sepolia',
    11155420: 'Optimism Sepolia', 11155111: 'Ethereum Sepolia',
    42161: 'Arbitrum One', 137: 'Polygon', 8453: 'Base', 10: 'Optimism', 1: 'Ethereum',
  }

  return Object.fromEntries(
    Object.keys(CONTRACT_ADDRESSES).map(key => {
      const chainId  = parseInt(key)
      const deployed = getDeployedContracts(chainId)
      const pending  = getPendingContracts(chainId)
      return [chainId, {
        chainId,
        name:       chainNames[chainId] ?? 'Unknown',
        deployed:   deployed.length,
        pending:    pending.length,
        progress:   getDeploymentProgress(chainId),
        isComplete: areMainContractsDeployed(chainId),
      }]
    })
  )
}

export const getDeploymentStatus = (chainId: number) =>
  DEPLOYMENT_STATUS[chainId as keyof typeof DEPLOYMENT_STATUS] ?? {
    status:    'unknown' as const,
    date:      null,
    deployer:  null,
    verified:  false,
  }

export const CONTRACT_CATEGORIES = {
  core:     ['personalFundFactory', 'usdc', 'treasury'] as const,
  optional: ['protocolRegistry', 'userPreferences', 'dateTime', 'mockDeFiProtocol'] as const,
} as const

export const getCategoryContracts = (
  chainId:  number,
  category: keyof typeof CONTRACT_CATEGORIES,
): (keyof ContractAddresses)[] =>
  CONTRACT_CATEGORIES[category].filter(c => isContractDeployed(chainId, c))

export const getContractsByCategory = (chainId: number) => ({
  core:     getCategoryContracts(chainId, 'core'),
  optional: getCategoryContracts(chainId, 'optional'),
})

export const updateChainAddresses = (
  chainId:   number,
  addresses: Partial<ContractAddresses>,
): void => {
  if (import.meta.env.PROD) {
    console.error('❌ Cannot update addresses in production')
    return
  }
  const current = CONTRACT_ADDRESSES[chainId]
  if (!current) {
    console.error(`❌ Chain ${chainId} not configured`)
    return
  }
  ;(CONTRACT_ADDRESSES)[chainId] = {
    ...current,
    ...addresses,
  }
  console.log(`✅ Updated addresses for chain ${chainId}:`, addresses)
}

export const DEPLOYMENT_STATUS = {
  421614:   { status: 'deployed' as const, date: '2026-03-09', deployer: '0x5C7f635e60b36D415F7214B903b2057ce088ead5', verified: true  },
  80002:    { status: 'deployed' as const, date: '2026-03-08', deployer: '0x5C7f635e60b36D415F7214B903b2057ce088ead5', verified: true  },
  84532:    { status: 'pending'  as const, date: null,          deployer: null,                                           verified: false },
  11155420: { status: 'pending'  as const, date: null,          deployer: null,                                           verified: false },
  11155111: { status: 'pending'  as const, date: null,          deployer: null,                                           verified: false },
} as const

export type ContractName = keyof ContractAddresses
export type ChainId      = keyof typeof CONTRACT_ADDRESSES

if (import.meta.env.DEV) {
  const errors: string[] = []
  Object.entries(CONTRACT_ADDRESSES).forEach(([chainIdStr, addresses]) => {
    if (!addresses.usdc || addresses.usdc === ZERO_ADDRESS) {
      errors.push(`Chain ${chainIdStr}: Missing USDC address`)
    }
  })
  if (errors.length > 0) console.warn('⚠️ Address config warnings:', errors)

  const arb = CONTRACT_ADDRESSES[421614]
  if (arb) {
    console.log('🎯 USDC — Arbitrum Sepolia:', {
      mock:      MOCK_USDC[421614],
      official:  OFFICIAL_USDC[421614],
      using:     arb.usdc,
      type:      getCurrentUSDCType(421614),
    })
    if (arb.usdc !== MOCK_USDC[421614]) {
      console.error('❌ Not using MockUSDC! Check addresses.ts')
    } else {
      console.log('✅ Correctly using MockUSDC')
    }
  }
}