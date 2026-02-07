/**
 * MultisigGovernor unit tests
 */
import { MultisigGovernor } from '../src';

describe('MultisigGovernor', () => {
  let gov: MultisigGovernor;

  beforeEach(() => {
    gov = new MultisigGovernor({
      threshold: 2,
      totalSigners: 3,
      quorumForConfigChange: 3,
    });
  });

  test('instantiates with config', () => {
    expect(gov).toBeInstanceOf(MultisigGovernor);
  });

  test('instantiates with defaults', () => {
    const g2 = new MultisigGovernor();
    expect(g2).toBeInstanceOf(MultisigGovernor);
  });

  test('getSigner returns undefined for unknown id', () => {
    const signer = gov.getSigner('nonexistent');
    expect(signer).toBeUndefined();
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    gov.on('proposal:created', handler);
    gov.emit('proposal:created', { id: 'P001' });
    expect(handler).toHaveBeenCalled();
  });
});
