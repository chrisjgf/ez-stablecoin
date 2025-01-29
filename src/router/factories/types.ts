export interface IExchangeConfig {
  apiKey: string
  apiSecret: string
  apiUrl?: string
}

export interface IExchange {
  fetchBalance(): Promise<BalanceResult | undefined>
}

export interface BalanceResult {
  [currency: string]: string
}
