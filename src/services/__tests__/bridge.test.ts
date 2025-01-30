// src/services/__tests__/assetBridge.test.ts

import { bridge } from '../bridge';

jest.mock('@across-protocol/app-sdk', () => ({
  createAcrossClient: jest.fn().mockReturnValue({
    getQuote: jest.fn().mockResolvedValue({
      deposit: {}
    }),
    executeQuote: jest.fn().mockResolvedValue({})
  })
}));

describe('bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log
  });

  it('should execute bridge process successfully', async () => {
    const amountToBridge = '0.000001'; // ETH

    await expect(bridge(amountToBridge)).resolves.not.toThrow();

    expect(console.log).toHaveBeenCalledWith('Initiating bridge process...');
    expect(console.log).toHaveBeenCalledWith('Getting quote from Across...');
    expect(console.log).toHaveBeenCalledWith('Bridge process completed successfully');
  });

});
