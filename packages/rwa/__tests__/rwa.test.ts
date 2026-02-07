/**
 * RWATokenFactory unit tests
 */
import { RWATokenFactory } from '../src';

const mockClient = {
  isConnected: () => true,
  getNetwork: () => 'testnet',
  request: jest.fn().mockResolvedValue({ result: {} }),
  submit: jest.fn().mockResolvedValue({ result: { engine_result: 'tesSUCCESS' } }),
  autofill: jest.fn().mockImplementation((tx: any) => Promise.resolve({ ...tx, Sequence: 1, Fee: '12' })),
} as any;

describe('RWATokenFactory', () => {
  let factory: RWATokenFactory;

  beforeEach(() => {
    factory = new RWATokenFactory(mockClient);
    jest.clearAllMocks();
  });

  test('instantiates without error', () => {
    expect(factory).toBeInstanceOf(RWATokenFactory);
  });

  test('getAsset returns undefined for unknown id', () => {
    const asset = factory.getAsset('nonexistent');
    expect(asset).toBeUndefined();
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    factory.on('asset:created', handler);
    factory.emit('asset:created', { id: 'test' });
    expect(handler).toHaveBeenCalled();
  });
});
