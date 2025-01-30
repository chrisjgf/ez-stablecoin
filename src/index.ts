import { createPublicClient, erc20Abi, http, createWalletClient } from 'viem'
import { base, mainnet, optimism } from 'viem/chains'
import { getContractAddress } from './constants/registry'
import { getContractCall } from './helpers/viem'
import { ExchangeRouter } from './router'
import { createAcrossClient } from '@across-protocol/app-sdk'
import { privateKeyToAccount } from 'viem/accounts'
import dotenv from 'dotenv'
import readline from 'node:readline/promises'

dotenv.config()

/**
 * Create a public client for Mainnet using viem.
 *
 * NOTE: Make sure you have a valid RPC URL. If you don’t have one,
 *       you can rely on viem’s default fallback for `mainnet`,
 *       but it is strongly recommended to provide your own.
 */
const client = createPublicClient({
  chain: mainnet,
  transport: http(),
})

const getERC20Symbol = async (tokenAddress: `0x${string}`): Promise<string> =>
  getContractCall({
    client,
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
  })

/**
 * Prompt user via Node readline for an amount input
 */
const promptForAmount = async (): Promise<number> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question('Please enter an amount: ').then((answer: string) => {
      const parsed = Number.parseFloat(answer)
      rl.close()
      if (Number.isNaN(parsed)) {
        console.error('Invalid number. Defaulting to 1.')
        resolve(1)
      } else {
        resolve(parsed)
      }
    })
  })
}

async function main() {
  console.log(process.env.PK)

  const router = new ExchangeRouter({
    kraken: {
      apiKey: process.env.KRAKEN_API_KEY!,
      apiSecret: process.env.KRAKEN_API_SECRET!,
    },
    across: {
      acrossInstance: createAcrossClient({
        chains: [
          {
            ...optimism,
            rpcUrls: {
              default: {
                http: [`https://optimism-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`],
              },
            },
          },
          {
            ...base,
            rpcUrls: {
              default: {
                http: [`https://base-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`],
              },
            },
          },
        ],
        integratorId: '0xdead', // Replace with your integrator ID
      }),
      walletInstance: createWalletClient({
        account: privateKeyToAccount(process.env.PK! as `0x${string}`),
        chain: optimism,
        transport: http(optimism.rpcUrls.default.http[0]),
      }),
    },
  })

  console.log('--- Welcome to Sensei ---')

  // 1) Prompt user
  const amount = await promptForAmount()
  console.log(`You entered: ${amount}\n`)

  // Example: call an ERC20 contract function using erc20ABI
  // const usdcAddress = getContractAddress('weth', 1)
  // const symbol = await getERC20Symbol(usdcAddress)
  // console.log(`Fetched token symbol: ${symbol}\n`)

  // ===============================================

  // 2) Poll for balance

  const poll = async () => {
    const targetCurrency = 'ZGBP'
    const pollingInterval = 60 * 1000 // 1 minute in milliseconds

    console.log(`Starting to poll ${targetCurrency} balance every minute...\n`)

    const polling = setInterval(async () => {
      try {
        const balanceResult = await router.kraken.fetchBalance()

        if (!balanceResult) {
          return console.error('Failed to retrieve balance.')
        }

        const currentBalanceStr = balanceResult[targetCurrency] || '0'
        const currentBalance = Number.parseFloat(currentBalanceStr)

        console.log(`Current ${targetCurrency} Balance: ${currentBalance}`)

        if (currentBalance < amount) {
          return console.log(`Balance is less than ${amount}. Waiting for balance to update...`)
        }

        console.log(`Balance updated, new balance is ${currentBalance}. Ready to swap.`)

        clearInterval(polling)

        // 3) Swap
        const swapResult = await router.kraken.swapGBPtoUSDC(amount)

        if (!swapResult) {
          return console.error('Swap failed or was not initiated.')
        }

        console.log(
          `Swap initiated successfully for ${amount} ${targetCurrency} at ${swapResult} GBP per USDC.`,
        )
      } catch (error) {
        console.error('Error during polling:', error)
      }
    }, pollingInterval)
  } // () ! commented out for testing

  // 3) Withdraw from Kraken & watch wallet

  // 4) Bridge
  await router.across?.bridge(amount)

  // 5) Exit
  process.exit(0)
}

// Run our main function, and handle errors
main().catch((err) => {
  console.error('Error in main:', err)
  process.exit(1)
})
