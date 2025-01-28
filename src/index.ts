import { format } from 'date-fns'
import { random } from 'lodash'
import * as readline from 'node:readline/promises'
import { createPublicClient, erc20Abi, http } from 'viem'
import { mainnet } from 'viem/chains'
import { getContractAddress } from './constants/registry'
import { getContractCall } from './helpers/viem'

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
 * Mock API call
 */
const mockApiCall = async (amount: number): Promise<boolean> => {
  // 1 in 6 chance of success
  const isSuccess = random(0, 5) === 5
  console.log(
    `[${format(
      new Date(),
      'HH:mm:ss',
    )}] Mock API polled with amount=${amount}, success=${isSuccess}`,
  )
  return isSuccess
}

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

/**
 * Main workflow:
 *  - Prompt user for amount.
 *  - Demonstrate a contract call with `erc20ABI` (fetch USDC symbol).
 *  - Poll mock API every 10 seconds until success is returned.
 */
async function main() {
  console.log('--- Welcome to Sensei ---')

  // 1) Prompt user
  const amount = await promptForAmount()
  console.log(`You entered: ${amount}\n`)

  // 2) Example: call an ERC20 contract function using erc20ABI
  const usdcAddress = getContractAddress('weth', 1)
  const symbol = await getERC20Symbol(usdcAddress)
  console.log(`Fetched token symbol: ${symbol}\n`)

  console.log('Entering pending state... will poll every 10 seconds.\n')

  // 3) Poll logic
  let success = false
  while (!success) {
    // Wait 10 seconds between polls
    await new Promise((resolve) => setTimeout(resolve, 10_000))
    success = await mockApiCall(amount)
  }

  console.log('Success! Terminating session.')
}

// Run our main function, and handle errors
main().catch((err) => {
  console.error('Error in main:', err)
  process.exit(1)
})
