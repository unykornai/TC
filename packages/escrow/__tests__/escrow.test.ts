/**
 * EscrowManager unit tests
 */
import { EscrowManager } from '../src';

// Mock XRPLClient
const mockClient = {
  isConnected: () => true,
  getNetwork: () => 'testnet',
  request: jest.fn().mockResolvedValue({ result: {} }),
  submit: jest.fn().mockResolvedValue({ result: { engine_result: 'tesSUCCESS' } }),
  autofill: jest.fn().mockImplementation((tx: any) => Promise.resolve({ ...tx, Sequence: 1, Fee: '12' })),
} as any;

describe('EscrowManager', () => {
  let manager: EscrowManager;

  beforeEach(() => {
    manager = new EscrowManager(mockClient);
    jest.clearAllMocks();
  });

  test('instantiates without error', () => {
    expect(manager).toBeInstanceOf(EscrowManager);
  });

  test('is defined and functional', () => {
    expect(typeof manager).toBe('object');
  });

  test('emits events as EventEmitter', () => {
    const handler = jest.fn();
    manager.on('test-event', handler);
    manager.emit('test-event', { data: 'test' });
    expect(handler).toHaveBeenCalledWith({ data: 'test' });
  });
});
