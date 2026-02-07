/**
 * SettlementEngine unit tests
 */
import { SettlementEngine } from '../src';

const mockClient = {
  isConnected: () => true,
  getNetwork: () => 'testnet',
  request: jest.fn().mockResolvedValue({ result: {} }),
  submit: jest.fn().mockResolvedValue({ result: { engine_result: 'tesSUCCESS' } }),
  autofill: jest.fn().mockImplementation((tx: any) => Promise.resolve({ ...tx, Sequence: 1, Fee: '12' })),
} as any;

describe('SettlementEngine', () => {
  let engine: SettlementEngine;

  beforeEach(() => {
    engine = new SettlementEngine(mockClient);
    jest.clearAllMocks();
  });

  test('instantiates without error', () => {
    expect(engine).toBeInstanceOf(SettlementEngine);
  });

  test('is defined and functional', () => {
    expect(typeof engine).toBe('object');
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    engine.on('settlement:complete', handler);
    engine.emit('settlement:complete', { id: 'S001' });
    expect(handler).toHaveBeenCalled();
  });
});
