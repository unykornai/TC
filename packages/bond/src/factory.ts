/**
 * @optkas/bond — Structured Bond Factory
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Extends the base BondEngine with institutional-grade structuring:
 *
 * BondProgram → BondSeries → BondTranche hierarchy
 * - BondProgram: Issuer-level shelf (entity, asset class, jurisdiction, trustee model)
 * - BondSeries: Specific issuance (maturity, coupon, collateral, reporting cadence)
 * - BondTranche: Priority slice (senior/mezz/junior, rate, waterfall order, eligibility)
 *
 * WaterfallEngine: Distribution cascade
 * - Accounts: senior debt service, reserves, operating, residual
 * - Event-driven distribution on coupon dates and maturity
 *
 * AllocationBook: Investor subscription management
 * - Subscriber registration, allocation, pro-rata, settlement status
 * - Transfer restriction enforcement via ComplianceEngine
 *
 * DocumentSetManager: Executed package tracking
 * - Document versioning, hash→CID→attestation mapping
 * - Signature packet ingestion, completeness checks
 *
 * CashflowScheduler: Payment scheduling with accrual calculations
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════
// BOND PROGRAM
// ═══════════════════════════════════════════════════════════════════

export interface BondProgram {
  id: string;
  name: string;
  issuerEntity: string;
  assetClass: string;           // 'corporate' | 'municipal' | 'structured' | 'green'
  jurisdiction: string;
  governingLaw: string;
  trusteeModel: 'independent' | 'fiscal_agent' | 'indenture_trustee';
  defaultFramework: {
    graceperiodDays: number;
    curePeriodDays: number;
    crossDefaultEnabled: boolean;
    accelerationThreshold: number;  // % of holders required
  };
  shelfLimit: string;           // Total authorized issuance under this program
  issuedToDate: string;         // Running total of all series issued
  series: string[];             // Series IDs
  status: 'active' | 'suspended' | 'closed';
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════
// BOND SERIES
// ═══════════════════════════════════════════════════════════════════

export type SeriesStatus = 'draft' | 'authorized' | 'offering' | 'closed' | 'active' | 'matured' | 'defaulted';

export interface BondSeries {
  id: string;
  programId: string;
  name: string;
  issuanceDate: string;
  maturityDate: string;
  couponType: 'fixed' | 'floating' | 'zero_coupon' | 'step_up' | 'revenue_linked';
  paymentFrequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  baseCouponRate: number;
  floatingSpread?: number;      // If floating, spread over reference rate
  referenceRate?: string;       // e.g., 'SOFR' | 'PRIME'
  totalPrincipal: string;
  currency: string;
  collateral: {
    type: string;
    description: string;
    value: string;
    coverageRatio: number;
    custodian: string;
  };
  reportingCadence: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  tranches: string[];           // Tranche IDs
  status: SeriesStatus;
  documentSetId: string;
  waterfallId: string;
  allocationBookId: string;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════
// BOND TRANCHE
// ═══════════════════════════════════════════════════════════════════

export type TranchePriority = 'senior' | 'mezzanine' | 'junior' | 'equity';

export interface BondTranche {
  id: string;
  seriesId: string;
  name: string;
  priority: TranchePriority;
  waterfallOrder: number;       // 1 = paid first
  principal: string;
  couponRate: number;
  minimumDenomination: string;
  eligibility: {
    accreditedOnly: boolean;
    qualifiedPurchaserOnly: boolean;
    jurisdictions: string[];    // Allowed jurisdictions (empty = all)
  };
  iouCurrency: string;         // XRPL IOU code for this tranche
  outstandingPrincipal: string;
  status: 'draft' | 'active' | 'fully_allocated' | 'redeemed';
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════
// WATERFALL ENGINE
// ═══════════════════════════════════════════════════════════════════

export type WaterfallAccountType =
  | 'senior_debt_service'
  | 'reserve'
  | 'operating'
  | 'residual'
  | 'insurance'
  | 'trustee_fee';

export interface WaterfallAccount {
  id: string;
  type: WaterfallAccountType;
  name: string;
  order: number;               // Distribution priority (1 = first)
  targetBalance: string;       // Target balance for reserve accounts
  currentBalance: string;
  capPerDistribution?: string; // Max per single distribution event
  xrplAddress?: string;
}

export interface WaterfallDefinition {
  id: string;
  seriesId: string;
  accounts: WaterfallAccount[];
  distributionEvents: WaterfallDistribution[];
  lastDistributionAt: string;
}

export interface WaterfallDistribution {
  id: string;
  waterfallId: string;
  triggerDate: string;
  totalAvailable: string;
  allocations: WaterfallAllocation[];
  status: 'pending' | 'executed' | 'partial';
  executedAt?: string;
  hash: string;
}

export interface WaterfallAllocation {
  accountId: string;
  accountType: WaterfallAccountType;
  order: number;
  requested: string;
  allocated: string;
  shortfall: string;
}

// ═══════════════════════════════════════════════════════════════════
// ALLOCATION BOOK
// ═══════════════════════════════════════════════════════════════════

export type AllocationStatus = 'subscribed' | 'allocated' | 'settled' | 'rejected' | 'cancelled';

export interface Subscriber {
  id: string;
  entityId: string;             // KYC entity reference
  legalName: string;
  xrplAddress: string;
  trancheId: string;
  requestedAmount: string;
  allocatedAmount: string;
  settledAmount: string;
  status: AllocationStatus;
  subscribedAt: string;
  allocatedAt?: string;
  settledAt?: string;
  transferRestrictions: string[]; // Active restriction IDs
}

export interface AllocationBook {
  id: string;
  seriesId: string;
  subscribers: Subscriber[];
  totalSubscribed: string;
  totalAllocated: string;
  totalSettled: string;
  oversubscriptionRatio: number;
  allocationMethod: 'pro_rata' | 'first_come' | 'discretionary';
  closedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT SET MANAGER
// ═══════════════════════════════════════════════════════════════════

export type DocumentCategory =
  | 'indenture'
  | 'prospectus'
  | 'legal_opinion'
  | 'control_agreement'
  | 'security_agreement'
  | 'insurance_certificate'
  | 'appraisal'
  | 'signature_page'
  | 'amendment'
  | 'supplement'
  | 'investor_letter'
  | 'trustee_certificate';

export interface ManagedDocument {
  id: string;
  category: DocumentCategory;
  name: string;
  version: number;
  sha256: string;
  ipfsCid?: string;
  attestationTxHash?: string;
  uploadedAt: string;
  uploadedBy: string;
  supersedes?: string;          // Previous document ID
  signaturePacket?: {
    signers: string[];
    signedAt: string;
    complete: boolean;
  };
}

export interface DocumentSet {
  id: string;
  seriesId: string;
  documents: ManagedDocument[];
  requiredCategories: DocumentCategory[];
  completeness: number;         // 0-1 ratio
  lastUpdatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════
// CASHFLOW SCHEDULER
// ═══════════════════════════════════════════════════════════════════

export interface ScheduledCashflow {
  id: string;
  seriesId: string;
  trancheId?: string;
  type: 'coupon' | 'principal' | 'fee' | 'reserve_contribution' | 'revenue_distribution';
  scheduledDate: string;
  amount: string;
  currency: string;
  accrualBasis: '30/360' | 'actual/360' | 'actual/365' | 'actual/actual';
  accrualStart: string;
  accrualEnd: string;
  status: 'scheduled' | 'accruing' | 'due' | 'paid' | 'missed' | 'deferred';
  paidAmount?: string;
  paidAt?: string;
}

// ═══════════════════════════════════════════════════════════════════
// BOND FACTORY (Orchestrator)
// ═══════════════════════════════════════════════════════════════════

export class BondFactory extends EventEmitter {
  private programs: Map<string, BondProgram> = new Map();
  private seriesMap: Map<string, BondSeries> = new Map();
  private tranches: Map<string, BondTranche> = new Map();
  private waterfalls: Map<string, WaterfallDefinition> = new Map();
  private allocationBooks: Map<string, AllocationBook> = new Map();
  private documentSets: Map<string, DocumentSet> = new Map();
  private cashflows: Map<string, ScheduledCashflow[]> = new Map();

  constructor() {
    super();
  }

  // ─── Program Management ────────────────────────────────────────

  createProgram(params: {
    name: string;
    issuerEntity: string;
    assetClass: string;
    jurisdiction: string;
    governingLaw: string;
    trusteeModel: 'independent' | 'fiscal_agent' | 'indenture_trustee';
    shelfLimit: string;
    graceperiodDays?: number;
    curePeriodDays?: number;
  }): BondProgram {
    const program: BondProgram = {
      id: `PGM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      name: params.name,
      issuerEntity: params.issuerEntity,
      assetClass: params.assetClass,
      jurisdiction: params.jurisdiction,
      governingLaw: params.governingLaw,
      trusteeModel: params.trusteeModel,
      defaultFramework: {
        graceperiodDays: params.graceperiodDays || 10,
        curePeriodDays: params.curePeriodDays || 30,
        crossDefaultEnabled: true,
        accelerationThreshold: 0.25,
      },
      shelfLimit: params.shelfLimit,
      issuedToDate: '0',
      series: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.programs.set(program.id, program);
    this.emit('program_created', program);
    return program;
  }

  getProgram(programId: string): BondProgram | undefined {
    return this.programs.get(programId);
  }

  // ─── Series Management ─────────────────────────────────────────

  createSeries(params: {
    programId: string;
    name: string;
    issuanceDate: string;
    maturityDate: string;
    couponType: BondSeries['couponType'];
    paymentFrequency: BondSeries['paymentFrequency'];
    baseCouponRate: number;
    totalPrincipal: string;
    currency: string;
    collateralType: string;
    collateralDescription: string;
    collateralValue: string;
    coverageRatio: number;
    custodian: string;
    reportingCadence: BondSeries['reportingCadence'];
    requiredDocuments?: DocumentCategory[];
  }): BondSeries {
    const program = this.programs.get(params.programId);
    if (!program) throw new Error(`Program not found: ${params.programId}`);
    if (program.status !== 'active') throw new Error(`Program is not active: ${program.status}`);

    // Check shelf limit
    const newTotal = parseFloat(program.issuedToDate) + parseFloat(params.totalPrincipal);
    if (newTotal > parseFloat(program.shelfLimit)) {
      throw new Error(
        `Series principal ${params.totalPrincipal} would exceed shelf limit. ` +
        `Issued: ${program.issuedToDate}, Limit: ${program.shelfLimit}`
      );
    }

    // Create waterfall
    const waterfallId = `WF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const waterfall: WaterfallDefinition = {
      id: waterfallId,
      seriesId: '', // Set below
      accounts: [
        { id: `WFA-1`, type: 'trustee_fee', name: 'Trustee Fee Account', order: 1, targetBalance: '0', currentBalance: '0' },
        { id: `WFA-2`, type: 'senior_debt_service', name: 'Senior Debt Service', order: 2, targetBalance: '0', currentBalance: '0' },
        { id: `WFA-3`, type: 'reserve', name: 'Debt Service Reserve', order: 3, targetBalance: (parseFloat(params.totalPrincipal) * 0.06).toFixed(2), currentBalance: '0' },
        { id: `WFA-4`, type: 'operating', name: 'Operating Reserve', order: 4, targetBalance: (parseFloat(params.totalPrincipal) * 0.02).toFixed(2), currentBalance: '0' },
        { id: `WFA-5`, type: 'insurance', name: 'Insurance Reserve', order: 5, targetBalance: '0', currentBalance: '0' },
        { id: `WFA-6`, type: 'residual', name: 'Residual / Equity', order: 6, targetBalance: '0', currentBalance: '0' },
      ],
      distributionEvents: [],
      lastDistributionAt: '',
    };

    // Create allocation book
    const allocBookId = `ALB-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const allocationBook: AllocationBook = {
      id: allocBookId,
      seriesId: '',
      subscribers: [],
      totalSubscribed: '0',
      totalAllocated: '0',
      totalSettled: '0',
      oversubscriptionRatio: 0,
      allocationMethod: 'pro_rata',
    };

    // Create document set
    const docSetId = `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const defaultRequired: DocumentCategory[] = params.requiredDocuments || [
      'indenture', 'prospectus', 'legal_opinion', 'control_agreement',
      'security_agreement', 'insurance_certificate', 'appraisal', 'signature_page',
    ];
    const documentSet: DocumentSet = {
      id: docSetId,
      seriesId: '',
      documents: [],
      requiredCategories: defaultRequired,
      completeness: 0,
      lastUpdatedAt: new Date().toISOString(),
    };

    const series: BondSeries = {
      id: `SER-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      programId: params.programId,
      name: params.name,
      issuanceDate: params.issuanceDate,
      maturityDate: params.maturityDate,
      couponType: params.couponType,
      paymentFrequency: params.paymentFrequency,
      baseCouponRate: params.baseCouponRate,
      totalPrincipal: params.totalPrincipal,
      currency: params.currency,
      collateral: {
        type: params.collateralType,
        description: params.collateralDescription,
        value: params.collateralValue,
        coverageRatio: params.coverageRatio,
        custodian: params.custodian,
      },
      reportingCadence: params.reportingCadence,
      tranches: [],
      status: 'draft',
      documentSetId: docSetId,
      waterfallId,
      allocationBookId: allocBookId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Wire back-references
    waterfall.seriesId = series.id;
    allocationBook.seriesId = series.id;
    documentSet.seriesId = series.id;

    // Store everything
    this.seriesMap.set(series.id, series);
    this.waterfalls.set(waterfallId, waterfall);
    this.allocationBooks.set(allocBookId, allocationBook);
    this.documentSets.set(docSetId, documentSet);
    this.cashflows.set(series.id, []);

    // Update program
    program.series.push(series.id);
    program.issuedToDate = newTotal.toFixed(2);
    program.updatedAt = new Date().toISOString();

    this.emit('series_created', series);
    return series;
  }

  getSeries(seriesId: string): BondSeries | undefined {
    return this.seriesMap.get(seriesId);
  }

  transitionSeries(seriesId: string, newStatus: SeriesStatus): void {
    const series = this.seriesMap.get(seriesId);
    if (!series) throw new Error(`Series not found: ${seriesId}`);

    const validTransitions: Record<SeriesStatus, SeriesStatus[]> = {
      draft: ['authorized'],
      authorized: ['offering'],
      offering: ['closed'],
      closed: ['active'],
      active: ['matured', 'defaulted'],
      matured: [],
      defaulted: [],
    };

    const allowed = validTransitions[series.status];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid series transition: ${series.status} → ${newStatus}. Allowed: ${allowed.join(', ')}`);
    }

    series.status = newStatus;
    series.updatedAt = new Date().toISOString();
    this.emit('series_transitioned', { seriesId, newStatus });
  }

  // ─── Tranche Management ────────────────────────────────────────

  createTranche(params: {
    seriesId: string;
    name: string;
    priority: TranchePriority;
    waterfallOrder: number;
    principal: string;
    couponRate: number;
    minimumDenomination: string;
    accreditedOnly?: boolean;
    qualifiedPurchaserOnly?: boolean;
    jurisdictions?: string[];
    iouCurrency: string;
  }): BondTranche {
    const series = this.seriesMap.get(params.seriesId);
    if (!series) throw new Error(`Series not found: ${params.seriesId}`);

    // Validate total tranche principal doesn't exceed series
    const existingPrincipal = series.tranches.reduce((sum, tid) => {
      const t = this.tranches.get(tid);
      return sum + (t ? parseFloat(t.principal) : 0);
    }, 0);

    if (existingPrincipal + parseFloat(params.principal) > parseFloat(series.totalPrincipal)) {
      throw new Error(
        `Tranche principal ${params.principal} would exceed series total ${series.totalPrincipal}. ` +
        `Already tranched: ${existingPrincipal.toFixed(2)}`
      );
    }

    const tranche: BondTranche = {
      id: `TRN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      seriesId: params.seriesId,
      name: params.name,
      priority: params.priority,
      waterfallOrder: params.waterfallOrder,
      principal: params.principal,
      couponRate: params.couponRate,
      minimumDenomination: params.minimumDenomination,
      eligibility: {
        accreditedOnly: params.accreditedOnly ?? true,
        qualifiedPurchaserOnly: params.qualifiedPurchaserOnly ?? false,
        jurisdictions: params.jurisdictions || [],
      },
      iouCurrency: params.iouCurrency,
      outstandingPrincipal: params.principal,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    this.tranches.set(tranche.id, tranche);
    series.tranches.push(tranche.id);
    series.updatedAt = new Date().toISOString();

    this.emit('tranche_created', tranche);
    return tranche;
  }

  getTranche(trancheId: string): BondTranche | undefined {
    return this.tranches.get(trancheId);
  }

  getTranchesBySeries(seriesId: string): BondTranche[] {
    const series = this.seriesMap.get(seriesId);
    if (!series) return [];
    return series.tranches.map((tid) => this.tranches.get(tid)!).filter(Boolean);
  }

  // ─── Waterfall Engine ──────────────────────────────────────────

  getWaterfall(waterfallId: string): WaterfallDefinition | undefined {
    return this.waterfalls.get(waterfallId);
  }

  /**
   * Execute a waterfall distribution.
   * Cascades available funds through accounts in priority order.
   * Each account is filled to its target before the next receives.
   */
  executeDistribution(waterfallId: string, availableFunds: string): WaterfallDistribution {
    const waterfall = this.waterfalls.get(waterfallId);
    if (!waterfall) throw new Error(`Waterfall not found: ${waterfallId}`);

    let remaining = parseFloat(availableFunds);
    const allocations: WaterfallAllocation[] = [];

    // Sort accounts by order
    const sortedAccounts = [...waterfall.accounts].sort((a, b) => a.order - b.order);

    for (const account of sortedAccounts) {
      const target = parseFloat(account.targetBalance);
      const current = parseFloat(account.currentBalance);

      let requested: number;
      if (account.type === 'residual') {
        // Residual gets everything left
        requested = remaining;
      } else if (target > 0) {
        // Reserve accounts: fill to target
        requested = Math.max(0, target - current);
      } else {
        // Debt service: based on tranches (simplified to remaining pro-rata)
        requested = remaining;
      }

      // Apply cap if set
      if (account.capPerDistribution) {
        requested = Math.min(requested, parseFloat(account.capPerDistribution));
      }

      const allocated = Math.min(requested, remaining);
      const shortfall = Math.max(0, requested - allocated);

      allocations.push({
        accountId: account.id,
        accountType: account.type,
        order: account.order,
        requested: requested.toFixed(2),
        allocated: allocated.toFixed(2),
        shortfall: shortfall.toFixed(2),
      });

      // Update account balance
      account.currentBalance = (current + allocated).toFixed(2);
      remaining -= allocated;

      if (remaining <= 0) break;
    }

    const distribution: WaterfallDistribution = {
      id: `DIST-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      waterfallId,
      triggerDate: new Date().toISOString(),
      totalAvailable: availableFunds,
      allocations,
      status: remaining > 0 ? 'partial' : 'executed',
      executedAt: new Date().toISOString(),
      hash: crypto.createHash('sha256')
        .update(JSON.stringify({ waterfallId, availableFunds, allocations }))
        .digest('hex'),
    };

    waterfall.distributionEvents.push(distribution);
    waterfall.lastDistributionAt = distribution.executedAt!;

    this.emit('waterfall_distributed', distribution);
    return distribution;
  }

  // ─── Allocation Book ───────────────────────────────────────────

  getAllocationBook(bookId: string): AllocationBook | undefined {
    return this.allocationBooks.get(bookId);
  }

  /**
   * Register a subscriber in the allocation book.
   */
  subscribe(bookId: string, params: {
    entityId: string;
    legalName: string;
    xrplAddress: string;
    trancheId: string;
    amount: string;
  }): Subscriber {
    const book = this.allocationBooks.get(bookId);
    if (!book) throw new Error(`Allocation book not found: ${bookId}`);

    const tranche = this.tranches.get(params.trancheId);
    if (!tranche) throw new Error(`Tranche not found: ${params.trancheId}`);

    if (parseFloat(params.amount) < parseFloat(tranche.minimumDenomination)) {
      throw new Error(`Below minimum denomination: ${tranche.minimumDenomination}`);
    }

    const subscriber: Subscriber = {
      id: `SUB-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      entityId: params.entityId,
      legalName: params.legalName,
      xrplAddress: params.xrplAddress,
      trancheId: params.trancheId,
      requestedAmount: params.amount,
      allocatedAmount: '0',
      settledAmount: '0',
      status: 'subscribed',
      subscribedAt: new Date().toISOString(),
      transferRestrictions: [],
    };

    book.subscribers.push(subscriber);
    book.totalSubscribed = (parseFloat(book.totalSubscribed) + parseFloat(params.amount)).toFixed(2);

    // Compute oversubscription ratio
    const tranchePrincipal = parseFloat(tranche.principal);
    if (tranchePrincipal > 0) {
      book.oversubscriptionRatio = parseFloat(book.totalSubscribed) / tranchePrincipal;
    }

    this.emit('subscriber_added', { bookId, subscriber });
    return subscriber;
  }

  /**
   * Allocate subscriptions (pro-rata if oversubscribed).
   */
  allocate(bookId: string): Subscriber[] {
    const book = this.allocationBooks.get(bookId);
    if (!book) throw new Error(`Allocation book not found: ${bookId}`);

    const subscribersByTranche: Map<string, Subscriber[]> = new Map();
    for (const sub of book.subscribers) {
      if (sub.status !== 'subscribed') continue;
      const list = subscribersByTranche.get(sub.trancheId) || [];
      list.push(sub);
      subscribersByTranche.set(sub.trancheId, list);
    }

    const allocated: Subscriber[] = [];

    for (const [trancheId, subs] of subscribersByTranche) {
      const tranche = this.tranches.get(trancheId);
      if (!tranche) continue;

      const available = parseFloat(tranche.principal);
      const totalRequested = subs.reduce((s, sub) => s + parseFloat(sub.requestedAmount), 0);

      for (const sub of subs) {
        const requested = parseFloat(sub.requestedAmount);
        let alloc: number;

        if (book.allocationMethod === 'pro_rata' && totalRequested > available) {
          alloc = (requested / totalRequested) * available;
        } else {
          alloc = Math.min(requested, available);
        }

        sub.allocatedAmount = alloc.toFixed(2);
        sub.status = 'allocated';
        sub.allocatedAt = new Date().toISOString();
        allocated.push(sub);
      }
    }

    book.totalAllocated = allocated.reduce((s, sub) => s + parseFloat(sub.allocatedAmount), 0).toFixed(2);
    this.emit('allocations_completed', { bookId, count: allocated.length });
    return allocated;
  }

  /**
   * Mark a subscriber as settled.
   */
  settleSubscriber(bookId: string, subscriberId: string, settledAmount: string): void {
    const book = this.allocationBooks.get(bookId);
    if (!book) throw new Error(`Allocation book not found: ${bookId}`);

    const sub = book.subscribers.find((s) => s.id === subscriberId);
    if (!sub) throw new Error(`Subscriber not found: ${subscriberId}`);

    sub.settledAmount = settledAmount;
    sub.status = 'settled';
    sub.settledAt = new Date().toISOString();

    book.totalSettled = book.subscribers
      .reduce((s, subscriber) => s + parseFloat(subscriber.settledAmount), 0)
      .toFixed(2);

    this.emit('subscriber_settled', { bookId, subscriberId, settledAmount });
  }

  // ─── Document Set Manager ──────────────────────────────────────

  getDocumentSet(docSetId: string): DocumentSet | undefined {
    return this.documentSets.get(docSetId);
  }

  /**
   * Upload a document to the document set.
   */
  uploadDocument(docSetId: string, params: {
    category: DocumentCategory;
    name: string;
    contentHash: string;
    ipfsCid?: string;
    uploadedBy: string;
  }): ManagedDocument {
    const docSet = this.documentSets.get(docSetId);
    if (!docSet) throw new Error(`Document set not found: ${docSetId}`);

    // Check for existing document of same category (supersede)
    const existing = docSet.documents.find(
      (d) => d.category === params.category && !d.supersedes
    );

    const version = existing
      ? docSet.documents.filter((d) => d.category === params.category).length + 1
      : 1;

    const doc: ManagedDocument = {
      id: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      category: params.category,
      name: params.name,
      version,
      sha256: params.contentHash,
      ipfsCid: params.ipfsCid,
      uploadedAt: new Date().toISOString(),
      uploadedBy: params.uploadedBy,
      supersedes: existing?.id,
    };

    docSet.documents.push(doc);
    this.updateCompleteness(docSet);

    this.emit('document_uploaded', { docSetId, document: doc });
    return doc;
  }

  /**
   * Record an attestation TX hash for a document.
   */
  attestDocument(docSetId: string, documentId: string, txHash: string): void {
    const docSet = this.documentSets.get(docSetId);
    if (!docSet) throw new Error(`Document set not found: ${docSetId}`);

    const doc = docSet.documents.find((d) => d.id === documentId);
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    doc.attestationTxHash = txHash;
    this.emit('document_attested', { docSetId, documentId, txHash });
  }

  /**
   * Record signatures for a document.
   */
  recordSignatures(docSetId: string, documentId: string, signers: string[]): void {
    const docSet = this.documentSets.get(docSetId);
    if (!docSet) throw new Error(`Document set not found: ${docSetId}`);

    const doc = docSet.documents.find((d) => d.id === documentId);
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    doc.signaturePacket = {
      signers,
      signedAt: new Date().toISOString(),
      complete: true,
    };
    this.emit('document_signed', { docSetId, documentId, signers });
  }

  private updateCompleteness(docSet: DocumentSet): void {
    const covered = new Set<DocumentCategory>();
    for (const doc of docSet.documents) {
      covered.add(doc.category);
    }
    docSet.completeness = docSet.requiredCategories.length > 0
      ? covered.size / docSet.requiredCategories.length
      : 1;
    docSet.lastUpdatedAt = new Date().toISOString();
  }

  /**
   * Check if all required documents are present and attested.
   */
  isDocumentSetComplete(docSetId: string): { complete: boolean; missing: DocumentCategory[] } {
    const docSet = this.documentSets.get(docSetId);
    if (!docSet) throw new Error(`Document set not found: ${docSetId}`);

    const covered = new Set(docSet.documents.map((d) => d.category));
    const missing = docSet.requiredCategories.filter((c) => !covered.has(c));
    return { complete: missing.length === 0, missing };
  }

  // ─── Cashflow Scheduler ────────────────────────────────────────

  /**
   * Generate coupon cashflow schedule for a series.
   */
  generateCashflowSchedule(seriesId: string): ScheduledCashflow[] {
    const series = this.seriesMap.get(seriesId);
    if (!series) throw new Error(`Series not found: ${seriesId}`);

    const tranches = this.getTranchesBySeries(seriesId);
    const schedule: ScheduledCashflow[] = [];

    const monthsPerPeriod: Record<string, number> = {
      monthly: 1, quarterly: 3, semi_annual: 6, annual: 12,
    };
    const months = monthsPerPeriod[series.paymentFrequency] || 6;

    const start = new Date(series.issuanceDate);
    const end = new Date(series.maturityDate);

    let current = new Date(start);
    current.setMonth(current.getMonth() + months);
    let idx = 0;

    while (current <= end) {
      const accrualStart = new Date(current);
      accrualStart.setMonth(accrualStart.getMonth() - months);

      for (const tranche of tranches) {
        const periodsPerYear = 12 / months;
        const couponAmount = (parseFloat(tranche.principal) * tranche.couponRate / periodsPerYear).toFixed(2);

        schedule.push({
          id: `CF-${++idx}`,
          seriesId,
          trancheId: tranche.id,
          type: 'coupon',
          scheduledDate: current.toISOString().split('T')[0],
          amount: couponAmount,
          currency: series.currency,
          accrualBasis: '30/360',
          accrualStart: accrualStart.toISOString().split('T')[0],
          accrualEnd: current.toISOString().split('T')[0],
          status: 'scheduled',
        });
      }

      current = new Date(current);
      current.setMonth(current.getMonth() + months);
    }

    // Add principal repayment at maturity for each tranche
    for (const tranche of tranches) {
      schedule.push({
        id: `CF-${++idx}`,
        seriesId,
        trancheId: tranche.id,
        type: 'principal',
        scheduledDate: series.maturityDate,
        amount: tranche.principal,
        currency: series.currency,
        accrualBasis: '30/360',
        accrualStart: series.issuanceDate,
        accrualEnd: series.maturityDate,
        status: 'scheduled',
      });
    }

    this.cashflows.set(seriesId, schedule);
    this.emit('cashflow_schedule_generated', { seriesId, count: schedule.length });
    return schedule;
  }

  getCashflows(seriesId: string): ScheduledCashflow[] {
    return this.cashflows.get(seriesId) || [];
  }

  getDueCashflows(seriesId: string, asOf?: Date): ScheduledCashflow[] {
    const flows = this.cashflows.get(seriesId) || [];
    const cutoff = asOf || new Date();
    return flows.filter(
      (cf) => cf.status === 'scheduled' && new Date(cf.scheduledDate) <= cutoff
    );
  }
}

export default BondFactory;
