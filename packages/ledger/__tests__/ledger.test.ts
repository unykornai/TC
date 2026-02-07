/**
 * LedgerBootstrap unit tests
 */
import { LedgerBootstrap, buildDefaultTopology, XRPL_FLAGS } from '../src';

const mockClient = {
  isConnected: () => true,
  getNetwork: () => 'testnet',
  request: jest.fn().mockResolvedValue({ result: {} }),
  submit: jest.fn().mockResolvedValue({ result: { engine_result: 'tesSUCCESS' } }),
  autofill: jest.fn().mockImplementation((tx: any) => Promise.resolve({ ...tx, Sequence: 1, Fee: '12' })),
} as any;

describe('buildDefaultTopology', () => {
  test('returns testnet topology by default', () => {
    const t = buildDefaultTopology();
    expect(t).toBeDefined();
    expect(t.accounts).toBeDefined();
    expect(t.accounts.size).toBeGreaterThan(0);
  });

  test('returns mainnet topology', () => {
    const t = buildDefaultTopology('mainnet');
    expect(t).toBeDefined();
    expect(t.accounts.size).toBeGreaterThan(0);
  });
});

describe('XRPL_FLAGS', () => {
  test('exports flag constants', () => {
    expect(XRPL_FLAGS).toBeDefined();
    expect(typeof XRPL_FLAGS).toBe('object');
  });
});

describe('LedgerBootstrap', () => {
  let bootstrap: LedgerBootstrap;

  beforeEach(() => {
    bootstrap = new LedgerBootstrap(mockClient);
  });

  test('instantiates with default topology', () => {
    expect(bootstrap).toBeInstanceOf(LedgerBootstrap);
  });

  test('instantiates with custom topology', () => {
    const topo = buildDefaultTopology();
    const b2 = new LedgerBootstrap(mockClient, topo);
    expect(b2).toBeInstanceOf(LedgerBootstrap);
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    bootstrap.on('bootstrap:start', handler);
    bootstrap.emit('bootstrap:start');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
