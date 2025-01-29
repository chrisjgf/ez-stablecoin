import { createKrakenModule, type IKrakenExchange } from './factories/kraken'
import type { IExchange, IExchangeConfig } from './factories/types'

export interface IExchangeRouterConfig {
  kraken: IExchangeConfig
  coinbase?: IExchangeConfig
}

export class ExchangeRouter {
  public kraken: IKrakenExchange
  public coinbase?: IExchange

  constructor(config: IExchangeRouterConfig) {
    this.kraken = createKrakenModule(config.kraken)
    console.info('Initialized Kraken module.\n')
  }

  public listExchanges(): string[] {
    return ['kraken', 'coinbase']
  }
}
