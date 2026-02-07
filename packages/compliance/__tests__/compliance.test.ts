/**
 * ComplianceEngine unit tests
 */
import { ComplianceEngine } from '../src';

describe('ComplianceEngine', () => {
  let engine: ComplianceEngine;

  beforeEach(() => {
    engine = new ComplianceEngine();
  });

  test('instantiates without error', () => {
    expect(engine).toBeInstanceOf(ComplianceEngine);
  });

  test('getCovenant returns undefined for unknown id', () => {
    const cov = engine.getCovenant('nonexistent');
    expect(cov).toBeUndefined();
  });

  test('is an EventEmitter', () => {
    const handler = jest.fn();
    engine.on('kyc:approved', handler);
    engine.emit('kyc:approved', { entity: 'TEST' });
    expect(handler).toHaveBeenCalled();
  });
});
