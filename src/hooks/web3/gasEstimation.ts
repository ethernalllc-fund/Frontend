import { usePublicClient } from 'wagmi'
import { formatGwei, formatEther, parseGwei, type Address, type Abi } from 'viem'
import type { PublicClient } from 'viem'

export interface GasEstimate {
  gasLimit: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  estimatedCost: bigint
  formatted: {
    gasLimit: string
    maxFeePerGas: string
    maxPriorityFeePerGas: string
    estimatedCost: string
  }
}

export interface GasEstimationOptions {
  gasLimitBuffer?: number
  maxFeeBuffer?: number
  forceLegacy?: boolean
  gasLimit?: bigint
}

interface ContractGasParams {
  address: Address
  abi: Abi
  functionName: string
  args?: unknown[]
  value?: bigint
  account?: Address
}

const DEFAULT_GAS_LIMIT_BUFFER = 40
const DEFAULT_MAX_FEE_BUFFER = 40
const MIN_PRIORITY_FEE = parseGwei('0.003')
const CHAIN_CONFIGS = {
  421614: { // Arbitrum Sepolia
    isArbitrum: true,
    defaultGasLimit: 50_000_000n,
    minMaxFee: parseGwei('0.1'),
    maxMaxFee: parseGwei('2'),      // cap: 2 gwei máximo en testnet
  },
  42161: { // Arbitrum One
    isArbitrum: true,
    defaultGasLimit: 50_000_000n,
    minMaxFee: parseGwei('0.3'),
    maxMaxFee: parseGwei('10'),
  },
  80002: { // Polygon Amoy
    isArbitrum: false,
    defaultGasLimit: 900_000n,
    minMaxFee: parseGwei('50'),
    maxMaxFee: parseGwei('500'),
  },
  137: { // Polygon
    isArbitrum: false,
    defaultGasLimit: 900_000n,
    minMaxFee: parseGwei('50'),
    maxMaxFee: parseGwei('500'),
  },
  1: { // Ethereum
    isArbitrum: false,
    defaultGasLimit: 500_000n,
    minMaxFee: parseGwei('35'),
    maxMaxFee: parseGwei('300'),
  },
  11155111: { // Sepolia
    isArbitrum: false,
    defaultGasLimit: 30_000_000n,
    minMaxFee: parseGwei('7'),
    maxMaxFee: parseGwei('50'),
  },
} as const

export function useGasEstimation() {
  const publicClient = usePublicClient()

  const estimateGas = async (
    params: ContractGasParams,
    options: GasEstimationOptions = {}
  ): Promise<GasEstimate> => {
    if (!publicClient) {
      throw new Error('Public client not available')
    }

    const {
      gasLimitBuffer = DEFAULT_GAS_LIMIT_BUFFER,
      maxFeeBuffer = DEFAULT_MAX_FEE_BUFFER,
      forceLegacy = false,
    } = options

    const chainId = publicClient.chain?.id ?? 421614
    const config = CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS] ?? CHAIN_CONFIGS[421614]

    try {
      let gasLimit: bigint
      if (options.gasLimit) {
        gasLimit = options.gasLimit
      } else {
        try {
          const estimated = await publicClient.estimateContractGas(params)
          gasLimit = (estimated * BigInt(100 + gasLimitBuffer)) / 100n
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('Gas estimation failed, using default:', error)
          }
          gasLimit = config.defaultGasLimit
        }
      }

      const block = await publicClient.getBlock()
      const baseFeePerGas = block.baseFeePerGas ?? 0n

      let maxFeePerGas: bigint
      let maxPriorityFeePerGas: bigint

      if (forceLegacy || !baseFeePerGas) {
        const gasPrice = await publicClient.getGasPrice()
        maxFeePerGas = (gasPrice * BigInt(100 + maxFeeBuffer)) / 100n
        maxPriorityFeePerGas = 0n
      } else {
        if (config.isArbitrum) {
          const gasPrice = await publicClient.getGasPrice()
          maxFeePerGas = (gasPrice * BigInt(100 + maxFeeBuffer)) / 100n
          maxPriorityFeePerGas = gasPrice / 10n
        } else {
          let suggestedPriorityFee = MIN_PRIORITY_FEE

          try {
            const feeHistory = await publicClient.getFeeHistory({
              blockCount: 4,
              rewardPercentiles: [50],
            })

            if (feeHistory.reward && feeHistory.reward.length > 0) {
              const rewards = feeHistory.reward.map(r => r[0] ?? 0n)
              const avgReward = rewards.reduce((a, b) => a + b, 0n) / BigInt(rewards.length)
              suggestedPriorityFee = avgReward > MIN_PRIORITY_FEE ? avgReward : MIN_PRIORITY_FEE
            }
          } catch {
            suggestedPriorityFee = MIN_PRIORITY_FEE
          }

          maxPriorityFeePerGas = (suggestedPriorityFee * BigInt(100 + maxFeeBuffer)) / 100n
          const bufferedBaseFee = (baseFeePerGas * BigInt(100 + maxFeeBuffer)) / 100n
          maxFeePerGas = bufferedBaseFee * 2n + maxPriorityFeePerGas
        }
      }

      if (maxFeePerGas < config.minMaxFee) {
        maxFeePerGas = config.minMaxFee
      }
      if (maxFeePerGas > config.maxMaxFee) {
        maxFeePerGas = config.maxMaxFee
        maxPriorityFeePerGas = maxPriorityFeePerGas > maxFeePerGas ? maxFeePerGas / 10n : maxPriorityFeePerGas
      }

      const estimatedCost = gasLimit * maxFeePerGas
      const formatted = {
        gasLimit: gasLimit.toString(),
        maxFeePerGas: formatGwei(maxFeePerGas),
        maxPriorityFeePerGas: formatGwei(maxPriorityFeePerGas),
        estimatedCost: formatEther(estimatedCost),
      }

      return {
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCost,
        formatted,
      }
    } catch (error) {
      console.error('Gas estimation error:', error)
      throw error
    }
  }

  return {
    estimateGas,
  }
}

export async function estimateGasForTransaction(
  publicClient: PublicClient,
  params: ContractGasParams,
  options: GasEstimationOptions = {}
): Promise<GasEstimate> {
  const {
    gasLimitBuffer = DEFAULT_GAS_LIMIT_BUFFER,
    maxFeeBuffer = DEFAULT_MAX_FEE_BUFFER,
  } = options

  const chainId = publicClient.chain?.id ?? 421614
  const config = CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS] ?? CHAIN_CONFIGS[421614]

  let gasLimit: bigint
  try {
    const estimated = await publicClient.estimateContractGas(params)
    gasLimit = (estimated * BigInt(100 + gasLimitBuffer)) / 100n
  } catch {
    gasLimit = config.defaultGasLimit
  }

  const block = await publicClient.getBlock()
  const baseFeePerGas = block.baseFeePerGas ?? 0n
  const gasPrice = await publicClient.getGasPrice()

  let maxFeePerGas: bigint
  let maxPriorityFeePerGas: bigint

  if (config.isArbitrum) {
    maxFeePerGas = (gasPrice * BigInt(100 + maxFeeBuffer)) / 100n
    maxPriorityFeePerGas = gasPrice / 10n
  } else if (baseFeePerGas) {
    maxPriorityFeePerGas = (MIN_PRIORITY_FEE * BigInt(100 + maxFeeBuffer)) / 100n
    const bufferedBaseFee = (baseFeePerGas * BigInt(100 + maxFeeBuffer)) / 100n
    maxFeePerGas = bufferedBaseFee * 2n + maxPriorityFeePerGas
  } else {
    maxFeePerGas = (gasPrice * BigInt(100 + maxFeeBuffer)) / 100n
    maxPriorityFeePerGas = 0n
  }

  if (maxFeePerGas < config.minMaxFee) {
    maxFeePerGas = config.minMaxFee
  }
  if (maxFeePerGas > config.maxMaxFee) {
    maxFeePerGas = config.maxMaxFee
    maxPriorityFeePerGas = maxPriorityFeePerGas > maxFeePerGas ? maxFeePerGas / 10n : maxPriorityFeePerGas
  }

  const estimatedCost = gasLimit * maxFeePerGas

  return {
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    estimatedCost,
    formatted: {
      gasLimit: gasLimit.toString(),
      maxFeePerGas: formatGwei(maxFeePerGas),
      maxPriorityFeePerGas: formatGwei(maxPriorityFeePerGas),
      estimatedCost: formatEther(estimatedCost),
    },
  }
}

export async function getCurrentGasPrice(publicClient: PublicClient): Promise<{
  gasPrice: bigint
  baseFeePerGas: bigint | null
  priorityFee: bigint | null
  formatted: {
    gasPrice: string
    baseFeePerGas: string | null
    priorityFee: string | null
  }
}> {
  const gasPrice = await publicClient.getGasPrice()
  const block = await publicClient.getBlock()
  const baseFeePerGas: bigint | null = block.baseFeePerGas !== undefined ? block.baseFeePerGas : null

  let priorityFee: bigint | null = null
  if (baseFeePerGas && gasPrice > baseFeePerGas) {
    priorityFee = gasPrice - baseFeePerGas
  }

  return {
    gasPrice,
    baseFeePerGas,
    priorityFee,
    formatted: {
      gasPrice: formatGwei(gasPrice),
      baseFeePerGas: baseFeePerGas ? formatGwei(baseFeePerGas) : null,
      priorityFee: priorityFee ? formatGwei(priorityFee) : null,
    },
  }
}

export async function isGasPriceSafe(
  publicClient: PublicClient,
  maxAcceptableGwei: number = 100
): Promise<boolean> {
  const { gasPrice } = await getCurrentGasPrice(publicClient)
  const gasPriceGwei = Number(formatGwei(gasPrice))
  return gasPriceGwei <= maxAcceptableGwei
}

export async function waitForSafeGasPrice(
  publicClient: PublicClient,
  maxGwei: number = 50,
  checkIntervalMs: number = 30000,
  maxWaitMs: number = 600000
): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const isSafe = await isGasPriceSafe(publicClient, maxGwei)
    if (isSafe) return true

    if (import.meta.env.DEV) {
      console.log(`Gas price too high, waiting ${checkIntervalMs}ms...`)
    }
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs))
  }

  return false
}