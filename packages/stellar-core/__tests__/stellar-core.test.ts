/**
 * StellarClient unit tests
 */
import { StellarClient } from '../src';

describe('StellarClient', () => {
  let client: StellarClient;

  beforeEach(() => {
    client = new StellarClient({ network: 'testnet' });
  });

  test('instantiates with testnet config', () => {
    expect(client).toBeInstanceOf(StellarClient);
  });

  test('defaults to testnet', () => {
    const c2 = new StellarClient();
    expect(c2).toBeInstanceOf(StellarClient);
  });

  test('accepts mainnet config', () => {
    const c3 = new StellarClient({ network: 'mainnet' });
    expect(c3).toBeInstanceOf(StellarClient);
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    client.on('connected', handler);
    client.emit('connected');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
