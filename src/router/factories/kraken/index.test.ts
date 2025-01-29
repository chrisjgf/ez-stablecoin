import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { createKrakenModule, type IKrakenExchange } from '.'
import type { KrakenCreateOrderParams } from './types'

describe('KrakenModule - createOrder', () => {
  let mock: MockAdapter
  let kraken: IKrakenExchange

  beforeEach(() => {
    mock = new MockAdapter(axios)
    const config = {
      apiKey: 'testKrakenApiKey',
      apiSecret: 'testKrakenApiSecret',
      apiUrl: 'https://api.kraken.com',
    }
    kraken = createKrakenModule(config)
  })

  afterEach(() => {
    mock.reset()
  })

  test('should successfully create a market buy order and return txid', async () => {
    const params: KrakenCreateOrderParams = {
      pair: 'USDCGBP',
      type: 'buy',
      ordertype: 'market',
      volume: '100',
      validate: false,
    }

    // Mock AddOrder API response
    const txid = 'ABC123DEF456'
    mock.onPost('https://api.kraken.com/0/private/AddOrder').reply(200, {
      error: [],
      result: {
        txid: [txid],
      },
    })

    // Spy on the logger to verify logs
    const loggerInfoSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const loggerErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const returnedTxid = await kraken.createOrder(params)

    // Restore the original console methods
    loggerInfoSpy.mockRestore()
    loggerErrorSpy.mockRestore()

    // Assertions
    expect(returnedTxid).toBe(txid)
    expect(mock.history.post.length).toBe(1)
    expect(mock.history.post[0].url).toBe('https://api.kraken.com/0/private/AddOrder')
  })

  test('should handle API errors gracefully and return null', async () => {
    const params: KrakenCreateOrderParams = {
      pair: 'USDCGBP',
      type: 'buy',
      ordertype: 'market',
      volume: '100',
      validate: false,
    }

    // Mock AddOrder API response with an error
    mock.onPost('https://api.kraken.com/0/private/AddOrder').reply(200, {
      error: ['EAPI:Invalid order parameters'],
      result: {},
    })

    // Spy on the logger to verify logs
    const loggerErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const returnedTxid = await kraken.createOrder(params)

    // Restore the original console methods
    loggerErrorSpy.mockRestore()

    // Assertions
    expect(returnedTxid).toBeNull()
    expect(mock.history.post.length).toBe(1)
    expect(mock.history.post[0].url).toBe('https://api.kraken.com/0/private/AddOrder')
  })

  test('should return executed price when order is closed within max attempts', async () => {
    const txid = 'ABC123DEF456'
    const executedPrice = 1.5 // Example executed price

    // Mock the QueryOrders API responses
    // First two attempts: order is 'open'
    mock.onPost('https://api.kraken.com/0/private/QueryOrders').replyOnce(200, {
      error: [],
      result: {
        [txid]: {
          price: executedPrice.toString(),
          vol_exec: '0',
          cost: '0',
          fee: '0',
          ordertype: 'market',
          descr: {
            pair: 'USDCGBP',
            type: 'buy',
            ordertype: 'market',
            price: '0',
            cost: '0',
            leverage: '',
            order: '',
          },
          status: 'open',
          opentm: 1620000000,
          closetm: 0,
          expiretm: 0,
          userref: 0,
          validate: false,
        },
      },
    })

    mock.onPost('https://api.kraken.com/0/private/QueryOrders').replyOnce(200, {
      error: [],
      result: {
        [txid]: {
          price: executedPrice.toString(),
          vol_exec: '0',
          cost: '0',
          fee: '0',
          ordertype: 'market',
          descr: {
            pair: 'USDCGBP',
            type: 'buy',
            ordertype: 'market',
            price: '0',
            cost: '0',
            leverage: '',
            order: '',
          },
          status: 'open',
          opentm: 1620000000,
          closetm: 0,
          expiretm: 0,
          userref: 0,
          validate: false,
        },
      },
    })

    // Third attempt: order is 'closed'
    mock.onPost('https://api.kraken.com/0/private/QueryOrders').replyOnce(200, {
      error: [],
      result: {
        [txid]: {
          price: executedPrice.toString(),
          vol_exec: '100',
          cost: '150',
          fee: '1.5',
          ordertype: 'market',
          descr: {
            pair: 'USDCGBP',
            type: 'buy',
            ordertype: 'market',
            price: '0',
            cost: '0',
            leverage: '',
            order: '',
          },
          status: 'closed',
          opentm: 1620000000,
          closetm: 1620000060,
          expiretm: 0,
          userref: 0,
          validate: false,
        },
      },
    })

    // Set a lower maxAttempts and faster pollingIntervalMs for testing
    const result = await kraken.pollOrderStatus(txid, 3, 100) // 3 attempts, 100ms interval

    expect(result).toBe(executedPrice)
    expect(mock.history.post.length).toBe(3) // Three polling attempts
  })

  test('should return null when order does not close within max attempts', async () => {
    const txid = 'XYZ789GHI012'

    // Mock all QueryOrders API responses as 'open'
    for (let i = 0; i < 5; i++) {
      mock.onPost('https://api.kraken.com/0/private/QueryOrders').replyOnce(200, {
        error: [],
        result: {
          [txid]: {
            price: '0',
            vol_exec: '0',
            cost: '0',
            fee: '0',
            ordertype: 'market',
            descr: {
              pair: 'USDCGBP',
              type: 'buy',
              ordertype: 'market',
              price: '0',
              cost: '0',
              leverage: '',
              order: '',
            },
            status: 'open',
            opentm: 1620000000,
            closetm: 0,
            expiretm: 0,
            userref: 0,
            validate: false,
          },
        },
      })
    }

    // Set a lower maxAttempts and faster pollingIntervalMs for testing
    const result = await kraken.pollOrderStatus(txid, 5, 100) // 5 attempts, 100ms interval

    expect(result).toBeNull()
    expect(mock.history.post.length).toBe(5) // Five polling attempts
  })

  test('should handle API errors gracefully and continue polling', async () => {
    const txid = 'ERROR123TXID'
    const executedPrice = 2.0

    // First attempt: API error
    mock.onPost('https://api.kraken.com/0/private/QueryOrders').replyOnce(500)

    // Second attempt: order is still open
    mock.onPost('https://api.kraken.com/0/private/QueryOrders').replyOnce(200, {
      error: [],
      result: {
        [txid]: {
          price: '0',
          vol_exec: '0',
          cost: '0',
          fee: '0',
          ordertype: 'market',
          descr: {
            pair: 'USDCGBP',
            type: 'buy',
            ordertype: 'market',
            price: '0',
            cost: '0',
            leverage: '',
            order: '',
          },
          status: 'open',
          opentm: 1620000000,
          closetm: 0,
          expiretm: 0,
          userref: 0,
          validate: false,
        },
      },
    })

    // Third attempt: order is closed
    mock.onPost('https://api.kraken.com/0/private/QueryOrders').replyOnce(200, {
      error: [],
      result: {
        [txid]: {
          price: executedPrice.toString(),
          vol_exec: '100',
          cost: '200',
          fee: '2.0',
          ordertype: 'market',
          descr: {
            pair: 'USDCGBP',
            type: 'buy',
            ordertype: 'market',
            price: '0',
            cost: '0',
            leverage: '',
            order: '',
          },
          status: 'closed',
          opentm: 1620000000,
          closetm: 1620000120,
          expiretm: 0,
          userref: 0,
          validate: false,
        },
      },
    })

    // Fourth and Fifth attempts: not needed, but mock them as 'closed' just in case
    mock.onPost('https://api.kraken.com/0/private/QueryOrders').reply(200, {
      error: [],
      result: {
        [txid]: {
          price: executedPrice.toString(),
          vol_exec: '100',
          cost: '200',
          fee: '2.0',
          ordertype: 'market',
          descr: {
            pair: 'USDCGBP',
            type: 'buy',
            ordertype: 'market',
            price: '0',
            cost: '0',
            leverage: '',
            order: '',
          },
          status: 'closed',
          opentm: 1620000000,
          closetm: 1620000120,
          expiretm: 0,
          userref: 0,
          validate: false,
        },
      },
    })

    // Set a lower maxAttempts and faster pollingIntervalMs for testing
    const result = await kraken.pollOrderStatus(txid, 5, 100) // 5 attempts, 100ms interval

    expect(result).toBe(executedPrice)
    expect(mock.history.post.length).toBe(3) // Three polling attempts
  })

  test('should handle unexpected errors gracefully and continue polling', async () => {
    const txid = 'UNEXPECTED456TXID'
    const executedPrice = 2.5

    // First attempt: unexpected error (e.g., network failure)
    mock.onPost('https://api.kraken.com/0/private/QueryOrders').networkErrorOnce()

    // Second attempt: order is still open
    mock.onPost('https://api.kraken.com/0/private/QueryOrders').replyOnce(200, {
      error: [],
      result: {
        [txid]: {
          price: '0',
          vol_exec: '0',
          cost: '0',
          fee: '0',
          ordertype: 'market',
          descr: {
            pair: 'USDCGBP',
            type: 'buy',
            ordertype: 'market',
            price: '0',
            cost: '0',
            leverage: '',
            order: '',
          },
          status: 'open',
          opentm: 1620000000,
          closetm: 0,
          expiretm: 0,
          userref: 0,
          validate: false,
        },
      },
    })

    // Third attempt: order is closed
    mock.onPost('https://api.kraken.com/0/private/QueryOrders').replyOnce(200, {
      error: [],
      result: {
        [txid]: {
          price: executedPrice.toString(),
          vol_exec: '100',
          cost: '250',
          fee: '2.5',
          ordertype: 'market',
          descr: {
            pair: 'USDCGBP',
            type: 'buy',
            ordertype: 'market',
            price: '0',
            cost: '0',
            leverage: '',
            order: '',
          },
          status: 'closed',
          opentm: 1620000000,
          closetm: 1620000150,
          expiretm: 0,
          userref: 0,
          validate: false,
        },
      },
    })

    // Set a lower maxAttempts and faster pollingIntervalMs for testing
    const result = await kraken.pollOrderStatus(txid, 5, 100) // 5 attempts, 100ms interval

    expect(result).toBe(executedPrice)
    expect(mock.history.post.length).toBe(3) // Three polling attempts
  })
})
