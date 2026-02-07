/**
 * OPTKAS — Draw Management Engine
 *
 * Post-funding infrastructure: draw requests, interest accrual,
 * repayment tracking, utilization monitoring.
 *
 * This is the plumbing between "facility closed" and "money moves."
 * Bridgewater doesn't close a facility and then manage draws in spreadsheets.
 * Neither do we.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════

export type DrawStatus = 'REQUESTED' | 'APPROVED' | 'FUNDED' | 'REJECTED' | 'CANCELLED';
export type RepaymentType = 'PRINCIPAL' | 'INTEREST' | 'FEE' | 'PREPAYMENT';

export interface FacilityTerms {
  facilityId: string;
  lenderName: string;
  facilitySize: number;
  advanceRate: number;
  baseRate: string;
  spread: number;              // basis points
  currentBaseRate: number;     // current SOFR or Prime
  floorRate: number;
  commitmentFee: number;       // % on undrawn per annum
  dayCountConvention: 'ACT/360' | 'ACT/365' | '30/360';
  tenor: number;               // months
  startDate: string;
  maturityDate: string;
  revolving: boolean;
  minimumDraw: number;
  maxOutstanding: number;
}

export interface DrawRequest {
  id: string;
  facilityId: string;
  requestDate: string;
  fundingDate?: string;
  amount: number;
  purpose: string;
  status: DrawStatus;
  approvedBy?: string;
  approvedDate?: string;
  wireInstructions?: {
    bank: string;
    accountName: string;
    accountNumber: string;
    routingNumber: string;
    reference: string;
  };
}

export interface Repayment {
  id: string;
  facilityId: string;
  date: string;
  type: RepaymentType;
  amount: number;
  appliedToPrincipal: number;
  appliedToInterest: number;
  appliedToFees: number;
  reference: string;
}

export interface InterestAccrual {
  periodStart: string;
  periodEnd: string;
  principalBalance: number;
  rate: number;               // annualized
  dayCount: number;
  interestAmount: number;
  cumulativeInterest: number;
}

export interface FacilitySnapshot {
  asOf: string;
  facilityId: string;
  totalCommitment: number;
  totalDrawn: number;
  totalRepaid: number;
  outstandingPrincipal: number;
  accruedInterest: number;
  totalInterestPaid: number;
  totalFeesPaid: number;
  availableCapacity: number;
  utilizationRate: number;
  currentRate: number;
  daysToMaturity: number;
  nextInterestPaymentDate: string;
  nextInterestAmount: number;
  drawHistory: DrawRequest[];
  repaymentHistory: Repayment[];
  accrualSchedule: InterestAccrual[];
  covenantStatus: {
    coverageRatio: number;
    ltv: number;
    allPassing: boolean;
  };
  hash: string;
}

// ═══════════════════════════════════════════════════════════════════
//  DRAW MANAGEMENT ENGINE
// ═══════════════════════════════════════════════════════════════════

export class DrawManagementEngine extends EventEmitter {
  private facilities: Map<string, FacilityTerms> = new Map();
  private draws: Map<string, DrawRequest[]> = new Map();
  private repayments: Map<string, Repayment[]> = new Map();
  private accruals: Map<string, InterestAccrual[]> = new Map();

  constructor() {
    super();
  }

  // ── Register Facility ─────────────────────────────────────────

  registerFacility(terms: Omit<FacilityTerms, 'facilityId'>): FacilityTerms {
    const facility: FacilityTerms = {
      ...terms,
      facilityId: `FAC-${String(this.facilities.size + 1).padStart(3, '0')}`,
    };
    this.facilities.set(facility.facilityId, facility);
    this.draws.set(facility.facilityId, []);
    this.repayments.set(facility.facilityId, []);
    this.accruals.set(facility.facilityId, []);
    this.emit('facility:registered', facility);
    return facility;
  }

  // ── Draw Request ──────────────────────────────────────────────

  requestDraw(facilityId: string, amount: number, purpose: string): DrawRequest | null {
    const facility = this.facilities.get(facilityId);
    if (!facility) return null;

    // Validate
    const outstanding = this.getOutstandingPrincipal(facilityId);
    const available = facility.maxOutstanding - outstanding;

    if (amount > available) {
      this.emit('draw:rejected', { facilityId, amount, reason: `Exceeds available capacity ($${available.toLocaleString()})` });
      return null;
    }

    if (amount < facility.minimumDraw) {
      this.emit('draw:rejected', { facilityId, amount, reason: `Below minimum draw ($${facility.minimumDraw.toLocaleString()})` });
      return null;
    }

    const draw: DrawRequest = {
      id: `DRAW-${Date.now().toString(36).toUpperCase()}`,
      facilityId,
      requestDate: new Date().toISOString(),
      amount,
      purpose,
      status: 'REQUESTED',
    };

    this.draws.get(facilityId)!.push(draw);
    this.emit('draw:requested', draw);
    return draw;
  }

  approveDraw(drawId: string, facilityId: string, approvedBy: string): DrawRequest | null {
    const facilityDraws = this.draws.get(facilityId);
    if (!facilityDraws) return null;

    const draw = facilityDraws.find(d => d.id === drawId);
    if (!draw || draw.status !== 'REQUESTED') return null;

    draw.status = 'APPROVED';
    draw.approvedBy = approvedBy;
    draw.approvedDate = new Date().toISOString();
    this.emit('draw:approved', draw);
    return draw;
  }

  fundDraw(drawId: string, facilityId: string, wireInstructions: DrawRequest['wireInstructions']): DrawRequest | null {
    const facilityDraws = this.draws.get(facilityId);
    if (!facilityDraws) return null;

    const draw = facilityDraws.find(d => d.id === drawId);
    if (!draw || draw.status !== 'APPROVED') return null;

    draw.status = 'FUNDED';
    draw.fundingDate = new Date().toISOString();
    draw.wireInstructions = wireInstructions;

    // Accrue interest from funding date
    this.accrueInterest(facilityId, draw.fundingDate);

    this.emit('draw:funded', draw);
    return draw;
  }

  // ── Repayments ────────────────────────────────────────────────

  recordRepayment(facilityId: string, amount: number, type: RepaymentType, reference: string): Repayment | null {
    const facility = this.facilities.get(facilityId);
    if (!facility) return null;

    const outstanding = this.getOutstandingPrincipal(facilityId);
    const accruedInterest = this.getAccruedInterest(facilityId);

    // Apply waterfall: fees first, then interest, then principal
    let remaining = amount;
    let appliedToFees = 0;
    let appliedToInterest = 0;
    let appliedToPrincipal = 0;

    if (type === 'INTEREST') {
      appliedToInterest = Math.min(remaining, accruedInterest);
      remaining -= appliedToInterest;
    } else if (type === 'PREPAYMENT' || type === 'PRINCIPAL') {
      // Interest first, then principal
      appliedToInterest = Math.min(remaining, accruedInterest);
      remaining -= appliedToInterest;
      appliedToPrincipal = Math.min(remaining, outstanding);
      remaining -= appliedToPrincipal;
    } else if (type === 'FEE') {
      appliedToFees = remaining;
      remaining = 0;
    }

    const repayment: Repayment = {
      id: `REP-${Date.now().toString(36).toUpperCase()}`,
      facilityId,
      date: new Date().toISOString(),
      type,
      amount,
      appliedToPrincipal,
      appliedToInterest,
      appliedToFees,
      reference,
    };

    this.repayments.get(facilityId)!.push(repayment);
    this.emit('repayment:recorded', repayment);
    return repayment;
  }

  // ── Interest Accrual ──────────────────────────────────────────

  accrueInterest(facilityId: string, asOfDate?: string): InterestAccrual | null {
    const facility = this.facilities.get(facilityId);
    if (!facility) return null;

    const outstanding = this.getOutstandingPrincipal(facilityId);
    if (outstanding <= 0) return null;

    const accruals = this.accruals.get(facilityId)!;
    const lastAccrual = accruals[accruals.length - 1];
    const periodStart = lastAccrual ? lastAccrual.periodEnd : facility.startDate;
    const periodEnd = asOfDate || new Date().toISOString();

    // Compute interest
    const rate = Math.max(
      (facility.currentBaseRate + facility.spread / 100),
      facility.floorRate
    ) / 100;

    const dayCount = this.computeDayCount(periodStart, periodEnd, facility.dayCountConvention);
    const divisor = facility.dayCountConvention === 'ACT/365' ? 365 : 360;
    const interestAmount = outstanding * rate * (dayCount / divisor);

    const cumulativeInterest = accruals.reduce((sum, a) => sum + a.interestAmount, 0) + interestAmount;

    const accrual: InterestAccrual = {
      periodStart,
      periodEnd,
      principalBalance: outstanding,
      rate: rate * 100,
      dayCount,
      interestAmount: Math.round(interestAmount * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
    };

    accruals.push(accrual);
    this.emit('interest:accrued', accrual);
    return accrual;
  }

  // ── Facility Snapshot ─────────────────────────────────────────

  getSnapshot(facilityId: string): FacilitySnapshot | null {
    const facility = this.facilities.get(facilityId);
    if (!facility) return null;

    const draws = this.draws.get(facilityId) || [];
    const repaymentList = this.repayments.get(facilityId) || [];
    const accruals = this.accruals.get(facilityId) || [];

    const totalDrawn = draws
      .filter(d => d.status === 'FUNDED')
      .reduce((sum, d) => sum + d.amount, 0);

    const totalRepaidPrincipal = repaymentList.reduce((sum, r) => sum + r.appliedToPrincipal, 0);
    const totalInterestPaid = repaymentList.reduce((sum, r) => sum + r.appliedToInterest, 0);
    const totalFeesPaid = repaymentList.reduce((sum, r) => sum + r.appliedToFees, 0);
    const outstandingPrincipal = totalDrawn - totalRepaidPrincipal;
    const accruedInterest = accruals.reduce((sum, a) => sum + a.interestAmount, 0) - totalInterestPaid;
    const availableCapacity = facility.maxOutstanding - outstandingPrincipal;
    const utilizationRate = facility.maxOutstanding > 0 ? (outstandingPrincipal / facility.maxOutstanding) * 100 : 0;

    const currentRate = Math.max(
      facility.currentBaseRate + facility.spread / 100,
      facility.floorRate
    );

    const maturityDate = new Date(facility.maturityDate);
    const daysToMaturity = Math.ceil((maturityDate.getTime() - Date.now()) / 86_400_000);

    // Next interest (estimated — monthly)
    const monthlyInterest = outstandingPrincipal * (currentRate / 100) / 12;
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Covenant check
    const collateralValue = 10_000_000; // TC Advantage face value
    const coverageRatio = outstandingPrincipal > 0
      ? (collateralValue * (facility.advanceRate / 100)) / outstandingPrincipal
      : 999;
    const ltv = collateralValue > 0 ? (outstandingPrincipal / collateralValue) * 100 : 0;

    const snapshot: FacilitySnapshot = {
      asOf: new Date().toISOString(),
      facilityId,
      totalCommitment: facility.maxOutstanding,
      totalDrawn,
      totalRepaid: totalRepaidPrincipal + totalInterestPaid + totalFeesPaid,
      outstandingPrincipal,
      accruedInterest: Math.round(accruedInterest * 100) / 100,
      totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
      totalFeesPaid: Math.round(totalFeesPaid * 100) / 100,
      availableCapacity,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      currentRate,
      daysToMaturity,
      nextInterestPaymentDate: nextMonth.toISOString(),
      nextInterestAmount: Math.round(monthlyInterest * 100) / 100,
      drawHistory: draws,
      repaymentHistory: repaymentList,
      accrualSchedule: accruals,
      covenantStatus: {
        coverageRatio: Math.round(coverageRatio * 100) / 100,
        ltv: Math.round(ltv * 100) / 100,
        allPassing: coverageRatio >= 1.5 && ltv <= 65,
      },
      hash: '',
    };

    snapshot.hash = crypto.createHash('sha256')
      .update(JSON.stringify({ ...snapshot, hash: undefined }))
      .digest('hex');

    return snapshot;
  }

  // ── Utilization Report ────────────────────────────────────────

  getUtilizationReport(facilityId: string): {
    current: number;
    average30d: number;
    peak: number;
    commitmentFeeEstimate: number;
  } | null {
    const facility = this.facilities.get(facilityId);
    if (!facility) return null;

    const outstanding = this.getOutstandingPrincipal(facilityId);
    const utilization = (outstanding / facility.maxOutstanding) * 100;
    const undrawn = facility.maxOutstanding - outstanding;
    const annualCommitmentFee = undrawn * (facility.commitmentFee / 100);

    return {
      current: Math.round(utilization * 100) / 100,
      average30d: Math.round(utilization * 100) / 100, // Simplified — would track daily in production
      peak: Math.round(utilization * 100) / 100,
      commitmentFeeEstimate: Math.round(annualCommitmentFee * 100) / 100,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────

  private getOutstandingPrincipal(facilityId: string): number {
    const draws = this.draws.get(facilityId) || [];
    const repaymentList = this.repayments.get(facilityId) || [];

    const totalDrawn = draws
      .filter(d => d.status === 'FUNDED')
      .reduce((sum, d) => sum + d.amount, 0);

    const totalRepaid = repaymentList.reduce((sum, r) => sum + r.appliedToPrincipal, 0);
    return totalDrawn - totalRepaid;
  }

  private getAccruedInterest(facilityId: string): number {
    const accruals = this.accruals.get(facilityId) || [];
    const repaymentList = this.repayments.get(facilityId) || [];

    const totalAccrued = accruals.reduce((sum, a) => sum + a.interestAmount, 0);
    const totalPaid = repaymentList.reduce((sum, r) => sum + r.appliedToInterest, 0);
    return totalAccrued - totalPaid;
  }

  private computeDayCount(start: string, end: string, convention: FacilityTerms['dayCountConvention']): number {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (convention === '30/360') {
      const d1 = Math.min(startDate.getDate(), 30);
      const d2 = Math.min(endDate.getDate(), 30);
      const m1 = startDate.getMonth();
      const m2 = endDate.getMonth();
      const y1 = startDate.getFullYear();
      const y2 = endDate.getFullYear();
      return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
    }

    // ACT/360 or ACT/365
    return Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000);
  }

  // ── Accessors ─────────────────────────────────────────────────

  getFacility(id: string): FacilityTerms | undefined { return this.facilities.get(id); }
  getAllFacilities(): FacilityTerms[] { return Array.from(this.facilities.values()); }
}
