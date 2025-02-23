import axios, { type AxiosInstance } from 'axios'
import * as crypto from 'node:crypto'
import type {
  KrakenApiResponse,
  KrakenBalanceResult,
  KrakenCreateOrderParams,
  KrakenOrderResult,
  KrakenQueryOrdersResult,
  KrakenTicker,
} from './types'
import type { IExchange, IExchangeConfig } from '../types'

export interface IKrakenExchange extends IExchange {
  swapGBPtoUSDC(amountGBP: number): Promise<number | undefined>
  createOrder(params: KrakenCreateOrderParams): Promise<string | null>
  pollOrderStatus(
    txid: string,
    maxAttempts?: number,
    pollingIntervalMs?: number,
  ): Promise<number | null>
  withdraw(asset: string, key: string, amount: number): Promise<string | null>
  pollWithdrawalStatus(
    refid: string,
    maxAttempts?: number,
    pollingIntervalMs?: number,
  ): Promise<boolean>
}

export const createKrakenModule = (
  config: IExchangeConfig,
  axiosInstance: AxiosInstance = axios,
): IKrakenExchange => {
  const { apiKey, apiSecret, apiUrl = 'https://api.kraken.com' } = config

  if (!apiKey || !apiSecret) {
    throw new Error('API key and secret are required')
  }

  const generateNonce = (): string => Date.now().toString()

  const getKrakenSignature = (path: string, nonce: string, postData: string): string => {
    const secretBuffer = Buffer.from(apiSecret, 'base64')
    const hash = crypto
      .createHash('sha256')
      .update(nonce + postData)
      .digest()
    const hmac = crypto
      .createHmac('sha512', secretBuffer)
      .update(Buffer.concat([Buffer.from(path), hash]))
      .digest('base64')
    return hmac
  }

  /*
  // Public methods
  */
  const fetchBalance = async (): Promise<KrakenBalanceResult | undefined> => {
    const apiPath = '/0/private/Balance'
    const nonce = generateNonce()
    const postData = `nonce=${nonce}`
    const signature = getKrakenSignature(apiPath, nonce, postData)

    try {
      const response = await axiosInstance.post<KrakenApiResponse<KrakenBalanceResult>>(
        `${apiUrl}${apiPath}`,
        postData,
        {
          headers: {
            'API-Key': apiKey,
            'API-Sign': signature,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )

      if (response.data.error.length > 0) {
        console.error('Error from Kraken API:', response.data.error)
        return
      }

      return response.data.result
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error:', error.message)
        if (error.response) {
          console.error('Response data:', error.response.data)
        }
      } else {
        console.error('Unexpected error:', error)
      }
    }
  }

  /**
   * Internal helper function to poll the status of a Kraken order until it's closed or a timeout is reached.
   * @param txid Transaction ID of the order.
   * @param maxAttempts Maximum number of polling attempts.
   * @param pollingIntervalMs Interval between polling attempts in milliseconds.
   * @returns The executed price if the order is closed; otherwise, null.
   */
  const pollOrderStatus = async (
    txid: string,
    maxAttempts = 30,
    pollingIntervalMs = 10000,
  ): Promise<number | null> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Polling attempt ${attempt} for order TXID: ${txid}`)

      try {
        const queryOrdersPath = '/0/private/QueryOrders'
        const nonce = generateNonce()
        const postData = `nonce=${nonce}&txid=${txid}`
        const signature = getKrakenSignature(queryOrdersPath, nonce, postData)

        const queryOrdersResponse = await axiosInstance.post<
          KrakenApiResponse<KrakenQueryOrdersResult>
        >(`${apiUrl}${queryOrdersPath}`, postData, {
          headers: {
            'API-Key': apiKey,
            'API-Sign': signature,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })

        // Defensive Coding: Ensure response.data and response.data.error exist
        if (!queryOrdersResponse.data || !Array.isArray(queryOrdersResponse.data.error)) {
          console.error('Kraken QueryOrders API Error: Invalid response structure')
          // Decide whether to continue polling or abort. Here, we choose to continue.
        } else if (queryOrdersResponse.data.error.length > 0) {
          console.error(
            `Kraken QueryOrders API Error: ${queryOrdersResponse.data.error.join(', ')}`,
          )
          // Decide whether to continue polling or abort based on the error
          // For now, continue polling
        } else {
          const orderInfo = queryOrdersResponse.data.result[txid]
          if (orderInfo && orderInfo.status === 'closed') {
            const executedPrice = Number.parseFloat(orderInfo.price)
            console.log(`Kraken Swap Executed. Executed Price: ${executedPrice} GBP per USDC`)
            return executedPrice
          }
          console.warn(
            `Attempt ${attempt}: Kraken Order is not yet closed. Status: ${orderInfo?.status || 'Unknown'}. Continuing to poll...`,
          )
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(`Kraken QueryOrders Axios Error: ${error.message}`)
          if (error.response?.data) {
            console.error(
              `Kraken QueryOrders Response Data: ${JSON.stringify(error.response.data)}`,
            )
          }
        } else {
          console.error(`Kraken QueryOrders Unexpected Error: ${error}`)
        }
        // Decide whether to continue polling or abort based on the error
        // For now, continue polling
      }

      // Wait before the next polling attempt
      await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs))
    }

    console.error(`Kraken Order ${txid} was not closed after ${maxAttempts} attempts.`)
    return null
  }

  /**
   * Creates an order on Kraken with specified parameters.
   * @param params Parameters for creating the order.
   * @returns The transaction ID (txid) of the created order or null if failed.
   */
  const createOrder = async (params: KrakenCreateOrderParams): Promise<string | null> => {
    const { pair, type, ordertype, volume, price, leverage, validate = false } = params

    try {
      const addOrderPath = '/0/private/AddOrder'
      const nonce = generateNonce()
      let postData = `nonce=${nonce}&ordertype=${ordertype}&type=${type}&pair=${pair}&volume=${volume}&validate=${validate}`

      if (
        price &&
        (ordertype === 'limit' || ordertype === 'stop-loss' || ordertype === 'take-profit')
      ) {
        postData += `&price=${price}`
      }

      if (leverage) {
        postData += `&leverage=${leverage}`
      }

      const signature = getKrakenSignature(addOrderPath, nonce, postData)

      const addOrderResponse = await axiosInstance.post<KrakenApiResponse<KrakenOrderResult>>(
        `${apiUrl}${addOrderPath}`,
        postData,
        {
          headers: {
            'API-Key': apiKey,
            'API-Sign': signature,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )

      if (addOrderResponse.data.error.length > 0) {
        console.error(`Kraken AddOrder API Error: ${addOrderResponse.data.error.join(', ')}`)
        return null
      }

      const txid = addOrderResponse.data.result.txid[0]
      console.log(`Kraken Order Placed. TXID: ${txid}`)
      return txid
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Kraken CreateOrder Axios Error: ${error.message}`)
        if (error.response) {
          console.error(`Kraken CreateOrder Response Data: ${JSON.stringify(error.response.data)}`)
        }
      } else {
        console.error(`Kraken CreateOrder Unexpected Error: ${error}`)
      }
      return null
    }
  }

  const swapGBPtoUSDC = async (amountGBP: number): Promise<number | undefined> => {
    const pair = 'USDCGBP'
    const type = 'buy'
    const ordertype = 'market'
    const validate = false // Set to true to validate without placing the order

    try {
      // Step 1: Fetch current ticker to get the ask price
      const tickerResponse = await axiosInstance.get<
        KrakenApiResponse<{ [key: string]: KrakenTicker }>
      >(`${apiUrl}/0/public/Ticker?pair=${pair}`)

      if (tickerResponse.data.error.length > 0) {
        console.error(`Kraken Ticker API Error: ${tickerResponse.data.error.join(', ')}`)
      }

      const tickerData = tickerResponse.data.result[pair]
      const askPrice = Number.parseFloat(tickerData.a[0])

      if (Number.isNaN(askPrice) || askPrice <= 0) {
        console.error('Invalid ask price retrieved from Kraken ticker.')
        return
      }

      console.log(`askPrice ${askPrice}`)

      // Step 2: Calculate the volume of USDC to buy
      const volumeUSDC = amountGBP / askPrice
      const volumeUSDCStr = volumeUSDC.toFixed(6) // Adjust decimal places as needed

      // Step 3: Place a market order to buy USDC
      const txid = await createOrder({
        pair,
        type,
        ordertype,
        volume: volumeUSDCStr,
        validate,
      })

      if (!txid) {
        console.error('Failed to place Kraken order.')
        return
      }

      // Step 4: Poll the order status until it's closed
      const executedPrice = await pollOrderStatus(txid, 30, 10000) // 30 attempts, 10 seconds interval

      if (executedPrice !== null) {
        console.log(`Kraken Swap Completed. Executed Price: ${executedPrice} GBP per USDC`)
        return executedPrice
      }

      console.error(`Kraken Swap Failed or Timed Out for Order TXID: ${txid}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Kraken Swap Axios Error: ${error.message}`)
        if (error.response) {
          console.error(`Kraken Swap Response Data: ${JSON.stringify(error.response.data)}`)
        }
      } else {
        console.error(`Kraken Swap Unexpected Error: ${error}`)
      }
    }
  }

  /**
   * Withdraws a specified amount of an asset to a predefined address on the Optimism chain.
   *
   * @param asset - The asset to withdraw (e.g., 'USDC').
   * @param key - The withdrawal key name configured in Kraken for the Optimism address.
   * @param amount - The amount of the asset to withdraw.
   * @returns A promise that resolves to the withdrawal transaction ID if successful, or null if failed.
   */
  const withdraw = async (asset: string, key: string, amount: number): Promise<string | null> => {
    const apiPath = '/0/private/Withdraw'
    const nonce = generateNonce()
    const postData = `nonce=${nonce}&asset=${asset}&key=${encodeURIComponent(key)}&amount=${amount}`
    const signature = getKrakenSignature(apiPath, nonce, postData)

    try {
      const response = await axiosInstance.post<KrakenApiResponse<{ refid: string }>>(
        `${apiUrl}${apiPath}`,
        postData,
        {
          headers: {
            'API-Key': apiKey,
            'API-Sign': signature,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )

      if (response.data.error.length > 0) {
        console.error(`Kraken Withdraw API Error: ${response.data.error.join(', ')}`)
        return null
      }

      const refid = response.data.result.refid
      console.log(`Withdrawal Successful. Reference ID: ${refid}`)
      return refid
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Kraken Withdraw Axios Error: ${error.message}`)
        if (error.response) {
          console.error(`Kraken Withdraw Response Data: ${JSON.stringify(error.response.data)}`)
        }
      } else {
        console.error(`Kraken Withdraw Unexpected Error: ${error}`)
      }
      return null
    }
  }

  /**
   * Polls the status of a recent withdrawal until it is confirmed.
   *
   * @param refid - The reference ID of the withdrawal to check.
   * @param maxAttempts - Maximum number of polling attempts (default: 30).
   * @param pollingIntervalMs - Interval between polling attempts in milliseconds (default: 10000 ms).
   * @returns A promise that resolves to `true` if the withdrawal is confirmed, or `false` if not confirmed within the maximum attempts.
   */
  const pollWithdrawalStatus = async (
    refid: string,
    maxAttempts = 30,
    pollingIntervalMs = 10000,
  ): Promise<boolean> => {
    const apiPath = '/0/private/WithdrawStatus'

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Polling attempt ${attempt} for withdrawal REFID: ${refid}`)

      const nonce = generateNonce()
      const postData = `nonce=${nonce}&refid=${encodeURIComponent(refid)}`
      const signature = getKrakenSignature(apiPath, nonce, postData)

      try {
        const response = await axiosInstance.post<
          KrakenApiResponse<
            {
              refid: string
              method: string
              asset: string
              amount: string
              fee: string
              status: string
              misc: string
            }[]
          >
        >(`${apiUrl}${apiPath}`, postData, {
          headers: {
            'API-Key': apiKey,
            'API-Sign': signature,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })

        if (response.data.error.length > 0) {
          console.error(`Kraken WithdrawStatus API Error: ${response.data.error.join(', ')}`)
        } else {
          const withdrawal = response.data.result.find((w) => w.refid === refid)
          if (withdrawal) {
            console.log(`Withdrawal Status: ${withdrawal.status}`)
            if (['success', 'settled'].includes(withdrawal.status.toLowerCase())) {
              console.log(`Withdrawal ${refid} is confirmed.`)
              return true
            }
            console.log(
              `Withdrawal ${refid} is not yet confirmed. Current status: ${withdrawal.status}`,
            )
          } else {
            console.warn(`No withdrawal found with REFID: ${refid}`)
          }
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(`Kraken WithdrawStatus Axios Error: ${error.message}`)
          if (error.response) {
            console.error(
              `Kraken WithdrawStatus Response Data: ${JSON.stringify(error.response.data)}`,
            )
          }
        } else {
          console.error(`Kraken WithdrawStatus Unexpected Error: ${error}`)
        }
      }

      // Wait before the next polling attempt
      await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs))
    }

    console.error(`Withdrawal ${refid} was not confirmed after ${maxAttempts} attempts.`)
    return false
  }

  return {
    fetchBalance,
    swapGBPtoUSDC,
    createOrder,
    pollOrderStatus,
    withdraw,
    pollWithdrawalStatus,
  }
}
