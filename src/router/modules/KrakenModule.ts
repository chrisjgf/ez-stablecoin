export class KrakenModule {
  public apiKey: string
  public apiSecret: string

  constructor() {
    this.apiKey = ''
    this.apiSecret = ''
  }

  public async swapFromWethToUsdc() {
    console.log('Swapping from WETH to USDC')
  }
}
