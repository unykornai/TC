/**
 * TradingEngine + RiskController unit tests
 */
import { TradingEngine, RiskController } from '../src';

const mockClient = {
  isConnected: () => true,
  getNetwork: () => 'testnet',
  request: jest.fn().mockResolvedValue({ result: {} }),
  submit: jest.fn().mockResolvedValue({ result: { engine_result: 'tesSUCCESS' } }),
  autofill: jest.fn().mockImplementation((tx: any) => Promise.resolve({ ...tx, Sequence: 1, Fee: '12' })),
} as any;

describe('RiskController', () => {
  let rc: RiskController;

  beforeEach(() => {
    rc = new RiskController({
      maxPositionPct: 0.1,
      maxDailyVolume: 5000000,
      stopLossPct: 0.05,
      circuitBreakerPct: 0.1,
    });
  });

  test('instantiates with risk config', () => {
    expect(rc).toBeInstanceOf(RiskController);
  });
});

describe('TradingEngine', () => {
  test('instantiates with client and config', () => {
    const engine = new TradingEngine(mockClient, { enabled: true, strategies: [], riskConfig: { maxPositionPct: 0.1, maxDailyVolume: 5000000, stopLossPct: 0.05, circuitBreakerPct: 0.1 } } as any);
    expect(engine).toBeDefined();
  });
});
