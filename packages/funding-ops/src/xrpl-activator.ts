/**
 * @optkas/funding-ops — XRPL Trustline Activator
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Live testnet trustline activation for all OPTKAS token types.
 * Connects to XRPL testnet, verifies accounts, sets issuer flags,
 * and deploys trustlines across all 5 recipient accounts.
 *
 * Designed to run as a standalone script or via the FundingPipeline.
 */

import { XRPLClient, PreparedTransaction, AccountInfo } from '@optkas/xrpl-core';
import { TrustlineManager, TrustlineDeployment } from '@optkas/issuance';
import { EventEmitter } from 'events';

// ─── Types ───────────────────────────────────────────────────────

export interface XRPLActivationConfig {
  issuerAddress: string;
  accounts: {
    treasury: string;
    escrow: string;
    attestation: string;
    amm: string;
    trading: string;
  };
  tokens: Array<{
    code: string;
    limit: string;
  }>;
}

export interface AccountReadiness {
  address: string;
  role: string;
  exists: boolean;
  balance: string;
  sequence: number;
  hasDefaultRipple: boolean;
  reserveMet: boolean;
  trustlines: Array<{
    currency: string;
    issuer: string;
    balance: string;
    limit: string;
  }>;
}

export interface ActivationResult {
  accountReadiness: AccountReadiness[];
  issuerSettingsTx?: PreparedTransaction;
  trustlineTransactions: PreparedTransaction[];
  totalTransactions: number;
  allAccountsReady: boolean;
  allTrustlinesDeployed: boolean;
  summary: string;
}

// ─── XRPL Activator ─────────────────────────────────────────────

export class XRPLActivator extends EventEmitter {
  private client: XRPLClient;
  private trustlineManager: TrustlineManager;
  private config: XRPLActivationConfig;

  constructor(client: XRPLClient, config: XRPLActivationConfig) {
    super();
    this.client = client;
    this.trustlineManager = new TrustlineManager(client);
    this.config = config;
  }

  /**
   * Check the readiness of all XRPL accounts.
   * Verifies existence, balance, reserves, and existing trustlines.
   */
  async checkAccountReadiness(): Promise<AccountReadiness[]> {
    const results: AccountReadiness[] = [];

    const allAccounts = [
      { address: this.config.issuerAddress, role: 'issuer' },
      { address: this.config.accounts.treasury, role: 'treasury' },
      { address: this.config.accounts.escrow, role: 'escrow' },
      { address: this.config.accounts.attestation, role: 'attestation' },
      { address: this.config.accounts.amm, role: 'amm' },
      { address: this.config.accounts.trading, role: 'trading' },
    ];

    for (const acct of allAccounts) {
      try {
        const info = await this.client.getAccountInfo(acct.address);
        const trustlines = await this.client.getTrustlines(acct.address);
        const balance = parseFloat(info.balance);

        // Base reserve: 10 XRP + 2 XRP per owner count
        // Each trustline adds 1 to owner count
        const requiredReserve = 10 + (info.ownerCount + this.config.tokens.length) * 2;

        results.push({
          address: acct.address,
          role: acct.role,
          exists: true,
          balance: info.balance,
          sequence: info.sequence,
          hasDefaultRipple: acct.role === 'issuer' ? (info.flags & 0x00800000) !== 0 : false,
          reserveMet: balance >= requiredReserve,
          trustlines: trustlines.map(t => ({
            currency: t.currency,
            issuer: t.issuer,
            balance: t.balance,
            limit: t.limit,
          })),
        });
      } catch (err: any) {
        results.push({
          address: acct.address,
          role: acct.role,
          exists: false,
          balance: '0',
          sequence: 0,
          hasDefaultRipple: false,
          reserveMet: false,
          trustlines: [],
        });
      }
    }

    return results;
  }

  /**
   * Prepare the DefaultRipple AccountSet transaction for the issuer.
   * This MUST be set before any IOU issuance can work.
   */
  async prepareIssuerSettings(dryRun = true): Promise<PreparedTransaction> {
    const tx = {
      TransactionType: 'AccountSet' as const,
      Account: this.config.issuerAddress,
      SetFlag: 8, // asfDefaultRipple
    };

    return this.client.prepareTransaction(
      tx,
      'Set DefaultRipple on OPTKAS issuer account (required for IOU issuance)',
      dryRun
    );
  }

  /**
   * Prepare trustline deployment for all tokens across all recipient accounts.
   * Skips accounts that already have the trustline configured.
   */
  async prepareTrustlineDeployment(
    accountReadiness: AccountReadiness[],
    dryRun = true
  ): Promise<PreparedTransaction[]> {
    const allTxs: PreparedTransaction[] = [];

    const recipientAccounts = accountReadiness.filter(a => a.role !== 'issuer' && a.exists);

    for (const token of this.config.tokens) {
      for (const account of recipientAccounts) {
        // Check if trustline already exists
        const existing = account.trustlines.find(
          t => t.currency === token.code && t.issuer === this.config.issuerAddress
        );

        if (existing && parseFloat(existing.limit) > 0) {
          this.emit('trustline_skipped', {
            account: account.address,
            role: account.role,
            currency: token.code,
            reason: 'already_configured',
          });
          continue;
        }

        // Prepare TrustSet
        const tx = {
          TransactionType: 'TrustSet' as const,
          Account: account.address,
          LimitAmount: {
            currency: token.code,
            issuer: this.config.issuerAddress,
            value: token.limit,
          },
        };

        const prepared = await this.client.prepareTransaction(
          tx,
          `Create ${token.code} trustline: ${account.role} (${account.address}) → issuer (limit: ${token.limit})`,
          dryRun
        );

        allTxs.push(prepared);
        this.emit('trustline_prepared', {
          account: account.address,
          role: account.role,
          currency: token.code,
          limit: token.limit,
        });
      }
    }

    return allTxs;
  }

  /**
   * Verify that all expected trustlines are properly configured.
   */
  async verifyAllTrustlines(): Promise<{
    total: number;
    configured: number;
    missing: Array<{ account: string; role: string; currency: string }>;
  }> {
    const readiness = await this.checkAccountReadiness();
    const recipients = readiness.filter(a => a.role !== 'issuer' && a.exists);

    let total = 0;
    let configured = 0;
    const missing: Array<{ account: string; role: string; currency: string }> = [];

    for (const token of this.config.tokens) {
      for (const account of recipients) {
        total++;
        const hasTrustline = account.trustlines.some(
          t => t.currency === token.code && t.issuer === this.config.issuerAddress && parseFloat(t.limit) > 0
        );

        if (hasTrustline) {
          configured++;
        } else {
          missing.push({
            account: account.address,
            role: account.role,
            currency: token.code,
          });
        }
      }
    }

    return { total, configured, missing };
  }

  /**
   * Run the full XRPL activation sequence.
   * Returns all unsigned transactions ready for multisig signing.
   */
  async activate(dryRun = true): Promise<ActivationResult> {
    // 1. Check account readiness
    const accountReadiness = await this.checkAccountReadiness();
    const allAccountsReady = accountReadiness.every(a => a.exists && a.reserveMet);

    // 2. Prepare issuer settings if DefaultRipple not set
    let issuerSettingsTx: PreparedTransaction | undefined;
    const issuer = accountReadiness.find(a => a.role === 'issuer');
    if (issuer && !issuer.hasDefaultRipple) {
      issuerSettingsTx = await this.prepareIssuerSettings(dryRun);
    }

    // 3. Prepare trustline deployments
    const trustlineTransactions = await this.prepareTrustlineDeployment(accountReadiness, dryRun);

    // 4. Build result
    const totalTransactions = (issuerSettingsTx ? 1 : 0) + trustlineTransactions.length;

    const result: ActivationResult = {
      accountReadiness,
      issuerSettingsTx,
      trustlineTransactions,
      totalTransactions,
      allAccountsReady,
      allTrustlinesDeployed: trustlineTransactions.length === 0, // If 0, all already deployed
      summary: `XRPL Activation: ${accountReadiness.filter(a => a.exists).length}/6 accounts ready, ` +
        `${issuerSettingsTx ? '1 issuer setting + ' : ''}${trustlineTransactions.length} trustline txs prepared`,
    };

    this.emit('activation_complete', result);
    return result;
  }
}

export default XRPLActivator;
