/**
 * AgentEngine unit tests
 */
import { AgentEngine } from '../src';

describe('AgentEngine', () => {
  let engine: AgentEngine;

  beforeEach(() => {
    engine = new AgentEngine();
  });

  test('instantiates without error', () => {
    expect(engine).toBeInstanceOf(AgentEngine);
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    engine.on('strategy:executed', handler);
    engine.emit('strategy:executed', { strategy: 'TWAP' });
    expect(handler).toHaveBeenCalled();
  });
});
