/**
 * OrderBookEngine + OrderManager unit tests
 */
import { OrderBookEngine, OrderManager } from '../src';

const mockClient = {
  isConnected: () => true,
  getNetwork: () => 'testnet',
  request: jest.fn().mockResolvedValue({ result: {} }),
  submit: jest.fn().mockResolvedValue({ result: { engine_result: 'tesSUCCESS' } }),
  autofill: jest.fn().mockImplementation((tx: any) => Promise.resolve({ ...tx, Sequence: 1, Fee: '12' })),
} as any;

describe('OrderBookEngine', () => {
  let engine: OrderBookEngine;

  beforeEach(() => {
    engine = new OrderBookEngine(mockClient);
  });

  test('instantiates without error', () => {
    expect(engine).toBeInstanceOf(OrderBookEngine);
  });
});

describe('OrderManager', () => {
  let om: OrderManager;

  beforeEach(() => {
    om = new OrderManager(mockClient, {
      enabled: true,
      tradingAccount: 'rTestAddr',
      maxOpenOrders: 100,
      maxSlippageBps: 50,
      defaultExpiration: 3600,
      allowedPairs: [],
      riskLimits: { maxSingleOrderUsd: 100000, maxDailyVolumeUsd: 1000000 },
    } as any);
  });

  test('instantiates with config', () => {
    expect(om).toBeInstanceOf(OrderManager);
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    om.on('order:placed', handler);
    om.emit('order:placed', { id: 'test' });
    expect(handler).toHaveBeenCalled();
  });
});
