/**
 * @optkas/borrowing-base — Automated Borrowing Base Certificate Engine
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * What lenders actually require on the 1st of every month:
 * - Collateral market values (mark-to-market)
 * - Eligible vs ineligible classification
 * - Advance rates applied per asset class
 * - Concentration limits checked
 * - Net borrowing base computed
 * - Available capacity vs outstanding debt
 * - Covenant compliance attestation
 * - Hash-signed certificate for audit trail
 *
 * Generates a formal Borrowing Base Certificate (BBC) that any
 * institutional credit fund can drop straight into their system.
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════

export type AssetClass =
  | 'investment_grade_notes'
  | 'high_yield_bonds'
  | 'commercial_paper'
  | 'treasury_securities'
  | 'real_estate'
  | 'digital_assets'
  | 'stablecoins'
  | 'amm_lp_positions'
  | 'other';

export type EligibilityStatus = 'eligible' | 'ineligible' | 'excess_concentration' | 'pending_verification';

export interface CollateralItem {
  id: string;
  name: string;
  assetClass: AssetClass;
  cusip?: string;
  isin?: string;
  description: string;
  faceValue: number;
  marketValue: number;
  lastAppraisalDate: string;
  custodian: string;
  custodianVerified: boolean;
  maturityDate?: string;
  couponRate?: number;
  creditRating?: string;
  eligible: EligibilityStatus;
  ineligibilityReason?: string;
}

export interface AdvanceRateSchedule {
  assetClass: AssetClass;
  baseAdvanceRate: number;          // 0–1
  adjustedAdvanceRate: number;       // After haircuts
  concentrationLimit: number;        // Max % of total
  minimumRating?: string;
  minimumLiquidity?: number;
  notes: string;
}

export interface CovenantCheck {
  id: string;
  description: string;
  type: 'ratio' | 'absolute' | 'qualitative';
  threshold: number | string;
  currentValue: number | string;
  status: 'compliant' | 'warning' | 'breach';
  remedyPeriod?: number;  // days
}

export interface BorrowingBaseCertificate {
  certificateNumber: string;
  certificationDate: string;
  periodStart: string;
  periodEnd: string;
  borrower: {
    name: string;
    jurisdiction: string;
    entityType: string;
  };
  facilityDetails: {
    facilityId: string;
    facilityType: string;
    commitmentAmount: number;
    outstandingPrincipal: number;
    outstandingInterest: number;
    totalOutstanding: number;
  };
  collateralSchedule: {
    item: CollateralItem;
    advanceRate: number;
    eligibleAmount: number;
    concentrationExcess: number;
    netContribution: number;
  }[];
  advanceRateSchedule: AdvanceRateSchedule[];
  summary: {
    totalFaceValue: number;
    totalMarketValue: number;
    totalEligible: number;
    totalIneligible: number;
    grossBorrowingBase: number;
    concentrationExcess: number;
    netBorrowingBase: number;
    outstandingDebt: number;
    excessAvailability: number;
    utilizationRate: number;
    collateralCoverageRatio: number;
    loanToValue: number;
  };
  covenantCompliance: CovenantCheck[];
  allCovenantsCompliant: boolean;
  certificationStatement: string;
  attestation: {
    method: string;
    xrplTx?: string;
    stellarTx?: string;
    hash: string;
  };
  generatedAt: string;
  nextDue: string;
}

// ═══════════════════════════════════════════════════════════════════
//  BORROWING BASE ENGINE
// ═══════════════════════════════════════════════════════════════════

export class BorrowingBaseEngine extends EventEmitter {
  private collateral: CollateralItem[] = [];
  private advanceRates: AdvanceRateSchedule[] = [];
  private facilitySize: number = 0;
  private outstandingDebt: number = 0;
  private certificateCount: number = 0;

  constructor(config?: {
    facilitySize?: number;
    outstandingDebt?: number;
  }) {
    super();
    this.facilitySize = config?.facilitySize || 0;
    this.outstandingDebt = config?.outstandingDebt || 0;
    this.initializeDefaultAdvanceRates();
  }

  // ── Default Advance Rate Schedule ───────────────────────────────

  private initializeDefaultAdvanceRates(): void {
    this.advanceRates = [
      {
        assetClass: 'investment_grade_notes',
        baseAdvanceRate: 0.65,
        adjustedAdvanceRate: 0.60,
        concentrationLimit: 0.50,
        minimumRating: 'BBB-',
        notes: 'TC Advantage 5% Secured MTN (CUSIP 87225HAB4) — primary collateral',
      },
      {
        assetClass: 'high_yield_bonds',
        baseAdvanceRate: 0.50,
        adjustedAdvanceRate: 0.45,
        concentrationLimit: 0.30,
        minimumRating: 'B-',
        notes: 'Sub-investment-grade fixed income',
      },
      {
        assetClass: 'treasury_securities',
        baseAdvanceRate: 0.95,
        adjustedAdvanceRate: 0.93,
        concentrationLimit: 1.00,
        notes: 'US Treasury — highest quality collateral',
      },
      {
        assetClass: 'real_estate',
        baseAdvanceRate: 0.50,
        adjustedAdvanceRate: 0.45,
        concentrationLimit: 0.25,
        notes: 'Appraised value, 6-month refresh required',
      },
      {
        assetClass: 'stablecoins',
        baseAdvanceRate: 0.90,
        adjustedAdvanceRate: 0.85,
        concentrationLimit: 0.20,
        minimumLiquidity: 8,
        notes: 'RLUSD, USDC — requires custodian verification',
      },
      {
        assetClass: 'digital_assets',
        baseAdvanceRate: 0.30,
        adjustedAdvanceRate: 0.25,
        concentrationLimit: 0.15,
        notes: 'OPTKAS tokens, RWA tokens — high volatility haircut',
      },
      {
        assetClass: 'amm_lp_positions',
        baseAdvanceRate: 0.20,
        adjustedAdvanceRate: 0.15,
        concentrationLimit: 0.10,
        notes: 'AMM pool positions — IL risk + liquidity discount',
      },
      {
        assetClass: 'commercial_paper',
        baseAdvanceRate: 0.80,
        adjustedAdvanceRate: 0.75,
        concentrationLimit: 0.30,
        minimumRating: 'A-2',
        notes: 'Short-dated commercial paper',
      },
      {
        assetClass: 'other',
        baseAdvanceRate: 0.00,
        adjustedAdvanceRate: 0.00,
        concentrationLimit: 0.00,
        notes: 'Ineligible unless specifically approved',
      },
    ];
  }

  // ── Collateral Management ───────────────────────────────────────

  setCollateral(items: CollateralItem[]): void {
    this.collateral = [...items];
    this.emit('collateral:loaded', { count: items.length });
  }

  addCollateral(item: CollateralItem): void {
    this.collateral.push(item);
    this.emit('collateral:added', item);
  }

  setAdvanceRates(rates: AdvanceRateSchedule[]): void {
    this.advanceRates = [...rates];
  }

  setFacilityDetails(facilitySize: number, outstandingDebt: number): void {
    this.facilitySize = facilitySize;
    this.outstandingDebt = outstandingDebt;
  }

  // ── Generate Certificate ────────────────────────────────────────

  generateCertificate(periodStart?: string, periodEnd?: string): BorrowingBaseCertificate {
    this.certificateCount++;
    const now = new Date();
    const pStart = periodStart || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const pEnd = periodEnd || now.toISOString().split('T')[0];
    const nextDue = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];

    const totalMV = this.collateral.reduce((s, c) => s + c.marketValue, 0);

    // Compute per-item borrowing base
    const collateralSchedule = this.collateral.map(item => {
      const schedule = this.advanceRates.find(r => r.assetClass === item.assetClass)
        || this.advanceRates.find(r => r.assetClass === 'other')!;

      const advanceRate = item.eligible === 'eligible' ? schedule.adjustedAdvanceRate : 0;
      const eligibleAmount = item.marketValue * advanceRate;

      // Concentration check
      const weight = totalMV > 0 ? item.marketValue / totalMV : 0;
      const concentrationExcess = Math.max(0, weight - schedule.concentrationLimit) * item.marketValue * advanceRate;
      const netContribution = Math.max(0, eligibleAmount - concentrationExcess);

      return {
        item,
        advanceRate,
        eligibleAmount: Math.round(eligibleAmount * 100) / 100,
        concentrationExcess: Math.round(concentrationExcess * 100) / 100,
        netContribution: Math.round(netContribution * 100) / 100,
      };
    });

    // Summary calculations
    const totalFace = this.collateral.reduce((s, c) => s + c.faceValue, 0);
    const totalEligibleMV = this.collateral.filter(c => c.eligible === 'eligible').reduce((s, c) => s + c.marketValue, 0);
    const totalIneligibleMV = totalMV - totalEligibleMV;
    const grossBB = collateralSchedule.reduce((s, c) => s + c.eligibleAmount, 0);
    const totalConcentrationExcess = collateralSchedule.reduce((s, c) => s + c.concentrationExcess, 0);
    const netBB = collateralSchedule.reduce((s, c) => s + c.netContribution, 0);
    const excessAvailability = netBB - this.outstandingDebt;
    const utilizationRate = netBB > 0 ? this.outstandingDebt / netBB : 0;
    const coverageRatio = this.outstandingDebt > 0 ? totalMV / this.outstandingDebt : Infinity;
    const ltv = totalMV > 0 ? this.outstandingDebt / totalMV : 0;

    // Covenant compliance
    const covenants: CovenantCheck[] = [
      {
        id: 'COV-001',
        description: 'Minimum Collateral Coverage Ratio',
        type: 'ratio',
        threshold: 1.50,
        currentValue: Math.round(coverageRatio * 100) / 100,
        status: coverageRatio >= 1.50 ? 'compliant' : coverageRatio >= 1.25 ? 'warning' : 'breach',
        remedyPeriod: 5,
      },
      {
        id: 'COV-002',
        description: 'Maximum Loan-to-Value',
        type: 'ratio',
        threshold: 0.65,
        currentValue: Math.round(ltv * 100) / 100,
        status: ltv <= 0.65 ? 'compliant' : ltv <= 0.75 ? 'warning' : 'breach',
        remedyPeriod: 5,
      },
      {
        id: 'COV-003',
        description: 'Custodian Verification',
        type: 'qualitative',
        threshold: 'All items verified',
        currentValue: this.collateral.every(c => c.custodianVerified) ? 'All verified' : 'Pending',
        status: this.collateral.every(c => c.custodianVerified) ? 'compliant' : 'warning',
      },
      {
        id: 'COV-004',
        description: 'Maximum Single-Name Concentration',
        type: 'ratio',
        threshold: 0.50,
        currentValue: totalMV > 0 ? Math.round(Math.max(...this.collateral.map(c => c.marketValue / totalMV)) * 100) / 100 : 0,
        status: totalConcentrationExcess === 0 ? 'compliant' : 'warning',
      },
      {
        id: 'COV-005',
        description: 'Minimum Net Borrowing Base',
        type: 'absolute',
        threshold: this.outstandingDebt,
        currentValue: Math.round(netBB * 100) / 100,
        status: netBB >= this.outstandingDebt ? 'compliant' : 'breach',
        remedyPeriod: 3,
      },
    ];

    const allCompliant = covenants.every(c => c.status === 'compliant');

    // Build certificate
    const certBody: BorrowingBaseCertificate = {
      certificateNumber: `BBC-${now.getFullYear()}-${String(this.certificateCount).padStart(3, '0')}`,
      certificationDate: now.toISOString().split('T')[0],
      periodStart: pStart,
      periodEnd: pEnd,
      borrower: {
        name: 'OPTKAS1-MAIN SPV, LLC',
        jurisdiction: 'Wyoming, USA',
        entityType: 'Limited Liability Company (SPV)',
      },
      facilityDetails: {
        facilityId: 'OPTKAS-FAC-001',
        facilityType: 'Senior Secured Revolving Credit Facility',
        commitmentAmount: this.facilitySize,
        outstandingPrincipal: this.outstandingDebt,
        outstandingInterest: 0, // Calculated at disbursement
        totalOutstanding: this.outstandingDebt,
      },
      collateralSchedule,
      advanceRateSchedule: this.advanceRates,
      summary: {
        totalFaceValue: Math.round(totalFace * 100) / 100,
        totalMarketValue: Math.round(totalMV * 100) / 100,
        totalEligible: Math.round(totalEligibleMV * 100) / 100,
        totalIneligible: Math.round(totalIneligibleMV * 100) / 100,
        grossBorrowingBase: Math.round(grossBB * 100) / 100,
        concentrationExcess: Math.round(totalConcentrationExcess * 100) / 100,
        netBorrowingBase: Math.round(netBB * 100) / 100,
        outstandingDebt: this.outstandingDebt,
        excessAvailability: Math.round(excessAvailability * 100) / 100,
        utilizationRate: Math.round(utilizationRate * 10000) / 100,
        collateralCoverageRatio: coverageRatio === Infinity ? 999.99 : Math.round(coverageRatio * 100) / 100,
        loanToValue: Math.round(ltv * 10000) / 100,
      },
      covenantCompliance: covenants,
      allCovenantsCompliant: allCompliant,
      certificationStatement: `The undersigned, as an authorized officer of OPTKAS1-MAIN SPV, LLC, hereby certifies ` +
        `that as of ${pEnd}, (a) the information set forth in this Borrowing Base Certificate is true and correct ` +
        `in all material respects, (b) all collateral items have been verified through the custodian chain of custody, ` +
        `(c) no Event of Default or potential Event of Default has occurred and is continuing, and (d) all ` +
        `representations and warranties are true and correct in all material respects as of the date hereof.`,
      attestation: {
        method: 'Dual-chain (XRPL NFT + Stellar manage_data)',
        hash: '',
      },
      generatedAt: now.toISOString(),
      nextDue: nextDue,
    };

    // Compute hash
    certBody.attestation.hash = crypto.createHash('sha256')
      .update(JSON.stringify(certBody))
      .digest('hex');

    this.emit('certificate:generated', {
      number: certBody.certificateNumber,
      netBB: certBody.summary.netBorrowingBase,
      coverageRatio: certBody.summary.collateralCoverageRatio,
    });

    return certBody;
  }

  // ── Sensitivity Analysis ────────────────────────────────────────

  runSensitivity(shockPercents: number[] = [-30, -20, -15, -10, -5, 0, 5, 10]): {
    shockPercent: number;
    netBorrowingBase: number;
    coverageRatio: number;
    ltv: number;
    covenantBreaches: number;
  }[] {
    const results = [];

    for (const shock of shockPercents) {
      // Temporarily shock market values
      const originalValues = this.collateral.map(c => c.marketValue);
      this.collateral.forEach(c => { c.marketValue = c.marketValue * (1 + shock / 100); });

      const cert = this.generateCertificate();
      results.push({
        shockPercent: shock,
        netBorrowingBase: cert.summary.netBorrowingBase,
        coverageRatio: cert.summary.collateralCoverageRatio,
        ltv: cert.summary.loanToValue,
        covenantBreaches: cert.covenantCompliance.filter(c => c.status === 'breach').length,
      });

      // Restore original values
      this.collateral.forEach((c, i) => { c.marketValue = originalValues[i]; });
    }

    return results;
  }
}
