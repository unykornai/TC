import { XRPLClient } from '../client';

describe('XRPLClient', () => {
  it('should instantiate with testnet URL', () => {
    const client = new XRPLClient('wss://s.altnet.rippletest.net:51233');
    expect(client).toBeDefined();
  });

  it('should convert XRP to drops', () => {
    expect(XRPLClient.xrpToDrops('1')).toBe('1000000');
    expect(XRPLClient.xrpToDrops('0.5')).toBe('500000');
    expect(XRPLClient.xrpToDrops('100')).toBe('100000000');
  });

  it('should convert drops to XRP', () => {
    expect(XRPLClient.dropsToXrp('1000000')).toBe('1');
    expect(XRPLClient.dropsToXrp('500000')).toBe('0.5');
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
