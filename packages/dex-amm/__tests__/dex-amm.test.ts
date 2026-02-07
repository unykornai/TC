/**
 * AMMManager + PoolManager unit tests
 */
import { AMMManager, PoolManager } from '../src';

const mockClient = {
  isConnected: () => true,
  getNetwork: () => 'testnet',
  request: jest.fn().mockResolvedValue({ result: {} }),
  submit: jest.fn().mockResolvedValue({ result: { engine_result: 'tesSUCCESS' } }),
  autofill: jest.fn().mockImplementation((tx: any) => Promise.resolve({ ...tx, Sequence: 1, Fee: '12' })),
} as any;

describe('AMMManager', () => {
  let amm: AMMManager;

  beforeEach(() => {
    amm = new AMMManager(mockClient, {
      enabled: true,
      maxSlippageBps: 100,
      defaultFeeBps: 30,
      pairs: [],
    });
  });

  test('instantiates with config', () => {
    expect(amm).toBeInstanceOf(AMMManager);
  });
});

describe('PoolManager', () => {
  let pm: PoolManager;

  beforeEach(() => {
    pm = new PoolManager(mockClient);
  });

  test('instantiates without error', () => {
    expect(pm).toBeInstanceOf(PoolManager);
  });

  test('getPool returns undefined for unknown id', () => {
    const pool = pm.getPool('nonexistent');
    expect(pool).toBeUndefined();
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    pm.on('pool:created', handler);
    pm.emit('pool:created', { id: 'test' });
    expect(handler).toHaveBeenCalled();
  });
});
