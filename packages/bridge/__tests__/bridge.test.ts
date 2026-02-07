/**
 * BridgeManager unit tests
 */
import { BridgeManager } from '../src';

describe('BridgeManager', () => {
  let bridge: BridgeManager;

  beforeEach(() => {
    bridge = new BridgeManager();
  });

  test('instantiates without error', () => {
    expect(bridge).toBeInstanceOf(BridgeManager);
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    bridge.on('transfer:initiated', handler);
    bridge.emit('transfer:initiated', { from: 'xrpl', to: 'stellar' });
    expect(handler).toHaveBeenCalled();
  });
});
