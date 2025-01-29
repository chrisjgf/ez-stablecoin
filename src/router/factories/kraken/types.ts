export interface KrakenApiResponse<T> {
  error: string[]
  result: T
}

export interface KrakenBalanceResult {
  [currency: string]: string
}

export interface KrakenTicker {
  a: [string, string, string] // Ask array: [price, whole lot volume, lot volume]
  b: [string, string, string] // Bid array
  c: [string, string] // Last trade closed array
  v: [string, string] // Volume array
  p: [string, string] // Volume weighted average price array
  t: [number, number] // Number of trades array
  l: [string, string] // Low array
  h: [string, string] // High array
  o: string // Today's opening price
}

export interface KrakenCreateOrderParams {
  pair: string // Trading pair, e.g., 'USDCGBP'
  type: 'buy' | 'sell' // Order type: 'buy' or 'sell'
  ordertype: string // Order type: 'market', 'limit', etc.
  volume: string // Volume of the asset to buy/sell, as a string
  price?: string // Price per unit (required for 'limit' orders)
  leverage?: string // Leverage (optional)
  validate?: boolean // If true, validates the order without placing it
}

export interface KrakenOrderResult {
  txid: string[]
}

export interface KrakenQueryOrdersResult {
  [txid: string]: {
    price: string
    vol_exec: string
    cost: string
    fee: string
    ordertype: string
    descr: {
      pair: string
      type: string
      ordertype: string
      price: string
      cost: string
      leverage: string
      order: string
    }
    status: string
    opentm: number
    closetm: number
    expiretm: number
    userref: number
    validate: boolean
  }
}
