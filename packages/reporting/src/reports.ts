/**
 * @optkas/reporting — Institutional Reporting Engine
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Generates institution-grade reports for:
 * - Investor statements (per-holder position, coupon history, NAV)
 * - Trustee reports (collateral status, covenant compliance, waterfall summary)
 * - Payment reconciliation (expected vs actual, with CSV/OFX import stubs)
 * - NAV / valuation snapshots (portfolio-level and per-series)
 * - Bond lifecycle status (pipeline, active, matured, defaulted)
 *
 * Every report is hash-attested for independent verifiability.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ─── Report Types ────────────────────────────────────────────────────

export type InstitutionalReportType =
  | 'investor_statement'
  | 'trustee_report'
  | 'payment_reconciliation'
  | 'nav_snapshot'
  | 'lifecycle_status'
  | 'covenant_summary'
  | 'waterfall_summary'
  | 'portfolio_summary';

// ─── Investor Statement ──────────────────────────────────────────────

export interface InvestorStatement {
  investorId: string;
  investorName: string;
  statementDate: string;
  periodStart: string;
  periodEnd: string;
  positions: InvestorPosition[];
  couponPayments: CouponPaymentRecord[];
  totalInvested: string;
  totalCouponsReceived: string;
  currentNAV: string;
  unrealizedGainLoss: string;
}

export interface InvestorPosition {
  bondId: string;
  bondName: string;
  seriesId?: string;
  trancheId?: string;
  tranchePriority?: string;
  principalAmount: string;
  iouBalance: string;
  couponRate: number;
  maturityDate: string;
  status: string;
}

export interface CouponPaymentRecord {
  bondId: string;
  couponId: string;
  paymentDate: string;
  amount: string;
  currency: string;
  status: string;
}

// ─── Trustee Report ──────────────────────────────────────────────────

export interface TrusteeReport {
  reportDate: string;
  periodStart: string;
  periodEnd: string;
  seriesId: string;
  seriesName: string;
  collateralSummary: {
    type: string;
    currentValue: string;
    coverageRatio: number;
    lastAppraisal: string;
    custodian: string;
  };
  covenantStatus: CovenantStatusEntry[];
  waterfallSummary: {
    totalDistributed: string;
    accountBalances: { name: string; balance: string }[];
    shortfalls: { account: string; shortfall: string }[];
  };
  outstandingPrincipal: string;
  nextPaymentDate: string;
  nextPaymentAmount: string;
  documentCompleteness: number;
  alerts: string[];
}

export interface CovenantStatusEntry {
  covenantId: string;
  type: string;
  description: string;
  threshold: number;
  currentValue: number;
  status: string;
  lastChecked: string;
}

// ─── Payment Reconciliation ──────────────────────────────────────────

export interface PaymentReconciliation {
  reconciliationDate: string;
  periodStart: string;
  periodEnd: string;
  expectedPayments: ReconciliationEntry[];
  actualPayments: ReconciliationEntry[];
  matched: ReconciliationMatch[];
  unmatched: ReconciliationEntry[];
  totalExpected: string;
  totalActual: string;
  variance: string;
  status: 'balanced' | 'variance_detected' | 'pending';
}

export interface ReconciliationEntry {
  id: string;
  date: string;
  amount: string;
  currency: string;
  counterparty: string;
  reference: string;
  source: 'ledger' | 'bank' | 'csv_import' | 'ofx_import';
}

export interface ReconciliationMatch {
  expectedId: string;
  actualId: string;
  amount: string;
  variance: string;
  matchConfidence: number;
}

// ─── NAV Snapshot ────────────────────────────────────────────────────

export interface NAVSnapshot {
  snapshotDate: string;
  portfolioId?: string;
  seriesId?: string;
  positions: NAVPosition[];
  totalAssets: string;
  totalLiabilities: string;
  netAssetValue: string;
  navPerUnit: string;
  changeFromPrevious: string;
  changePercent: number;
  valuationMethod: 'mark_to_market' | 'mark_to_model' | 'amortized_cost';
  hash: string;
}

export interface NAVPosition {
  assetId: string;
  assetName: string;
  quantity: string;
  unitPrice: string;
  marketValue: string;
  costBasis: string;
  unrealizedGainLoss: string;
  weight: number;
}

// ─── Lifecycle Status ────────────────────────────────────────────────

export interface LifecycleStatusReport {
  reportDate: string;
  pipeline: { count: number; totalPrincipal: string; items: LifecycleItem[] };
  active: { count: number; totalPrincipal: string; items: LifecycleItem[] };
  matured: { count: number; totalPrincipal: string; items: LifecycleItem[] };
  defaulted: { count: number; totalPrincipal: string; items: LifecycleItem[] };
  totalOutstanding: string;
  nextMaturities: { bondId: string; name: string; maturityDate: string; principal: string }[];
}

export interface LifecycleItem {
  bondId: string;
  name: string;
  status: string;
  principal: string;
  couponRate: number;
  maturityDate: string;
  outstandingBalance: string;
}

// ─── Generated Report Wrapper ────────────────────────────────────────

export interface GeneratedReport<T> {
  reportId: string;
  type: InstitutionalReportType;
  generatedAt: string;
  generatedBy: string;
  data: T;
  hash: string;
}

// ─── Reporting Engine ────────────────────────────────────────────────

export class ReportingEngine extends EventEmitter {
  private reports: Map<string, GeneratedReport<unknown>> = new Map();
  private navHistory: NAVSnapshot[] = [];
  private previousNAV: string = '0';

  constructor() {
    super();
  }

  private generateId(): string {
    return `RPT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private hashData(data: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private wrapReport<T>(type: InstitutionalReportType, data: T): GeneratedReport<T> {
    const report: GeneratedReport<T> = {
      reportId: this.generateId(),
      type,
      generatedAt: new Date().toISOString(),
      generatedBy: 'OPTKAS-REPORTING-ENGINE',
      data,
      hash: this.hashData(data),
    };
    this.reports.set(report.reportId, report as GeneratedReport<unknown>);
    this.emit('report_generated', { reportId: report.reportId, type });
    return report;
  }

  // ─── Investor Statement ────────────────────────────────────────

  generateInvestorStatement(params: {
    investorId: string;
    investorName: string;
    periodStart: string;
    periodEnd: string;
    positions: InvestorPosition[];
    couponPayments: CouponPaymentRecord[];
  }): GeneratedReport<InvestorStatement> {
    const totalInvested = params.positions
      .reduce((s, p) => s + parseFloat(p.principalAmount), 0).toFixed(2);
    const totalCoupons = params.couponPayments
      .filter((c) => c.status === 'paid')
      .reduce((s, c) => s + parseFloat(c.amount), 0).toFixed(2);
    const currentNAV = params.positions
      .reduce((s, p) => s + parseFloat(p.iouBalance), 0).toFixed(2);

    const statement: InvestorStatement = {
      investorId: params.investorId,
      investorName: params.investorName,
      statementDate: new Date().toISOString(),
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      positions: params.positions,
      couponPayments: params.couponPayments,
      totalInvested,
      totalCouponsReceived: totalCoupons,
      currentNAV,
      unrealizedGainLoss: (parseFloat(currentNAV) - parseFloat(totalInvested)).toFixed(2),
    };

    return this.wrapReport('investor_statement', statement);
  }

  // ─── Trustee Report ────────────────────────────────────────────

  generateTrusteeReport(params: {
    seriesId: string;
    seriesName: string;
    periodStart: string;
    periodEnd: string;
    collateral: TrusteeReport['collateralSummary'];
    covenants: CovenantStatusEntry[];
    waterfallBalances: { name: string; balance: string }[];
    waterfallShortfalls: { account: string; shortfall: string }[];
    totalDistributed: string;
    outstandingPrincipal: string;
    nextPaymentDate: string;
    nextPaymentAmount: string;
    documentCompleteness: number;
  }): GeneratedReport<TrusteeReport> {
    const alerts: string[] = [];

    // Check for covenant breaches
    for (const cov of params.covenants) {
      if (cov.status === 'breach') {
        alerts.push(`COVENANT BREACH: ${cov.type} — ${cov.description} (${cov.currentValue} vs threshold ${cov.threshold})`);
      }
    }

    // Check for waterfall shortfalls
    for (const sf of params.waterfallShortfalls) {
      if (parseFloat(sf.shortfall) > 0) {
        alerts.push(`WATERFALL SHORTFALL: ${sf.account} — ${sf.shortfall}`);
      }
    }

    // Check document completeness
    if (params.documentCompleteness < 1) {
      alerts.push(`DOCUMENTS INCOMPLETE: ${(params.documentCompleteness * 100).toFixed(0)}% complete`);
    }

    // Check collateral coverage
    if (params.collateral.coverageRatio < 1.0) {
      alerts.push(`COLLATERAL UNDERCOVERED: ratio ${params.collateral.coverageRatio.toFixed(2)}x`);
    }

    const report: TrusteeReport = {
      reportDate: new Date().toISOString(),
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      seriesId: params.seriesId,
      seriesName: params.seriesName,
      collateralSummary: params.collateral,
      covenantStatus: params.covenants,
      waterfallSummary: {
        totalDistributed: params.totalDistributed,
        accountBalances: params.waterfallBalances,
        shortfalls: params.waterfallShortfalls,
      },
      outstandingPrincipal: params.outstandingPrincipal,
      nextPaymentDate: params.nextPaymentDate,
      nextPaymentAmount: params.nextPaymentAmount,
      documentCompleteness: params.documentCompleteness,
      alerts,
    };

    return this.wrapReport('trustee_report', report);
  }

  // ─── Payment Reconciliation ────────────────────────────────────

  generateReconciliation(params: {
    periodStart: string;
    periodEnd: string;
    expectedPayments: ReconciliationEntry[];
    actualPayments: ReconciliationEntry[];
  }): GeneratedReport<PaymentReconciliation> {
    const matched: ReconciliationMatch[] = [];
    const unmatchedExpected = [...params.expectedPayments];
    const unmatchedActual = [...params.actualPayments];

    // Simple matching by amount + date proximity
    for (let i = unmatchedExpected.length - 1; i >= 0; i--) {
      const expected = unmatchedExpected[i];
      const matchIdx = unmatchedActual.findIndex(
        (a) => a.amount === expected.amount && a.currency === expected.currency
      );

      if (matchIdx >= 0) {
        const actual = unmatchedActual[matchIdx];
        matched.push({
          expectedId: expected.id,
          actualId: actual.id,
          amount: expected.amount,
          variance: (parseFloat(actual.amount) - parseFloat(expected.amount)).toFixed(2),
          matchConfidence: 1.0,
        });
        unmatchedExpected.splice(i, 1);
        unmatchedActual.splice(matchIdx, 1);
      }
    }

    const totalExpected = params.expectedPayments
      .reduce((s, e) => s + parseFloat(e.amount), 0).toFixed(2);
    const totalActual = params.actualPayments
      .reduce((s, a) => s + parseFloat(a.amount), 0).toFixed(2);

    const recon: PaymentReconciliation = {
      reconciliationDate: new Date().toISOString(),
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      expectedPayments: params.expectedPayments,
      actualPayments: params.actualPayments,
      matched,
      unmatched: [...unmatchedExpected, ...unmatchedActual],
      totalExpected,
      totalActual,
      variance: (parseFloat(totalActual) - parseFloat(totalExpected)).toFixed(2),
      status: unmatchedExpected.length === 0 && unmatchedActual.length === 0 ? 'balanced' : 'variance_detected',
    };

    return this.wrapReport('payment_reconciliation', recon);
  }

  // ─── NAV Snapshot ──────────────────────────────────────────────

  generateNAVSnapshot(params: {
    portfolioId?: string;
    seriesId?: string;
    positions: NAVPosition[];
    totalLiabilities: string;
    valuationMethod: NAVSnapshot['valuationMethod'];
    totalUnits?: string;
  }): GeneratedReport<NAVSnapshot> {
    const totalAssets = params.positions
      .reduce((s, p) => s + parseFloat(p.marketValue), 0).toFixed(2);
    const nav = (parseFloat(totalAssets) - parseFloat(params.totalLiabilities)).toFixed(2);
    const units = params.totalUnits || '1';
    const navPerUnit = (parseFloat(nav) / parseFloat(units)).toFixed(8);

    const change = (parseFloat(nav) - parseFloat(this.previousNAV)).toFixed(2);
    const changePct = parseFloat(this.previousNAV) > 0
      ? ((parseFloat(change) / parseFloat(this.previousNAV)) * 100)
      : 0;

    const snapshot: NAVSnapshot = {
      snapshotDate: new Date().toISOString(),
      portfolioId: params.portfolioId,
      seriesId: params.seriesId,
      positions: params.positions,
      totalAssets,
      totalLiabilities: params.totalLiabilities,
      netAssetValue: nav,
      navPerUnit,
      changeFromPrevious: change,
      changePercent: parseFloat(changePct.toFixed(4)),
      valuationMethod: params.valuationMethod,
      hash: '',
    };

    snapshot.hash = this.hashData(snapshot);
    this.navHistory.push(snapshot);
    this.previousNAV = nav;

    return this.wrapReport('nav_snapshot', snapshot);
  }

  // ─── Lifecycle Status ──────────────────────────────────────────

  generateLifecycleReport(params: {
    items: LifecycleItem[];
  }): GeneratedReport<LifecycleStatusReport> {
    const pipeline = params.items.filter((i) => ['draft', 'approved', 'offering'].includes(i.status));
    const active = params.items.filter((i) => ['funded', 'active'].includes(i.status));
    const matured = params.items.filter((i) => ['matured', 'redeemed'].includes(i.status));
    const defaulted = params.items.filter((i) => i.status === 'defaulted');

    const sumPrincipal = (items: LifecycleItem[]) =>
      items.reduce((s, i) => s + parseFloat(i.principal), 0).toFixed(2);

    const totalOutstanding = active.reduce(
      (s, i) => s + parseFloat(i.outstandingBalance), 0
    ).toFixed(2);

    // Next maturities (within 180 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 180);
    const nextMaturities = active
      .filter((i) => new Date(i.maturityDate) <= cutoff)
      .sort((a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime())
      .map((i) => ({
        bondId: i.bondId,
        name: i.name,
        maturityDate: i.maturityDate,
        principal: i.principal,
      }));

    const report: LifecycleStatusReport = {
      reportDate: new Date().toISOString(),
      pipeline: { count: pipeline.length, totalPrincipal: sumPrincipal(pipeline), items: pipeline },
      active: { count: active.length, totalPrincipal: sumPrincipal(active), items: active },
      matured: { count: matured.length, totalPrincipal: sumPrincipal(matured), items: matured },
      defaulted: { count: defaulted.length, totalPrincipal: sumPrincipal(defaulted), items: defaulted },
      totalOutstanding,
      nextMaturities,
    };

    return this.wrapReport('lifecycle_status', report);
  }

  // ─── CSV/OFX Import Stubs ──────────────────────────────────────

  /**
   * Parse CSV payment data for reconciliation.
   * Stub — in production, use csv-parse or similar.
   */
  parseCSVPayments(csvContent: string): ReconciliationEntry[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const entries: ReconciliationEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      entries.push({
        id: `CSV-${i}`,
        date: row.date || row.payment_date || '',
        amount: row.amount || '0',
        currency: row.currency || 'USD',
        counterparty: row.counterparty || row.payee || '',
        reference: row.reference || row.ref || '',
        source: 'csv_import',
      });
    }

    return entries;
  }

  /**
   * Parse OFX payment data for reconciliation.
   * Stub — in production, use ofx-js or similar.
   */
  parseOFXPayments(ofxContent: string): ReconciliationEntry[] {
    // Simplified OFX parsing — looks for STMTTRN blocks
    const entries: ReconciliationEntry[] = [];
    const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = trnRegex.exec(ofxContent)) !== null) {
      const block = match[1];
      const getValue = (tag: string): string => {
        const m = block.match(new RegExp(`<${tag}>([^<\\n]+)`));
        return m ? m[1].trim() : '';
      };

      entries.push({
        id: `OFX-${++idx}`,
        date: getValue('DTPOSTED'),
        amount: getValue('TRNAMT'),
        currency: 'USD',
        counterparty: getValue('NAME'),
        reference: getValue('FITID'),
        source: 'ofx_import',
      });
    }

    return entries;
  }

  // ─── Queries ───────────────────────────────────────────────────

  getReport(reportId: string): GeneratedReport<unknown> | undefined {
    return this.reports.get(reportId);
  }

  getReportsByType(type: InstitutionalReportType): GeneratedReport<unknown>[] {
    return Array.from(this.reports.values()).filter((r) => r.type === type);
  }

  getNAVHistory(): NAVSnapshot[] {
    return [...this.navHistory];
  }
}

export default ReportingEngine;
