import * as readline from 'node:readline/promises'
import { createPublicClient, erc20Abi, http } from 'viem'
import { mainnet } from 'viem/chains'
import { getContractAddress } from './constants/registry'
import { getContractCall } from './helpers/viem'
import * as dotenv from 'dotenv'
import { ExchangeRouter } from './router'

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
  const router = new ExchangeRouter({
    kraken: {
      apiKey: process.env.KRAKEN_API_KEY!,
      apiSecret: process.env.KRAKEN_API_SECRET!,
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

  const targetCurrency = 'ZGBP'
  const pollingInterval = 60 * 1000 // 1 minute in milliseconds

  console.log(`Starting to poll ${targetCurrency} balance every minute...\n`)

  // 2) Poll for balance
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

      // 4) Exit
      process.exit(0)
    } catch (error) {
      console.error('Error during polling:', error)
    }
  }, pollingInterval)
}

// Run our main function, and handle errors
main().catch((err) => {
  console.error('Error in main:', err)
  process.exit(1)
})
