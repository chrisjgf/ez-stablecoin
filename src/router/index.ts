import { KrakenModule } from './modules/KrakenModule'

export class Router {
  public KrakenModule: KrakenModule

  constructor() {
    this.KrakenModule = new KrakenModule()
  }
}
