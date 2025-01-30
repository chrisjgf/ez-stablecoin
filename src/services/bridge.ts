// bridgeOptimismToBase.ts

import { createAcrossClient } from "@across-protocol/app-sdk";
import { createWalletClient, http, Chain, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import dotenv from 'dotenv'

dotenv.config()

// ----- Configuration -----

const PRIVATE_KEY = process.env.PK as `0x${string}`

// Network configurations
const OPTIMISM_CHAIN: Chain = {
  id: 10,
  name: 'Optimism',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://mainnet.optimism.io'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://optimistic.etherscan.io' },
  },
}

const BASE_CHAIN: Chain = {
  id: 8453,
  name: 'Base',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://basescan.org' },
  },
}

// ----- Initialize Clients -----

const account = privateKeyToAccount(PRIVATE_KEY)
const walletClient = createWalletClient({
  account,
  chain: OPTIMISM_CHAIN,
  transport: http(OPTIMISM_CHAIN.rpcUrls.default.http[0]),
})

// Initialize Across client
const acrossClient = createAcrossClient({
  chains: [OPTIMISM_CHAIN, BASE_CHAIN],
  integratorId: "0x0000", // Replace with your integrator ID
})

// ----- Bridge Function: Optimism to Base -----

async function bridge(amountEth: string) {
  try {
    console.log('Initiating bridge process...')

    // Define the route with properly typed addresses
    const route = {
      originChainId: OPTIMISM_CHAIN.id,
      destinationChainId: BASE_CHAIN.id,
      inputToken: "0x7aC76E469526A078960C25b02D5233aD0cD45ED3" as `0x${string}`, // USDC on Optimism
      outputToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`, // USDC on Base
    }

    // Get quote from Across
    console.log('Getting quote from Across...')
    const quote = await acrossClient.getQuote({
      route,
      inputAmount: parseEther(amountEth),
      recipient: account.address,
    })

    console.log('Quote received. Executing bridge transaction...')

    // Execute the quote
    const result = await acrossClient.executeQuote({
      walletClient,
      deposit: quote.deposit,
      onProgress: (progress) => {
        if (progress.step === "approve") {
          if (progress.status === "txSuccess") {
            console.log('Token approval successful')
          }
        }
        if (progress.step === "deposit") {
          if (progress.status === "txSuccess") {
            const { depositId } = progress
            console.log(`Deposit successful. Deposit ID: ${depositId}`)
          }
        }
        if (progress.step === "fill") {
          if (progress.status === "txSuccess") {
            const { actionSuccess } = progress
            console.log(`Fill successful. Action success: ${actionSuccess}`)
          }
        }
      },
    })

    console.log('Bridge process completed successfully')
    return result

  } catch (error: any) {
    console.error('Error during bridging process:', error.message)
    throw error
  }
}

export { bridge }