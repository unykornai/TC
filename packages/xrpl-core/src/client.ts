/**
 * @optkas/xrpl-core — XRPL Client Abstraction
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Provides a safe, institutional-grade XRPL client wrapper.
 * All transactions are prepared unsigned and routed through multisig.
 * No private keys are handled in this module.
 */

import { Client, Wallet, Transaction, SubmittableTransaction, xrpToDrops, dropsToXrp } from 'xrpl';
import { EventEmitter } from 'events';
import { createLogger, Logger } from 'winston';

// ─── Types ───────────────────────────────────────────────────────────

export type NetworkType = 'testnet' | 'mainnet';

export interface XRPLClientConfig {
  network: NetworkType;
  urls: {
    testnet: string;
    mainnet: string;
  };
  timeout?: number;
  maxRetries?: number;
}

export interface PreparedTransaction {
  unsigned: Transaction;
  network: NetworkType;
  dryRun: boolean;
  metadata: {
    description: string;
    requiredSigners: number;
    estimatedFee: string;
    timestamp: string;
  };
}

export interface TransactionResult {
  success: boolean;
  txHash: string;
  ledgerIndex: number;
  fee: string;
  timestamp: string;
  network: NetworkType;
  raw: unknown;
}

export interface AccountInfo {
  address: string;
  balance: string;
  sequence: number;
  signerList?: SignerListInfo;
  flags: number;
  ownerCount: number;
}

export interface SignerListInfo {
  signerQuorum: number;
  signerEntries: Array<{
    account: string;
    signerWeight: number;
  }>;
}

export interface TrustlineInfo {
  currency: string;
  issuer: string;
  balance: string;
  limit: string;
}

// ─── Default Configuration ───────────────────────────────────────────

const DEFAULT_CONFIG: XRPLClientConfig = {
  network: 'testnet',
  urls: {
    testnet: 'wss://s.altnet.rippletest.net:51233',
    mainnet: 'wss://xrplcluster.com',
  },
  timeout: 30000,
  maxRetries: 3,
};

// ─── XRPL Client ────────────────────────────────────────────────────

export class XRPLClient extends EventEmitter {
  private client: Client | null = null;
  private config: XRPLClientConfig;
  private logger: Logger;
  private connected = false;

  constructor(config?: Partial<XRPLClientConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = createLogger({
      level: 'info',
      defaultMeta: { service: 'xrpl-core', network: this.config.network },
    });
  }

  // ─── Connection Management ──────────────────────────────────────

  get network(): NetworkType {
    return this.config.network;
  }

  get isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    const url = this.config.urls[this.config.network];
    this.client = new Client(url, { timeout: this.config.timeout });

    await this.client.connect();
    this.connected = true;
    this.logger.info(`Connected to XRPL ${this.config.network}: ${url}`);
    this.emit('connected', { network: this.config.network, url });
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.client) return;

    await this.client.disconnect();
    this.connected = false;
    this.client = null;
    this.logger.info('Disconnected from XRPL');
    this.emit('disconnected');
  }

  private ensureConnected(): Client {
    if (!this.connected || !this.client) {
      throw new Error('XRPL client not connected. Call connect() first.');
    }
    return this.client;
  }

  // ─── Account Queries ────────────────────────────────────────────

  async getAccountInfo(address: string): Promise<AccountInfo> {
    const client = this.ensureConnected();
    const response = await client.request({
      command: 'account_info',
      account: address,
      signer_lists: true,
    });

    const accountData = response.result.account_data;
    const signerLists = (response.result as any).account_data?.signer_lists;

    const info: AccountInfo = {
      address: accountData.Account,
      balance: dropsToXrp(accountData.Balance),
      sequence: accountData.Sequence,
      flags: accountData.Flags,
      ownerCount: accountData.OwnerCount,
    };

    if (signerLists && signerLists.length > 0) {
      info.signerList = {
        signerQuorum: signerLists[0].SignerQuorum,
        signerEntries: signerLists[0].SignerEntries.map((entry: any) => ({
          account: entry.SignerEntry.Account,
          signerWeight: entry.SignerEntry.SignerWeight,
        })),
      };
    }

    return info;
  }

  async getTrustlines(address: string): Promise<TrustlineInfo[]> {
    const client = this.ensureConnected();
    const response = await client.request({
      command: 'account_lines',
      account: address,
    });

    return response.result.lines.map((line: any) => ({
      currency: line.currency,
      issuer: line.account,
      balance: line.balance,
      limit: line.limit,
    }));
  }

  async getBalance(address: string): Promise<string> {
    const info = await this.getAccountInfo(address);
    return info.balance;
  }

  // ─── Transaction Preparation (UNSIGNED) ─────────────────────────

  /**
   * Prepare a transaction WITHOUT signing it.
   * The returned PreparedTransaction must be routed to signers for multisig approval.
   * This method NEVER signs or submits transactions.
   */
  async prepareTransaction(
    tx: Transaction,
    description: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const client = this.ensureConnected();

    // Auto-fill sequence, fee, lastLedgerSequence
    const prepared = await client.autofill(tx);

    const preparedTx: PreparedTransaction = {
      unsigned: prepared,
      network: this.config.network,
      dryRun,
      metadata: {
        description,
        requiredSigners: 2, // Default 2-of-3 multisig
        estimatedFee: prepared.Fee || '12',
        timestamp: new Date().toISOString(),
      },
    };

    this.logger.info(`Transaction prepared: ${description}`, {
      type: tx.TransactionType,
      account: tx.Account,
      dryRun,
    });

    this.emit('transaction_prepared', preparedTx);
    return preparedTx;
  }

  // ─── Transaction Submission (POST-SIGNING) ──────────────────────

  /**
   * Submit a SIGNED transaction blob.
   * This should only be called after multisig approval has been obtained.
   * The signed blob comes from the external signing process (HSM/KMS).
   */
  async submitSigned(signedBlob: string): Promise<TransactionResult> {
    const client = this.ensureConnected();

    const response = await client.request({
      command: 'submit',
      tx_blob: signedBlob,
    });

    const result: TransactionResult = {
      success: response.result.engine_result === 'tesSUCCESS',
      txHash: response.result.tx_json?.hash || '',
      ledgerIndex: response.result.tx_json?.ledger_index || 0,
      fee: response.result.tx_json?.Fee || '0',
      timestamp: new Date().toISOString(),
      network: this.config.network,
      raw: response.result,
    };

    this.logger.info(`Transaction submitted: ${result.txHash}`, {
      success: result.success,
      engineResult: response.result.engine_result,
    });

    this.emit('transaction_submitted', result);
    return result;
  }

  // ─── Ledger Queries ─────────────────────────────────────────────

  async getLedgerIndex(): Promise<number> {
    const client = this.ensureConnected();
    const response = await client.request({ command: 'ledger', ledger_index: 'validated' });
    return response.result.ledger_index;
  }

  async getTransaction(txHash: string): Promise<unknown> {
    const client = this.ensureConnected();
    const response = await client.request({
      command: 'tx',
      transaction: txHash,
    });
    return response.result;
  }

  async getEscrows(address: string): Promise<unknown[]> {
    const client = this.ensureConnected();
    const response = await client.request({
      command: 'account_objects',
      account: address,
      type: 'escrow',
    });
    return response.result.account_objects;
  }

  // ─── Utility ────────────────────────────────────────────────────

  static xrpToDrops(xrp: string | number): string {
    return xrpToDrops(xrp);
  }

  static dropsToXrp(drops: string | number): string {
    return dropsToXrp(drops);
  }

  static hexEncode(str: string): string {
    return Buffer.from(str, 'utf8').toString('hex').toUpperCase();
  }

  static hexDecode(hex: string): string {
    return Buffer.from(hex, 'hex').toString('utf8');
  }

  /**
   * Convert ISO date to Ripple epoch time.
   * Ripple epoch is seconds since 2000-01-01T00:00:00Z.
   */
  static isoToRippleTime(isoDate: string): number {
    const RIPPLE_EPOCH = 946684800; // 2000-01-01T00:00:00Z in Unix epoch
    return Math.floor(new Date(isoDate).getTime() / 1000) - RIPPLE_EPOCH;
  }

  static rippleTimeToIso(rippleTime: number): string {
    const RIPPLE_EPOCH = 946684800;
    return new Date((rippleTime + RIPPLE_EPOCH) * 1000).toISOString();
  }
}

export default XRPLClient;
