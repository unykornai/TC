/**
 * @optkas/audit — Audit Report Generation
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Generates structured, institution-grade audit reports.
 * Reports are hash-attested on public ledgers for independent verifiability.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ───────────────────────────────────────────────────────────

export type AuditEventType =
  | 'iou_issued'
  | 'iou_transferred'
  | 'iou_burned'
  | 'escrow_created'
  | 'escrow_released'
  | 'escrow_cancelled'
  | 'attestation_anchored'
  | 'compliance_check_passed'
  | 'compliance_check_failed'
  | 'signer_approved'
  | 'multisig_executed'
  | 'config_changed'
  | 'emergency_pause'
  | 'emergency_resume'
  | 'audit_report_generated';

export type ReportType =
  | 'full'
  | 'transaction'
  | 'compliance'
  | 'governance'
  | 'risk'
  | 'sanctions'
  | 'regulatory'
  | 'annual';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  timestamp: string;
  sequenceNumber: number;
  actor: {
    role: string;
    identifier: string;
  };
  operation: {
    description: string;
    layer: number;
    component: string;
  };
  details: Record<string, unknown>;
  ledgerEvidence: {
    xrpl?: {
      txHash: string;
      ledgerIndex: number;
      network: 'testnet' | 'mainnet';
    };
    stellar?: {
      txHash: string;
      ledgerSequence: number;
      network: 'testnet' | 'mainnet';
    };
  };
  attestation: {
    sha256: string;
    anchoredOn: ('xrpl' | 'stellar')[];
  };
  compliance: {
    gatesChecked: string[];
    result: 'pass' | 'fail' | 'not_applicable';
  };
}

export interface AuditReport {
  metadata: {
    reportId: string;
    type: ReportType;
    generatedAt: string;
    generatedBy: string;
    dateRange: { from: string; to: string };
    network: 'testnet' | 'mainnet';
    eventCount: number;
    sha256: string;
  };
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    compliancePassRate: number;
    governanceActions: number;
    attestationsAnchored: number;
  };
  events: AuditEvent[];
  reconciliation: {
    xrplIousOutstanding: string;
    stellarAssetsOutstanding: string;
    escrowsActive: number;
    discrepancies: unknown[];
  };
  attestation: {
    reportHash: string;
    xrplTxHash?: string;
    stellarTxHash?: string;
  };
}

// ─── Audit Event Store ───────────────────────────────────────────────

export class AuditEventStore {
  private events: AuditEvent[] = [];
  private sequenceCounter = 0;

  /**
   * Record a new audit event.
   */
  record(event: Omit<AuditEvent, 'id' | 'sequenceNumber' | 'attestation'>): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      id: uuidv4(),
      sequenceNumber: ++this.sequenceCounter,
      attestation: {
        sha256: '',
        anchoredOn: [],
      },
    };

    // Compute hash of the event data (excluding the hash itself)
    const hashable = { ...fullEvent };
    hashable.attestation = { sha256: '', anchoredOn: [] };
    fullEvent.attestation.sha256 = crypto
      .createHash('sha256')
      .update(JSON.stringify(hashable))
      .digest('hex');

    this.events.push(fullEvent);
    return fullEvent;
  }

  /**
   * Query events by type.
   */
  queryByType(type: AuditEventType): AuditEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Query events by date range.
   */
  queryByDateRange(from: string, to: string): AuditEvent[] {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.events.filter((e) => {
      const eventDate = new Date(e.timestamp);
      return eventDate >= fromDate && eventDate <= toDate;
    });
  }

  /**
   * Query events by report type filter.
   */
  queryForReport(reportType: ReportType, from: string, to: string): AuditEvent[] {
    const dateFiltered = this.queryByDateRange(from, to);

    const typeFilters: Record<ReportType, AuditEventType[]> = {
      full: [], // All events
      transaction: ['iou_issued', 'iou_transferred', 'iou_burned', 'escrow_created', 'escrow_released', 'escrow_cancelled'],
      compliance: ['compliance_check_passed', 'compliance_check_failed', 'attestation_anchored'],
      governance: ['signer_approved', 'multisig_executed', 'config_changed', 'emergency_pause', 'emergency_resume'],
      risk: ['escrow_created', 'escrow_released', 'escrow_cancelled', 'iou_issued', 'iou_burned'],
      sanctions: ['compliance_check_passed', 'compliance_check_failed'],
      regulatory: [], // All events
      annual: [], // All events
    };

    const filter = typeFilters[reportType];
    if (filter.length === 0) return dateFiltered;
    return dateFiltered.filter((e) => filter.includes(e.type));
  }

  /**
   * Get all events.
   */
  getAll(): AuditEvent[] {
    return [...this.events];
  }

  /**
   * Get event count.
   */
  get count(): number {
    return this.events.length;
  }
}

// ─── Report Generator ────────────────────────────────────────────────

export class ReportGenerator {
  private store: AuditEventStore;

  constructor(store: AuditEventStore) {
    this.store = store;
  }

  /**
   * Generate an audit report.
   */
  generate(options: {
    type: ReportType;
    from: string;
    to: string;
    network: 'testnet' | 'mainnet';
  }): AuditReport {
    const events = this.store.queryForReport(options.type, options.from, options.to);

    // Compute summary
    const eventsByType: Record<string, number> = {};
    let compliancePasses = 0;
    let complianceTotal = 0;
    let governanceActions = 0;
    let attestations = 0;

    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      if (event.compliance.result !== 'not_applicable') {
        complianceTotal++;
        if (event.compliance.result === 'pass') compliancePasses++;
      }

      if (['signer_approved', 'multisig_executed', 'config_changed', 'emergency_pause', 'emergency_resume'].includes(event.type)) {
        governanceActions++;
      }

      if (event.type === 'attestation_anchored') {
        attestations++;
      }
    }

    const report: AuditReport = {
      metadata: {
        reportId: uuidv4(),
        type: options.type,
        generatedAt: new Date().toISOString(),
        generatedBy: 'OPTKAS-AUDIT-SYSTEM',
        dateRange: { from: options.from, to: options.to },
        network: options.network,
        eventCount: events.length,
        sha256: '', // Computed below
      },
      summary: {
        totalEvents: events.length,
        eventsByType,
        compliancePassRate: complianceTotal > 0 ? compliancePasses / complianceTotal : 1,
        governanceActions,
        attestationsAnchored: attestations,
      },
      events,
      reconciliation: {
        xrplIousOutstanding: '0',
        stellarAssetsOutstanding: '0',
        escrowsActive: 0,
        discrepancies: [],
      },
      attestation: {
        reportHash: '',
      },
    };

    // Compute report hash
    const hashable = JSON.stringify({ ...report, metadata: { ...report.metadata, sha256: '' } });
    report.metadata.sha256 = crypto.createHash('sha256').update(hashable).digest('hex');
    report.attestation.reportHash = report.metadata.sha256;

    return report;
  }

  /**
   * Save report to file.
   */
  saveReport(report: AuditReport, outputDir: string): string {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '').substring(0, 15);
    const fileName = `audit_${report.metadata.type}_${dateStr}.json`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    return filePath;
  }
}

export default ReportGenerator;
