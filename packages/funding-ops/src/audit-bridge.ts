/**
 * @optkas/funding-ops — Audit Bridge
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Connects the funding operations lifecycle to the platform audit system.
 * Every significant state change in the tx-queue, funding pipeline, and
 * settlement connector is automatically recorded as a structured audit event.
 *
 * This module bridges:
 *   - TransactionQueue events → AuditEventStore
 *   - FundingPipeline phase transitions → AuditEventStore
 *   - Settlement lifecycle events → AuditEventStore
 *
 * All events are:
 *   - SHA-256 hashed at creation
 *   - Assigned monotonic sequence numbers
 *   - Classified by compliance gate relevance
 *   - Tagged for ledger attestation (XRPL memo / Stellar ManageData)
 *
 * The audit bridge is the single point of truth for "what happened" across
 * the entire funding + settlement lifecycle.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────

export type AuditSeverity = 'info' | 'warning' | 'critical';

export type AuditCategory =
  | 'tx_lifecycle'
  | 'funding_pipeline'
  | 'settlement'
  | 'governance'
  | 'compliance'
  | 'attestation'
  | 'reconciliation'
  | 'system';

export type AuditAnchorTarget = 'xrpl' | 'stellar' | 'both' | 'none';

export interface AuditBridgeEvent {
  id: string;
  sequenceNumber: number;
  timestamp: string;
  category: AuditCategory;
  severity: AuditSeverity;
  source: string;
  actor: {
    role: string;
    identifier: string;
  };
  operation: {
    type: string;
    description: string;
    layer: number;
    component: string;
  };
  details: Record<string, unknown>;
  ledgerEvidence: {
    xrpl?: {
      txHash?: string;
      ledgerIndex?: number;
      network: 'testnet' | 'mainnet';
    };
    stellar?: {
      txHash?: string;
      ledgerSequence?: number;
      network: 'testnet' | 'mainnet';
    };
  };
  attestation: {
    sha256: string;
    anchorTarget: AuditAnchorTarget;
    anchored: boolean;
    anchoredAt?: string;
  };
  compliance: {
    gatesChecked: string[];
    result: 'pass' | 'fail' | 'not_applicable';
  };
  references: {
    txId?: string;
    pipelineId?: string;
    settlementId?: string;
    bondId?: string;
    escrowId?: string;
  };
}

export interface AuditBridgeConfig {
  network: 'testnet' | 'mainnet';
  persistPath?: string;
  maxEvents?: number;
  autoAnchor?: boolean;
  retentionDays?: number;
}

export interface AuditBridgeSummary {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  lastEventAt: string | null;
  oldestEventAt: string | null;
  unanchoredCount: number;
  compliancePassRate: number;
  txLifecycleEvents: number;
  fundingPipelineEvents: number;
  settlementEvents: number;
}

export interface AuditBridgeStats {
  eventsRecorded: number;
  eventsAnchored: number;
  compliancePasses: number;
  complianceFails: number;
  criticalEvents: number;
  categoryCounts: Record<string, number>;
}

// ─── Audit Bridge ────────────────────────────────────────────────

export class AuditBridge extends EventEmitter {
  private events: AuditBridgeEvent[] = [];
  private sequenceCounter = 0;
  private config: Required<AuditBridgeConfig>;
  private stats: AuditBridgeStats;

  constructor(config?: AuditBridgeConfig) {
    super();
    this.config = {
      network: config?.network ?? 'testnet',
      persistPath: config?.persistPath ?? './logs/audit-bridge.json',
      maxEvents: config?.maxEvents ?? 100_000,
      autoAnchor: config?.autoAnchor ?? false,
      retentionDays: config?.retentionDays ?? 2555, // ~7 years
    };
    this.stats = {
      eventsRecorded: 0,
      eventsAnchored: 0,
      compliancePasses: 0,
      complianceFails: 0,
      criticalEvents: 0,
      categoryCounts: {},
    };
    this.loadFromDisk();
  }

  // ─── Event Recording ────────────────────────────────────────────

  /**
   * Record a new audit event from the funding operations lifecycle.
   * Returns the fully formed, hashed event.
   */
  record(params: {
    category: AuditCategory;
    severity: AuditSeverity;
    source: string;
    actorRole: string;
    actorIdentifier: string;
    operationType: string;
    operationDescription: string;
    layer: number;
    component: string;
    details: Record<string, unknown>;
    complianceGates?: string[];
    complianceResult?: 'pass' | 'fail' | 'not_applicable';
    anchorTarget?: AuditAnchorTarget;
    references?: AuditBridgeEvent['references'];
    ledgerEvidence?: AuditBridgeEvent['ledgerEvidence'];
  }): AuditBridgeEvent {
    const now = new Date().toISOString();
    const seq = ++this.sequenceCounter;

    const event: AuditBridgeEvent = {
      id: `ABE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      sequenceNumber: seq,
      timestamp: now,
      category: params.category,
      severity: params.severity,
      source: params.source,
      actor: {
        role: params.actorRole,
        identifier: params.actorIdentifier,
      },
      operation: {
        type: params.operationType,
        description: params.operationDescription,
        layer: params.layer,
        component: params.component,
      },
      details: params.details,
      ledgerEvidence: params.ledgerEvidence ?? {
        xrpl: { network: this.config.network },
        stellar: { network: this.config.network },
      },
      attestation: {
        sha256: '',
        anchorTarget: params.anchorTarget ?? 'both',
        anchored: false,
      },
      compliance: {
        gatesChecked: params.complianceGates ?? [],
        result: params.complianceResult ?? 'not_applicable',
      },
      references: params.references ?? {},
    };

    // Compute SHA-256 hash of the event (excluding the hash field)
    const hashable = { ...event, attestation: { ...event.attestation, sha256: '' } };
    event.attestation.sha256 = crypto
      .createHash('sha256')
      .update(JSON.stringify(hashable))
      .digest('hex');

    this.events.push(event);
    this.updateStats(event);
    this.emit('event_recorded', event);

    // Trim if at capacity
    if (this.events.length > this.config.maxEvents) {
      const removed = this.events.shift();
      if (removed) this.emit('event_evicted', removed);
    }

    this.persist();
    return event;
  }

  // ─── TX Queue Integration ─────────────────────────────────────

  /**
   * Record a tx-queue lifecycle event.
   * Call this for: enqueued, signed, ready, submitted, confirmed, failed, cancelled, expired
   */
  recordTxEvent(params: {
    txId: string;
    pipelineId: string;
    eventType: string;
    ledger: 'xrpl' | 'stellar';
    description: string;
    actorRole: string;
    actorIdentifier: string;
    details: Record<string, unknown>;
    txHash?: string;
  }): AuditBridgeEvent {
    return this.record({
      category: 'tx_lifecycle',
      severity: params.eventType === 'failed' ? 'critical'
        : params.eventType === 'expired' || params.eventType === 'cancelled' ? 'warning'
        : 'info',
      source: 'TransactionQueue',
      actorRole: params.actorRole,
      actorIdentifier: params.actorIdentifier,
      operationType: `tx_${params.eventType}`,
      operationDescription: params.description,
      layer: 3,
      component: 'funding-ops/tx-queue',
      details: {
        ...params.details,
        ledger: params.ledger,
      },
      anchorTarget: params.eventType === 'confirmed' ? 'both' : 'none',
      references: {
        txId: params.txId,
        pipelineId: params.pipelineId,
      },
      ledgerEvidence: params.txHash ? {
        [params.ledger]: {
          txHash: params.txHash,
          network: this.config.network,
        },
      } : undefined,
    });
  }

  // ─── Funding Pipeline Integration ──────────────────────────────

  /**
   * Record a funding pipeline phase transition.
   */
  recordPipelineEvent(params: {
    pipelineId: string;
    phase: string;
    status: string;
    description: string;
    transactionCount: number;
    details: Record<string, unknown>;
  }): AuditBridgeEvent {
    return this.record({
      category: 'funding_pipeline',
      severity: params.status === 'failed' ? 'critical'
        : params.status === 'paused' ? 'warning'
        : 'info',
      source: 'FundingPipeline',
      actorRole: 'automation',
      actorIdentifier: 'funding-pipeline',
      operationType: `pipeline_${params.status}`,
      operationDescription: params.description,
      layer: 3,
      component: 'funding-ops/pipeline',
      details: {
        ...params.details,
        phase: params.phase,
        transactionCount: params.transactionCount,
      },
      complianceGates: ['pipeline_authorization', 'pause_check'],
      complianceResult: params.status === 'failed' ? 'fail' : 'pass',
      anchorTarget: params.status === 'completed' ? 'both' : 'none',
      references: {
        pipelineId: params.pipelineId,
      },
    });
  }

  // ─── Settlement Integration ────────────────────────────────────

  /**
   * Record a settlement lifecycle event.
   */
  recordSettlementEvent(params: {
    settlementId: string;
    eventType: string;
    model: string;
    buyer: string;
    seller: string;
    status: string;
    description: string;
    details: Record<string, unknown>;
    bondId?: string;
    txHash?: string;
  }): AuditBridgeEvent {
    const isFinal = ['settled', 'failed', 'disputed'].includes(params.status);
    return this.record({
      category: 'settlement',
      severity: params.status === 'failed' || params.status === 'disputed' ? 'critical'
        : params.status === 'settling' ? 'warning'
        : 'info',
      source: 'SettlementConnector',
      actorRole: 'automation',
      actorIdentifier: 'settlement-engine',
      operationType: `settlement_${params.eventType}`,
      operationDescription: params.description,
      layer: 3,
      component: 'funding-ops/settlement-connector',
      details: {
        ...params.details,
        model: params.model,
        buyer: params.buyer,
        seller: params.seller,
      },
      complianceGates: ['settlement_authorization', 'dvp_validation', 'pause_check'],
      complianceResult: params.status === 'failed' ? 'fail' : 'pass',
      anchorTarget: isFinal ? 'both' : 'none',
      references: {
        settlementId: params.settlementId,
        bondId: params.bondId,
      },
    });
  }

  // ─── Governance Integration ────────────────────────────────────

  /**
   * Record a governance event (signer action, pause, rotation).
   */
  recordGovernanceEvent(params: {
    actionType: string;
    signerRole: string;
    signerIdentifier: string;
    description: string;
    details: Record<string, unknown>;
  }): AuditBridgeEvent {
    return this.record({
      category: 'governance',
      severity: params.actionType === 'emergency_pause' ? 'critical'
        : params.actionType.includes('rotation') ? 'warning'
        : 'info',
      source: 'GovernanceModule',
      actorRole: params.signerRole,
      actorIdentifier: params.signerIdentifier,
      operationType: `governance_${params.actionType}`,
      operationDescription: params.description,
      layer: 4,
      component: 'governance/multisig',
      details: params.details,
      complianceGates: ['governance_authorization', 'quorum_validation'],
      complianceResult: 'pass',
      anchorTarget: 'both',
    });
  }

  // ─── Attestation Tracking ──────────────────────────────────────

  /**
   * Mark an event as anchored on a ledger.
   */
  markAnchored(eventId: string, ledger: 'xrpl' | 'stellar', txHash: string): void {
    const event = this.events.find(e => e.id === eventId);
    if (!event) throw new Error(`Audit event not found: ${eventId}`);

    if (ledger === 'xrpl' && event.ledgerEvidence.xrpl) {
      event.ledgerEvidence.xrpl.txHash = txHash;
    } else if (ledger === 'stellar' && event.ledgerEvidence.stellar) {
      event.ledgerEvidence.stellar.txHash = txHash;
    }

    // Check if fully anchored
    const target = event.attestation.anchorTarget;
    const hasXrpl = !!event.ledgerEvidence.xrpl?.txHash;
    const hasStellar = !!event.ledgerEvidence.stellar?.txHash;

    if (
      (target === 'xrpl' && hasXrpl) ||
      (target === 'stellar' && hasStellar) ||
      (target === 'both' && hasXrpl && hasStellar)
    ) {
      event.attestation.anchored = true;
      event.attestation.anchoredAt = new Date().toISOString();
      this.stats.eventsAnchored++;
      this.emit('event_anchored', event);
    }

    this.persist();
  }

  // ─── Queries ───────────────────────────────────────────────────

  /**
   * Get event by ID.
   */
  getEvent(eventId: string): AuditBridgeEvent | undefined {
    return this.events.find(e => e.id === eventId);
  }

  /**
   * Get events by category.
   */
  byCategory(category: AuditCategory): AuditBridgeEvent[] {
    return this.events.filter(e => e.category === category);
  }

  /**
   * Get events by severity.
   */
  bySeverity(severity: AuditSeverity): AuditBridgeEvent[] {
    return this.events.filter(e => e.severity === severity);
  }

  /**
   * Get events by date range.
   */
  byDateRange(from: string, to: string): AuditBridgeEvent[] {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.events.filter(e => {
      const d = new Date(e.timestamp);
      return d >= fromDate && d <= toDate;
    });
  }

  /**
   * Get events by reference (txId, pipelineId, settlementId, etc.).
   */
  byReference(refKey: keyof AuditBridgeEvent['references'], refValue: string): AuditBridgeEvent[] {
    return this.events.filter(e => e.references[refKey] === refValue);
  }

  /**
   * Get all unanchored events that need attestation.
   */
  getUnanchored(): AuditBridgeEvent[] {
    return this.events.filter(
      e => e.attestation.anchorTarget !== 'none' && !e.attestation.anchored
    );
  }

  /**
   * Get all critical events.
   */
  getCritical(): AuditBridgeEvent[] {
    return this.events.filter(e => e.severity === 'critical');
  }

  /**
   * Get all events.
   */
  getAll(): AuditBridgeEvent[] {
    return [...this.events];
  }

  /**
   * Get event count.
   */
  get count(): number {
    return this.events.length;
  }

  // ─── Summary & Stats ──────────────────────────────────────────

  /**
   * Get a summary of the audit bridge state.
   */
  getSummary(): AuditBridgeSummary {
    const eventsByCategory: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    let compliancePasses = 0;
    let complianceTotal = 0;
    let unanchored = 0;

    for (const event of this.events) {
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;

      if (event.compliance.result !== 'not_applicable') {
        complianceTotal++;
        if (event.compliance.result === 'pass') compliancePasses++;
      }

      if (event.attestation.anchorTarget !== 'none' && !event.attestation.anchored) {
        unanchored++;
      }
    }

    return {
      totalEvents: this.events.length,
      eventsByCategory,
      eventsBySeverity,
      lastEventAt: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null,
      oldestEventAt: this.events.length > 0 ? this.events[0].timestamp : null,
      unanchoredCount: unanchored,
      compliancePassRate: complianceTotal > 0 ? compliancePasses / complianceTotal : 1,
      txLifecycleEvents: eventsByCategory['tx_lifecycle'] || 0,
      fundingPipelineEvents: eventsByCategory['funding_pipeline'] || 0,
      settlementEvents: eventsByCategory['settlement'] || 0,
    };
  }

  /**
   * Get running stats.
   */
  getStats(): AuditBridgeStats {
    return { ...this.stats };
  }

  // ─── Persistence ───────────────────────────────────────────────

  private persist(): void {
    try {
      const dir = path.dirname(this.config.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        sequenceCounter: this.sequenceCounter,
        stats: this.stats,
        events: this.events,
      };
      fs.writeFileSync(this.config.persistPath, JSON.stringify(data, null, 2));
    } catch (err) {
      this.emit('persist_error', err);
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.config.persistPath)) {
        const raw = fs.readFileSync(this.config.persistPath, 'utf-8');
        const data = JSON.parse(raw);
        this.events = data.events || [];
        this.sequenceCounter = data.sequenceCounter || 0;
        this.stats = data.stats || this.stats;
      }
    } catch (err) {
      this.emit('load_error', err);
    }
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private updateStats(event: AuditBridgeEvent): void {
    this.stats.eventsRecorded++;
    this.stats.categoryCounts[event.category] =
      (this.stats.categoryCounts[event.category] || 0) + 1;

    if (event.severity === 'critical') this.stats.criticalEvents++;

    if (event.compliance.result === 'pass') this.stats.compliancePasses++;
    if (event.compliance.result === 'fail') this.stats.complianceFails++;
  }
}

export default AuditBridge;
