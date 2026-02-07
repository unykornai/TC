import { AuditEventStore, ReportGenerator } from '../report';

const makeEvent = (type: any, actor = 'test') => ({
  type,
  timestamp: new Date().toISOString(),
  actor: { role: actor, identifier: `${actor}-id` },
  operation: { description: 'test op', layer: 3, component: 'test' },
  details: {},
  ledgerEvidence: {},
  compliance: { gatesChecked: [], result: 'pass' as const },
});

describe('AuditEventStore', () => {
  let store: AuditEventStore;

  beforeEach(() => {
    store = new AuditEventStore();
  });

  it('should record events', () => {
    store.record(makeEvent('iou_issued'));
    const events = store.queryByType('iou_issued');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('iou_issued');
  });

  it('should auto-generate event IDs', () => {
    store.record(makeEvent('escrow_created'));
    const events = store.queryByType('escrow_created');
    expect(events[0].id).toBeDefined();
    expect(events[0].id.length).toBeGreaterThan(0);
  });

  it('should auto-hash events', () => {
    store.record(makeEvent('attestation_anchored'));
    const events = store.queryByType('attestation_anchored');
    expect(events[0].attestation.sha256).toBeDefined();
    expect(events[0].attestation.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should filter by type', () => {
    store.record(makeEvent('iou_issued', 'a'));
    store.record(makeEvent('escrow_created', 'b'));
    store.record(makeEvent('iou_issued', 'c'));
    const events = store.queryByType('iou_issued');
    expect(events).toHaveLength(2);
  });
});

describe('ReportGenerator', () => {
  it('should generate reports', () => {
    const store = new AuditEventStore();
    store.record(makeEvent('iou_issued'));

    const generator = new ReportGenerator(store);
    const report = generator.generate({
      type: 'full',
      from: '2026-01-01',
      to: '2026-12-31',
      network: 'testnet',
    });

    expect(report).toBeDefined();
    expect(report.metadata.type).toBe('full');
    expect(report.events.length).toBeGreaterThanOrEqual(0);
  });
});
