/**
 * Issuer + TrustlineManager unit tests
 */
import { Issuer, TrustlineManager } from '../src';

const mockClient = {
  isConnected: () => true,
  getNetwork: () => 'testnet',
  request: jest.fn().mockResolvedValue({ result: {} }),
  submit: jest.fn().mockResolvedValue({ result: { engine_result: 'tesSUCCESS' } }),
  autofill: jest.fn().mockImplementation((tx: any) => Promise.resolve({ ...tx, Sequence: 1, Fee: '12' })),
} as any;

describe('Issuer', () => {
  let issuer: Issuer;

  beforeEach(() => {
    issuer = new Issuer(mockClient);
    jest.clearAllMocks();
  });

  test('instantiates without error', () => {
    expect(issuer).toBeInstanceOf(Issuer);
  });

  test('emits events', () => {
    const handler = jest.fn();
    issuer.on('issuance', handler);
    issuer.emit('issuance', { token: 'OPTKAS.BOND', amount: '1000' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('TrustlineManager', () => {
  let tm: TrustlineManager;

  beforeEach(() => {
    tm = new TrustlineManager(mockClient);
  });

  test('instantiates without error', () => {
    expect(tm).toBeInstanceOf(TrustlineManager);
  });
});
