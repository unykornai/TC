/**
 * @optkas/rwa — Real-World Asset Token Factory
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Generic factory for tokenizing any real-world asset class on XRPL:
 * - Bonds (fixed income)
 * - Real estate (fractional ownership)
 * - Receivables (invoice financing)
 * - Commodities (metals, energy)
 * - Private equity (fund interests)
 * - IP / Revenue shares
 *
 * Each tokenized asset has:
 * - Asset metadata & classification
 * - Compliance gates (KYC/AML, accreditation, jurisdiction)
 * - Valuation snapshots with oracle support
 * - Lifecycle management (issuance → maturity/liquidation)
 * - Transfer restrictions (XRPL RequireAuth)
 * - Full audit trail via @optkas/attestation
 */

import { XRPLClient, PreparedTransaction } from '@optkas/xrpl-core';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────

export type AssetClass =
  | 'fixed_income'
  | 'real_estate'
  | 'receivables'
  | 'commodities'
  | 'private_equity'
  | 'ip_royalty'
  | 'other';

export type AssetLifecycle =
  | 'draft'
  | 'approved'
  | 'issuing'
  | 'active'
  | 'suspended'
  | 'matured'
  | 'liquidating'
  | 'terminated';

export type TransferRestriction =
  | 'unrestricted'
  | 'accredited_only'
  | 'qualified_purchaser'
  | 'jurisdiction_restricted'
  | 'locked';

export interface ValuationSnapshot {
  id: string;
  timestamp: string;
  value: string;
  currency: string;
  method: 'appraisal' | 'mark_to_market' | 'dcf' | 'oracle' | 'manual';
  provider: string;
  documentHash?: string;
}

export interface ComplianceGate {
  id: string;
  name: string;
  type: 'kyc' | 'aml' | 'accreditation' | 'jurisdiction' | 'holding_period' | 'custom';
  required: boolean;
  status: 'pending' | 'passed' | 'failed' | 'expired';
  validUntil?: string;
  metadata: Record<string, unknown>;
}

export interface TokenHolder {
  id: string;
  address: string;
  balance: string;
  complianceGates: ComplianceGate[];
  acquiredAt: string;
  transferRestriction: TransferRestriction;
}

export interface TokenizedAsset {
  id: string;
  name: string;
  description: string;
  assetClass: AssetClass;
  lifecycle: AssetLifecycle;

  // Token configuration
  token: {
    currency: string;             // XRPL IOU currency code
    issuerAddress: string;        // XRPL issuer
    totalSupply: string;
    circulatingSupply: string;
    decimals: number;
    transferRestriction: TransferRestriction;
    freezeEnabled: boolean;
    clawbackEnabled: boolean;
  };

  // Underlying asset
  underlying: {
    description: string;
    location?: string;
    custodian: string;
    legalEntity: string;
    contractHash: string;         // SHA-256 of legal agreement
    jurisdiction: string;
  };

  // Valuations
  valuations: ValuationSnapshot[];
  currentValuation: string;
  valuationCurrency: string;

  // Holders
  holders: TokenHolder[];

  // Lifecycle events
  events: AssetEvent[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AssetEvent {
  id: string;
  type: string;
  timestamp: string;
  actor: string;
  data: Record<string, unknown>;
  txHash?: string;
}

export interface MintRequest {
  assetId: string;
  recipient: string;
  amount: string;
  reason: string;
}

// ─── RWA Token Factory ────────────────────────────────────────────────

export class RWATokenFactory extends EventEmitter {
  private client: XRPLClient;
  private assets: Map<string, TokenizedAsset> = new Map();

  constructor(client: XRPLClient) {
    super();
    this.client = client;
  }

  // ─── Asset Registration ────────────────────────────────────────

  /**
   * Register a new RWA token. Creates the on-chain representation definition.
   */
  registerAsset(params: {
    name: string;
    description: string;
    assetClass: AssetClass;
    currency: string;
    issuerAddress: string;
    totalSupply: string;
    transferRestriction: TransferRestriction;
    custodian: string;
    legalEntity: string;
    contractHash: string;
    jurisdiction: string;
    initialValuation: string;
    valuationCurrency: string;
    createdBy: string;
  }): TokenizedAsset {
    const id = `RWA-${params.assetClass.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const asset: TokenizedAsset = {
      id,
      name: params.name,
      description: params.description,
      assetClass: params.assetClass,
      lifecycle: 'draft',
      token: {
        currency: params.currency,
        issuerAddress: params.issuerAddress,
        totalSupply: params.totalSupply,
        circulatingSupply: '0',
        decimals: 8,
        transferRestriction: params.transferRestriction,
        freezeEnabled: true,
        clawbackEnabled: true,
      },
      underlying: {
        description: params.description,
        custodian: params.custodian,
        legalEntity: params.legalEntity,
        contractHash: params.contractHash,
        jurisdiction: params.jurisdiction,
      },
      valuations: [{
        id: `VAL-001`,
        timestamp: new Date().toISOString(),
        value: params.initialValuation,
        currency: params.valuationCurrency,
        method: 'appraisal',
        provider: params.custodian,
      }],
      currentValuation: params.initialValuation,
      valuationCurrency: params.valuationCurrency,
      holders: [],
      events: [{
        id: `EVT-001`,
        type: 'asset_registered',
        timestamp: new Date().toISOString(),
        actor: params.createdBy,
        data: { name: params.name, assetClass: params.assetClass },
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: params.createdBy,
    };

    this.assets.set(id, asset);
    this.emit('asset_registered', { id, name: params.name, assetClass: params.assetClass });
    return asset;
  }

  // ─── Compliance Gate Management ────────────────────────────────

  addComplianceGate(
    assetId: string,
    holderId: string,
    gate: Omit<ComplianceGate, 'id'>
  ): ComplianceGate {
    const asset = this.getAssetOrThrow(assetId);
    const holder = asset.holders.find((h) => h.id === holderId);
    if (!holder) throw new Error(`Holder not found: ${holderId}`);

    const fullGate: ComplianceGate = {
      ...gate,
      id: `GATE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    };

    holder.complianceGates.push(fullGate);
    this.emit('compliance_gate_added', { assetId, holderId, gate: fullGate });
    return fullGate;
  }

  approveComplianceGate(assetId: string, holderId: string, gateId: string): void {
    const asset = this.getAssetOrThrow(assetId);
    const holder = asset.holders.find((h) => h.id === holderId);
    if (!holder) throw new Error(`Holder not found: ${holderId}`);

    const gate = holder.complianceGates.find((g) => g.id === gateId);
    if (!gate) throw new Error(`Gate not found: ${gateId}`);

    gate.status = 'passed';
    this.emit('compliance_gate_approved', { assetId, holderId, gateId });
  }

  /**
   * Check if all required compliance gates are passed for a holder.
   */
  isCompliant(assetId: string, holderId: string): boolean {
    const asset = this.getAssetOrThrow(assetId);
    const holder = asset.holders.find((h) => h.id === holderId);
    if (!holder) return false;

    return holder.complianceGates
      .filter((g) => g.required)
      .every((g) => g.status === 'passed');
  }

  // ─── Token Issuance ────────────────────────────────────────────

  /**
   * Register a new token holder with compliance gates.
   */
  registerHolder(
    assetId: string,
    params: { address: string; transferRestriction?: TransferRestriction }
  ): TokenHolder {
    const asset = this.getAssetOrThrow(assetId);

    const holder: TokenHolder = {
      id: `HOLD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      address: params.address,
      balance: '0',
      complianceGates: [],
      acquiredAt: new Date().toISOString(),
      transferRestriction: params.transferRestriction || asset.token.transferRestriction,
    };

    asset.holders.push(holder);
    return holder;
  }

  /**
   * Mint tokens to a holder. Requires all compliance gates passed.
   * Returns unsigned transactions for multisig.
   */
  async mintTokens(
    assetId: string,
    holderId: string,
    amount: string,
    dryRun = true
  ): Promise<{ trustlineTx: PreparedTransaction; mintTx: PreparedTransaction }> {
    const asset = this.getAssetOrThrow(assetId);

    if (!['issuing', 'active'].includes(asset.lifecycle)) {
      throw new Error(`Asset not in issuable state: ${asset.lifecycle}`);
    }

    const holder = asset.holders.find((h) => h.id === holderId);
    if (!holder) throw new Error(`Holder not found: ${holderId}`);

    if (!this.isCompliant(assetId, holderId)) {
      throw new Error(`Holder ${holderId} has not passed all required compliance gates`);
    }

    const remaining = parseFloat(asset.token.totalSupply) - parseFloat(asset.token.circulatingSupply);
    if (parseFloat(amount) > remaining) {
      throw new Error(`Exceeds supply cap. Remaining: ${remaining}`);
    }

    // 1. Trustline from holder to issuer
    const trustlineTx = await this.client.prepareTransaction(
      {
        TransactionType: 'TrustSet' as const,
        Account: holder.address,
        LimitAmount: {
          currency: asset.token.currency,
          issuer: asset.token.issuerAddress,
          value: amount,
        },
      },
      `RWA TRUSTLINE: ${holder.address} → ${asset.token.currency} (limit: ${amount})`,
      dryRun
    );

    // 2. Mint (issue IOU from issuer to holder)
    const mintTx = await this.client.prepareTransaction(
      {
        TransactionType: 'Payment' as const,
        Account: asset.token.issuerAddress,
        Destination: holder.address,
        Amount: {
          currency: asset.token.currency,
          issuer: asset.token.issuerAddress,
          value: amount,
        } as any,
        Memos: [{
          Memo: {
            MemoType: XRPLClient.hexEncode('rwa/mint'),
            MemoData: XRPLClient.hexEncode(JSON.stringify({
              assetId: asset.id,
              holderId: holder.id,
              amount,
              assetClass: asset.assetClass,
              contractHash: asset.underlying.contractHash,
            })),
          },
        }],
      } as any,
      `RWA MINT: ${amount} ${asset.token.currency} → ${holder.address}`,
      dryRun
    );

    holder.balance = (parseFloat(holder.balance) + parseFloat(amount)).toFixed(8);
    asset.token.circulatingSupply = (
      parseFloat(asset.token.circulatingSupply) + parseFloat(amount)
    ).toFixed(8);
    asset.updatedAt = new Date().toISOString();

    this.addEvent(assetId, 'tokens_minted', 'system', { holderId, amount });
    this.emit('tokens_minted', { assetId, holderId, amount });
    return { trustlineTx, mintTx };
  }

  /**
   * Burn tokens (holder returns IOUs to issuer).
   */
  async burnTokens(
    assetId: string,
    holderId: string,
    amount: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const asset = this.getAssetOrThrow(assetId);
    const holder = asset.holders.find((h) => h.id === holderId);
    if (!holder) throw new Error(`Holder not found: ${holderId}`);
    if (parseFloat(holder.balance) < parseFloat(amount)) {
      throw new Error(`Insufficient balance: ${holder.balance} < ${amount}`);
    }

    const burnTx = await this.client.prepareTransaction(
      {
        TransactionType: 'Payment' as const,
        Account: holder.address,
        Destination: asset.token.issuerAddress,
        Amount: {
          currency: asset.token.currency,
          issuer: asset.token.issuerAddress,
          value: amount,
        } as any,
      } as any,
      `RWA BURN: ${amount} ${asset.token.currency} from ${holder.address}`,
      dryRun
    );

    holder.balance = (parseFloat(holder.balance) - parseFloat(amount)).toFixed(8);
    asset.token.circulatingSupply = (
      parseFloat(asset.token.circulatingSupply) - parseFloat(amount)
    ).toFixed(8);

    this.addEvent(assetId, 'tokens_burned', 'system', { holderId, amount });
    return burnTx;
  }

  // ─── Freeze / Clawback ─────────────────────────────────────────

  async freezeHolder(
    assetId: string,
    holderId: string,
    reason: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const asset = this.getAssetOrThrow(assetId);
    const holder = asset.holders.find((h) => h.id === holderId);
    if (!holder) throw new Error(`Holder not found: ${holderId}`);

    const tx = await this.client.prepareTransaction(
      {
        TransactionType: 'TrustSet' as const,
        Account: asset.token.issuerAddress,
        LimitAmount: {
          currency: asset.token.currency,
          issuer: holder.address,
          value: '0',
        },
        Flags: 0x00100000, // tfSetFreeze
      } as any,
      `RWA FREEZE: ${holder.address} on ${asset.token.currency} — ${reason}`,
      dryRun
    );

    holder.transferRestriction = 'locked';
    this.addEvent(assetId, 'holder_frozen', 'system', { holderId, reason });
    return tx;
  }

  async clawback(
    assetId: string,
    holderId: string,
    amount: string,
    reason: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const asset = this.getAssetOrThrow(assetId);
    if (!asset.token.clawbackEnabled) {
      throw new Error('Clawback not enabled for this asset');
    }

    const holder = asset.holders.find((h) => h.id === holderId);
    if (!holder) throw new Error(`Holder not found: ${holderId}`);

    const tx = await this.client.prepareTransaction(
      {
        TransactionType: 'Clawback' as const,
        Account: asset.token.issuerAddress,
        Amount: {
          currency: asset.token.currency,
          issuer: holder.address,
          value: amount,
        } as any,
      } as any,
      `RWA CLAWBACK: ${amount} ${asset.token.currency} from ${holder.address} — ${reason}`,
      dryRun
    );

    holder.balance = (parseFloat(holder.balance) - parseFloat(amount)).toFixed(8);
    asset.token.circulatingSupply = (
      parseFloat(asset.token.circulatingSupply) - parseFloat(amount)
    ).toFixed(8);

    this.addEvent(assetId, 'clawback', 'system', { holderId, amount, reason });
    return tx;
  }

  // ─── Valuation Management ──────────────────────────────────────

  addValuation(
    assetId: string,
    params: {
      value: string;
      currency: string;
      method: ValuationSnapshot['method'];
      provider: string;
      documentHash?: string;
    }
  ): ValuationSnapshot {
    const asset = this.getAssetOrThrow(assetId);

    const snapshot: ValuationSnapshot = {
      id: `VAL-${String(asset.valuations.length + 1).padStart(3, '0')}`,
      timestamp: new Date().toISOString(),
      ...params,
    };

    asset.valuations.push(snapshot);
    asset.currentValuation = params.value;
    asset.valuationCurrency = params.currency;
    asset.updatedAt = new Date().toISOString();

    this.addEvent(assetId, 'valuation_updated', params.provider, {
      value: params.value,
      method: params.method,
    });

    this.emit('valuation_updated', { assetId, snapshot });
    return snapshot;
  }

  // ─── Lifecycle Management ──────────────────────────────────────

  transitionLifecycle(assetId: string, newState: AssetLifecycle, reason: string): void {
    const asset = this.getAssetOrThrow(assetId);

    const validTransitions: Record<AssetLifecycle, AssetLifecycle[]> = {
      draft: ['approved', 'terminated'],
      approved: ['issuing', 'terminated'],
      issuing: ['active', 'terminated'],
      active: ['suspended', 'matured', 'liquidating'],
      suspended: ['active', 'terminated'],
      matured: ['terminated'],
      liquidating: ['terminated'],
      terminated: [],
    };

    const allowed = validTransitions[asset.lifecycle];
    if (!allowed.includes(newState)) {
      throw new Error(`Invalid: ${asset.lifecycle} → ${newState}. Allowed: ${allowed.join(', ')}`);
    }

    const from = asset.lifecycle;
    asset.lifecycle = newState;
    asset.updatedAt = new Date().toISOString();

    this.addEvent(assetId, 'lifecycle_transition', 'system', { from, to: newState, reason });
    this.emit('lifecycle_changed', { assetId, from, to: newState, reason });
  }

  // ─── Queries ───────────────────────────────────────────────────

  getAsset(assetId: string): TokenizedAsset | undefined {
    return this.assets.get(assetId);
  }

  getAllAssets(): TokenizedAsset[] {
    return Array.from(this.assets.values());
  }

  getAssetsByClass(assetClass: AssetClass): TokenizedAsset[] {
    return this.getAllAssets().filter((a) => a.assetClass === assetClass);
  }

  getActiveAssets(): TokenizedAsset[] {
    return this.getAllAssets().filter((a) =>
      ['issuing', 'active'].includes(a.lifecycle)
    );
  }

  /**
   * Asset summary for portfolio/reporting.
   */
  getAssetSummary(assetId: string): {
    id: string;
    name: string;
    assetClass: AssetClass;
    lifecycle: AssetLifecycle;
    totalSupply: string;
    circulatingSupply: string;
    holderCount: number;
    currentValuation: string;
    collateralizationRatio: string;
  } | undefined {
    const asset = this.assets.get(assetId);
    if (!asset) return undefined;

    const circ = parseFloat(asset.token.circulatingSupply);
    const val = parseFloat(asset.currentValuation);

    return {
      id: asset.id,
      name: asset.name,
      assetClass: asset.assetClass,
      lifecycle: asset.lifecycle,
      totalSupply: asset.token.totalSupply,
      circulatingSupply: asset.token.circulatingSupply,
      holderCount: asset.holders.length,
      currentValuation: asset.currentValuation,
      collateralizationRatio: circ > 0 ? (val / circ).toFixed(4) : 'N/A',
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private getAssetOrThrow(assetId: string): TokenizedAsset {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);
    return asset;
  }

  private addEvent(
    assetId: string,
    type: string,
    actor: string,
    data: Record<string, unknown>
  ): void {
    const asset = this.assets.get(assetId);
    if (!asset) return;
    asset.events.push({
      id: `EVT-${String(asset.events.length + 1).padStart(3, '0')}`,
      type,
      timestamp: new Date().toISOString(),
      actor,
      data,
    });
  }
}

export default RWATokenFactory;
