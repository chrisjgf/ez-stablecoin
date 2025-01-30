import { base, optimism } from 'viem/chains'
import type { IAcrossConfig } from '../types'
import { simpleToExact } from '../../../helpers/numbers'

export interface IAcrossExchange {
  bridge(amount: number): Promise<void>
}

export const createAcrossModule = (config: IAcrossConfig): IAcrossExchange => {
  const { acrossInstance, walletInstance } = config

  if (!acrossInstance || !walletInstance) {
    throw new Error('Instances not setup correctly')
  }

  const bridge = async (amount: number) => {
    try {
      console.log('Initiating bridge process...')

      // Define the route with properly typed addresses
      const route = {
        originChainId: optimism.id,
        destinationChainId: base.id,
        inputToken: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' as `0x${string}`, // USDC on Optimism
        outputToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // USDC on Base
      }

      // Get quote from Across
      console.log('Getting quote from Across...')

      const quote = await acrossInstance.getQuote({
        route,
        inputAmount: simpleToExact(amount, 6),
        recipient: walletInstance.account.address,
      })

      console.log('Quote received. Executing bridge transaction...')
      console.log(quote)

      // Execute the quote
      const result = await acrossInstance.executeQuote({
        walletClient: walletInstance,
        deposit: quote.deposit,
        onProgress: (progress) => {
          if (progress.step === 'approve') {
            if (progress.status === 'txSuccess') {
              console.log('Token approval successful')
            }
          }
          if (progress.step === 'deposit') {
            if (progress.status === 'txSuccess') {
              const { depositId } = progress
              console.log(`Deposit successful. Deposit ID: ${depositId}`)
            }
          }
          if (progress.step === 'fill') {
            if (progress.status === 'txSuccess') {
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
      if (error?.includes('TransactionReceiptNotFoundError')) {
        acrossInstance
          .waitForDepositTx({
            transactionHash: '0x',
            originChainId: optimism.id,
          })
          .then((result) => {
            console.log('Deposit transaction found!')
            console.log(result)
          })
          .catch((error) => {
            console.error('Error during deposit transaction search:', error.message)
          })
      }
      // throw error
    }
  }

  return { bridge }
}
