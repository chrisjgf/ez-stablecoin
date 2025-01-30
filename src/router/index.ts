import { createAcrossModule, type IAcrossExchange } from './factories/across'
import { createKrakenModule, type IKrakenExchange } from './factories/kraken'
import type { IAcrossConfig, IExchange, IExchangeConfig } from './factories/types'

export interface IExchangeRouterConfig {
  kraken: IExchangeConfig
  across?: IAcrossConfig
  coinbase?: IExchangeConfig
}

export class ExchangeRouter {
  public kraken: IKrakenExchange
  public across?: IAcrossExchange
  public coinbase?: IExchange

  constructor(config: IExchangeRouterConfig) {
    this.kraken = createKrakenModule(config.kraken)

    if (config.across) {
      this.across = createAcrossModule(config.across)
      console.info('Initialized Kraken & Across modules.\n')
      return
    }

    console.info('Initialized Kraken module.\n')
  }

  public listExchanges(): string[] {
    return ['kraken', 'coinbase', 'across']
  }
}
