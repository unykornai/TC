/**
 * @optkas/stellar-core — Stellar Client Abstraction
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Provides a safe, institutional-grade Stellar client wrapper.
 * All transactions are prepared unsigned and routed through multisig.
 * No private keys are handled in this module.
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import { EventEmitter } from 'events';
import { createLogger, Logger } from 'winston';

// ─── Types ───────────────────────────────────────────────────────────

export type StellarNetworkType = 'testnet' | 'mainnet';

export interface StellarClientConfig {
  network: StellarNetworkType;
  urls: {
    testnet: string;
    mainnet: string;
  };
  passphrases: {
    testnet: string;
    mainnet: string;
  };
  timeout?: number;
}

export interface StellarPreparedTransaction {
  xdr: string; // Unsigned transaction XDR
  network: StellarNetworkType;
  dryRun: boolean;
  metadata: {
    description: string;
    requiredSigners: number;
    estimatedFee: string;
    timestamp: string;
    sourceAccount: string;
  };
}

export interface StellarTransactionResult {
  success: boolean;
  txHash: string;
  ledgerSequence: number;
  fee: string;
  timestamp: string;
  network: StellarNetworkType;
  raw: unknown;
}

export interface StellarAccountInfo {
  accountId: string;
  sequence: string;
  balances: StellarBalance[];
  signers: StellarSigner[];
  thresholds: {
    low: number;
    medium: number;
    high: number;
  };
  flags: {
    authRequired: boolean;
    authRevocable: boolean;
    authClawbackEnabled: boolean;
  };
  homeDomain?: string;
}

export interface StellarBalance {
  assetType: string;
  assetCode?: string;
  assetIssuer?: string;
  balance: string;
  limit?: string;
  isAuthorized?: boolean;
}

export interface StellarSigner {
  key: string;
  weight: number;
  type: string;
}

// ─── Default Configuration ───────────────────────────────────────────

const DEFAULT_CONFIG: StellarClientConfig = {
  network: 'testnet',
  urls: {
    testnet: 'https://horizon-testnet.stellar.org',
    mainnet: 'https://horizon.stellar.org',
  },
  passphrases: {
    testnet: 'Test SDF Network ; September 2015',
    mainnet: 'Public Global Stellar Network ; September 2015',
  },
  timeout: 30000,
};

// ─── Stellar Client ──────────────────────────────────────────────────

export class StellarClient extends EventEmitter {
  private server: StellarSdk.Horizon.Server;
  private config: StellarClientConfig;
  private logger: Logger;

  constructor(config?: Partial<StellarClientConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    const url = this.config.urls[this.config.network];
    this.server = new StellarSdk.Horizon.Server(url);
    this.logger = createLogger({
      level: 'info',
      defaultMeta: { service: 'stellar-core', network: this.config.network },
    });
  }

  // ─── Properties ─────────────────────────────────────────────────

  get network(): StellarNetworkType {
    return this.config.network;
  }

  get networkPassphrase(): string {
    return this.config.passphrases[this.config.network];
  }

  // ─── Account Queries ────────────────────────────────────────────

  async getAccountInfo(accountId: string): Promise<StellarAccountInfo> {
    const account = await this.server.loadAccount(accountId);

    return {
      accountId: account.accountId(),
      sequence: account.sequenceNumber(),
      balances: account.balances.map((b: any) => ({
        assetType: b.asset_type,
        assetCode: b.asset_code,
        assetIssuer: b.asset_issuer,
        balance: b.balance,
        limit: b.limit,
        isAuthorized: b.is_authorized,
      })),
      signers: account.signers.map((s: any) => ({
        key: s.key,
        weight: s.weight,
        type: s.type,
      })),
      thresholds: {
        low: account.thresholds.low_threshold,
        medium: account.thresholds.med_threshold,
        high: account.thresholds.high_threshold,
      },
      flags: {
        authRequired: account.flags.auth_required,
        authRevocable: account.flags.auth_revocable,
        authClawbackEnabled: (account.flags as any).auth_clawback_enabled || false,
      },
      homeDomain: account.home_domain,
    };
  }

  async getBalance(accountId: string, assetCode?: string, assetIssuer?: string): Promise<string> {
    const info = await this.getAccountInfo(accountId);

    if (!assetCode) {
      // Return native XLM balance
      const native = info.balances.find((b) => b.assetType === 'native');
      return native?.balance || '0';
    }

    const asset = info.balances.find(
      (b) => b.assetCode === assetCode && b.assetIssuer === assetIssuer
    );
    return asset?.balance || '0';
  }

  // ─── Transaction Preparation (UNSIGNED) ─────────────────────────

  /**
   * Build an unsigned transaction.
   * Returns XDR that must be routed to signers for multisig approval.
   * This method NEVER signs or submits transactions.
   */
  async prepareTransaction(
    sourceAccountId: string,
    operations: StellarSdk.xdr.Operation[],
    description: string,
    dryRun = true
  ): Promise<StellarPreparedTransaction> {
    const sourceAccount = await this.server.loadAccount(sourceAccountId);
    const fee = await this.server.fetchBaseFee();

    const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: fee.toString(),
      networkPassphrase: this.networkPassphrase,
    });

    for (const op of operations) {
      txBuilder.addOperation(op);
    }

    const tx = txBuilder.setTimeout(300).build();

    const prepared: StellarPreparedTransaction = {
      xdr: tx.toXDR(),
      network: this.config.network,
      dryRun,
      metadata: {
        description,
        requiredSigners: 2, // Default 2-of-3
        estimatedFee: fee.toString(),
        timestamp: new Date().toISOString(),
        sourceAccount: sourceAccountId,
      },
    };

    this.logger.info(`Transaction prepared: ${description}`, {
      sourceAccount: sourceAccountId,
      operationCount: operations.length,
      dryRun,
    });

    this.emit('transaction_prepared', prepared);
    return prepared;
  }

  // ─── Transaction Submission (POST-SIGNING) ──────────────────────

  /**
   * Submit a SIGNED transaction XDR.
   * Only call after multisig approval obtained externally.
   */
  async submitSigned(signedXdr: string): Promise<StellarTransactionResult> {
    const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);

    const response = await this.server.submitTransaction(
      tx as StellarSdk.Transaction
    );

    const result: StellarTransactionResult = {
      success: true,
      txHash: (response as any).hash,
      ledgerSequence: (response as any).ledger,
      fee: (response as any).fee_charged || '0',
      timestamp: new Date().toISOString(),
      network: this.config.network,
      raw: response,
    };

    this.logger.info(`Transaction submitted: ${result.txHash}`, {
      success: result.success,
      ledger: result.ledgerSequence,
    });

    this.emit('transaction_submitted', result);
    return result;
  }

  // ─── Asset Helpers ──────────────────────────────────────────────

  static createAsset(code: string, issuer: string): StellarSdk.Asset {
    return new StellarSdk.Asset(code, issuer);
  }

  static nativeAsset(): StellarSdk.Asset {
    return StellarSdk.Asset.native();
  }

  // ─── Operation Builders ─────────────────────────────────────────

  /**
   * Build a payment operation (unsigned).
   */
  static buildPaymentOp(
    destination: string,
    asset: StellarSdk.Asset,
    amount: string
  ): StellarSdk.xdr.Operation {
    return StellarSdk.Operation.payment({ destination, asset, amount });
  }

  /**
   * Build a change trust operation (unsigned).
   */
  static buildChangeTrustOp(
    asset: StellarSdk.Asset,
    limit?: string
  ): StellarSdk.xdr.Operation {
    return StellarSdk.Operation.changeTrust({ asset, limit });
  }

  /**
   * Build a set options operation for authorization flags (unsigned).
   */
  static buildSetFlagsOp(flags: {
    setFlags?: number;
    clearFlags?: number;
    homeDomain?: string;
    lowThreshold?: number;
    medThreshold?: number;
    highThreshold?: number;
  }): StellarSdk.xdr.Operation {
    return StellarSdk.Operation.setOptions(flags as any);
  }

  /**
   * Build a manage data operation for attestation (unsigned).
   */
  static buildManageDataOp(name: string, value: Buffer | null): StellarSdk.xdr.Operation {
    return StellarSdk.Operation.manageData({ name, value });
  }

  /**
   * Build a set trust line flags operation (unsigned).
   * Used for authorizing/revoking holders of regulated assets.
   */
  static buildSetTrustLineFlagsOp(
    trustor: string,
    asset: StellarSdk.Asset,
    flags: { authorized?: boolean; authorizedToMaintainLiabilities?: boolean; clawbackEnabled?: boolean }
  ): StellarSdk.xdr.Operation {
    const setFlags: number[] = [];
    const clearFlags: number[] = [];

    if (flags.authorized === true) setFlags.push(StellarSdk.AuthRequiredFlag);
    if (flags.authorized === false) clearFlags.push(StellarSdk.AuthRequiredFlag);

    return StellarSdk.Operation.setTrustLineFlags({
      trustor,
      asset,
      flags: {
        authorized: flags.authorized,
        authorizedToMaintainLiabilities: flags.authorizedToMaintainLiabilities,
        clawbackEnabled: flags.clawbackEnabled,
      },
    });
  }

  /**
   * Build a clawback operation (unsigned).
   */
  static buildClawbackOp(
    asset: StellarSdk.Asset,
    from: string,
    amount: string
  ): StellarSdk.xdr.Operation {
    return StellarSdk.Operation.clawback({ asset, from, amount });
  }
}

export default StellarClient;
