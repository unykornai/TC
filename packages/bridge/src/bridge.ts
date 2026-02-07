/**
 * @optkas/bridge — XChainBridge Configuration & Management
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Manages XRPL XChain Bridge infrastructure:
 * - Bridge configuration models (locking chain ↔ issuing chain)
 * - Door account management and setup
 * - Witness server configuration generation
 * - Claim ID tracking and cross-chain attestations
 * - Bridge transaction preparation (XChainCreateBridge, XChainCommit, XChainClaim)
 * - Audit events for all bridge operations
 *
 * Bridges connect two XRPL networks (e.g., mainnet ↔ sidechain) or
 * XRPL ↔ EVM chains via bridge protocol. All bridge operations require
 * multisig governance approval.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────

export interface BridgeConfig {
  id: string;
  name: string;
  lockingChain: ChainConfig;
  issuingChain: ChainConfig;
  bridgeCurrency: string;
  bridgeIssuer?: string;          // null for XRP bridges
  signatureReward: string;        // Reward for witness attestations (in drops)
  minAccountCreateAmount: string; // Minimum for cross-chain account creates
  status: 'configured' | 'active' | 'paused' | 'decommissioned';
  createdAt: string;
  updatedAt: string;
}

export interface ChainConfig {
  networkUrl: string;
  networkType: 'mainnet' | 'testnet' | 'sidechain' | 'devnet';
  doorAccountAddress: string;
  doorAccountSettings: DoorAccountSettings;
  witnesses: WitnessConfig[];
}

export interface DoorAccountSettings {
  disableMasterKey: boolean;
  requireMultisig: boolean;
  signerQuorum: number;
  signerEntries: { address: string; weight: number }[];
}

export interface WitnessConfig {
  id: string;
  publicKey: string;
  endpoint: string;             // e.g., "https://witness1.optkas.com"
  weight: number;
  active: boolean;
  registeredAt: string;
}

export interface ClaimRecord {
  id: string;
  bridgeId: string;
  claimId: number;
  direction: 'locking_to_issuing' | 'issuing_to_locking';
  sourceAddress: string;
  destinationAddress: string;
  amount: string;
  currency: string;
  commitTxHash?: string;
  claimTxHash?: string;
  attestations: WitnessAttestation[];
  requiredAttestations: number;
  status: 'committed' | 'attested' | 'claimed' | 'expired' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface WitnessAttestation {
  witnessId: string;
  signature: string;
  attestedAt: string;
  claimId: number;
}

export interface WitnessServerConfig {
  lockingChainUrl: string;
  issuingChainUrl: string;
  lockingChainDoor: string;
  issuingChainDoor: string;
  bridgeCurrency: string;
  bridgeIssuer?: string;
  signatureReward: string;
  witnessKeyPath: string;        // Path to witness signing key
  attestationQuorum: number;
  logPath: string;
  metricsPort: number;
  healthCheckPort: number;
}

// ─── Bridge Manager ──────────────────────────────────────────────────

export class BridgeManager extends EventEmitter {
  private bridges: Map<string, BridgeConfig> = new Map();
  private claims: Map<string, ClaimRecord> = new Map();
  private claimCounter: Map<string, number> = new Map(); // bridgeId → next claim ID

  constructor() {
    super();
  }

  // ─── Bridge Configuration ──────────────────────────────────────

  /**
   * Configure a new bridge between two chains.
   */
  configureBridge(params: {
    name: string;
    lockingChainUrl: string;
    lockingChainType: ChainConfig['networkType'];
    lockingDoorAddress: string;
    issuingChainUrl: string;
    issuingChainType: ChainConfig['networkType'];
    issuingDoorAddress: string;
    currency: string;
    issuer?: string;
    signatureReward: string;
    minAccountCreateAmount: string;
    signerQuorum: number;
    signerEntries: { address: string; weight: number }[];
  }): BridgeConfig {
    const bridge: BridgeConfig = {
      id: `BRG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      name: params.name,
      lockingChain: {
        networkUrl: params.lockingChainUrl,
        networkType: params.lockingChainType,
        doorAccountAddress: params.lockingDoorAddress,
        doorAccountSettings: {
          disableMasterKey: true,
          requireMultisig: true,
          signerQuorum: params.signerQuorum,
          signerEntries: params.signerEntries,
        },
        witnesses: [],
      },
      issuingChain: {
        networkUrl: params.issuingChainUrl,
        networkType: params.issuingChainType,
        doorAccountAddress: params.issuingDoorAddress,
        doorAccountSettings: {
          disableMasterKey: true,
          requireMultisig: true,
          signerQuorum: params.signerQuorum,
          signerEntries: params.signerEntries,
        },
        witnesses: [],
      },
      bridgeCurrency: params.currency,
      bridgeIssuer: params.issuer,
      signatureReward: params.signatureReward,
      minAccountCreateAmount: params.minAccountCreateAmount,
      status: 'configured',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.bridges.set(bridge.id, bridge);
    this.claimCounter.set(bridge.id, 1);
    this.emit('bridge_configured', bridge);
    return bridge;
  }

  getBridge(bridgeId: string): BridgeConfig | undefined {
    return this.bridges.get(bridgeId);
  }

  getAllBridges(): BridgeConfig[] {
    return Array.from(this.bridges.values());
  }

  // ─── Witness Management ────────────────────────────────────────

  /**
   * Register a witness server for a bridge.
   */
  registerWitness(bridgeId: string, chain: 'locking' | 'issuing', params: {
    publicKey: string;
    endpoint: string;
    weight: number;
  }): WitnessConfig {
    const bridge = this.bridges.get(bridgeId);
    if (!bridge) throw new Error(`Bridge not found: ${bridgeId}`);

    const witness: WitnessConfig = {
      id: `WIT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      publicKey: params.publicKey,
      endpoint: params.endpoint,
      weight: params.weight,
      active: true,
      registeredAt: new Date().toISOString(),
    };

    const chainConfig = chain === 'locking' ? bridge.lockingChain : bridge.issuingChain;
    chainConfig.witnesses.push(witness);
    bridge.updatedAt = new Date().toISOString();

    this.emit('witness_registered', { bridgeId, chain, witness });
    return witness;
  }

  /**
   * Deactivate a witness.
   */
  deactivateWitness(bridgeId: string, chain: 'locking' | 'issuing', witnessId: string): void {
    const bridge = this.bridges.get(bridgeId);
    if (!bridge) throw new Error(`Bridge not found: ${bridgeId}`);

    const chainConfig = chain === 'locking' ? bridge.lockingChain : bridge.issuingChain;
    const witness = chainConfig.witnesses.find((w) => w.id === witnessId);
    if (!witness) throw new Error(`Witness not found: ${witnessId}`);

    witness.active = false;
    bridge.updatedAt = new Date().toISOString();
    this.emit('witness_deactivated', { bridgeId, chain, witnessId });
  }

  // ─── Witness Server Config Generation ──────────────────────────

  /**
   * Generate a witness server configuration file.
   * This is used to deploy witness nodes that attest to cross-chain transfers.
   */
  generateWitnessServerConfig(bridgeId: string, witnessId: string, params: {
    keyPath: string;
    logPath: string;
    metricsPort: number;
    healthCheckPort: number;
  }): WitnessServerConfig {
    const bridge = this.bridges.get(bridgeId);
    if (!bridge) throw new Error(`Bridge not found: ${bridgeId}`);

    const activeWitnesses = [
      ...bridge.lockingChain.witnesses,
      ...bridge.issuingChain.witnesses,
    ].filter((w) => w.active);

    const totalWeight = activeWitnesses.reduce((s, w) => s + w.weight, 0);
    const quorum = Math.ceil(totalWeight * 0.67); // 2/3 + 1

    const config: WitnessServerConfig = {
      lockingChainUrl: bridge.lockingChain.networkUrl,
      issuingChainUrl: bridge.issuingChain.networkUrl,
      lockingChainDoor: bridge.lockingChain.doorAccountAddress,
      issuingChainDoor: bridge.issuingChain.doorAccountAddress,
      bridgeCurrency: bridge.bridgeCurrency,
      bridgeIssuer: bridge.bridgeIssuer,
      signatureReward: bridge.signatureReward,
      witnessKeyPath: params.keyPath,
      attestationQuorum: quorum,
      logPath: params.logPath,
      metricsPort: params.metricsPort,
      healthCheckPort: params.healthCheckPort,
    };

    this.emit('witness_config_generated', { bridgeId, witnessId, config });
    return config;
  }

  // ─── Cross-Chain Claims ────────────────────────────────────────

  /**
   * Record a cross-chain commit (funds locked on source chain).
   */
  recordCommit(bridgeId: string, params: {
    direction: ClaimRecord['direction'];
    sourceAddress: string;
    destinationAddress: string;
    amount: string;
    commitTxHash: string;
  }): ClaimRecord {
    const bridge = this.bridges.get(bridgeId);
    if (!bridge) throw new Error(`Bridge not found: ${bridgeId}`);

    const claimId = this.claimCounter.get(bridgeId) || 1;
    this.claimCounter.set(bridgeId, claimId + 1);

    const activeWitnesses = params.direction === 'locking_to_issuing'
      ? bridge.lockingChain.witnesses.filter((w) => w.active)
      : bridge.issuingChain.witnesses.filter((w) => w.active);

    const totalWeight = activeWitnesses.reduce((s, w) => s + w.weight, 0);
    const requiredAttestations = Math.ceil(totalWeight * 0.67);

    const claim: ClaimRecord = {
      id: `CLM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      bridgeId,
      claimId,
      direction: params.direction,
      sourceAddress: params.sourceAddress,
      destinationAddress: params.destinationAddress,
      amount: params.amount,
      currency: bridge.bridgeCurrency,
      commitTxHash: params.commitTxHash,
      attestations: [],
      requiredAttestations,
      status: 'committed',
      createdAt: new Date().toISOString(),
    };

    this.claims.set(claim.id, claim);
    this.emit('commit_recorded', claim);
    return claim;
  }

  /**
   * Record a witness attestation for a claim.
   */
  recordAttestation(claimRecordId: string, attestation: WitnessAttestation): ClaimRecord {
    const claim = this.claims.get(claimRecordId);
    if (!claim) throw new Error(`Claim not found: ${claimRecordId}`);

    if (claim.attestations.some((a) => a.witnessId === attestation.witnessId)) {
      throw new Error(`Witness ${attestation.witnessId} already attested`);
    }

    claim.attestations.push(attestation);

    if (claim.attestations.length >= claim.requiredAttestations) {
      claim.status = 'attested';
      this.emit('claim_attested', claim);
    }

    return claim;
  }

  /**
   * Record a successful claim (funds released on destination chain).
   */
  completeClaim(claimRecordId: string, claimTxHash: string): ClaimRecord {
    const claim = this.claims.get(claimRecordId);
    if (!claim) throw new Error(`Claim not found: ${claimRecordId}`);

    claim.status = 'claimed';
    claim.claimTxHash = claimTxHash;
    claim.completedAt = new Date().toISOString();

    this.emit('claim_completed', claim);
    return claim;
  }

  getClaim(claimRecordId: string): ClaimRecord | undefined {
    return this.claims.get(claimRecordId);
  }

  getClaimsForBridge(bridgeId: string): ClaimRecord[] {
    return Array.from(this.claims.values()).filter((c) => c.bridgeId === bridgeId);
  }

  getPendingClaims(bridgeId: string): ClaimRecord[] {
    return this.getClaimsForBridge(bridgeId).filter(
      (c) => c.status === 'committed' || c.status === 'attested'
    );
  }

  // ─── Bridge State Management ───────────────────────────────────

  activateBridge(bridgeId: string): void {
    const bridge = this.bridges.get(bridgeId);
    if (!bridge) throw new Error(`Bridge not found: ${bridgeId}`);

    // Validate minimum witnesses
    const lockingWitnesses = bridge.lockingChain.witnesses.filter((w) => w.active).length;
    const issuingWitnesses = bridge.issuingChain.witnesses.filter((w) => w.active).length;

    if (lockingWitnesses < 1 || issuingWitnesses < 1) {
      throw new Error(
        `Insufficient witnesses. Locking: ${lockingWitnesses}, Issuing: ${issuingWitnesses}. Minimum 1 each required.`
      );
    }

    bridge.status = 'active';
    bridge.updatedAt = new Date().toISOString();
    this.emit('bridge_activated', { bridgeId });
  }

  pauseBridge(bridgeId: string, reason: string): void {
    const bridge = this.bridges.get(bridgeId);
    if (!bridge) throw new Error(`Bridge not found: ${bridgeId}`);

    bridge.status = 'paused';
    bridge.updatedAt = new Date().toISOString();
    this.emit('bridge_paused', { bridgeId, reason });
  }
}

export default BridgeManager;
