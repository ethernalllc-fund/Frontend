export interface ContractAddresses {
  personalFundFactory: `0x${string}`
  usdc:                `0x${string}`
  treasury:            `0x${string}`
  governance:          `0x${string}`
  token:               `0x${string}`
  protocolRegistry?:   `0x${string}`
  userPreferences?:    `0x${string}`
  dateTime?:           `0x${string}`
  personalFund?:       `0x${string}`
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
  421614: '0x6e1371974D923397ecE9eE7525ac50ad7087c77f',
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
  // ARBITRUM SEPOLIA — DEPLOYED
  421614: {
    personalFundFactory: '0x8101f50Abef13511eAbA87469A51B5106A54CA92',
    usdc:                getUSDCAddress(421614), // sin cambios
    treasury:            '0x045F8Ff2387813778DBc9ce93677669891a92909',
    governance:          '0x28E37450297593B621eecD1Ad069D2748354184E',
    token:               '0x853B2e3D6e26183DDDedA90A45Ff3C639873899c',
    protocolRegistry:    '0xb215948f03959F61d0ca918f02F1d0789Af8a0BC',
    userPreferences:     '0x1ed2B6bD2124D322c42985a072DB6751634DDCFF',
    dateTime:            '0xeb91ef08F65b6BFE4753db429e8d82A28a1970c5',
    personalFund:        '0x078d0457165c85bf566FB4E8511F1CFa64674f92',
  },

  // 🟡 POLYGON AMOY — READY TO DEPLOY
  80002: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(80002),
    treasury:            ZERO_ADDRESS,
    governance:          ZERO_ADDRESS,
    token:               ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
    dateTime:            ZERO_ADDRESS,
    personalFund:        ZERO_ADDRESS,
  },

  // 🔴 BASE SEPOLIA — PENDING
  84532: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(84532),
    treasury:            ZERO_ADDRESS,
    governance:          ZERO_ADDRESS,
    token:               ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
    dateTime:            ZERO_ADDRESS,
    personalFund:        ZERO_ADDRESS,
  },

  // 🔴 OPTIMISM SEPOLIA — PENDING
  11155420: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(11155420),
    treasury:            ZERO_ADDRESS,
    governance:          ZERO_ADDRESS,
    token:               ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
    dateTime:            ZERO_ADDRESS,
    personalFund:        ZERO_ADDRESS,
  },

  // 🔴 ETHEREUM SEPOLIA — PENDING
  11155111: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(11155111),
    treasury:            ZERO_ADDRESS,
    governance:          ZERO_ADDRESS,
    token:               ZERO_ADDRESS,
    protocolRegistry:    ZERO_ADDRESS,
    userPreferences:     ZERO_ADDRESS,
    dateTime:            ZERO_ADDRESS,
    personalFund:        ZERO_ADDRESS,
  },

  // 🔴 ARBITRUM ONE (MAINNET) — PENDING
  42161: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(42161),
    treasury:            ZERO_ADDRESS,
    governance:          ZERO_ADDRESS,
    token:               ZERO_ADDRESS,
  },

  // 🔴 POLYGON (MAINNET) — PENDING
  137: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(137),
    treasury:            ZERO_ADDRESS,
    governance:          ZERO_ADDRESS,
    token:               ZERO_ADDRESS,
  },

  // 🔴 BASE (MAINNET) — PENDING
  8453: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(8453),
    treasury:            ZERO_ADDRESS,
    governance:          ZERO_ADDRESS,
    token:               ZERO_ADDRESS,
  },

  // 🔴 OPTIMISM (MAINNET) — PENDING
  10: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(10),
    treasury:            ZERO_ADDRESS,
    governance:          ZERO_ADDRESS,
    token:               ZERO_ADDRESS,
  },

  // 🔴 ETHEREUM (MAINNET) — PENDING
  1: {
    personalFundFactory: ZERO_ADDRESS,
    usdc:                getUSDCAddress(1),
    treasury:            ZERO_ADDRESS,
    governance:          ZERO_ADDRESS,
    token:               ZERO_ADDRESS,
  },
}

const _arb = CONTRACT_ADDRESSES[421614] as ContractAddresses

export const TREASURY_ADDRESS          = _arb.treasury
export const FACTORY_ADDRESS           = _arb.personalFundFactory
export const USDC_ADDRESS              = _arb.usdc
export const GOVERNANCE_ADDRESS        = _arb.governance
export const TOKEN_ADDRESS             = _arb.token
export const PROTOCOL_REGISTRY_ADDRESS = _arb.protocolRegistry!
export const USER_PREFERENCES_ADDRESS  = _arb.userPreferences!
export const DATETIME_ADDRESS          = _arb.dateTime!
export const PERSONAL_FUND_ADDRESS     = _arb.personalFund!

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
    'personalFundFactory', 'usdc', 'treasury', 'governance', 'token',
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
  core:     ['personalFundFactory', 'usdc', 'treasury', 'governance', 'token'] as const,
  optional: ['protocolRegistry', 'userPreferences', 'dateTime'] as const,
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
  421614:   { status: 'deployed' as const, date: '2024-12-14', deployer: '0x2c81Af5Ca0663Ef8aa73b498c0E5BeC54EB24C15', verified: true  },
  80002:    { status: 'pending'  as const, date: null,          deployer: null,                                           verified: false },
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