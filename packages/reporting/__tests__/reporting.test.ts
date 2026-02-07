/**
 * ReportingEngine unit tests
 */
import { ReportingEngine } from '../src';

describe('ReportingEngine', () => {
  let engine: ReportingEngine;

  beforeEach(() => {
    engine = new ReportingEngine();
  });

  test('instantiates without error', () => {
    expect(engine).toBeInstanceOf(ReportingEngine);
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    engine.on('report:generated', handler);
    engine.emit('report:generated', { type: 'investor_statement' });
    expect(handler).toHaveBeenCalled();
  });
});
