import type { AcrossClient } from '@across-protocol/app-sdk'
import type { WalletClient, Transport, Chain, Account, RpcSchema } from 'viem'

export interface IExchangeConfig {
  apiKey: string
  apiSecret: string
  apiUrl?: string
}

export interface IExchange {
  fetchBalance(): Promise<BalanceResult | undefined>
}

export interface IAcrossConfig {
  acrossInstance: AcrossClient
  walletInstance: WalletClient<Transport, Chain, Account, RpcSchema>
}

export interface BalanceResult {
  [currency: string]: string
}
