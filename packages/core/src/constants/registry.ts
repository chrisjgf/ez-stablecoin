import type { Address } from 'viem'
import { base, optimism } from 'viem/chains'

type SupportedChainId = typeof optimism.id | typeof base.id

interface TContractRegistry {
  usdc: { [key in SupportedChainId]: Address }
}

export const ContractRegistry: TContractRegistry = {
  usdc: {
    [optimism.id]: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
}

export const getContractAddress = (
  contractName: keyof TContractRegistry,
  chainId: SupportedChainId,
) => {
  return ContractRegistry[contractName][chainId]
}
