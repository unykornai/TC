/**
 * StablecoinGateway unit tests
 */
import { StablecoinGateway } from '../src';

const mockClient = {
  isConnected: () => true,
  getNetwork: () => 'testnet',
  request: jest.fn().mockResolvedValue({ result: {} }),
  submit: jest.fn().mockResolvedValue({ result: { engine_result: 'tesSUCCESS' } }),
  autofill: jest.fn().mockImplementation((tx: any) => Promise.resolve({ ...tx, Sequence: 1, Fee: '12' })),
} as any;

describe('StablecoinGateway', () => {
  let gw: StablecoinGateway;

  beforeEach(() => {
    gw = new StablecoinGateway(mockClient);
    jest.clearAllMocks();
  });

  test('instantiates without error', () => {
    expect(gw).toBeInstanceOf(StablecoinGateway);
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    gw.on('deposit', handler);
    gw.emit('deposit', { amount: '1000', currency: 'USD' });
    expect(handler).toHaveBeenCalledWith({ amount: '1000', currency: 'USD' });
  });
});
