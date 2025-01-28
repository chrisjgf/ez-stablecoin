import { Address } from "viem";
import { mainnet } from "viem/chains";

type SupportedChainId = typeof mainnet.id

interface TContractRegistry {
    'weth': { [key in SupportedChainId]: Address }
}

export const ContractRegistry: TContractRegistry = {
    'weth': {
        [mainnet.id]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    }
}

export const getContractAddress = (contractName: keyof TContractRegistry, chainId: SupportedChainId) => {
    return ContractRegistry[contractName][chainId]
}