/**
 * @optkas/funding-ops — Stellar Regulated Asset Activator
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Configures Stellar issuer account for regulated asset issuance:
 * - Sets authorization flags (auth_required, auth_revocable, clawback_enabled)
 * - Creates OPTKAS-USD asset trustlines from distribution and anchor accounts
 * - Authorizes accounts to hold regulated assets
 * - Issues initial asset distribution
 *
 * All transactions prepared UNSIGNED — routed to multisig.
 */

import {
  StellarClient,
  StellarPreparedTransaction,
  StellarAccountInfo,
} from '@optkas/stellar-core';
import { EventEmitter } from 'events';

// ─── Types ───────────────────────────────────────────────────────

export interface StellarActivationConfig {
  issuerAddress: string;
  distributionAddress: string;
  anchorAddress: string;
  assets: Array<{
    code: string;
    limit: string;
    regulated: boolean;
  }>;
}

export interface StellarAccountReadiness {
  address: string;
  role: string;
  exists: boolean;
  xlmBalance: string;
  signerCount: number;
  flags: {
    authRequired: boolean;
    authRevocable: boolean;
    authClawbackEnabled: boolean;
  };
  existingTrustlines: Array<{
    assetCode: string;
    assetIssuer: string;
    balance: string;
    limit: string;
    authorized: boolean;
  }>;
}

export interface StellarActivationResult {
  accountReadiness: StellarAccountReadiness[];
  issuerFlagsTx?: StellarPreparedTransaction;
  trustlineTransactions: StellarPreparedTransaction[];
  authorizationTransactions: StellarPreparedTransaction[];
  totalTransactions: number;
  allAccountsReady: boolean;
  regulatedAssetConfigured: boolean;
  summary: string;
}

// ─── Stellar Activator ──────────────────────────────────────────

export class StellarActivator extends EventEmitter {
  private client: StellarClient;
  private config: StellarActivationConfig;

  constructor(client: StellarClient, config: StellarActivationConfig) {
    super();
    this.client = client;
    this.config = config;
  }

  /**
   * Check readiness of all Stellar accounts.
   */
  async checkAccountReadiness(): Promise<StellarAccountReadiness[]> {
    const results: StellarAccountReadiness[] = [];

    const accounts = [
      { address: this.config.issuerAddress, role: 'issuer' },
      { address: this.config.distributionAddress, role: 'distribution' },
      { address: this.config.anchorAddress, role: 'anchor' },
    ];

    for (const acct of accounts) {
      try {
        const info = await this.client.getAccountInfo(acct.address);
        const xlmBalance = info.balances.find(b => b.assetType === 'native')?.balance || '0';

        results.push({
          address: acct.address,
          role: acct.role,
          exists: true,
          xlmBalance,
          signerCount: info.signers.length,
          flags: {
            authRequired: info.flags.authRequired,
            authRevocable: info.flags.authRevocable,
            authClawbackEnabled: info.flags.authClawbackEnabled,
          },
          existingTrustlines: info.balances
            .filter(b => b.assetType !== 'native' && b.assetCode)
            .map(b => ({
              assetCode: b.assetCode!,
              assetIssuer: b.assetIssuer!,
              balance: b.balance,
              limit: b.limit || '0',
              authorized: b.isAuthorized || false,
            })),
        });
      } catch (err: any) {
        results.push({
          address: acct.address,
          role: acct.role,
          exists: false,
          xlmBalance: '0',
          signerCount: 0,
          flags: {
            authRequired: false,
            authRevocable: false,
            authClawbackEnabled: false,
          },
          existingTrustlines: [],
        });
      }
    }

    return results;
  }

  /**
   * Prepare issuer flag settings for regulated asset issuance.
   *
   * IMPORTANT: clawback_enabled can ONLY be set on accounts with NO existing trustlines.
   * Once set, it CANNOT be removed. This is by design for regulated assets.
   *
   * Flags:
   *   - AuthRequiredFlag (0x1)  = 1
   *   - AuthRevocableFlag (0x2) = 2
   *   - AuthClawbackEnabledFlag (0x8) = 8
   */
  async prepareIssuerFlags(
    currentFlags: { authRequired: boolean; authRevocable: boolean; authClawbackEnabled: boolean },
    dryRun = true
  ): Promise<StellarPreparedTransaction | null> {
    // Calculate which flags need to be set
    let flagsToSet = 0;
    if (!currentFlags.authRequired) flagsToSet |= 1;
    if (!currentFlags.authRevocable) flagsToSet |= 2;
    if (!currentFlags.authClawbackEnabled) flagsToSet |= 8;

    if (flagsToSet === 0) {
      this.emit('issuer_flags_already_set', { message: 'All required issuer flags already set' });
      return null;
    }

    return this.client.prepareTransaction(
      this.config.issuerAddress,
      [
        StellarClient.buildSetFlagsOp({
          setFlags: flagsToSet,
        }),
      ],
      `Set Stellar issuer flags: ${[
        !currentFlags.authRequired ? 'auth_required' : '',
        !currentFlags.authRevocable ? 'auth_revocable' : '',
        !currentFlags.authClawbackEnabled ? 'clawback_enabled' : '',
      ].filter(Boolean).join(' + ')}`,
      dryRun
    );
  }

  /**
   * Prepare trustline creation for distribution and anchor accounts.
   * Skips trustlines that already exist.
   */
  async prepareTrustlines(
    accountReadiness: StellarAccountReadiness[],
    dryRun = true
  ): Promise<StellarPreparedTransaction[]> {
    const txs: StellarPreparedTransaction[] = [];

    const holders = accountReadiness.filter(a => a.role !== 'issuer' && a.exists);

    for (const asset of this.config.assets) {
      const stellarAsset = StellarClient.createAsset(asset.code, this.config.issuerAddress);

      for (const holder of holders) {
        // Check if trustline already exists
        const existing = holder.existingTrustlines.find(
          t => t.assetCode === asset.code && t.assetIssuer === this.config.issuerAddress
        );

        if (existing) {
          this.emit('trustline_skipped', {
            account: holder.address,
            role: holder.role,
            asset: asset.code,
            reason: 'already_exists',
          });
          continue;
        }

        const tx = await this.client.prepareTransaction(
          holder.address,
          [StellarClient.buildChangeTrustOp(stellarAsset, asset.limit)],
          `ChangeTrust: ${holder.role} → ${asset.code} (limit: ${asset.limit})`,
          dryRun
        );

        txs.push(tx);
        this.emit('trustline_prepared', {
          account: holder.address,
          role: holder.role,
          asset: asset.code,
          limit: asset.limit,
        });
      }
    }

    return txs;
  }

  /**
   * Prepare authorization for regulated asset holders.
   * Issuer must explicitly authorize each account to hold the asset.
   */
  async prepareAuthorizations(
    accountReadiness: StellarAccountReadiness[],
    dryRun = true
  ): Promise<StellarPreparedTransaction[]> {
    const txs: StellarPreparedTransaction[] = [];

    const holders = accountReadiness.filter(a => a.role !== 'issuer' && a.exists);

    for (const asset of this.config.assets) {
      if (!asset.regulated) continue;

      const stellarAsset = StellarClient.createAsset(asset.code, this.config.issuerAddress);

      for (const holder of holders) {
        // Check if already authorized
        const existing = holder.existingTrustlines.find(
          t => t.assetCode === asset.code && t.assetIssuer === this.config.issuerAddress
        );

        if (existing?.authorized) {
          this.emit('authorization_skipped', {
            account: holder.address,
            role: holder.role,
            asset: asset.code,
            reason: 'already_authorized',
          });
          continue;
        }

        const tx = await this.client.prepareTransaction(
          this.config.issuerAddress,
          [
            StellarClient.buildSetTrustLineFlagsOp(
              holder.address,
              stellarAsset,
              { authorized: true }
            ),
          ],
          `Authorize ${holder.role} for ${asset.code}`,
          dryRun
        );

        txs.push(tx);
        this.emit('authorization_prepared', {
          account: holder.address,
          role: holder.role,
          asset: asset.code,
        });
      }
    }

    return txs;
  }

  /**
   * Prepare initial asset issuance from issuer to distribution account.
   * This mints the first batch of regulated assets.
   */
  async prepareInitialIssuance(
    assetCode: string,
    amount: string,
    dryRun = true
  ): Promise<StellarPreparedTransaction> {
    const asset = StellarClient.createAsset(assetCode, this.config.issuerAddress);

    return this.client.prepareTransaction(
      this.config.issuerAddress,
      [
        StellarClient.buildPaymentOp(
          this.config.distributionAddress,
          asset,
          amount
        ),
      ],
      `Issue ${amount} ${assetCode} from issuer → distribution`,
      dryRun
    );
  }

  /**
   * Run the full Stellar activation sequence.
   */
  async activate(dryRun = true): Promise<StellarActivationResult> {
    // 1. Check account readiness
    const accountReadiness = await this.checkAccountReadiness();
    const allAccountsReady = accountReadiness.every(a => a.exists);

    // 2. Prepare issuer flags
    const issuer = accountReadiness.find(a => a.role === 'issuer');
    let issuerFlagsTx: StellarPreparedTransaction | undefined;
    if (issuer && issuer.exists) {
      const flagsTx = await this.prepareIssuerFlags(issuer.flags, dryRun);
      if (flagsTx) issuerFlagsTx = flagsTx;
    }

    // 3. Prepare trustlines
    const trustlineTransactions = await this.prepareTrustlines(accountReadiness, dryRun);

    // 4. Prepare authorizations
    const authorizationTransactions = await this.prepareAuthorizations(accountReadiness, dryRun);

    // 5. Build result
    const totalTransactions =
      (issuerFlagsTx ? 1 : 0) + trustlineTransactions.length + authorizationTransactions.length;

    const regulatedAssetConfigured =
      issuer?.flags.authRequired === true &&
      issuer?.flags.authRevocable === true &&
      issuer?.flags.authClawbackEnabled === true;

    const result: StellarActivationResult = {
      accountReadiness,
      issuerFlagsTx,
      trustlineTransactions,
      authorizationTransactions,
      totalTransactions,
      allAccountsReady,
      regulatedAssetConfigured: regulatedAssetConfigured || !!issuerFlagsTx,
      summary: `Stellar Activation: ${accountReadiness.filter(a => a.exists).length}/3 accounts ready, ` +
        `${issuerFlagsTx ? '1 issuer flags + ' : ''}` +
        `${trustlineTransactions.length} trustlines + ${authorizationTransactions.length} authorizations`,
    };

    this.emit('activation_complete', result);
    return result;
  }
}

export default StellarActivator;
