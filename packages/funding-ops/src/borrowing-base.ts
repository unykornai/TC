/**
 * Borrowing Base Certificate Generator
 *
 * Automated monthly borrowing base certificate generation for
 * lender covenant compliance reporting. Produces:
 *   - Collateral valuation snapshots
 *   - Advance rate calculations
 *   - Coverage ratio monitoring
 *   - Exception / covenant breach detection
 *   - Lender-grade certificate output
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ── Types ──────────────────────────────────────────────────────

export type CollateralType = 'mtn' | 'bond' | 'note' | 'equity' | 'real_estate' | 'other';
export type ExceptionSeverity = 'critical' | 'warning' | 'info';
export type CertificateStatus = 'draft' | 'generated' | 'reviewed' | 'certified' | 'submitted';
export type CovenantStatus = 'compliant' | 'warning' | 'breached';

export interface CollateralPosition {
  id: string;
  description: string;
  type: CollateralType;
  cusip?: string;
  isin?: string;
  faceValue: number;
  marketValue: number;
  haircut: number;          // percentage (0–100)
  advanceRate: number;      // percentage (0–100), always = 100 - haircut
  eligibleValue: number;    // faceValue × advanceRate
  couponRate?: number;
  maturityDate?: string;
  transferAgent?: string;
  insuranceCoverage?: number;
  verified: boolean;
  verificationSource?: string;
  lastVerified?: string;
}

export interface CovenantCheck {
  id: string;
  name: string;
  description: string;
  threshold: number;
  actual: number;
  unit: string;
  status: CovenantStatus;
  breachDate?: string;
}

export interface BorrowingBaseException {
  id: string;
  severity: ExceptionSeverity;
  category: string;
  description: string;
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface BorrowingBaseCertificate {
  id: string;
  certificateDate: string;
  reportingPeriod: string;
  generatedAt: string;
  status: CertificateStatus;

  // Collateral
  positions: CollateralPosition[];
  totalFaceValue: number;
  totalMarketValue: number;
  totalEligibleValue: number;
  weightedAdvanceRate: number;

  // Facility
  facilityLimit: number;
  currentOutstanding: number;
  availableCapacity: number;
  utilizationRate: number;

  // Coverage
  collateralCoverageRatio: number;
  interestCoverageRatio: number;
  minimumCoverageRequired: number;
  coverageExcess: number;

  // Covenants
  covenants: CovenantCheck[];
  covenantCompliance: boolean;

  // Exceptions
  exceptions: BorrowingBaseException[];
  criticalExceptions: number;
  warningExceptions: number;

  // Integrity
  hash: string;
  certifiedBy?: string;
  certifiedAt?: string;
}

export interface BorrowingBaseSummary {
  lastCertificateDate: string | null;
  certificateCount: number;
  totalFaceValue: number;
  totalEligibleValue: number;
  facilityLimit: number;
  currentOutstanding: number;
  collateralCoverageRatio: number;
  interestCoverageRatio: number;
  weightedAdvanceRate: number;
  utilizationRate: number;
  availableCapacity: number;
  covenantCompliance: boolean;
  breachedCovenants: number;
  openExceptions: number;
  criticalExceptions: number;
  status: CertificateStatus;
}

export interface BorrowingBaseConfig {
  facilityLimit?: number;
  currentOutstanding?: number;
  minimumCoverageRatio?: number;
  interestRate?: number;           // annual rate on facility, for ICR calc
  defaultHaircut?: number;         // default haircut % for new positions
  persistPath?: string;
  autoGenerate?: boolean;
}

export interface BorrowingBaseEvent {
  type: 'certificate_generated' | 'position_added' | 'position_updated' |
        'covenant_breached' | 'covenant_cured' | 'exception_raised' |
        'exception_resolved' | 'certificate_certified';
  id: string;
  timestamp: string;
  details: Record<string, any>;
}

// ── Borrowing Base Engine ──────────────────────────────────────

export class BorrowingBase extends EventEmitter {
  private positions: CollateralPosition[] = [];
  private certificates: BorrowingBaseCertificate[] = [];
  private exceptions: BorrowingBaseException[] = [];
  private config: Required<BorrowingBaseConfig>;

  constructor(config: BorrowingBaseConfig = {}) {
    super();
    this.config = {
      facilityLimit: config.facilityLimit ?? 4_000_000,
      currentOutstanding: config.currentOutstanding ?? 0,
      minimumCoverageRatio: config.minimumCoverageRatio ?? 2.0,
      interestRate: config.interestRate ?? 0.10,
      defaultHaircut: config.defaultHaircut ?? 40,
      persistPath: config.persistPath ?? './logs/borrowing-base.json',
      autoGenerate: config.autoGenerate ?? false,
    };
  }

  // ── Position Management ────────────────────────────────────────

  addPosition(params: {
    description: string;
    type: CollateralType;
    faceValue: number;
    marketValue?: number;
    haircut?: number;
    cusip?: string;
    isin?: string;
    couponRate?: number;
    maturityDate?: string;
    transferAgent?: string;
    insuranceCoverage?: number;
    verificationSource?: string;
  }): CollateralPosition {
    const haircut = params.haircut ?? this.config.defaultHaircut;
    const advanceRate = 100 - haircut;
    const marketValue = params.marketValue ?? params.faceValue;
    const eligibleValue = params.faceValue * (advanceRate / 100);

    const position: CollateralPosition = {
      id: `COL-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      description: params.description,
      type: params.type,
      cusip: params.cusip,
      isin: params.isin,
      faceValue: params.faceValue,
      marketValue,
      haircut,
      advanceRate,
      eligibleValue,
      couponRate: params.couponRate,
      maturityDate: params.maturityDate,
      transferAgent: params.transferAgent,
      insuranceCoverage: params.insuranceCoverage,
      verified: !!params.verificationSource,
      verificationSource: params.verificationSource,
      lastVerified: params.verificationSource ? new Date().toISOString() : undefined,
    };

    this.positions.push(position);

    const event: BorrowingBaseEvent = {
      type: 'position_added',
      id: position.id,
      timestamp: new Date().toISOString(),
      details: { description: position.description, faceValue: position.faceValue, eligibleValue: position.eligibleValue },
    };
    this.emit('position_added', event);

    return position;
  }

  updateOutstanding(amount: number): void {
    this.config.currentOutstanding = amount;
  }

  // ── Exception Management ───────────────────────────────────────

  raiseException(params: {
    severity: ExceptionSeverity;
    category: string;
    description: string;
  }): BorrowingBaseException {
    const exception: BorrowingBaseException = {
      id: `EXC-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      severity: params.severity,
      category: params.category,
      description: params.description,
      detectedAt: new Date().toISOString(),
      resolved: false,
    };

    this.exceptions.push(exception);

    const event: BorrowingBaseEvent = {
      type: 'exception_raised',
      id: exception.id,
      timestamp: new Date().toISOString(),
      details: { severity: exception.severity, category: exception.category },
    };
    this.emit('exception_raised', event);

    return exception;
  }

  resolveException(exceptionId: string): boolean {
    const exception = this.exceptions.find(e => e.id === exceptionId);
    if (!exception || exception.resolved) return false;

    exception.resolved = true;
    exception.resolvedAt = new Date().toISOString();

    const event: BorrowingBaseEvent = {
      type: 'exception_resolved',
      id: exception.id,
      timestamp: new Date().toISOString(),
      details: { category: exception.category },
    };
    this.emit('exception_resolved', event);

    return true;
  }

  // ── Certificate Generation ─────────────────────────────────────

  generateCertificate(reportingPeriod?: string): BorrowingBaseCertificate {
    const now = new Date();
    const period = reportingPeriod || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Calculate totals
    const totalFaceValue = this.positions.reduce((sum, p) => sum + p.faceValue, 0);
    const totalMarketValue = this.positions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalEligibleValue = this.positions.reduce((sum, p) => sum + p.eligibleValue, 0);
    const weightedAdvanceRate = totalFaceValue > 0
      ? (totalEligibleValue / totalFaceValue) * 100
      : 0;

    // Facility calculations
    const facilityLimit = this.config.facilityLimit;
    const currentOutstanding = this.config.currentOutstanding;
    const availableCapacity = Math.max(0, Math.min(totalEligibleValue, facilityLimit) - currentOutstanding);
    const utilizationRate = facilityLimit > 0
      ? (currentOutstanding / facilityLimit) * 100
      : 0;

    // Coverage ratios
    const collateralCoverageRatio = currentOutstanding > 0
      ? totalFaceValue / currentOutstanding
      : totalFaceValue > 0 ? Infinity : 0;
    const annualCouponIncome = this.positions.reduce(
      (sum, p) => sum + (p.faceValue * (p.couponRate || 0) / 100), 0
    );
    const annualInterestExpense = currentOutstanding * this.config.interestRate;
    const interestCoverageRatio = annualInterestExpense > 0
      ? annualCouponIncome / annualInterestExpense
      : annualCouponIncome > 0 ? Infinity : 0;

    // Run covenant checks
    const covenants = this.runCovenantChecks(
      collateralCoverageRatio, interestCoverageRatio, utilizationRate
    );
    const covenantCompliance = covenants.every(c => c.status !== 'breached');

    // Gather open exceptions
    const openExceptions = this.exceptions.filter(e => !e.resolved);
    const criticalExceptions = openExceptions.filter(e => e.severity === 'critical').length;
    const warningExceptions = openExceptions.filter(e => e.severity === 'warning').length;

    // Auto-raise exceptions for covenant breaches
    for (const covenant of covenants) {
      if (covenant.status === 'breached') {
        const existing = openExceptions.find(e =>
          e.category === 'covenant_breach' && e.description.includes(covenant.name)
        );
        if (!existing) {
          this.raiseException({
            severity: 'critical',
            category: 'covenant_breach',
            description: `Covenant breached: ${covenant.name} — actual ${covenant.actual.toFixed(2)}${covenant.unit} below threshold ${covenant.threshold}${covenant.unit}`,
          });
        }
      }
    }

    const certificate: BorrowingBaseCertificate = {
      id: `BBC-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      certificateDate: now.toISOString().split('T')[0],
      reportingPeriod: period,
      generatedAt: now.toISOString(),
      status: 'generated',
      positions: [...this.positions],
      totalFaceValue,
      totalMarketValue,
      totalEligibleValue,
      weightedAdvanceRate: Math.round(weightedAdvanceRate * 100) / 100,
      facilityLimit,
      currentOutstanding,
      availableCapacity,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      collateralCoverageRatio: collateralCoverageRatio === Infinity ? 999 : Math.round(collateralCoverageRatio * 100) / 100,
      interestCoverageRatio: interestCoverageRatio === Infinity ? 999 : Math.round(interestCoverageRatio * 100) / 100,
      minimumCoverageRequired: this.config.minimumCoverageRatio,
      coverageExcess: collateralCoverageRatio === Infinity
        ? 999
        : Math.round((collateralCoverageRatio - this.config.minimumCoverageRatio) * 100) / 100,
      covenants,
      covenantCompliance,
      exceptions: openExceptions,
      criticalExceptions,
      warningExceptions,
      hash: '',
    };

    // Compute integrity hash
    certificate.hash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ ...certificate, hash: '' }))
      .digest('hex');

    this.certificates.push(certificate);

    const event: BorrowingBaseEvent = {
      type: 'certificate_generated',
      id: certificate.id,
      timestamp: now.toISOString(),
      details: {
        period,
        collateralCoverageRatio: certificate.collateralCoverageRatio,
        covenantCompliance,
        criticalExceptions,
      },
    };
    this.emit('certificate_generated', event);

    return certificate;
  }

  certifyCertificate(certificateId: string, certifiedBy: string): boolean {
    const cert = this.certificates.find(c => c.id === certificateId);
    if (!cert || cert.status === 'certified') return false;

    cert.status = 'certified';
    cert.certifiedBy = certifiedBy;
    cert.certifiedAt = new Date().toISOString();

    const event: BorrowingBaseEvent = {
      type: 'certificate_certified',
      id: cert.id,
      timestamp: new Date().toISOString(),
      details: { certifiedBy, period: cert.reportingPeriod },
    };
    this.emit('certificate_certified', event);

    return true;
  }

  // ── Covenant Checks ────────────────────────────────────────────

  private runCovenantChecks(
    collateralCoverage: number,
    interestCoverage: number,
    utilization: number
  ): CovenantCheck[] {
    const checks: CovenantCheck[] = [];

    // Minimum collateral coverage
    const ccActual = collateralCoverage === Infinity ? 999 : collateralCoverage;
    const ccStatus: CovenantStatus = ccActual >= this.config.minimumCoverageRatio
      ? (ccActual >= this.config.minimumCoverageRatio * 1.1 ? 'compliant' : 'warning')
      : 'breached';
    checks.push({
      id: 'COV-CC',
      name: 'Minimum Collateral Coverage',
      description: `Collateral value must be at least ${this.config.minimumCoverageRatio}x outstanding`,
      threshold: this.config.minimumCoverageRatio,
      actual: ccActual,
      unit: 'x',
      status: ccStatus,
    });

    // Interest coverage
    const icActual = interestCoverage === Infinity ? 999 : interestCoverage;
    const icStatus: CovenantStatus = icActual >= 1.0
      ? (icActual >= 1.1 ? 'compliant' : 'warning')
      : 'breached';
    checks.push({
      id: 'COV-IC',
      name: 'Interest Coverage Ratio',
      description: 'Coupon income must cover facility interest expense',
      threshold: 1.0,
      actual: icActual,
      unit: 'x',
      status: icStatus,
    });

    // Maximum utilization
    const maxUtil = 90;
    const utilStatus: CovenantStatus = utilization <= maxUtil
      ? (utilization <= maxUtil * 0.9 ? 'compliant' : 'warning')
      : 'breached';
    checks.push({
      id: 'COV-UT',
      name: 'Maximum Utilization',
      description: `Facility utilization must not exceed ${maxUtil}%`,
      threshold: maxUtil,
      actual: Math.round(utilization * 100) / 100,
      unit: '%',
      status: utilStatus,
    });

    // All positions verified
    const verifiedCount = this.positions.filter(p => p.verified).length;
    const totalCount = this.positions.length;
    const verStatus: CovenantStatus = totalCount === 0 ? 'compliant'
      : verifiedCount === totalCount ? 'compliant'
      : verifiedCount >= totalCount * 0.8 ? 'warning'
      : 'breached';
    checks.push({
      id: 'COV-VR',
      name: 'Collateral Verification',
      description: 'All collateral positions must be independently verified',
      threshold: 100,
      actual: totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 100,
      unit: '%',
      status: verStatus,
    });

    return checks;
  }

  // ── Queries ────────────────────────────────────────────────────

  getPositions(): CollateralPosition[] {
    return [...this.positions];
  }

  getCertificates(): BorrowingBaseCertificate[] {
    return [...this.certificates];
  }

  getLatestCertificate(): BorrowingBaseCertificate | null {
    return this.certificates.length > 0
      ? this.certificates[this.certificates.length - 1]
      : null;
  }

  getExceptions(): BorrowingBaseException[] {
    return [...this.exceptions];
  }

  getOpenExceptions(): BorrowingBaseException[] {
    return this.exceptions.filter(e => !e.resolved);
  }

  getSummary(): BorrowingBaseSummary {
    const latest = this.getLatestCertificate();
    const totalFaceValue = this.positions.reduce((sum, p) => sum + p.faceValue, 0);
    const totalEligibleValue = this.positions.reduce((sum, p) => sum + p.eligibleValue, 0);
    const openExc = this.getOpenExceptions();

    if (latest) {
      return {
        lastCertificateDate: latest.certificateDate,
        certificateCount: this.certificates.length,
        totalFaceValue: latest.totalFaceValue,
        totalEligibleValue: latest.totalEligibleValue,
        facilityLimit: latest.facilityLimit,
        currentOutstanding: latest.currentOutstanding,
        collateralCoverageRatio: latest.collateralCoverageRatio,
        interestCoverageRatio: latest.interestCoverageRatio,
        weightedAdvanceRate: latest.weightedAdvanceRate,
        utilizationRate: latest.utilizationRate,
        availableCapacity: latest.availableCapacity,
        covenantCompliance: latest.covenantCompliance,
        breachedCovenants: latest.covenants.filter(c => c.status === 'breached').length,
        openExceptions: openExc.length,
        criticalExceptions: openExc.filter(e => e.severity === 'critical').length,
        status: latest.status,
      };
    }

    return {
      lastCertificateDate: null,
      certificateCount: 0,
      totalFaceValue,
      totalEligibleValue,
      facilityLimit: this.config.facilityLimit,
      currentOutstanding: this.config.currentOutstanding,
      collateralCoverageRatio: 0,
      interestCoverageRatio: 0,
      weightedAdvanceRate: totalFaceValue > 0 ? (totalEligibleValue / totalFaceValue) * 100 : 0,
      utilizationRate: 0,
      availableCapacity: Math.min(totalEligibleValue, this.config.facilityLimit),
      covenantCompliance: true,
      breachedCovenants: 0,
      openExceptions: openExc.length,
      criticalExceptions: openExc.filter(e => e.severity === 'critical').length,
      status: 'draft',
    };
  }

  // ── Persistence ────────────────────────────────────────────────

  persist(): void {
    const data = {
      positions: this.positions,
      certificates: this.certificates,
      exceptions: this.exceptions,
      config: this.config,
      savedAt: new Date().toISOString(),
    };
    const dir = path.dirname(this.config.persistPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.config.persistPath, JSON.stringify(data, null, 2));
  }

  loadFromDisk(): boolean {
    try {
      if (!fs.existsSync(this.config.persistPath)) return false;
      const raw = fs.readFileSync(this.config.persistPath, 'utf-8');
      const data = JSON.parse(raw);
      this.positions = data.positions || [];
      this.certificates = data.certificates || [];
      this.exceptions = data.exceptions || [];
      return true;
    } catch {
      return false;
    }
  }
}
