import axios, { type AxiosInstance } from 'axios'
import * as crypto from 'node:crypto'
import type { KrakenApiResponse, KrakenBalanceResult } from './types'
import type { IExchangeConfig } from '../types'

export const createKrakenModule = (
  config: IExchangeConfig,
  axiosInstance: AxiosInstance = axios,
) => {
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

      console.log('Account Balance:', response.data.result)
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

  return { fetchBalance }
}
