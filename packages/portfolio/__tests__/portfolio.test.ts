/**
 * PortfolioManager unit tests
 */
import { PortfolioManager } from '../src';

const mockClient = {
  isConnected: () => true,
  getNetwork: () => 'testnet',
  request: jest.fn().mockResolvedValue({ result: {} }),
  submit: jest.fn().mockResolvedValue({ result: { engine_result: 'tesSUCCESS' } }),
  autofill: jest.fn().mockImplementation((tx: any) => Promise.resolve({ ...tx, Sequence: 1, Fee: '12' })),
} as any;

describe('PortfolioManager', () => {
  let pm: PortfolioManager;

  beforeEach(() => {
    pm = new PortfolioManager(mockClient, {
      baseCurrency: 'USD',
      concentrationLimits: { bond: 0.5, equity: 0.3, rwa: 0.2 } as any,
      maxSingleExposure: 0.25,
      rebalanceThreshold: 0.05,
      valuationSources: {},
    });
    jest.clearAllMocks();
  });

  test('instantiates with config', () => {
    expect(pm).toBeInstanceOf(PortfolioManager);
  });

  test('getPosition returns undefined for unknown id', () => {
    const pos = pm.getPosition('nonexistent');
    expect(pos).toBeUndefined();
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    pm.on('rebalance', handler);
    pm.emit('rebalance', { trigger: 'threshold' });
    expect(handler).toHaveBeenCalled();
  });
});
