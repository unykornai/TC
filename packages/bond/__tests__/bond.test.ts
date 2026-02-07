/**
 * BondEngine + BondFactory unit tests
 */
import { BondEngine, BondFactory } from '../src';

const mockClient = {
  isConnected: () => true,
  getNetwork: () => 'testnet',
  request: jest.fn().mockResolvedValue({ result: {} }),
  submit: jest.fn().mockResolvedValue({ result: { engine_result: 'tesSUCCESS' } }),
  autofill: jest.fn().mockImplementation((tx: any) => Promise.resolve({ ...tx, Sequence: 1, Fee: '12' })),
} as any;

describe('BondEngine', () => {
  let engine: BondEngine;

  beforeEach(() => {
    engine = new BondEngine(mockClient);
    jest.clearAllMocks();
  });

  test('instantiates without error', () => {
    expect(engine).toBeInstanceOf(BondEngine);
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    engine.on('bond:issued', handler);
    engine.emit('bond:issued', { isin: 'TEST' });
    expect(handler).toHaveBeenCalled();
  });
});

describe('BondFactory', () => {
  let factory: BondFactory;

  beforeEach(() => {
    factory = new BondFactory();
  });

  test('instantiates without error', () => {
    expect(factory).toBeInstanceOf(BondFactory);
  });

  test('getProgram returns undefined for unknown id', () => {
    const program = factory.getProgram('nonexistent');
    expect(program).toBeUndefined();
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    factory.on('series:created', handler);
    factory.emit('series:created', { id: 'S001' });
    expect(handler).toHaveBeenCalled();
  });
});
