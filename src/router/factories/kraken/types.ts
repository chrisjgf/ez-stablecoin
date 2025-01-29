export interface KrakenApiResponse<T> {
  error: string[]
  result: T
}

export interface KrakenBalanceResult {
  [currency: string]: string
}
