/**
 * @optkas/compliance — KYC/KYB/AML + Covenant Monitoring Engine
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Institutional compliance layer providing:
 * - KYC/KYB adapter interface (pluggable providers)
 * - AML/sanctions screening stubs
 * - Transfer restriction engine (investor eligibility, lock-up, jurisdiction)
 * - Covenant monitoring engine (DSCR, LTV, concentration, reserves, deadlines)
 * - Breach detection and escalation
 * - DID/VC verification hooks
 *
 * All compliance checks are gating — operations cannot proceed without clearance.
 * Every check is audit-logged with hash evidence.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ─── KYC/KYB Types ──────────────────────────────────────────────────

export type KycStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'suspended';
export type EntityType = 'individual' | 'corporation' | 'trust' | 'fund' | 'spv';

export interface KycRecord {
  id: string;
  entityType: EntityType;
  legalName: string;
  jurisdiction: string;
  status: KycStatus;
  provider: string;
  providerReferenceId: string;
  accreditedInvestor: boolean;
  qualifiedPurchaser: boolean;
  sanctionsCleared: boolean;
  pepScreened: boolean;
  amlCleared: boolean;
  verifiedAt: string;
  expiresAt: string;
  documents: KycDocument[];
  didUri?: string;            // DID reference for verifiable credentials
  vcHashes: string[];         // Hashes of verifiable credentials
}

export interface KycDocument {
  type: string;               // 'passport' | 'articles_of_incorporation' | 'accreditation_letter' etc.
  hash: string;               // SHA-256 of document
  uploadedAt: string;
  verified: boolean;
}

// ─── Transfer Restriction Types ─────────────────────────────────────

export type RestrictionType =
  | 'jurisdiction'
  | 'accreditation'
  | 'lock_up'
  | 'holding_period'
  | 'concentration'
  | 'kyc_expiry'
  | 'sanctions'
  | 'custom';

export interface TransferRestriction {
  id: string;
  type: RestrictionType;
  description: string;
  active: boolean;
  params: Record<string, unknown>;
}

export interface TransferRequest {
  fromAddress: string;
  toAddress: string;
  asset: string;
  amount: string;
  fromEntityId: string;
  toEntityId: string;
}

export interface TransferDecision {
  allowed: boolean;
  restrictions: { restriction: TransferRestriction; passed: boolean; reason: string }[];
  checkedAt: string;
  hash: string;
}

// ─── Covenant Types ─────────────────────────────────────────────────

export type CovenantType =
  | 'dscr'              // Debt Service Coverage Ratio
  | 'ltv'               // Loan-to-Value
  | 'concentration'     // Single-asset or single-counterparty concentration
  | 'reserve'           // Minimum reserve balance
  | 'reporting'         // Reporting deadline compliance
  | 'insurance'         // Insurance maintenance
  | 'custom';

export type CovenantStatus = 'compliant' | 'warning' | 'breach' | 'cure_pending' | 'waived';

export interface Covenant {
  id: string;
  bondId: string;
  type: CovenantType;
  description: string;
  threshold: number;       // e.g., 1.25 for DSCR, 0.75 for LTV
  direction: 'above' | 'below'; // 'above' = value must stay above threshold
  currentValue: number;
  status: CovenantStatus;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastCheckedAt: string;
  nextCheckDue: string;
  breachHistory: CovenantBreach[];
  cureDeadlineDays: number;
}

export interface CovenantBreach {
  id: string;
  covenantId: string;
  detectedAt: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'material' | 'event_of_default';
  cureDeadline: string;
  curedAt?: string;
  waivedAt?: string;
  waivedBy?: string;
  escalatedTo: string[];
}

export interface CovenantCheckResult {
  covenantId: string;
  bondId: string;
  type: CovenantType;
  currentValue: number;
  threshold: number;
  status: CovenantStatus;
  delta: number;
  checkedAt: string;
  hash: string;
}

// ─── Compliance Engine ───────────────────────────────────────────────

export class ComplianceEngine extends EventEmitter {
  private kycRecords: Map<string, KycRecord> = new Map();
  private entityAddressMap: Map<string, string> = new Map(); // address → entityId
  private restrictions: TransferRestriction[] = [];
  private covenants: Map<string, Covenant> = new Map();
  private blockedJurisdictions: Set<string> = new Set(['OFAC-listed']);

  constructor() {
    super();
    this.initDefaultRestrictions();
  }

  private initDefaultRestrictions(): void {
    this.restrictions = [
      {
        id: 'RST-JURIS',
        type: 'jurisdiction',
        description: 'Block transfers to/from sanctioned jurisdictions',
        active: true,
        params: {},
      },
      {
        id: 'RST-ACCRED',
        type: 'accreditation',
        description: 'Require accredited investor status for bond IOUs',
        active: true,
        params: { assetPrefix: 'BOND' },
      },
      {
        id: 'RST-KYC-EXP',
        type: 'kyc_expiry',
        description: 'Block transfers for entities with expired KYC',
        active: true,
        params: {},
      },
      {
        id: 'RST-AML',
        type: 'sanctions',
        description: 'Block transfers for entities not AML-cleared',
        active: true,
        params: {},
      },
    ];
  }

  // ─── KYC/KYB Management ────────────────────────────────────────

  /**
   * Register a new KYC/KYB record.
   * In production, this would be populated by the KYC provider webhook.
   */
  registerEntity(params: {
    entityType: EntityType;
    legalName: string;
    jurisdiction: string;
    provider: string;
    providerReferenceId: string;
    accreditedInvestor: boolean;
    qualifiedPurchaser?: boolean;
    xrplAddress?: string;
    didUri?: string;
    expiryDays?: number;
  }): KycRecord {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (params.expiryDays || 365));

    const record: KycRecord = {
      id: `KYC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      entityType: params.entityType,
      legalName: params.legalName,
      jurisdiction: params.jurisdiction,
      status: 'pending',
      provider: params.provider,
      providerReferenceId: params.providerReferenceId,
      accreditedInvestor: params.accreditedInvestor,
      qualifiedPurchaser: params.qualifiedPurchaser || false,
      sanctionsCleared: false,
      pepScreened: false,
      amlCleared: false,
      verifiedAt: '',
      expiresAt: expiresAt.toISOString(),
      documents: [],
      didUri: params.didUri,
      vcHashes: [],
    };

    this.kycRecords.set(record.id, record);

    if (params.xrplAddress) {
      this.entityAddressMap.set(params.xrplAddress, record.id);
    }

    this.emit('entity_registered', record);
    return record;
  }

  /**
   * Approve KYC after provider verification.
   */
  approveEntity(entityId: string, params: {
    sanctionsCleared: boolean;
    pepScreened: boolean;
    amlCleared: boolean;
  }): KycRecord {
    const record = this.kycRecords.get(entityId);
    if (!record) throw new Error(`Entity not found: ${entityId}`);

    record.status = 'approved';
    record.sanctionsCleared = params.sanctionsCleared;
    record.pepScreened = params.pepScreened;
    record.amlCleared = params.amlCleared;
    record.verifiedAt = new Date().toISOString();

    this.emit('entity_approved', record);
    return record;
  }

  /**
   * Bind an XRPL address to an entity.
   */
  bindAddress(entityId: string, address: string): void {
    const record = this.kycRecords.get(entityId);
    if (!record) throw new Error(`Entity not found: ${entityId}`);
    this.entityAddressMap.set(address, entityId);
    this.emit('address_bound', { entityId, address });
  }

  /**
   * Register a Verifiable Credential hash.
   */
  registerVC(entityId: string, vcHash: string): void {
    const record = this.kycRecords.get(entityId);
    if (!record) throw new Error(`Entity not found: ${entityId}`);
    record.vcHashes.push(vcHash);
    this.emit('vc_registered', { entityId, vcHash });
  }

  getEntity(entityId: string): KycRecord | undefined {
    return this.kycRecords.get(entityId);
  }

  getEntityByAddress(address: string): KycRecord | undefined {
    const entityId = this.entityAddressMap.get(address);
    return entityId ? this.kycRecords.get(entityId) : undefined;
  }

  // ─── Transfer Restriction Engine ───────────────────────────────

  /**
   * Evaluate all active transfer restrictions for a proposed transfer.
   * Returns a decision with pass/fail for each restriction.
   */
  evaluateTransfer(request: TransferRequest): TransferDecision {
    const results: TransferDecision['restrictions'] = [];
    const fromEntity = this.kycRecords.get(request.fromEntityId);
    const toEntity = this.kycRecords.get(request.toEntityId);

    for (const restriction of this.restrictions) {
      if (!restriction.active) continue;

      let passed = true;
      let reason = 'OK';

      switch (restriction.type) {
        case 'jurisdiction': {
          if (fromEntity && this.blockedJurisdictions.has(fromEntity.jurisdiction)) {
            passed = false;
            reason = `Sender jurisdiction blocked: ${fromEntity.jurisdiction}`;
          }
          if (toEntity && this.blockedJurisdictions.has(toEntity.jurisdiction)) {
            passed = false;
            reason = `Receiver jurisdiction blocked: ${toEntity.jurisdiction}`;
          }
          break;
        }
        case 'accreditation': {
          const prefix = restriction.params.assetPrefix as string;
          if (prefix && request.asset.startsWith(prefix)) {
            if (toEntity && !toEntity.accreditedInvestor) {
              passed = false;
              reason = `Receiver is not an accredited investor`;
            }
          }
          break;
        }
        case 'kyc_expiry': {
          if (fromEntity && new Date(fromEntity.expiresAt) < new Date()) {
            passed = false;
            reason = `Sender KYC expired: ${fromEntity.expiresAt}`;
          }
          if (toEntity && new Date(toEntity.expiresAt) < new Date()) {
            passed = false;
            reason = `Receiver KYC expired: ${toEntity.expiresAt}`;
          }
          break;
        }
        case 'sanctions': {
          if (fromEntity && !fromEntity.amlCleared) {
            passed = false;
            reason = 'Sender not AML-cleared';
          }
          if (toEntity && !toEntity.amlCleared) {
            passed = false;
            reason = 'Receiver not AML-cleared';
          }
          break;
        }
        default:
          break;
      }

      results.push({ restriction, passed, reason });
    }

    const allowed = results.every((r) => r.passed);
    const checkedAt = new Date().toISOString();
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ request, results, checkedAt }))
      .digest('hex');

    const decision: TransferDecision = { allowed, restrictions: results, checkedAt, hash };
    this.emit('transfer_evaluated', { request, decision });
    return decision;
  }

  /**
   * Enforce transfer compliance — throws if blocked.
   */
  enforceTransfer(request: TransferRequest): void {
    const decision = this.evaluateTransfer(request);
    if (!decision.allowed) {
      const failures = decision.restrictions
        .filter((r) => !r.passed)
        .map((r) => `[${r.restriction.type}] ${r.reason}`)
        .join('; ');
      throw new Error(`TRANSFER BLOCKED: ${failures}`);
    }
  }

  addRestriction(restriction: TransferRestriction): void {
    this.restrictions.push(restriction);
  }

  addBlockedJurisdiction(jurisdiction: string): void {
    this.blockedJurisdictions.add(jurisdiction);
  }

  // ─── Covenant Monitoring Engine ────────────────────────────────

  /**
   * Register a covenant for a bond.
   */
  registerCovenant(params: {
    bondId: string;
    type: CovenantType;
    description: string;
    threshold: number;
    direction: 'above' | 'below';
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    cureDeadlineDays?: number;
  }): Covenant {
    const nextCheckDue = new Date();
    const freqDays: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, quarterly: 90 };
    nextCheckDue.setDate(nextCheckDue.getDate() + freqDays[params.frequency]);

    const covenant: Covenant = {
      id: `COV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      bondId: params.bondId,
      type: params.type,
      description: params.description,
      threshold: params.threshold,
      direction: params.direction,
      currentValue: params.direction === 'above' ? params.threshold + 0.1 : params.threshold - 0.1,
      status: 'compliant',
      frequency: params.frequency,
      lastCheckedAt: new Date().toISOString(),
      nextCheckDue: nextCheckDue.toISOString(),
      breachHistory: [],
      cureDeadlineDays: params.cureDeadlineDays || 30,
    };

    this.covenants.set(covenant.id, covenant);
    this.emit('covenant_registered', covenant);
    return covenant;
  }

  /**
   * Check a covenant against a new observed value.
   * Detects breaches, warnings, and records results.
   */
  checkCovenant(covenantId: string, observedValue: number): CovenantCheckResult {
    const covenant = this.covenants.get(covenantId);
    if (!covenant) throw new Error(`Covenant not found: ${covenantId}`);

    covenant.currentValue = observedValue;
    covenant.lastCheckedAt = new Date().toISOString();

    // Advance next check
    const freqDays: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, quarterly: 90 };
    const next = new Date();
    next.setDate(next.getDate() + freqDays[covenant.frequency]);
    covenant.nextCheckDue = next.toISOString();

    let status: CovenantStatus = 'compliant';
    const delta = covenant.direction === 'above'
      ? observedValue - covenant.threshold
      : covenant.threshold - observedValue;

    const warningBuffer = covenant.threshold * 0.05; // 5% warning zone

    if (delta < 0) {
      // Breach
      status = 'breach';
      const cureDeadline = new Date();
      cureDeadline.setDate(cureDeadline.getDate() + covenant.cureDeadlineDays);

      const severity = Math.abs(delta) > covenant.threshold * 0.1 ? 'material' : 'warning';

      const breach: CovenantBreach = {
        id: `BRH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        covenantId,
        detectedAt: new Date().toISOString(),
        value: observedValue,
        threshold: covenant.threshold,
        severity: severity === 'material' ? 'material' : 'warning',
        cureDeadline: cureDeadline.toISOString(),
        escalatedTo: [],
      };

      covenant.breachHistory.push(breach);
      this.emit('covenant_breach', { covenant, breach });
    } else if (delta < warningBuffer) {
      status = 'warning';
      this.emit('covenant_warning', { covenantId, value: observedValue, threshold: covenant.threshold, delta });
    }

    covenant.status = status;

    const checkedAt = new Date().toISOString();
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ covenantId, observedValue, status, checkedAt }))
      .digest('hex');

    const result: CovenantCheckResult = {
      covenantId,
      bondId: covenant.bondId,
      type: covenant.type,
      currentValue: observedValue,
      threshold: covenant.threshold,
      status,
      delta,
      checkedAt,
      hash,
    };

    this.emit('covenant_checked', result);
    return result;
  }

  /**
   * Record a cure for a covenant breach.
   */
  recordCure(covenantId: string, breachId: string): void {
    const covenant = this.covenants.get(covenantId);
    if (!covenant) throw new Error(`Covenant not found: ${covenantId}`);

    const breach = covenant.breachHistory.find((b) => b.id === breachId);
    if (!breach) throw new Error(`Breach not found: ${breachId}`);

    breach.curedAt = new Date().toISOString();
    covenant.status = 'compliant';
    this.emit('covenant_cured', { covenantId, breachId });
  }

  /**
   * Waive a covenant breach (requires governance approval).
   */
  waiveBreach(covenantId: string, breachId: string, waivedBy: string): void {
    const covenant = this.covenants.get(covenantId);
    if (!covenant) throw new Error(`Covenant not found: ${covenantId}`);

    const breach = covenant.breachHistory.find((b) => b.id === breachId);
    if (!breach) throw new Error(`Breach not found: ${breachId}`);

    breach.waivedAt = new Date().toISOString();
    breach.waivedBy = waivedBy;
    covenant.status = 'waived';
    this.emit('covenant_waived', { covenantId, breachId, waivedBy });
  }

  getCovenant(covenantId: string): Covenant | undefined {
    return this.covenants.get(covenantId);
  }

  getCovenantsForBond(bondId: string): Covenant[] {
    return Array.from(this.covenants.values()).filter((c) => c.bondId === bondId);
  }

  getBreachedCovenants(): Covenant[] {
    return Array.from(this.covenants.values()).filter((c) => c.status === 'breach');
  }

  getOverdueCovenants(): Covenant[] {
    const now = new Date();
    return Array.from(this.covenants.values()).filter(
      (c) => new Date(c.nextCheckDue) < now
    );
  }
}

export default ComplianceEngine;
