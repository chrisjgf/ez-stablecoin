import { createAcrossClient } from '@across-protocol/app-sdk'
import dotenv from 'dotenv'
import { createPublicClient, createWalletClient, erc20Abi, http, type PublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, optimism } from 'viem/chains'
import { sleep } from './helpers/utils'
import { getContractCall } from './helpers/viem'
import { ExchangeRouter } from './router'
import { ContractRegistry } from './constants/registry'
import { waitForGbp, updateStatus } from './api'

dotenv.config()

/**
 * Create a public client for Mainnet using viem.
 *
 * NOTE: Make sure you have a valid RPC URL. If you don't have one,
 *       you can rely on viem's default fallback for `mainnet`,
 *       but it is strongly recommended to provide your own.
 */
const client = createPublicClient({
  chain: base,
  transport: http(),
})

/**
 * Step 1: Poll until the Kraken balance for targetCurrency reaches the required amount.
 */
const pollUntilBalance = async (
  router: ExchangeRouter,
  targetCurrency: string,
  requiredAmount: number,
  pollingInterval: number,
): Promise<void> => {
  console.log(`Polling ${targetCurrency} balance every ${pollingInterval / 1000} seconds...`)
  while (true) {
    try {
      const balanceResult = await router.kraken.fetchBalance()
      if (!balanceResult) {
        console.error('Failed to retrieve balance. Trying again...')
      } else {
        const currentBalanceStr = balanceResult[targetCurrency] || '0'
        const currentBalance = Number.parseFloat(currentBalanceStr)
        console.log(`Current ${targetCurrency} Balance: ${currentBalance}`)
        if (currentBalance >= requiredAmount) {
          console.log(`Balance reached ${currentBalance}. Proceeding to swap.`)
          break
        }
        console.log(`Balance is less than ${requiredAmount}. Waiting...`)
      }
    } catch (error) {
      console.error('Error polling balance:', error)
    }
    await sleep(pollingInterval)
  }
}

/**
 * Step 2: Swap GBP to USDC using Kraken.
 *
 * @returns the swap rate (GBP per USDC) which is used to calculate the USDC amount.
 */
const swapGBPtoUSDC = async (router: ExchangeRouter, amount: number): Promise<number> => {
  const swapResult = await router.kraken.swapGBPtoUSDC(amount)
  if (!swapResult) {
    throw new Error('Swap failed or was not initiated.')
  }
  console.log(
    `Swap initiated successfully for ${amount} GBP at a rate of ${swapResult} GBP per USDC.`,
  )
  return swapResult
}

/**
 * Step 3: Withdraw USDC from Kraken.
 *
 * @returns the reference id (refid) of the withdrawal.
 */
const withdrawUSDC = async (router: ExchangeRouter, usdAmount: number): Promise<string> => {
  const refid = await router.kraken.withdraw('USDC', 'echo_intermediary_op', usdAmount)
  if (!refid) {
    throw new Error('Failed to initiate withdrawal.')
  }
  console.log(`Withdrawal initiated with refid: ${refid}`)

  const success = await router.kraken.pollWithdrawalStatus(refid)
  if (!success) {
    throw new Error('Withdrawal failed or was not confirmed.')
  }
  console.log('Withdrawal confirmed successfully.')
  return refid
}

/**
 * Step 4: Bridge USDC via Across.
 */
const bridgeUSDC = async (router: ExchangeRouter, amount: number): Promise<void> => {
  const adjustedAmount = amount - 2 // 2 USD Kraken fee
  const bridgeSuccess = await router.across?.bridge(adjustedAmount)
  if (!bridgeSuccess) {
    throw new Error('Bridge failed.')
  }
  console.log(`Bridged ${adjustedAmount} USDC successfully.`)
}

/**
 * Step 5: Send USDC on Base to the recipient (Echo).
 */
const sendUSDCOnBaseToEcho = async (
  baseWallet: ReturnType<typeof createWalletClient>,
  client: PublicClient,
  recipient: `0x${string}`,
): Promise<void> => {
  console.log('Sending USDC on Base to Echo...')

  const usdcBalance = await getContractCall({
    client: client,
    address: ContractRegistry.usdc[base.id] as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: baseWallet.account?.address ? [baseWallet.account?.address] : [],
  })

  console.log(`Total USDC on Base: ${usdcBalance}`)

  const txHash = await baseWallet.writeContract({
    address: ContractRegistry.usdc[base.id] as `0x${string}`,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [recipient, usdcBalance],
    chain: base,
    account: baseWallet.account!,
  })

  console.log(`USDC sent successfully. Transaction hash: ${txHash}`)
}

async function main() {
  console.log('--- Welcome to Sensei ---')

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
        integratorId: '0xdead', // Replace with integrator ID
      }),
      walletInstance: createWalletClient({
        account: privateKeyToAccount(process.env.PK! as `0x${string}`), // priv key intermediary w/ funds on optimism
        chain: {
          ...optimism,
          rpcUrls: {
            default: {
              http: [`https://optimism-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`],
            },
          },
        },
        transport: http(optimism.rpcUrls.default.http[0]),
      }),
    },
  })

  // Step 0: Read current status and wait until gbp > 0
  const amount = await waitForGbp()
  console.log(`You entered: ${amount}\n`)
  await updateStatus({ gbp: amount, gbpKraken: 0, usdcOp: 0, usdcBase: 0, usdcKraken: 0 })

  // Step 1: Poll for sufficient ZGBP balance every minute.
  const targetCurrency = 'ZGBP'
  const pollingInterval = 60 * 1000 // 1 minute in milliseconds
  await pollUntilBalance(router, targetCurrency, amount, pollingInterval)
  await updateStatus({ gbpKraken: amount })

  // Step 2: Swap GBP to USDC.
  const swapRate = await swapGBPtoUSDC(router, amount)
  const usdAmount = (1 / swapRate) * amount * 0.99 // amount w/ reserve factor
  await updateStatus({ usdcKraken: usdAmount })

  // Step 3: Withdraw USDC from Kraken.
  await withdrawUSDC(router, usdAmount)
  await updateStatus({ usdcOp: usdAmount })

  // Step 4: Bridge USDC.
  await bridgeUSDC(router, usdAmount)

  // Step 5: Send USDC on Base to Echo.
  const baseWallet = createWalletClient({
    account: privateKeyToAccount(process.env.PK! as `0x${string}`),
    chain: {
      ...base,
      rpcUrls: {
        default: {
          http: [`https://base-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`],
        },
      },
    },
    transport: http(base.rpcUrls.default.http[0]),
  })

  await sendUSDCOnBaseToEcho(
    baseWallet,
    client as unknown as PublicClient,
    process.env.RECIPIENT! as `0x${string}`,
  )
  await updateStatus({ usdcBase: usdAmount })

  // Exit the process
  process.exit(0)
}

// Call main if not imported elsewhere
main()
