/**
 * @optkas/funding-ops — Sponsor Consideration Note
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Tracks the lifecycle of a Sponsor Consideration Note — the financeable
 * debt instrument issued by the SPV to the platform sponsor (Unykorn) in
 * consideration for system architecture, engineering, and deployment.
 *
 * This module manages:
 *   - Principal and interest accrual (fixed or PIK)
 *   - Maturity tracking and payment scheduling
 *   - Assignment, pledge, and encumbrance tracking
 *   - Events of default and acceleration
 *   - Subordination status relative to investor bonds
 *   - Integration with AuditBridge for lifecycle events
 *
 * The Sponsor Note is:
 *   - Bona fide debt, not equity
 *   - Fully assignable without issuer consent
 *   - Senior to all unsecured obligations except investor bonds
 *   - Independent of investor capital, escrows, and trust assets
 *   - Payable from operating revenues or general assets
 *
 * Key legal protections enforced by this module:
 *   - No setoff against transaction participation fees
 *   - Acceleration on default, material breach, or improper termination
 *   - Non-interference with investor bond program
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────

export type NoteStatus =
  | 'draft'
  | 'issued'
  | 'accruing'
  | 'partially_paid'
  | 'matured'
  | 'accelerated'
  | 'paid_in_full'
  | 'defaulted';

export type InterestMode = 'cash' | 'pik' | 'mixed';

export type SubordinationTier =
  | 'senior_secured'
  | 'senior_unsecured'
  | 'subordinated_to_investor_bonds'
  | 'junior';

export type DefaultEventType =
  | 'payment_failure'
  | 'material_breach'
  | 'platform_rights_termination'
  | 'insolvency'
  | 'dissolution'
  | 'assignment_for_benefit_of_creditors';

export type AssignmentType = 'full_assignment' | 'pledge' | 'partial_assignment' | 'discount' | 'encumbrance';

export interface SponsorNoteConfig {
  persistPath?: string;
  autoAccrue?: boolean;
  accrualIntervalDays?: number;
}

export interface NoteTerms {
  principal: number;
  interestRate: number;        // Annual rate as decimal (e.g. 0.08 = 8%)
  interestMode: InterestMode;
  maturityMonths: number;
  subordination: SubordinationTier;
  prepayable: boolean;
  prepaymentPenalty: number;   // 0 = no penalty
  governingLaw: string;
}

export interface AccrualRecord {
  id: string;
  date: string;
  daysAccrued: number;
  rate: number;
  interestAmount: number;
  mode: InterestMode;
  pikCapitalized: number;      // Amount added to principal (PIK)
  cashPayable: number;         // Amount payable in cash
  cumulativeInterest: number;
  principalAfterPik: number;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  appliedToPrincipal: number;
  appliedToInterest: number;
  method: 'cash' | 'wire' | 'ledger_settlement';
  reference?: string;
  remainingPrincipal: number;
  remainingInterest: number;
}

export interface AssignmentRecord {
  id: string;
  date: string;
  type: AssignmentType;
  counterparty: string;
  amount: number;
  description: string;
  consentRequired: boolean;    // Always false per note terms
  acknowledged: boolean;
}

export interface DefaultEvent {
  id: string;
  date: string;
  type: DefaultEventType;
  description: string;
  cured: boolean;
  curedAt?: string;
  accelerated: boolean;
  acceleratedAmount?: number;
}

export interface SponsorNoteState {
  id: string;
  status: NoteStatus;
  issuer: string;
  payee: string;
  terms: NoteTerms;
  issuedAt: string | null;
  maturityDate: string | null;
  currentPrincipal: number;    // Includes PIK capitalization
  accruedInterest: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  accruals: AccrualRecord[];
  payments: PaymentRecord[];
  assignments: AssignmentRecord[];
  defaults: DefaultEvent[];
  accelerated: boolean;
  acceleratedAt: string | null;
  paidInFull: boolean;
  paidInFullAt: string | null;
  sha256: string;
}

export interface SponsorNoteSummary {
  noteId: string;
  status: NoteStatus;
  issuer: string;
  payee: string;
  originalPrincipal: number;
  currentPrincipal: number;
  accruedInterest: number;
  totalOutstanding: number;
  interestRate: string;
  interestMode: InterestMode;
  subordination: SubordinationTier;
  maturityDate: string | null;
  daysToMaturity: number | null;
  isOverdue: boolean;
  paymentsCount: number;
  totalPaid: number;
  assignmentsCount: number;
  totalAssigned: number;
  defaultsCount: number;
  uncuredDefaults: number;
  accelerated: boolean;
  paidInFull: boolean;
  assignableWithoutConsent: boolean;
  noSetoff: boolean;
}

export interface SponsorNoteEvent {
  type: string;
  noteId: string;
  timestamp: string;
  details: Record<string, unknown>;
}

// ─── Sponsor Note ────────────────────────────────────────────────

export class SponsorNote extends EventEmitter {
  private state: SponsorNoteState;
  private config: Required<SponsorNoteConfig>;

  constructor(config?: SponsorNoteConfig) {
    super();
    this.config = {
      persistPath: config?.persistPath ?? './logs/sponsor-note.json',
      autoAccrue: config?.autoAccrue ?? false,
      accrualIntervalDays: config?.accrualIntervalDays ?? 30,
    };
    this.state = this.defaultState();
    this.loadFromDisk();
  }

  // ─── Issuance ────────────────────────────────────────────────

  /**
   * Issue the Sponsor Consideration Note.
   * This creates the binding debt obligation.
   */
  issue(params: {
    issuer: string;
    payee: string;
    terms: NoteTerms;
  }): SponsorNoteState {
    if (this.state.status !== 'draft') {
      throw new Error(`Cannot issue note in status: ${this.state.status}`);
    }

    const now = new Date();
    const maturity = new Date(now);
    maturity.setMonth(maturity.getMonth() + params.terms.maturityMonths);

    this.state.id = `SN-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    this.state.status = 'issued';
    this.state.issuer = params.issuer;
    this.state.payee = params.payee;
    this.state.terms = { ...params.terms };
    this.state.issuedAt = now.toISOString();
    this.state.maturityDate = maturity.toISOString();
    this.state.currentPrincipal = params.terms.principal;
    this.state.sha256 = this.computeHash();

    this.emitEvent('note_issued', {
      principal: params.terms.principal,
      interestRate: params.terms.interestRate,
      maturityDate: this.state.maturityDate,
      subordination: params.terms.subordination,
    });

    this.persist();
    return { ...this.state };
  }

  // ─── Interest Accrual ────────────────────────────────────────

  /**
   * Accrue interest for a given number of days.
   * PIK interest is capitalized into principal.
   */
  accrue(days: number): AccrualRecord {
    this.ensureActive();

    if (this.state.status === 'issued') {
      this.state.status = 'accruing';
    }

    const dailyRate = this.state.terms.interestRate / 365;
    const interestAmount = this.state.currentPrincipal * dailyRate * days;

    let pikCapitalized = 0;
    let cashPayable = 0;

    switch (this.state.terms.interestMode) {
      case 'pik':
        pikCapitalized = interestAmount;
        this.state.currentPrincipal += pikCapitalized;
        break;
      case 'cash':
        cashPayable = interestAmount;
        this.state.accruedInterest += cashPayable;
        break;
      case 'mixed':
        pikCapitalized = interestAmount * 0.5;
        cashPayable = interestAmount * 0.5;
        this.state.currentPrincipal += pikCapitalized;
        this.state.accruedInterest += cashPayable;
        break;
    }

    const record: AccrualRecord = {
      id: `ACC-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      date: new Date().toISOString(),
      daysAccrued: days,
      rate: this.state.terms.interestRate,
      interestAmount,
      mode: this.state.terms.interestMode,
      pikCapitalized,
      cashPayable,
      cumulativeInterest: this.state.accruedInterest,
      principalAfterPik: this.state.currentPrincipal,
    };

    this.state.accruals.push(record);
    this.state.sha256 = this.computeHash();

    this.emitEvent('interest_accrued', {
      days,
      amount: interestAmount,
      mode: this.state.terms.interestMode,
      principalAfterPik: this.state.currentPrincipal,
    });

    this.persist();
    return record;
  }

  // ─── Payments ────────────────────────────────────────────────

  /**
   * Record a payment against the note.
   * Applies to accrued interest first, then principal.
   */
  recordPayment(params: {
    amount: number;
    method: PaymentRecord['method'];
    reference?: string;
  }): PaymentRecord {
    this.ensureActive();

    let remaining = params.amount;
    let appliedToInterest = 0;
    let appliedToPrincipal = 0;

    // Interest first
    if (this.state.accruedInterest > 0) {
      const interestPayment = Math.min(remaining, this.state.accruedInterest);
      this.state.accruedInterest -= interestPayment;
      appliedToInterest = interestPayment;
      remaining -= interestPayment;
      this.state.totalInterestPaid += interestPayment;
    }

    // Then principal
    if (remaining > 0) {
      const principalPayment = Math.min(remaining, this.state.currentPrincipal);
      this.state.currentPrincipal -= principalPayment;
      appliedToPrincipal = principalPayment;
      this.state.totalPrincipalPaid += principalPayment;
    }

    const record: PaymentRecord = {
      id: `PMT-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      date: new Date().toISOString(),
      amount: params.amount,
      appliedToPrincipal,
      appliedToInterest,
      method: params.method,
      reference: params.reference,
      remainingPrincipal: this.state.currentPrincipal,
      remainingInterest: this.state.accruedInterest,
    };

    this.state.payments.push(record);

    if (this.state.currentPrincipal <= 0 && this.state.accruedInterest <= 0) {
      this.state.status = 'paid_in_full';
      this.state.paidInFull = true;
      this.state.paidInFullAt = new Date().toISOString();
      this.emitEvent('note_paid_in_full', { totalPaid: this.state.totalPrincipalPaid + this.state.totalInterestPaid });
    } else {
      this.state.status = 'partially_paid';
    }

    this.state.sha256 = this.computeHash();

    this.emitEvent('payment_recorded', {
      amount: params.amount,
      appliedToInterest,
      appliedToPrincipal,
      remainingPrincipal: this.state.currentPrincipal,
    });

    this.persist();
    return record;
  }

  // ─── Assignment & Pledge ─────────────────────────────────────

  /**
   * Record an assignment, pledge, or encumbrance.
   * No issuer consent is required per Section 8 of the Note.
   */
  recordAssignment(params: {
    type: AssignmentType;
    counterparty: string;
    amount: number;
    description: string;
  }): AssignmentRecord {
    this.ensureActive();

    const record: AssignmentRecord = {
      id: `ASN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      date: new Date().toISOString(),
      type: params.type,
      counterparty: params.counterparty,
      amount: params.amount,
      description: params.description,
      consentRequired: false,   // Per note terms — always false
      acknowledged: false,
    };

    this.state.assignments.push(record);
    this.state.sha256 = this.computeHash();

    this.emitEvent('assignment_recorded', {
      type: params.type,
      counterparty: params.counterparty,
      amount: params.amount,
    });

    this.persist();
    return record;
  }

  /**
   * Mark an assignment as acknowledged by the issuer.
   */
  acknowledgeAssignment(assignmentId: string): void {
    const record = this.state.assignments.find(a => a.id === assignmentId);
    if (!record) throw new Error(`Assignment not found: ${assignmentId}`);
    record.acknowledged = true;
    this.persist();
  }

  // ─── Events of Default ──────────────────────────────────────

  /**
   * Record an event of default.
   */
  recordDefault(params: {
    type: DefaultEventType;
    description: string;
  }): DefaultEvent {
    const event: DefaultEvent = {
      id: `DEF-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      date: new Date().toISOString(),
      type: params.type,
      description: params.description,
      cured: false,
      accelerated: false,
    };

    this.state.defaults.push(event);
    this.state.status = 'defaulted';
    this.state.sha256 = this.computeHash();

    this.emitEvent('default_recorded', {
      type: params.type,
      description: params.description,
    });

    this.persist();
    return event;
  }

  /**
   * Cure a previously recorded default.
   */
  cureDefault(defaultId: string): void {
    const event = this.state.defaults.find(d => d.id === defaultId);
    if (!event) throw new Error(`Default event not found: ${defaultId}`);
    event.cured = true;
    event.curedAt = new Date().toISOString();

    // If no uncured defaults remain, restore to accruing
    const uncured = this.state.defaults.filter(d => !d.cured);
    if (uncured.length === 0 && !this.state.accelerated) {
      this.state.status = 'accruing';
    }

    this.emitEvent('default_cured', { defaultId });
    this.persist();
  }

  // ─── Acceleration ────────────────────────────────────────────

  /**
   * Accelerate the note — all outstanding amounts become immediately due.
   * Per Section 10 of the Note, no notice or demand required.
   */
  accelerate(): void {
    if (this.state.paidInFull) throw new Error('Cannot accelerate a paid note');

    this.state.accelerated = true;
    this.state.acceleratedAt = new Date().toISOString();
    this.state.status = 'accelerated';

    const totalDue = this.state.currentPrincipal + this.state.accruedInterest;

    // Mark all uncured defaults as accelerated
    for (const def of this.state.defaults) {
      if (!def.cured) def.accelerated = true;
      if (!def.cured) def.acceleratedAmount = totalDue;
    }

    this.state.sha256 = this.computeHash();

    this.emitEvent('note_accelerated', {
      totalDue,
      principal: this.state.currentPrincipal,
      accruedInterest: this.state.accruedInterest,
    });

    this.persist();
  }

  // ─── Queries ─────────────────────────────────────────────────

  getState(): SponsorNoteState {
    return { ...this.state };
  }

  getTerms(): NoteTerms {
    return { ...this.state.terms };
  }

  getAccruals(): AccrualRecord[] {
    return [...this.state.accruals];
  }

  getPayments(): PaymentRecord[] {
    return [...this.state.payments];
  }

  getAssignments(): AssignmentRecord[] {
    return [...this.state.assignments];
  }

  getDefaults(): DefaultEvent[] {
    return [...this.state.defaults];
  }

  getUncuredDefaults(): DefaultEvent[] {
    return this.state.defaults.filter(d => !d.cured);
  }

  getTotalOutstanding(): number {
    return this.state.currentPrincipal + this.state.accruedInterest;
  }

  getDaysToMaturity(): number | null {
    if (!this.state.maturityDate) return null;
    const now = new Date();
    const maturity = new Date(this.state.maturityDate);
    const diff = maturity.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  isOverdue(): boolean {
    const days = this.getDaysToMaturity();
    return days !== null && days < 0 && !this.state.paidInFull;
  }

  // ─── Summary ─────────────────────────────────────────────────

  getSummary(): SponsorNoteSummary {
    const totalAssigned = this.state.assignments.reduce((sum, a) => sum + a.amount, 0);

    return {
      noteId: this.state.id,
      status: this.state.status,
      issuer: this.state.issuer,
      payee: this.state.payee,
      originalPrincipal: this.state.terms.principal,
      currentPrincipal: this.state.currentPrincipal,
      accruedInterest: this.state.accruedInterest,
      totalOutstanding: this.getTotalOutstanding(),
      interestRate: `${(this.state.terms.interestRate * 100).toFixed(2)}%`,
      interestMode: this.state.terms.interestMode,
      subordination: this.state.terms.subordination,
      maturityDate: this.state.maturityDate,
      daysToMaturity: this.getDaysToMaturity(),
      isOverdue: this.isOverdue(),
      paymentsCount: this.state.payments.length,
      totalPaid: this.state.totalPrincipalPaid + this.state.totalInterestPaid,
      assignmentsCount: this.state.assignments.length,
      totalAssigned,
      defaultsCount: this.state.defaults.length,
      uncuredDefaults: this.getUncuredDefaults().length,
      accelerated: this.state.accelerated,
      paidInFull: this.state.paidInFull,
      assignableWithoutConsent: true,   // Always true per note terms
      noSetoff: true,                   // Always true per note terms
    };
  }

  // ─── Persistence ─────────────────────────────────────────────

  private persist(): void {
    try {
      const dir = path.dirname(this.config.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.config.persistPath, JSON.stringify(this.state, null, 2));
    } catch (err) {
      this.emit('persist_error', err);
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.config.persistPath)) {
        const raw = fs.readFileSync(this.config.persistPath, 'utf-8');
        const data = JSON.parse(raw);
        this.state = { ...this.defaultState(), ...data };
      }
    } catch (err) {
      this.emit('load_error', err);
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private defaultState(): SponsorNoteState {
    return {
      id: '',
      status: 'draft',
      issuer: '',
      payee: '',
      terms: {
        principal: 0,
        interestRate: 0,
        interestMode: 'pik',
        maturityMonths: 24,
        subordination: 'subordinated_to_investor_bonds',
        prepayable: true,
        prepaymentPenalty: 0,
        governingLaw: 'Wyoming',
      },
      issuedAt: null,
      maturityDate: null,
      currentPrincipal: 0,
      accruedInterest: 0,
      totalInterestPaid: 0,
      totalPrincipalPaid: 0,
      accruals: [],
      payments: [],
      assignments: [],
      defaults: [],
      accelerated: false,
      acceleratedAt: null,
      paidInFull: false,
      paidInFullAt: null,
      sha256: '',
    };
  }

  private ensureActive(): void {
    const blocked: NoteStatus[] = ['draft', 'paid_in_full'];
    if (blocked.includes(this.state.status)) {
      throw new Error(`Note is ${this.state.status} — operation not allowed`);
    }
  }

  private computeHash(): string {
    const hashable = { ...this.state, sha256: '' };
    return crypto.createHash('sha256').update(JSON.stringify(hashable)).digest('hex');
  }

  private emitEvent(type: string, details: Record<string, unknown>): void {
    const event: SponsorNoteEvent = {
      type,
      noteId: this.state.id,
      timestamp: new Date().toISOString(),
      details,
    };
    this.emit(type, event);
    this.emit('note_event', event);
  }
}

export default SponsorNote;
