import { AuditEventStore, ReportGenerator } from '../report';

describe('AuditEventStore', () => {
  let store: AuditEventStore;

  beforeEach(() => {
    store = new AuditEventStore();
  });

  it('should record events', () => {
    store.record({
      type: 'TOKEN_ISSUED',
      actor: 'test-actor',
      resource: 'OPTKAS.BOND',
      action: 'issue',
      details: { amount: '1000' }
    });

    const events = store.query({});
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('TOKEN_ISSUED');
  });

  it('should auto-generate event IDs', () => {
    store.record({
      type: 'ESCROW_CREATED',
      actor: 'test',
      resource: 'escrow-1',
      action: 'create',
      details: {}
    });

    const events = store.query({});
    expect(events[0].id).toBeDefined();
    expect(events[0].id.length).toBeGreaterThan(0);
  });

  it('should auto-hash events', () => {
    store.record({
      type: 'HASH_ATTESTED',
      actor: 'test',
      resource: 'doc-1',
      action: 'attest',
      details: {}
    });

    const events = store.query({});
    expect(events[0].hash).toBeDefined();
    expect(events[0].hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should filter by type', () => {
    store.record({ type: 'TOKEN_ISSUED', actor: 'a', resource: 'r', action: 'issue', details: {} });
    store.record({ type: 'ESCROW_CREATED', actor: 'b', resource: 'r', action: 'create', details: {} });
    store.record({ type: 'TOKEN_ISSUED', actor: 'c', resource: 'r', action: 'issue', details: {} });

    const events = store.query({ type: 'TOKEN_ISSUED' });
    expect(events).toHaveLength(2);
  });
});

describe('ReportGenerator', () => {
  it('should generate reports', () => {
    const store = new AuditEventStore();
    store.record({ type: 'TOKEN_ISSUED', actor: 'test', resource: 'BOND', action: 'issue', details: {} });

    const generator = new ReportGenerator(store);
    const report = generator.generate({
      type: 'full',
      period: { from: '2026-01-01', to: '2026-12-31' },
      network: 'testnet'
    });

    expect(report).toBeDefined();
    expect(report.metadata.report_type).toBe('full');
    expect(report.events.length).toBeGreaterThanOrEqual(0);
  });
});
