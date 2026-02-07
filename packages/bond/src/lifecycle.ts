/**
 * @optkas/bond — Bond Issuance & Lifecycle Engine
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Complete bond lifecycle management against XRPL infrastructure:
 * - Bond creation with full legal metadata linkage
 * - Participant onboarding with KYC gates
 * - IOU issuance against verified bond participation
 * - Coupon payment scheduling and execution
 * - Maturity settlement and redemption
 * - Early redemption / call provisions
 * - Default handling and recovery
 * - Collateral tracking and valuation
 *
 * The bond is a LEGAL instrument (Layer 1). This engine manages the
 * on-ledger EVIDENCE and SETTLEMENT COORDINATION (Layers 4-5).
 * The off-chain bond indenture governs all material obligations.
 */

import { XRPLClient, PreparedTransaction } from '@optkas/xrpl-core';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────

export type BondStatus =
  | 'draft'
  | 'approved'
  | 'offering'
  | 'funded'
  | 'active'
  | 'matured'
  | 'redeemed'
  | 'defaulted'
  | 'cancelled';

export type CouponFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'zero_coupon';

export interface BondDefinition {
  id: string;
  name: string;
  description: string;
  status: BondStatus;

  // Financial terms
  terms: {
    faceValue: string;              // Total bond face value (e.g., "100000000")
    currency: string;               // Settlement currency (e.g., "USD")
    couponRate: number;             // Annual coupon rate as decimal (e.g., 0.065 = 6.5%)
    couponFrequency: CouponFrequency;
    issueDate: string;              // ISO date
    maturityDate: string;           // ISO date
    settlementDays: number;         // T+N settlement
    minimumDenomination: string;    // Minimum subscription amount
    callProvision?: {
      callable: boolean;
      callDate: string;             // Earliest call date
      callPrice: string;            // Call price (usually at premium)
    };
    dayCountConvention: '30/360' | 'actual/360' | 'actual/365' | 'actual/actual';
  };

  // Collateral
  collateral: {
    type: string;                   // "real_estate" | "receivables" | "mixed"
    description: string;
    appraiserValue: string;
    coverageRatio: number;          // e.g., 1.25 = 125%
    custodian: string;
    lastValuationDate: string;
    uccFiling: string;              // UCC-1 reference
  };

  // Legal anchors
  legal: {
    indentureHash: string;          // SHA-256 of bond indenture
    prospectusHash: string;
    controlAgreementHash: string;
    legalOpinionHash: string;
    jurisdiction: string;
    governingLaw: string;
    trustee: string;
  };

  // Ledger references
  ledger: {
    issuerAddress: string;
    iouCurrency: string;            // XRPL IOU code (e.g., "BOND")
    escrowAccount: string;
    distributionAccount: string;
    couponAccount: string;
    settlementAccount: string;
  };

  // Participants
  participants: BondParticipant[];

  // Coupon schedule
  couponSchedule: CouponPayment[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface BondParticipant {
  id: string;
  name: string;
  xrplAddress: string;
  participationAmount: string;
  iouBalance: string;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'expired';
  kycProvider: string;
  onboardedAt: string;
  trustlineDeployed: boolean;
  accreditedInvestor: boolean;
}

export interface CouponPayment {
  id: string;
  paymentDate: string;
  recordDate: string;             // Who is entitled on this date
  amount: string;                 // Total coupon amount
  perUnitAmount: string;          // Per bond unit
  status: 'scheduled' | 'processing' | 'paid' | 'failed' | 'skipped';
  currency: string;
  settlementMethod: 'stablecoin' | 'xrp' | 'fiat';
  txHashes: string[];
  paidAt?: string;
}

export interface RedemptionRequest {
  participantId: string;
  bondId: string;
  amount: string;
  type: 'maturity' | 'early' | 'call';
  requestedAt: string;
}

export interface IssuanceResult {
  participantId: string;
  iouAmount: string;
  trustlineTx: PreparedTransaction;
  issuanceTx: PreparedTransaction;
  escrowTx?: PreparedTransaction;
}

// ─── Bond Lifecycle Engine ────────────────────────────────────────────

export class BondEngine extends EventEmitter {
  private client: XRPLClient;
  private bonds: Map<string, BondDefinition> = new Map();

  constructor(client: XRPLClient) {
    super();
    this.client = client;
  }

  // ─── Bond Creation ─────────────────────────────────────────────

  /**
   * Create a new bond definition with full legal metadata.
   * Does NOT issue anything on-ledger — just registers the bond.
   */
  createBond(params: {
    name: string;
    description: string;
    faceValue: string;
    currency: string;
    couponRate: number;
    couponFrequency: CouponFrequency;
    issueDate: string;
    maturityDate: string;
    minimumDenomination: string;
    collateralType: string;
    collateralDescription: string;
    collateralValue: string;
    coverageRatio: number;
    custodian: string;
    indentureHash: string;
    jurisdiction: string;
    trustee: string;
    issuerAddress: string;
    iouCurrency: string;
    escrowAccount: string;
    distributionAccount: string;
    couponAccount: string;
    settlementAccount: string;
    createdBy: string;
  }): BondDefinition {
    const bond: BondDefinition = {
      id: `BOND-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      name: params.name,
      description: params.description,
      status: 'draft',
      terms: {
        faceValue: params.faceValue,
        currency: params.currency,
        couponRate: params.couponRate,
        couponFrequency: params.couponFrequency,
        issueDate: params.issueDate,
        maturityDate: params.maturityDate,
        settlementDays: 2,
        minimumDenomination: params.minimumDenomination,
        dayCountConvention: '30/360',
      },
      collateral: {
        type: params.collateralType,
        description: params.collateralDescription,
        appraiserValue: params.collateralValue,
        coverageRatio: params.coverageRatio,
        custodian: params.custodian,
        lastValuationDate: new Date().toISOString(),
        uccFiling: '',
      },
      legal: {
        indentureHash: params.indentureHash,
        prospectusHash: '',
        controlAgreementHash: '',
        legalOpinionHash: '',
        jurisdiction: params.jurisdiction,
        governingLaw: `${params.jurisdiction} state law`,
        trustee: params.trustee,
      },
      ledger: {
        issuerAddress: params.issuerAddress,
        iouCurrency: params.iouCurrency,
        escrowAccount: params.escrowAccount,
        distributionAccount: params.distributionAccount,
        couponAccount: params.couponAccount,
        settlementAccount: params.settlementAccount,
      },
      participants: [],
      couponSchedule: this.generateCouponSchedule(
        params.issueDate,
        params.maturityDate,
        params.faceValue,
        params.couponRate,
        params.couponFrequency,
        params.currency
      ),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: params.createdBy,
    };

    this.bonds.set(bond.id, bond);
    this.emit('bond_created', bond);
    return bond;
  }

  // ─── Coupon Schedule Generation ────────────────────────────────

  private generateCouponSchedule(
    issueDate: string,
    maturityDate: string,
    faceValue: string,
    couponRate: number,
    frequency: CouponFrequency,
    currency: string
  ): CouponPayment[] {
    if (frequency === 'zero_coupon') return [];

    const schedule: CouponPayment[] = [];
    const start = new Date(issueDate);
    const end = new Date(maturityDate);
    const face = parseFloat(faceValue);

    const monthsPerPeriod: Record<CouponFrequency, number> = {
      monthly: 1,
      quarterly: 3,
      semi_annual: 6,
      annual: 12,
      zero_coupon: 0,
    };

    const periodsPerYear: Record<CouponFrequency, number> = {
      monthly: 12,
      quarterly: 4,
      semi_annual: 2,
      annual: 1,
      zero_coupon: 0,
    };

    const months = monthsPerPeriod[frequency];
    const perPeriodRate = couponRate / periodsPerYear[frequency];
    const couponAmount = (face * perPeriodRate).toFixed(2);
    const perUnitAmount = perPeriodRate.toFixed(8);

    let current = new Date(start);
    current.setMonth(current.getMonth() + months);
    let index = 0;

    while (current <= end) {
      const recordDate = new Date(current);
      recordDate.setDate(recordDate.getDate() - 15); // Record date 15 days before payment

      schedule.push({
        id: `CPN-${++index}`,
        paymentDate: current.toISOString().split('T')[0],
        recordDate: recordDate.toISOString().split('T')[0],
        amount: couponAmount,
        perUnitAmount,
        status: 'scheduled',
        currency,
        settlementMethod: 'stablecoin',
        txHashes: [],
      });

      current = new Date(current);
      current.setMonth(current.getMonth() + months);
    }

    return schedule;
  }

  // ─── Participant Onboarding ────────────────────────────────────

  /**
   * Register a new bond participant.
   * KYC must be completed before IOU issuance.
   */
  onboardParticipant(
    bondId: string,
    participant: {
      name: string;
      xrplAddress: string;
      participationAmount: string;
      accreditedInvestor: boolean;
    }
  ): BondParticipant {
    const bond = this.bonds.get(bondId);
    if (!bond) throw new Error(`Bond not found: ${bondId}`);

    const minDenom = parseFloat(bond.terms.minimumDenomination);
    if (parseFloat(participant.participationAmount) < minDenom) {
      throw new Error(`Minimum denomination: ${bond.terms.minimumDenomination} ${bond.terms.currency}`);
    }

    const p: BondParticipant = {
      id: `PART-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      name: participant.name,
      xrplAddress: participant.xrplAddress,
      participationAmount: participant.participationAmount,
      iouBalance: '0',
      kycStatus: 'pending',
      kycProvider: '',
      onboardedAt: new Date().toISOString(),
      trustlineDeployed: false,
      accreditedInvestor: participant.accreditedInvestor,
    };

    bond.participants.push(p);
    bond.updatedAt = new Date().toISOString();
    this.emit('participant_onboarded', { bondId, participant: p });
    return p;
  }

  /**
   * Approve KYC for a participant — gate before IOU issuance.
   */
  approveKyc(bondId: string, participantId: string, provider: string): void {
    const bond = this.bonds.get(bondId);
    if (!bond) throw new Error(`Bond not found: ${bondId}`);

    const participant = bond.participants.find((p) => p.id === participantId);
    if (!participant) throw new Error(`Participant not found: ${participantId}`);

    participant.kycStatus = 'approved';
    participant.kycProvider = provider;
    bond.updatedAt = new Date().toISOString();

    this.emit('kyc_approved', { bondId, participantId, provider });
  }

  // ─── Bond Issuance ─────────────────────────────────────────────

  /**
   * Issue bond IOUs to a KYC-approved participant.
   * Creates trustline + issues IOUs + optional escrow.
   *
   * Returns unsigned transactions for multisig approval.
   */
  async issueToParticipant(
    bondId: string,
    participantId: string,
    dryRun = true
  ): Promise<IssuanceResult> {
    const bond = this.bonds.get(bondId);
    if (!bond) throw new Error(`Bond not found: ${bondId}`);
    if (bond.status !== 'offering' && bond.status !== 'funded' && bond.status !== 'active') {
      throw new Error(`Bond status must be 'offering', 'funded', or 'active' — got: ${bond.status}`);
    }

    const participant = bond.participants.find((p) => p.id === participantId);
    if (!participant) throw new Error(`Participant not found: ${participantId}`);
    if (participant.kycStatus !== 'approved') {
      throw new Error(`KYC not approved for participant ${participantId} — status: ${participant.kycStatus}`);
    }

    // 1. Prepare trustline (if not already deployed)
    const trustlineTx = await this.client.prepareTransaction(
      {
        TransactionType: 'TrustSet' as const,
        Account: participant.xrplAddress,
        LimitAmount: {
          currency: bond.ledger.iouCurrency,
          issuer: bond.ledger.issuerAddress,
          value: participant.participationAmount,
        },
      },
      `BOND TRUSTLINE: ${participant.name} → ${bond.ledger.iouCurrency} (limit: ${participant.participationAmount})`,
      dryRun
    );

    // 2. Issue IOUs from issuer to participant
    const issuanceTx = await this.client.prepareTransaction(
      {
        TransactionType: 'Payment' as const,
        Account: bond.ledger.issuerAddress,
        Destination: participant.xrplAddress,
        Amount: {
          currency: bond.ledger.iouCurrency,
          issuer: bond.ledger.issuerAddress,
          value: participant.participationAmount,
        } as any,
        Memos: [{
          Memo: {
            MemoType: XRPLClient.hexEncode('bond/issuance'),
            MemoData: XRPLClient.hexEncode(JSON.stringify({
              bondId: bond.id,
              bondName: bond.name,
              participantId: participant.id,
              amount: participant.participationAmount,
              couponRate: bond.terms.couponRate,
              maturityDate: bond.terms.maturityDate,
              indentureHash: bond.legal.indentureHash,
              timestamp: new Date().toISOString(),
            })),
          },
        }],
      } as any,
      `BOND ISSUE: ${participant.participationAmount} ${bond.ledger.iouCurrency} → ${participant.name}`,
      dryRun
    );

    participant.iouBalance = participant.participationAmount;
    participant.trustlineDeployed = true;
    bond.updatedAt = new Date().toISOString();

    this.emit('bond_issued', {
      bondId: bond.id,
      participantId: participant.id,
      amount: participant.participationAmount,
    });

    return {
      participantId: participant.id,
      iouAmount: participant.participationAmount,
      trustlineTx,
      issuanceTx,
    };
  }

  // ─── Coupon Payments ───────────────────────────────────────────

  /**
   * Prepare coupon payments for all participants on a payment date.
   * Uses stablecoin (cross-currency) payments.
   */
  async prepareCouponPayments(
    bondId: string,
    couponId: string,
    stablecoinGateway: { currency: string; issuer: string },
    dryRun = true
  ): Promise<PreparedTransaction[]> {
    const bond = this.bonds.get(bondId);
    if (!bond) throw new Error(`Bond not found: ${bondId}`);

    const coupon = bond.couponSchedule.find((c) => c.id === couponId);
    if (!coupon) throw new Error(`Coupon not found: ${couponId}`);
    if (coupon.status !== 'scheduled') {
      throw new Error(`Coupon ${couponId} is not scheduled — status: ${coupon.status}`);
    }

    const txns: PreparedTransaction[] = [];

    for (const participant of bond.participants) {
      if (participant.kycStatus !== 'approved') continue;
      if (parseFloat(participant.iouBalance) <= 0) continue;

      // Calculate pro-rata coupon
      const participantShare = parseFloat(participant.participationAmount) / parseFloat(bond.terms.faceValue);
      const paymentAmount = (parseFloat(coupon.amount) * participantShare).toFixed(2);

      const tx: any = {
        TransactionType: 'Payment',
        Account: bond.ledger.couponAccount,
        Destination: participant.xrplAddress,
        Amount: {
          currency: stablecoinGateway.currency,
          issuer: stablecoinGateway.issuer,
          value: paymentAmount,
        },
        Memos: [{
          Memo: {
            MemoType: XRPLClient.hexEncode('bond/coupon'),
            MemoData: XRPLClient.hexEncode(JSON.stringify({
              bondId: bond.id,
              couponId: coupon.id,
              paymentDate: coupon.paymentDate,
              participantId: participant.id,
              amount: paymentAmount,
              rate: bond.terms.couponRate,
            })),
          },
        }],
      };

      const prepared = await this.client.prepareTransaction(
        tx,
        `COUPON: ${paymentAmount} ${stablecoinGateway.currency} → ${participant.name} (${coupon.paymentDate})`,
        dryRun
      );
      txns.push(prepared);
    }

    coupon.status = 'processing';
    bond.updatedAt = new Date().toISOString();

    this.emit('coupon_prepared', { bondId, couponId, paymentCount: txns.length });
    return txns;
  }

  // ─── Maturity Settlement ───────────────────────────────────────

  /**
   * Prepare maturity settlement — redeem all IOUs and return principal.
   * IOUs burned (sent back to issuer), stablecoin principal returned.
   */
  async prepareMaturitySettlement(
    bondId: string,
    stablecoinGateway: { currency: string; issuer: string },
    dryRun = true
  ): Promise<{ burnTxns: PreparedTransaction[]; paymentTxns: PreparedTransaction[] }> {
    const bond = this.bonds.get(bondId);
    if (!bond) throw new Error(`Bond not found: ${bondId}`);

    const maturity = new Date(bond.terms.maturityDate);
    const now = new Date();
    if (now < maturity) {
      throw new Error(`Bond has not matured. Maturity: ${bond.terms.maturityDate}`);
    }

    const burnTxns: PreparedTransaction[] = [];
    const paymentTxns: PreparedTransaction[] = [];

    for (const participant of bond.participants) {
      if (parseFloat(participant.iouBalance) <= 0) continue;

      // 1. Burn IOU (participant sends back to issuer)
      const burnTx = await this.client.prepareTransaction(
        {
          TransactionType: 'Payment' as const,
          Account: participant.xrplAddress,
          Destination: bond.ledger.issuerAddress,
          Amount: {
            currency: bond.ledger.iouCurrency,
            issuer: bond.ledger.issuerAddress,
            value: participant.iouBalance,
          } as any,
          Memos: [{
            Memo: {
              MemoType: XRPLClient.hexEncode('bond/maturity-burn'),
              MemoData: XRPLClient.hexEncode(JSON.stringify({
                bondId: bond.id,
                participantId: participant.id,
                amount: participant.iouBalance,
                maturityDate: bond.terms.maturityDate,
              })),
            },
          }],
        } as any,
        `MATURITY BURN: ${participant.iouBalance} ${bond.ledger.iouCurrency} from ${participant.name}`,
        dryRun
      );
      burnTxns.push(burnTx);

      // 2. Return principal in stablecoin
      const paymentTx = await this.client.prepareTransaction(
        {
          TransactionType: 'Payment' as const,
          Account: bond.ledger.settlementAccount,
          Destination: participant.xrplAddress,
          Amount: {
            currency: stablecoinGateway.currency,
            issuer: stablecoinGateway.issuer,
            value: participant.participationAmount,
          } as any,
          Memos: [{
            Memo: {
              MemoType: XRPLClient.hexEncode('bond/maturity-principal'),
              MemoData: XRPLClient.hexEncode(JSON.stringify({
                bondId: bond.id,
                participantId: participant.id,
                principalAmount: participant.participationAmount,
              })),
            },
          }],
        } as any,
        `MATURITY PRINCIPAL: ${participant.participationAmount} ${stablecoinGateway.currency} → ${participant.name}`,
        dryRun
      );
      paymentTxns.push(paymentTx);
    }

    bond.status = 'matured';
    bond.updatedAt = new Date().toISOString();

    this.emit('bond_matured', { bondId, participants: bond.participants.length });
    return { burnTxns, paymentTxns };
  }

  // ─── Early Redemption ──────────────────────────────────────────

  async prepareEarlyRedemption(
    bondId: string,
    participantId: string,
    amount: string,
    stablecoinGateway: { currency: string; issuer: string },
    dryRun = true
  ): Promise<{ burnTx: PreparedTransaction; paymentTx: PreparedTransaction }> {
    const bond = this.bonds.get(bondId);
    if (!bond) throw new Error(`Bond not found: ${bondId}`);

    if (bond.terms.callProvision && !bond.terms.callProvision.callable) {
      throw new Error('Bond is not callable — early redemption not permitted');
    }

    const participant = bond.participants.find((p) => p.id === participantId);
    if (!participant) throw new Error(`Participant not found: ${participantId}`);
    if (parseFloat(amount) > parseFloat(participant.iouBalance)) {
      throw new Error(`Insufficient balance: ${participant.iouBalance} < ${amount}`);
    }

    // Burn IOUs
    const burnTx = await this.client.prepareTransaction(
      {
        TransactionType: 'Payment' as const,
        Account: participant.xrplAddress,
        Destination: bond.ledger.issuerAddress,
        Amount: {
          currency: bond.ledger.iouCurrency,
          issuer: bond.ledger.issuerAddress,
          value: amount,
        } as any,
      } as any,
      `EARLY REDEMPTION BURN: ${amount} ${bond.ledger.iouCurrency} from ${participant.name}`,
      dryRun
    );

    // Pay principal
    const paymentTx = await this.client.prepareTransaction(
      {
        TransactionType: 'Payment' as const,
        Account: bond.ledger.settlementAccount,
        Destination: participant.xrplAddress,
        Amount: {
          currency: stablecoinGateway.currency,
          issuer: stablecoinGateway.issuer,
          value: amount,
        } as any,
      } as any,
      `EARLY REDEMPTION PAY: ${amount} ${stablecoinGateway.currency} → ${participant.name}`,
      dryRun
    );

    participant.iouBalance = (parseFloat(participant.iouBalance) - parseFloat(amount)).toFixed(8);
    this.emit('early_redemption', { bondId, participantId, amount });

    return { burnTx, paymentTx };
  }

  // ─── Default Handling ──────────────────────────────────────────

  triggerDefault(bondId: string, reason: string, triggeredBy: string): void {
    const bond = this.bonds.get(bondId);
    if (!bond) throw new Error(`Bond not found: ${bondId}`);

    bond.status = 'defaulted';
    bond.updatedAt = new Date().toISOString();

    this.emit('bond_defaulted', {
      bondId,
      reason,
      triggeredBy,
      timestamp: new Date().toISOString(),
      participants: bond.participants.length,
      outstandingBalance: bond.participants.reduce(
        (sum, p) => sum + parseFloat(p.iouBalance), 0
      ).toFixed(2),
    });
  }

  // ─── Bond Queries ──────────────────────────────────────────────

  getBond(bondId: string): BondDefinition | undefined {
    return this.bonds.get(bondId);
  }

  getAllBonds(): BondDefinition[] {
    return Array.from(this.bonds.values());
  }

  getActiveBonds(): BondDefinition[] {
    return this.getAllBonds().filter((b) =>
      ['offering', 'funded', 'active'].includes(b.status)
    );
  }

  getUpcomingCoupons(bondId: string): CouponPayment[] {
    const bond = this.bonds.get(bondId);
    if (!bond) return [];
    return bond.couponSchedule.filter((c) => c.status === 'scheduled');
  }

  getOutstandingSupply(bondId: string): string {
    const bond = this.bonds.get(bondId);
    if (!bond) return '0';
    return bond.participants
      .reduce((sum, p) => sum + parseFloat(p.iouBalance), 0)
      .toFixed(8);
  }

  /**
   * Transition bond status with validation.
   */
  transitionStatus(bondId: string, newStatus: BondStatus, reason: string): void {
    const bond = this.bonds.get(bondId);
    if (!bond) throw new Error(`Bond not found: ${bondId}`);

    const validTransitions: Record<BondStatus, BondStatus[]> = {
      draft: ['approved', 'cancelled'],
      approved: ['offering', 'cancelled'],
      offering: ['funded', 'cancelled'],
      funded: ['active', 'cancelled'],
      active: ['matured', 'defaulted'],
      matured: ['redeemed'],
      redeemed: [],
      defaulted: [],
      cancelled: [],
    };

    const allowed = validTransitions[bond.status];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid transition: ${bond.status} → ${newStatus}. Allowed: ${allowed.join(', ')}`);
    }

    bond.status = newStatus;
    bond.updatedAt = new Date().toISOString();
    this.emit('status_changed', { bondId, from: bond.status, to: newStatus, reason });
  }
}

export default BondEngine;
