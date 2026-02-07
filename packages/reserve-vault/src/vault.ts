/**
 * @optkas/reserve-vault — Unykorn Reserve Vault
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * THE MISSING PIECE IN THE CIRCLE OF LIFE
 * ═══════════════════════════════════════
 *
 * The Reserve Vault is the connective tissue between every layer of the
 * OPTKAS sovereign financial platform. It transforms raw bond positions,
 * debt instruments, and IOUs into composable financial primitives that
 * feed back into the system — creating a self-reinforcing loop.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    THE CIRCLE OF LIFE                           │
 * │                                                                 │
 * │   Assets ──→ Reserve Vault ──→ Attestation NFTs                │
 * │      ↑                              │                           │
 * │      │                              ↓                           │
 * │   Reinvest ←── Yield ←── Bond Coupon ←── Reserve Backing       │
 * │      │                              │                           │
 * │      ↓                              ↓                           │
 * │   More Assets    NFT-Gated Allocation → Subscribers             │
 * │      ↑                              │                           │
 * │      └──────── Settlement ←─────────┘                           │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * CORE CONCEPTS:
 *
 * 1. Reserve Deposits: Any OPTKAS-platform asset can be deposited into
 *    the vault (SOVBND, OPTKAS, IMPERIA, GEMVLT, TERRAVL, PETRO, XRP, XLM)
 *
 * 2. Perpetual Reserve Receipts (PRR): On deposit, the vault mints a PRR
 *    representing your proportional share of the total vault NAV. PRRs:
 *    - Auto-compound based on underlying yield
 *    - Can be used as collateral for new debt issuance
 *    - Track provenance (which assets back them)
 *    - Are transferable only to NFT-credentialed holders
 *
 * 3. Yield Stripping: Bond positions (SOVBND) can be decomposed into:
 *    - Principal Strip (locked until maturity, non-transferable)
 *    - Yield Strip (tradeable, represents coupon stream)
 *    This creates zero-coupon instruments + pure yield instruments
 *
 * 4. Reserve Attestation NFTs: Every vault state change mints an
 *    attestation NFT proving reserve levels at that moment in time.
 *    These are XRPL XLS-20 NFTs with immutable metadata.
 *
 * 5. NFT-Gated Allocation: Bond subscriptions are gated by NFT tier:
 *    - Founder NFT  → Direct allocation + governance vote
 *    - Institutional → Subscription rights + priority queue
 *    - Genesis      → Observer access + waitlist
 *
 * 6. Coupon Linkage: Bond coupon math references the vault's reserve
 *    yield, creating a dynamic but auditable rate source.
 *
 * ARCHITECTURE LAYERS:
 *
 * Layer 1: Vault Core        — deposit, withdraw, NAV calculation
 * Layer 2: Yield Engine      — strip, compound, distribute
 * Layer 3: Allocation Gate   — NFT verification, tier enforcement
 * Layer 4: Attestation       — periodic reserve proofs as NFTs
 * Layer 5: Governance        — multisig actions on vault parameters
 * Layer 6: Settlement Bridge — DvP for subscriptions/redemptions
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════
//  VAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

export interface VaultConfig {
  id: string;
  name: string;
  entity: string;                     // "OPTKAS1-MAIN SPV"
  jurisdiction: string;               // "Delaware, USA"
  vaultType: 'reserve' | 'yield' | 'collateral';
  acceptedAssets: AcceptedAsset[];
  parameters: VaultParameters;
  governance: GovernanceConfig;
  attestation: AttestationConfig;
  allocation: AllocationConfig;
  createdAt: string;
}

export interface AcceptedAsset {
  code: string;                       // "SOVBND" | "OPTKAS" | "XRP" etc
  hex?: string;                       // XRPL 40-char hex
  type: 'bond' | 'utility' | 'asset-backed' | 'native' | 'stablecoin';
  network: 'xrpl' | 'stellar' | 'both';
  issuer?: string;
  yieldBearing: boolean;
  annualYield?: number;               // e.g., 0.065 for 6.5%
  haircut: number;                    // Collateral haircut (e.g., 0.15 = 15%)
  maxDeposit: string;                 // Max single deposit
  maxVaultAllocation: number;         // Max % of total vault (e.g., 0.40 = 40%)
}

export interface VaultParameters {
  reserveRatioTarget: number;         // Target reserve ratio (e.g., 1.25 = 125%)
  reserveRatioMinimum: number;        // Minimum before circuit breaker (e.g., 1.0)
  rebalanceThreshold: number;         // Trigger rebalance if ratio deviates by this %
  compoundingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  withdrawalLockDays: number;         // Minimum lock period
  maxWithdrawalPerEpoch: number;      // Max % withdrawable per epoch (e.g., 0.10 = 10%)
  epochDurationDays: number;          // Epoch length for withdrawal limits
  treasuryFee: number;               // Management fee (e.g., 0.005 = 0.5% annual)
  performanceFee: number;            // Performance fee on yield (e.g., 0.10 = 10%)
}

export interface GovernanceConfig {
  multisigRequired: boolean;
  signers: string[];                  // XRPL addresses
  quorum: number;                     // Required signatures
  timelockHours: number;              // Delay on governance actions
  emergencySigners: string[];         // Bypass timelock for emergencies
  emergencyQuorum: number;
}

export interface AttestationConfig {
  frequency: 'hourly' | 'daily' | 'weekly' | 'on_deposit' | 'on_withdrawal';
  nftTaxon: number;                   // XLS-20 taxon for reserve attestation NFTs
  includeInNft: string[];             // Fields to include in NFT metadata
  publishToStellar: boolean;          // Dual-chain attestation
}

export interface AllocationConfig {
  tiers: AllocationTier[];
  subscriptionWindow: {
    openDate: string;
    closeDate: string;
    minSubscription: string;
    maxSubscription: string;
  };
  proRataEnabled: boolean;
  oversubscriptionPolicy: 'reject' | 'waitlist' | 'pro_rata';
}

export interface AllocationTier {
  name: string;                       // "Founder" | "Institutional" | "Genesis"
  nftTaxon: number;                   // Required NFT taxon to qualify
  priority: number;                   // Lower = higher priority
  maxAllocation: string;              // Max per subscriber
  rights: string[];                   // "allocate" | "subscribe" | "observe" | "vote" | "redeem"
}

// ═══════════════════════════════════════════════════════════════════════
//  VAULT STATE
// ═══════════════════════════════════════════════════════════════════════

export interface VaultState {
  totalNAV: string;                   // Total Net Asset Value in USD equivalent
  totalShares: string;                // Total PRR shares outstanding
  sharePrice: string;                 // NAV / shares = price per PRR
  reserveRatio: number;               // Current reserve ratio
  deposits: VaultDeposit[];
  withdrawalQueue: WithdrawalRequest[];
  yieldAccrued: string;               // Total yield accrued since inception
  lastAttestationHash: string;
  lastAttestationTime: string;
  epoch: number;                      // Current epoch number
  epochStart: string;
  status: 'active' | 'paused' | 'rebalancing' | 'emergency' | 'winding_down';
}

export interface VaultDeposit {
  id: string;
  depositor: string;                  // XRPL/Stellar address
  asset: string;                      // Asset code
  amount: string;
  valueAtDeposit: string;             // USD value at time of deposit
  currentValue: string;               // Current USD value
  sharesIssued: string;               // PRR shares issued for this deposit
  timestamp: string;
  lockExpiry: string;                 // When withdrawal becomes available
  yieldStripped: boolean;             // Whether yield has been separated
  principalStripId?: string;
  yieldStripId?: string;
}

export interface WithdrawalRequest {
  id: string;
  depositor: string;
  sharesAmount: string;               // PRR shares to redeem
  requestedAt: string;
  availableAt: string;                // After lock period
  status: 'pending' | 'available' | 'processing' | 'completed' | 'cancelled';
  estimatedValue: string;
}

// ═══════════════════════════════════════════════════════════════════════
//  YIELD STRIPS
// ═══════════════════════════════════════════════════════════════════════

export interface YieldStrip {
  id: string;
  sourceDepositId: string;
  bondId: string;                     // e.g., "SOVBND-A-2026"
  type: 'principal' | 'yield';
  faceValue: string;
  currentValue: string;
  couponRate: number;                 // Only for yield strips
  nextCouponDate?: string;
  maturityDate: string;
  transferable: boolean;              // Principal = false, Yield = true
  holder: string;                     // Current holder address
  createdAt: string;
}

export interface CouponPayment {
  stripId: string;
  bondId: string;
  period: number;                     // Coupon period number
  amount: string;
  scheduledDate: string;
  paidDate?: string;
  status: 'scheduled' | 'accrued' | 'paid' | 'defaulted';
  txHash?: string;
}

// ═══════════════════════════════════════════════════════════════════════
//  RESERVE ATTESTATION
// ═══════════════════════════════════════════════════════════════════════

export interface ReserveAttestation {
  id: string;
  vaultId: string;
  timestamp: string;
  epoch: number;
  snapshot: {
    totalNAV: string;
    totalShares: string;
    sharePrice: string;
    reserveRatio: number;
    assetBreakdown: { asset: string; amount: string; value: string }[];
    yieldAccrued: string;
    pendingWithdrawals: number;
  };
  hash: string;                       // SHA-256 of snapshot
  nftTokenId?: string;                // XLS-20 NFT token ID
  stellarTxHash?: string;             // Stellar attestation tx
  xrplTxHash?: string;               // XRPL attestation tx
}

// ═══════════════════════════════════════════════════════════════════════
//  SUBSCRIPTION & ALLOCATION
// ═══════════════════════════════════════════════════════════════════════

export interface Subscription {
  id: string;
  subscriberAddress: string;
  subscriberName?: string;
  nftTier: string;                    // "Founder" | "Institutional" | "Genesis"
  nftTokenId: string;                 // Proof of credential
  requestedAmount: string;
  allocatedAmount?: string;
  status: 'pending' | 'verified' | 'allocated' | 'settled' | 'rejected';
  verifiedAt?: string;
  allocatedAt?: string;
  settledAt?: string;
  txHash?: string;
}

// ═══════════════════════════════════════════════════════════════════════
//  UNYKORN RESERVE VAULT ENGINE
// ═══════════════════════════════════════════════════════════════════════

export class ReserveVault extends EventEmitter {
  private config: VaultConfig;
  private state: VaultState;
  private deposits: Map<string, VaultDeposit> = new Map();
  private yieldStrips: Map<string, YieldStrip> = new Map();
  private couponSchedule: CouponPayment[] = [];
  private attestations: ReserveAttestation[] = [];
  private subscriptions: Map<string, Subscription> = new Map();
  private nftRegistry: Map<string, { taxon: number; holder: string }> = new Map();

  constructor(config: VaultConfig) {
    super();
    this.config = config;
    this.state = {
      totalNAV: '0',
      totalShares: '0',
      sharePrice: '1.00',
      reserveRatio: 0,
      deposits: [],
      withdrawalQueue: [],
      yieldAccrued: '0',
      lastAttestationHash: '',
      lastAttestationTime: new Date().toISOString(),
      epoch: 0,
      epochStart: new Date().toISOString(),
      status: 'active',
    };
  }

  // ─── AUDIT EVENT EMITTER ─────────────────────────────────────────

  private audit(type: string, details: Record<string, unknown>): void {
    this.emit('audit', {
      type,
      timestamp: new Date().toISOString(),
      component: '@optkas/reserve-vault',
      layer: 'vault',
      details,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  LAYER 1: VAULT CORE — Deposit / Withdraw / NAV
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Deposit an asset into the Reserve Vault.
   * Returns PRR (Perpetual Reserve Receipt) shares.
   */
  deposit(request: {
    depositor: string;
    asset: string;
    amount: string;
    currentPrice: string; // USD price per unit
  }): VaultDeposit {
    // Validate asset is accepted
    const accepted = this.config.acceptedAssets.find(a => a.code === request.asset);
    if (!accepted) throw new Error(`Asset ${request.asset} not accepted by vault`);

    // Validate max deposit
    if (parseFloat(request.amount) > parseFloat(accepted.maxDeposit)) {
      throw new Error(`Deposit exceeds max: ${accepted.maxDeposit}`);
    }

    // Calculate USD value (apply haircut for collateral valuation)
    const rawValue = parseFloat(request.amount) * parseFloat(request.currentPrice);
    const haircutValue = rawValue * (1 - accepted.haircut);

    // Calculate PRR shares to issue
    const currentSharePrice = parseFloat(this.state.sharePrice) || 1.0;
    const sharesToIssue = haircutValue / currentSharePrice;

    // Create deposit record
    const deposit: VaultDeposit = {
      id: this.generateId('DEP'),
      depositor: request.depositor,
      asset: request.asset,
      amount: request.amount,
      valueAtDeposit: haircutValue.toFixed(2),
      currentValue: haircutValue.toFixed(2),
      sharesIssued: sharesToIssue.toFixed(6),
      timestamp: new Date().toISOString(),
      lockExpiry: this.calculateLockExpiry(),
      yieldStripped: false,
    };

    this.deposits.set(deposit.id, deposit);
    this.state.deposits.push(deposit);

    // Update vault state
    this.state.totalNAV = (parseFloat(this.state.totalNAV) + haircutValue).toFixed(2);
    this.state.totalShares = (parseFloat(this.state.totalShares) + sharesToIssue).toFixed(6);
    this.recalculateSharePrice();
    this.recalculateReserveRatio();

    // Check vault concentration limits
    this.checkConcentrationLimits(request.asset);

    this.audit('deposit', {
      depositId: deposit.id,
      asset: request.asset,
      amount: request.amount,
      value: haircutValue.toFixed(2),
      sharesIssued: sharesToIssue.toFixed(6),
      newNAV: this.state.totalNAV,
      newSharePrice: this.state.sharePrice,
    });

    this.emit('deposit', deposit);
    return deposit;
  }

  /**
   * Request withdrawal from the vault (subject to lock period and epoch limits).
   */
  requestWithdrawal(depositor: string, sharesAmount: string): WithdrawalRequest {
    const shares = parseFloat(sharesAmount);
    const depositorShares = this.getDepositorShares(depositor);

    if (shares > depositorShares) {
      throw new Error(`Insufficient shares: have ${depositorShares}, requested ${shares}`);
    }

    // Check epoch withdrawal limit
    const epochWithdrawals = this.getEpochWithdrawals();
    const maxEpochShares = parseFloat(this.state.totalShares) * this.config.parameters.maxWithdrawalPerEpoch;
    if (epochWithdrawals + shares > maxEpochShares) {
      throw new Error(`Epoch withdrawal limit reached: ${epochWithdrawals.toFixed(2)}/${maxEpochShares.toFixed(2)}`);
    }

    const estimatedValue = shares * parseFloat(this.state.sharePrice);

    const request: WithdrawalRequest = {
      id: this.generateId('WDR'),
      depositor,
      sharesAmount,
      requestedAt: new Date().toISOString(),
      availableAt: this.calculateLockExpiry(),
      status: 'pending',
      estimatedValue: estimatedValue.toFixed(2),
    };

    this.state.withdrawalQueue.push(request);

    this.audit('withdrawal_request', {
      requestId: request.id,
      depositor,
      shares: sharesAmount,
      estimatedValue: estimatedValue.toFixed(2),
    });

    this.emit('withdrawal_request', request);
    return request;
  }

  /**
   * Recalculate NAV based on current asset prices.
   */
  revalueVault(prices: Record<string, string>): void {
    let newNAV = 0;

    for (const deposit of this.deposits.values()) {
      const price = prices[deposit.asset];
      if (price) {
        const accepted = this.config.acceptedAssets.find(a => a.code === deposit.asset);
        const haircut = accepted?.haircut ?? 0;
        const newValue = parseFloat(deposit.amount) * parseFloat(price) * (1 - haircut);
        deposit.currentValue = newValue.toFixed(2);
        newNAV += newValue;
      }
    }

    this.state.totalNAV = newNAV.toFixed(2);
    this.recalculateSharePrice();
    this.recalculateReserveRatio();

    this.audit('revaluation', {
      newNAV: this.state.totalNAV,
      newSharePrice: this.state.sharePrice,
      reserveRatio: this.state.reserveRatio,
      prices,
    });

    this.emit('revaluation', { nav: this.state.totalNAV, sharePrice: this.state.sharePrice });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  LAYER 2: YIELD ENGINE — Strip / Compound / Distribute
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Strip a bond deposit into Principal Strip + Yield Strip.
   * Only applicable to yield-bearing assets (e.g., SOVBND).
   *
   * This is the INNOVATION: decomposing bonds into tradeable primitives.
   *
   * Principal Strip: locked until maturity, non-transferable
   * Yield Strip: tradeable, represents the coupon stream
   */
  stripYield(depositId: string): { principalStrip: YieldStrip; yieldStrip: YieldStrip } {
    const deposit = this.deposits.get(depositId);
    if (!deposit) throw new Error(`Deposit ${depositId} not found`);
    if (deposit.yieldStripped) throw new Error('Yield already stripped from this deposit');

    const accepted = this.config.acceptedAssets.find(a => a.code === deposit.asset);
    if (!accepted?.yieldBearing) {
      throw new Error(`Asset ${deposit.asset} is not yield-bearing — cannot strip`);
    }

    const annualYield = accepted.annualYield || 0;
    const maturityDate = this.calculateMaturity(deposit.asset);
    const yearsToMaturity = this.yearsUntil(maturityDate);
    const totalYieldValue = parseFloat(deposit.valueAtDeposit) * annualYield * yearsToMaturity;
    const principalValue = parseFloat(deposit.valueAtDeposit) - totalYieldValue;

    const principalStrip: YieldStrip = {
      id: this.generateId('PRS'),
      sourceDepositId: depositId,
      bondId: this.getBondId(deposit.asset),
      type: 'principal',
      faceValue: deposit.valueAtDeposit,
      currentValue: principalValue.toFixed(2),
      couponRate: 0,
      maturityDate,
      transferable: false,  // Principal locked
      holder: deposit.depositor,
      createdAt: new Date().toISOString(),
    };

    const yieldStrip: YieldStrip = {
      id: this.generateId('YLS'),
      sourceDepositId: depositId,
      bondId: this.getBondId(deposit.asset),
      type: 'yield',
      faceValue: totalYieldValue.toFixed(2),
      currentValue: totalYieldValue.toFixed(2),
      couponRate: annualYield,
      nextCouponDate: this.getNextCouponDate(),
      maturityDate,
      transferable: true,   // Yield can be traded
      holder: deposit.depositor,
      createdAt: new Date().toISOString(),
    };

    // Register strips
    this.yieldStrips.set(principalStrip.id, principalStrip);
    this.yieldStrips.set(yieldStrip.id, yieldStrip);
    deposit.yieldStripped = true;
    deposit.principalStripId = principalStrip.id;
    deposit.yieldStripId = yieldStrip.id;

    // Generate coupon schedule for the yield strip
    this.generateCouponSchedule(yieldStrip);

    this.audit('yield_stripped', {
      depositId,
      principalStripId: principalStrip.id,
      yieldStripId: yieldStrip.id,
      principalValue: principalStrip.currentValue,
      yieldValue: yieldStrip.currentValue,
      couponRate: annualYield,
      maturity: maturityDate,
    });

    this.emit('yield_stripped', { principalStrip, yieldStrip });
    return { principalStrip, yieldStrip };
  }

  /**
   * Transfer a yield strip to another holder (must have valid NFT credential).
   */
  transferYieldStrip(stripId: string, newHolder: string, requiredNftTaxon: number): void {
    const strip = this.yieldStrips.get(stripId);
    if (!strip) throw new Error(`Strip ${stripId} not found`);
    if (!strip.transferable) throw new Error('Principal strips are non-transferable');

    // Verify NFT credential
    if (!this.verifyNftCredential(newHolder, requiredNftTaxon)) {
      throw new Error(`Holder ${newHolder} does not hold required NFT credential (taxon ${requiredNftTaxon})`);
    }

    const previousHolder = strip.holder;
    strip.holder = newHolder;

    this.audit('yield_strip_transfer', {
      stripId,
      from: previousHolder,
      to: newHolder,
      value: strip.currentValue,
    });

    this.emit('yield_strip_transfer', { stripId, from: previousHolder, to: newHolder });
  }

  /**
   * Compound vault yields into the NAV.
   * Called on each compounding cycle.
   */
  compoundYield(): { yielded: string; newNAV: string } {
    let totalYield = 0;

    for (const deposit of this.deposits.values()) {
      const accepted = this.config.acceptedAssets.find(a => a.code === deposit.asset);
      if (accepted?.yieldBearing && accepted.annualYield) {
        // Calculate yield for this compounding period
        const periods = this.getCompoundingPeriodsPerYear();
        const periodYield = (parseFloat(deposit.currentValue) * accepted.annualYield) / periods;

        // Apply performance fee
        const netYield = periodYield * (1 - this.config.parameters.performanceFee);
        const treasuryFee = periodYield * this.config.parameters.performanceFee;

        deposit.currentValue = (parseFloat(deposit.currentValue) + netYield).toFixed(2);
        totalYield += netYield;
      }
    }

    // Update vault state
    this.state.totalNAV = (parseFloat(this.state.totalNAV) + totalYield).toFixed(2);
    this.state.yieldAccrued = (parseFloat(this.state.yieldAccrued) + totalYield).toFixed(2);
    this.recalculateSharePrice();

    this.audit('compound_yield', {
      yielded: totalYield.toFixed(2),
      newNAV: this.state.totalNAV,
      newSharePrice: this.state.sharePrice,
      totalAccrued: this.state.yieldAccrued,
    });

    this.emit('compound', { yielded: totalYield.toFixed(2), newNAV: this.state.totalNAV });
    return { yielded: totalYield.toFixed(2), newNAV: this.state.totalNAV };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  LAYER 3: ALLOCATION GATE — NFT Verification & Tier Enforcement
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Register an NFT credential for a holder.
   * In production, this verifies on-chain NFT ownership via XRPL.
   */
  registerNftCredential(holder: string, nftTokenId: string, taxon: number): void {
    this.nftRegistry.set(nftTokenId, { taxon, holder });
    this.audit('nft_registered', { holder, nftTokenId, taxon });
  }

  /**
   * Verify that a holder possesses a credential NFT with the required taxon.
   */
  verifyNftCredential(holder: string, requiredTaxon: number): boolean {
    for (const [tokenId, nft] of this.nftRegistry) {
      if (nft.holder === holder && nft.taxon === requiredTaxon) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the tier for a given holder based on their highest-priority NFT.
   */
  getHolderTier(holder: string): AllocationTier | null {
    const holderNfts = Array.from(this.nftRegistry.values()).filter(n => n.holder === holder);
    if (holderNfts.length === 0) return null;

    // Find highest-priority tier this holder qualifies for
    let bestTier: AllocationTier | null = null;
    for (const nft of holderNfts) {
      const tier = this.config.allocation.tiers.find(t => t.nftTaxon === nft.taxon);
      if (tier && (!bestTier || tier.priority < bestTier.priority)) {
        bestTier = tier;
      }
    }
    return bestTier;
  }

  /**
   * Submit a subscription for bond allocation.
   * NFT-gated: subscriber must hold a valid credential NFT.
   */
  subscribe(request: {
    subscriberAddress: string;
    nftTokenId: string;
    requestedAmount: string;
  }): Subscription {
    // Verify NFT exists in registry
    const nft = this.nftRegistry.get(request.nftTokenId);
    if (!nft || nft.holder !== request.subscriberAddress) {
      throw new Error('Invalid or unregistered NFT credential');
    }

    // Determine tier
    const tier = this.config.allocation.tiers.find(t => t.nftTaxon === nft.taxon);
    if (!tier) throw new Error(`No allocation tier for NFT taxon ${nft.taxon}`);

    // Check subscription rights
    if (!tier.rights.includes('allocate') && !tier.rights.includes('subscribe')) {
      throw new Error(`Tier "${tier.name}" does not have subscription rights`);
    }

    // Check amount limits
    if (parseFloat(request.requestedAmount) > parseFloat(tier.maxAllocation)) {
      throw new Error(`Requested amount exceeds tier maximum: ${tier.maxAllocation}`);
    }

    const subscription: Subscription = {
      id: this.generateId('SUB'),
      subscriberAddress: request.subscriberAddress,
      nftTier: tier.name,
      nftTokenId: request.nftTokenId,
      requestedAmount: request.requestedAmount,
      status: 'verified',
      verifiedAt: new Date().toISOString(),
    };

    this.subscriptions.set(subscription.id, subscription);

    this.audit('subscription', {
      subscriptionId: subscription.id,
      tier: tier.name,
      amount: request.requestedAmount,
      subscriber: request.subscriberAddress,
    });

    this.emit('subscription', subscription);
    return subscription;
  }

  /**
   * Allocate bonds to verified subscribers (called by governance).
   */
  allocateSubscriptions(): Subscription[] {
    const verified = Array.from(this.subscriptions.values())
      .filter(s => s.status === 'verified')
      .sort((a, b) => {
        // Sort by tier priority (Founder first, then Institutional, then Genesis)
        const tierA = this.config.allocation.tiers.find(t => t.name === a.nftTier);
        const tierB = this.config.allocation.tiers.find(t => t.name === b.nftTier);
        return (tierA?.priority ?? 99) - (tierB?.priority ?? 99);
      });

    const allocated: Subscription[] = [];

    for (const sub of verified) {
      sub.allocatedAmount = sub.requestedAmount; // Full allocation (can add pro-rata later)
      sub.status = 'allocated';
      sub.allocatedAt = new Date().toISOString();
      allocated.push(sub);
    }

    this.audit('allocation_round', {
      count: allocated.length,
      totalAllocated: allocated.reduce((s, a) => s + parseFloat(a.allocatedAmount || '0'), 0),
    });

    this.emit('allocation_round', allocated);
    return allocated;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  LAYER 4: RESERVE ATTESTATION — Periodic Proofs as NFTs
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Generate a reserve attestation snapshot.
   * Returns the attestation record for minting as an NFT.
   */
  generateAttestation(): ReserveAttestation {
    // Build asset breakdown
    const assetBreakdown: { asset: string; amount: string; value: string }[] = [];
    const assetTotals: Record<string, { amount: number; value: number }> = {};

    for (const deposit of this.deposits.values()) {
      if (!assetTotals[deposit.asset]) {
        assetTotals[deposit.asset] = { amount: 0, value: 0 };
      }
      assetTotals[deposit.asset].amount += parseFloat(deposit.amount);
      assetTotals[deposit.asset].value += parseFloat(deposit.currentValue);
    }

    for (const [asset, totals] of Object.entries(assetTotals)) {
      assetBreakdown.push({
        asset,
        amount: totals.amount.toFixed(6),
        value: totals.value.toFixed(2),
      });
    }

    const snapshot = {
      totalNAV: this.state.totalNAV,
      totalShares: this.state.totalShares,
      sharePrice: this.state.sharePrice,
      reserveRatio: this.state.reserveRatio,
      assetBreakdown,
      yieldAccrued: this.state.yieldAccrued,
      pendingWithdrawals: this.state.withdrawalQueue.filter(w => w.status === 'pending').length,
    };

    // Hash the snapshot
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(snapshot))
      .digest('hex');

    const attestation: ReserveAttestation = {
      id: this.generateId('ATT'),
      vaultId: this.config.id,
      timestamp: new Date().toISOString(),
      epoch: this.state.epoch,
      snapshot,
      hash,
    };

    this.attestations.push(attestation);
    this.state.lastAttestationHash = hash;
    this.state.lastAttestationTime = attestation.timestamp;

    this.audit('attestation', {
      attestationId: attestation.id,
      hash,
      nav: this.state.totalNAV,
      reserveRatio: this.state.reserveRatio,
    });

    this.emit('attestation', attestation);
    return attestation;
  }

  /**
   * Prepare XRPL NFTokenMint transaction for reserve attestation.
   * This mints an immutable on-chain proof of reserves.
   */
  prepareAttestationNftMint(attestation: ReserveAttestation, issuerAddress: string): {
    TransactionType: string;
    Account: string;
    NFTokenTaxon: number;
    Flags: number;
    URI: string;
    Memos: any[];
  } {
    // Encode attestation as compact URI metadata
    const metadata = {
      v: '1.0',
      type: 'reserve-attestation',
      vault: this.config.id,
      epoch: attestation.epoch,
      nav: attestation.snapshot.totalNAV,
      ratio: attestation.snapshot.reserveRatio,
      shares: attestation.snapshot.totalShares,
      hash: attestation.hash,
      ts: attestation.timestamp,
    };

    const uri = Buffer.from(JSON.stringify(metadata)).toString('hex').toUpperCase();

    return {
      TransactionType: 'NFTokenMint',
      Account: issuerAddress,
      NFTokenTaxon: this.config.attestation.nftTaxon,
      Flags: 1, // tfBurnable — attestation issuer can burn if needed
      URI: uri.length > 512 ? uri.slice(0, 512) : uri,
      Memos: [{
        Memo: {
          MemoType: Buffer.from('reserve/attestation').toString('hex').toUpperCase(),
          MemoData: Buffer.from(attestation.hash).toString('hex').toUpperCase(),
        }
      }],
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  LAYER 5: GOVERNANCE — Multisig Actions on Vault Parameters
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Propose a parameter change (requires multisig approval).
   */
  proposeParameterChange(proposer: string, change: Partial<VaultParameters>): {
    proposalId: string;
    change: Partial<VaultParameters>;
    requiredSignatures: number;
    signatures: string[];
    timelockExpiry: string;
  } {
    if (!this.config.governance.signers.includes(proposer)) {
      throw new Error('Proposer is not an authorized signer');
    }

    const proposal = {
      proposalId: this.generateId('GOV'),
      change,
      requiredSignatures: this.config.governance.quorum,
      signatures: [proposer],
      timelockExpiry: new Date(Date.now() + this.config.governance.timelockHours * 3600000).toISOString(),
    };

    this.audit('governance_proposal', {
      proposalId: proposal.proposalId,
      proposer,
      change,
    });

    this.emit('governance_proposal', proposal);
    return proposal;
  }

  /**
   * Emergency pause — bypasses timelock with emergency quorum.
   */
  emergencyPause(signer: string): void {
    if (!this.config.governance.emergencySigners.includes(signer)) {
      throw new Error('Not an emergency signer');
    }

    this.state.status = 'emergency';
    this.audit('emergency_pause', { signer, previousStatus: this.state.status });
    this.emit('emergency_pause', { signer });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  LAYER 6: SETTLEMENT BRIDGE — DvP for Subscriptions/Redemptions
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Prepare on-chain settlement for a bond allocation.
   * Returns XRPL transaction templates for DvP execution.
   */
  prepareAllocationSettlement(subscription: Subscription): {
    deliveryLeg: any;  // Bond token payment from treasury → subscriber
    paymentLeg: any;   // Consideration payment from subscriber → treasury
  } {
    if (subscription.status !== 'allocated') {
      throw new Error('Subscription must be allocated before settlement');
    }

    const amount = subscription.allocatedAmount || subscription.requestedAmount;

    return {
      deliveryLeg: {
        TransactionType: 'Payment',
        // Account: treasury address (filled at execution)
        Destination: subscription.subscriberAddress,
        Amount: {
          currency: '534F56424E440000000000000000000000000000', // SOVBND hex
          issuer: 'rpraqLjKmDB9a43F9fURWA2bVaywkyJua3',
          value: amount,
        },
        Memos: [{
          Memo: {
            MemoType: Buffer.from('bond/allocation').toString('hex').toUpperCase(),
            MemoData: Buffer.from(JSON.stringify({
              subscriptionId: subscription.id,
              tier: subscription.nftTier,
              nftProof: subscription.nftTokenId,
            })).toString('hex').toUpperCase(),
          }
        }],
      },
      paymentLeg: {
        TransactionType: 'Payment',
        Account: subscription.subscriberAddress,
        // Destination: treasury address (filled at execution)
        Amount: {
          currency: '524C555344000000000000000000000000000000', // RLUSD hex
          issuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',
          value: (parseFloat(amount) * 100).toString(), // $100 per SOVBND unit
        },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STATE QUERIES
  // ═══════════════════════════════════════════════════════════════════

  getState(): VaultState { return { ...this.state }; }
  getConfig(): VaultConfig { return { ...this.config }; }
  getDeposit(id: string): VaultDeposit | undefined { return this.deposits.get(id); }
  getYieldStrip(id: string): YieldStrip | undefined { return this.yieldStrips.get(id); }
  getSubscription(id: string): Subscription | undefined { return this.subscriptions.get(id); }
  getAttestations(): ReserveAttestation[] { return [...this.attestations]; }
  getActiveSubscriptions(): Subscription[] { return Array.from(this.subscriptions.values()); }
  getCouponSchedule(): CouponPayment[] { return [...this.couponSchedule]; }

  getVaultSummary(): Record<string, unknown> {
    return {
      id: this.config.id,
      name: this.config.name,
      entity: this.config.entity,
      status: this.state.status,
      totalNAV: this.state.totalNAV,
      totalShares: this.state.totalShares,
      sharePrice: this.state.sharePrice,
      reserveRatio: this.state.reserveRatio,
      yieldAccrued: this.state.yieldAccrued,
      totalDeposits: this.deposits.size,
      activeStrips: this.yieldStrips.size,
      subscriptions: this.subscriptions.size,
      attestations: this.attestations.length,
      epoch: this.state.epoch,
      lastAttestation: this.state.lastAttestationTime,
      lastAttestationHash: this.state.lastAttestationHash.slice(0, 16) + '...',
      acceptedAssets: this.config.acceptedAssets.map(a => a.code),
      allocationTiers: this.config.allocation.tiers.map(t => ({
        name: t.name,
        priority: t.priority,
        rights: t.rights,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  INTERNAL HELPERS
  // ═══════════════════════════════════════════════════════════════════

  private recalculateSharePrice(): void {
    const totalShares = parseFloat(this.state.totalShares);
    if (totalShares > 0) {
      this.state.sharePrice = (parseFloat(this.state.totalNAV) / totalShares).toFixed(6);
    }
  }

  private recalculateReserveRatio(): void {
    const totalLiabilities = this.state.withdrawalQueue
      .filter(w => w.status === 'pending' || w.status === 'available')
      .reduce((s, w) => s + parseFloat(w.estimatedValue), 0);

    if (totalLiabilities > 0) {
      this.state.reserveRatio = parseFloat(this.state.totalNAV) / totalLiabilities;
    } else {
      this.state.reserveRatio = parseFloat(this.state.totalNAV) > 0 ? 999 : 0;
    }
  }

  private checkConcentrationLimits(asset: string): void {
    const accepted = this.config.acceptedAssets.find(a => a.code === asset);
    if (!accepted) return;

    let assetValue = 0;
    for (const dep of this.deposits.values()) {
      if (dep.asset === asset) assetValue += parseFloat(dep.currentValue);
    }

    const concentration = assetValue / parseFloat(this.state.totalNAV);
    if (concentration > accepted.maxVaultAllocation) {
      this.emit('concentration_warning', {
        asset,
        concentration,
        limit: accepted.maxVaultAllocation,
      });
    }
  }

  private getDepositorShares(depositor: string): number {
    let total = 0;
    for (const dep of this.deposits.values()) {
      if (dep.depositor === depositor) total += parseFloat(dep.sharesIssued);
    }
    return total;
  }

  private getEpochWithdrawals(): number {
    return this.state.withdrawalQueue
      .filter(w => w.requestedAt >= this.state.epochStart && w.status !== 'cancelled')
      .reduce((s, w) => s + parseFloat(w.sharesAmount), 0);
  }

  private calculateLockExpiry(): string {
    const ms = this.config.parameters.withdrawalLockDays * 86400000;
    return new Date(Date.now() + ms).toISOString();
  }

  private getCompoundingPeriodsPerYear(): number {
    switch (this.config.parameters.compoundingFrequency) {
      case 'daily': return 365;
      case 'weekly': return 52;
      case 'monthly': return 12;
      case 'quarterly': return 4;
    }
  }

  private calculateMaturity(asset: string): string {
    // SOVBND: 5-year maturity from Feb 2026
    if (asset === 'SOVBND') return '2031-02-07';
    // Default: 1 year
    return new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
  }

  private yearsUntil(dateStr: string): number {
    const ms = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, ms / (365.25 * 86400000));
  }

  private getBondId(asset: string): string {
    if (asset === 'SOVBND') return 'SOVBND-A-2026';
    return `${asset}-VAULT`;
  }

  private getNextCouponDate(): string {
    // Next quarterly coupon (Q2 2026)
    return '2026-05-07';
  }

  private generateCouponSchedule(yieldStrip: YieldStrip): void {
    const periods = 20; // 5 years × 4 quarters
    const periodYield = (parseFloat(yieldStrip.faceValue) * yieldStrip.couponRate) / 4;
    const startDate = new Date('2026-02-07');

    for (let i = 1; i <= periods; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + (i * 3));

      this.couponSchedule.push({
        stripId: yieldStrip.id,
        bondId: yieldStrip.bondId,
        period: i,
        amount: periodYield.toFixed(2),
        scheduledDate: date.toISOString().split('T')[0],
        status: 'scheduled',
      });
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  DEFAULT VAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

export function createDefaultVaultConfig(): VaultConfig {
  return {
    id: 'URV-001',
    name: 'Unykorn Reserve Vault — Series 1',
    entity: 'OPTKAS1-MAIN SPV',
    jurisdiction: 'Delaware, USA',
    vaultType: 'reserve',
    acceptedAssets: [
      {
        code: 'SOVBND', hex: '534F56424E440000000000000000000000000000',
        type: 'bond', network: 'both', issuer: 'rpraqLjKmDB9a43F9fURWA2bVaywkyJua3',
        yieldBearing: true, annualYield: 0.065, haircut: 0.05,
        maxDeposit: '1000000', maxVaultAllocation: 0.40,
      },
      {
        code: 'OPTKAS', hex: '4F50544B41530000000000000000000000000000',
        type: 'utility', network: 'both', issuer: 'rpraqLjKmDB9a43F9fURWA2bVaywkyJua3',
        yieldBearing: false, haircut: 0.25,
        maxDeposit: '10000000', maxVaultAllocation: 0.30,
      },
      {
        code: 'IMPERIA', hex: '494D504552494100000000000000000000000000',
        type: 'asset-backed', network: 'both', issuer: 'rpraqLjKmDB9a43F9fURWA2bVaywkyJua3',
        yieldBearing: false, haircut: 0.10,
        maxDeposit: '10000', maxVaultAllocation: 0.25,
      },
      {
        code: 'GEMVLT', hex: '47454D564C540000000000000000000000000000',
        type: 'asset-backed', network: 'both', issuer: 'rpraqLjKmDB9a43F9fURWA2bVaywkyJua3',
        yieldBearing: false, haircut: 0.15,
        maxDeposit: '100000', maxVaultAllocation: 0.20,
      },
      {
        code: 'TERRAVL', hex: '5445525241564C00000000000000000000000000',
        type: 'asset-backed', network: 'both', issuer: 'rpraqLjKmDB9a43F9fURWA2bVaywkyJua3',
        yieldBearing: false, haircut: 0.20,
        maxDeposit: '50000', maxVaultAllocation: 0.20,
      },
      {
        code: 'PETRO', hex: '504554524F000000000000000000000000000000',
        type: 'asset-backed', network: 'both', issuer: 'rpraqLjKmDB9a43F9fURWA2bVaywkyJua3',
        yieldBearing: false, haircut: 0.20,
        maxDeposit: '1000000', maxVaultAllocation: 0.15,
      },
    ],
    parameters: {
      reserveRatioTarget: 1.25,
      reserveRatioMinimum: 1.0,
      rebalanceThreshold: 0.05,
      compoundingFrequency: 'quarterly',
      withdrawalLockDays: 90,
      maxWithdrawalPerEpoch: 0.10,
      epochDurationDays: 30,
      treasuryFee: 0.005,
      performanceFee: 0.10,
    },
    governance: {
      multisigRequired: true,
      signers: [
        'rpraqLjKmDB9a43F9fURWA2bVaywkyJua3',  // issuer
        'r3JfTyqU9jwnXh2aWCwr738fb9HygNmBys',  // treasury
        'rBC9g8YVU6HZouStFcdE5a8kmsob8napKD',   // escrow
      ],
      quorum: 2,
      timelockHours: 48,
      emergencySigners: [
        'rpraqLjKmDB9a43F9fURWA2bVaywkyJua3',
        'r3JfTyqU9jwnXh2aWCwr738fb9HygNmBys',
      ],
      emergencyQuorum: 2,
    },
    attestation: {
      frequency: 'on_deposit',
      nftTaxon: 100,     // Reserve attestation NFTs use taxon 100
      includeInNft: ['totalNAV', 'reserveRatio', 'sharePrice', 'hash'],
      publishToStellar: true,
    },
    allocation: {
      tiers: [
        {
          name: 'Founder',
          nftTaxon: 1,
          priority: 1,
          maxAllocation: '50000',
          rights: ['allocate', 'vote', 'redeem', 'observe'],
        },
        {
          name: 'Institutional',
          nftTaxon: 2,
          priority: 2,
          maxAllocation: '10000',
          rights: ['subscribe', 'redeem', 'observe'],
        },
        {
          name: 'Genesis',
          nftTaxon: 3,
          priority: 3,
          maxAllocation: '0',
          rights: ['observe'],
        },
      ],
      subscriptionWindow: {
        openDate: '2026-03-01',
        closeDate: '2026-06-01',
        minSubscription: '100',
        maxSubscription: '50000',
      },
      proRataEnabled: true,
      oversubscriptionPolicy: 'pro_rata',
    },
    createdAt: new Date().toISOString(),
  };
}
