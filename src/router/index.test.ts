import { ExchangeRouter, type IExchangeRouterConfig } from '.'
import type { IExchange, IExchangeConfig } from './factories/types'

describe('ExchangeRouter', () => {
  let router: ExchangeRouter
  let mockKraken: IExchange
  let mockCoinbase: IExchange
  let config: IExchangeRouterConfig

  beforeEach(() => {
    config = {
      kraken: {
        apiKey: 'testKrakenApiKey',
        apiSecret: 'testKrakenApiSecret',
      },
      coinbase: {
        apiKey: 'testCoinbaseApiKey',
        apiSecret: 'testCoinbaseApiSecret',
      },
    }

    router = new ExchangeRouter(config)

    mockKraken = {
      fetchBalance: jest.fn().mockResolvedValue({ BTC: '1.2345', USD: '1000' }),
    }

    mockCoinbase = {
      fetchBalance: jest.fn().mockResolvedValue({ ETH: '10', EUR: '500' }),
    }

    // Override the actual exchanges with mocks
    ;(router as any).kraken = mockKraken
    ;(router as any).coinbase = mockCoinbase
  })

  test('should list all supported exchanges', () => {
    const exchanges = router.listExchanges()
    expect(exchanges).toContain('kraken')
    expect(exchanges).toContain('coinbase')
    expect(exchanges.length).toBe(2)
  })

  test('should retrieve a supported exchange', () => {
    const kraken = router.kraken
    expect(kraken).toBe(mockKraken)
  })

  test('should fetch balance for Kraken', async () => {
    const balance = await router.kraken.fetchBalance()
    expect(balance).toEqual({ BTC: '1.2345', USD: '1000' })
    expect(mockKraken.fetchBalance).toHaveBeenCalledTimes(1)
  })
})
