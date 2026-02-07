import { XRPLClient } from '../client';

describe('XRPLClient', () => {
  it('should instantiate with config object', () => {
    const client = new XRPLClient({
      network: 'testnet',
      urls: {
        testnet: 'wss://s.altnet.rippletest.net:51233',
        mainnet: 'wss://xrplcluster.com',
      },
    });
    expect(client).toBeDefined();
  });

  it('should hex encode strings', () => {
    const encoded = XRPLClient.hexEncode('test');
    expect(encoded).toBe('74657374');
  });

  it('should hex decode strings', () => {
    const decoded = XRPLClient.hexDecode('74657374');
    expect(decoded).toBe('test');
  });

  it('should roundtrip hex encode/decode', () => {
    const original = 'OPTKAS Bond Funding v1';
    const encoded = XRPLClient.hexEncode(original);
    const decoded = XRPLClient.hexDecode(encoded);
    expect(decoded).toBe(original);
  });
});
