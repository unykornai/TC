/**
 * @optkas/ledger — XRPL Ledger Bootstrap & Account Topology
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Defines the COMPLETE XRPL account topology for the OPTKAS platform.
 * Every account, trustline, flag, and signer configuration is declared here.
 * This is the on-ledger blueprint — what the live system looks like.
 *
 * ─── HOW TO USE ──────────────────────────────────────────────────
 * 1. Run `bootstrap.fundTestnetAccounts()` to create funded testnet accounts
 * 2. Run `bootstrap.configureIssuerFlags()` to set account flags
 * 3. Run `bootstrap.deployTrustlines()` to wire all trustlines
 * 4. Run `bootstrap.configureMultisig()` to set signer lists
 * 5. Run `bootstrap.verifyTopology()` to validate everything
 *
 * In production, replace PLACEHOLDER addresses with HSM-generated keys.
 */

import { XRPLClient, PreparedTransaction } from '@optkas/xrpl-core';
import { EventEmitter } from 'events';

// ─── Account Topology ─────────────────────────────────────────────────

/**
 * Every XRPL account in the OPTKAS ecosystem.
 * PLACEHOLDER addresses are testnet-format — replace before mainnet.
 */
export interface AccountDefinition {
  name: string;
  role: string;
  purpose: string;
  address: string | null;
  secret?: string; // TESTNET ONLY — never stored for mainnet
  flags: AccountFlags;
  signerList?: SignerListConfig;
  trustlines: TrustlineDefinition[];
  reserveXrp: number; // Minimum XRP reserve needed
}

export interface AccountFlags {
  defaultRipple?: boolean;      // asfDefaultRipple (8) — required for issuers
  requireAuth?: boolean;        // asfRequireAuth (2)
  requireDestTag?: boolean;     // asfRequireDest (1)
  disableMaster?: boolean;      // asfDisableMaster (4) — production only
  noFreeze?: boolean;           // asfNoFreeze (6) — DO NOT SET for compliance
  globalFreeze?: boolean;       // asfGlobalFreeze (7) — emergency only
  allowTrustLineClawback?: boolean; // asfAllowTrustLineClawback (16)
  depositAuth?: boolean;        // asfDepositAuth (9)
  allowXrpPayment?: boolean;    // enable direct XRP payments
}

export interface SignerListConfig {
  quorum: number;
  entries: Array<{
    role: string;
    address: string | null;
    weight: number;
  }>;
}

export interface TrustlineDefinition {
  currency: string;
  issuerAccount: string; // reference to account name in topology
  limit: string;
  qualityIn?: number;
  qualityOut?: number;
  freeze?: boolean;
  noRipple?: boolean;
}

export interface LedgerTopology {
  network: 'testnet' | 'mainnet';
  accounts: Map<string, AccountDefinition>;
  trustlines: TrustlineWiring[];
  stablecoins: StablecoinDefinition[];
  ammPools: AMMPoolDefinition[];
}

export interface TrustlineWiring {
  from: string;      // account name
  to: string;        // account name (issuer)
  currency: string;
  limit: string;
  purpose: string;
}

export interface StablecoinDefinition {
  code: string;
  name: string;
  issuer: string; // external gateway address
  type: 'fiat_backed' | 'algorithmic' | 'crypto_backed';
  pegCurrency: string;
  decimalPrecision: number;
  trustlineLimit: string;
}

export interface AMMPoolDefinition {
  name: string;
  asset1: { currency: string; issuer?: string };
  asset2: { currency: string; issuer?: string };
  initialFee: number; // basis points
  purpose: string;
}

// ─── Account Flag Constants ───────────────────────────────────────────

export const XRPL_FLAGS = {
  asfRequireDest: 1,
  asfRequireAuth: 2,
  asfDisallowXRP: 3,
  asfDisableMaster: 4,
  asfAccountTxnID: 5,
  asfNoFreeze: 6,
  asfGlobalFreeze: 7,
  asfDefaultRipple: 8,
  asfDepositAuth: 9,
  asfAllowTrustLineClawback: 16,
} as const;

export const TRUSTSET_FLAGS = {
  tfSetfAuth: 0x00010000,
  tfSetNoRipple: 0x00020000,
  tfClearNoRipple: 0x00040000,
  tfSetFreeze: 0x00100000,
  tfClearFreeze: 0x00200000,
} as const;

export const OFFER_FLAGS = {
  tfPassive: 0x00010000,
  tfImmediateOrCancel: 0x00020000,
  tfFillOrKill: 0x00040000,
  tfSell: 0x00080000,
} as const;

// ─── Default Topology Builder ─────────────────────────────────────────

export function buildDefaultTopology(network: 'testnet' | 'mainnet' = 'testnet'): LedgerTopology {
  const accounts = new Map<string, AccountDefinition>();

  // ─── 1. ISSUER ACCOUNT ────────────────────────────────────────
  // The master issuer for all OPTKAS IOUs (BOND, ESCROW, stablecoins)
  accounts.set('issuer', {
    name: 'issuer',
    role: 'Master IOU Issuer',
    purpose: 'Issues all OPTKAS claim receipts, settlement tokens, and gateway IOUs. DefaultRipple ON. Clawback OFF (account-level — uses freeze+burn-back for recovery).',
    address: null, // PLACEHOLDER — replace with funded account
    flags: {
      defaultRipple: true,    // REQUIRED — allows issued IOUs to ripple through order book
      requireAuth: false,     // Open trustlines (KYC enforced off-chain)
      disableMaster: false,   // true in production after signer list set
      noFreeze: false,        // MUST remain false — compliance requires freeze capability
      allowTrustLineClawback: false, // Account-level: OFF. Recovery via freeze+burn-back.
      depositAuth: false,
    },
    signerList: {
      quorum: 2,
      entries: [
        { role: 'treasury', address: null, weight: 1 },
        { role: 'compliance', address: null, weight: 1 },
        { role: 'trustee', address: null, weight: 1 },
      ],
    },
    trustlines: [], // Issuers don't need trustlines — they issue
    reserveXrp: 50, // Base reserve + owner count buffer
  });

  // ─── 2. TREASURY ACCOUNT ──────────────────────────────────────
  // Operational treasury — holds XRP, receives IOUs, funds escrows
  accounts.set('treasury', {
    name: 'treasury',
    role: 'Platform Treasury',
    purpose: 'Operational treasury for XRP reserves, escrow funding, and IOU distribution. Destination tag required for incoming payments.',
    address: null,
    flags: {
      requireDestTag: true,
      depositAuth: false,
    },
    signerList: {
      quorum: 2,
      entries: [
        { role: 'treasury', address: null, weight: 1 },
        { role: 'compliance', address: null, weight: 1 },
        { role: 'trustee', address: null, weight: 1 },
      ],
    },
    trustlines: [
      { currency: 'BOND', issuerAccount: 'issuer', limit: '100000000', noRipple: true },
      { currency: 'ESCROW', issuerAccount: 'issuer', limit: '500000000', noRipple: true },
      { currency: 'USD', issuerAccount: 'gateway_bitstamp', limit: '50000000' },
      { currency: 'USD', issuerAccount: 'gateway_gatehub', limit: '50000000' },
      { currency: 'USDT', issuerAccount: 'gateway_tether', limit: '50000000' },
      { currency: 'USDC', issuerAccount: 'gateway_circle', limit: '50000000' },
    ],
    reserveXrp: 100,
  });

  // ─── 3. ESCROW ACCOUNT ────────────────────────────────────────
  // Creates and manages conditional XRPL escrows
  accounts.set('escrow', {
    name: 'escrow',
    role: 'Escrow Operations',
    purpose: 'Creates conditional escrows as on-chain evidence of settlement intent. Escrow ≠ custody. All funds are XRP drops held in XRPL escrow objects.',
    address: null,
    flags: {
      requireDestTag: true,
      depositAuth: false,
    },
    signerList: {
      quorum: 2,
      entries: [
        { role: 'treasury', address: null, weight: 1 },
        { role: 'compliance', address: null, weight: 1 },
        { role: 'trustee', address: null, weight: 1 },
      ],
    },
    trustlines: [
      { currency: 'ESCROW', issuerAccount: 'issuer', limit: '500000000', noRipple: true },
    ],
    reserveXrp: 200, // High reserve — each escrow object adds to owner count
  });

  // ─── 4. ATTESTATION ACCOUNT ───────────────────────────────────
  // Anchors document hashes via 1-drop XRP self-payments with memos
  accounts.set('attestation', {
    name: 'attestation',
    role: 'Document Attestation',
    purpose: 'Anchors SHA-256 hashes of legal documents, audit reports, and governance actions to XRPL via memo-bearing 1-drop self-payments.',
    address: null,
    flags: {
      depositAuth: true, // Only self-payments — no external deposits
    },
    trustlines: [], // No trustlines needed — uses XRP only
    reserveXrp: 50,
  });

  // ─── 5. TRADING ACCOUNT ───────────────────────────────────────
  // Places DEX offers (OfferCreate) for all trading strategies
  accounts.set('trading', {
    name: 'trading',
    role: 'DEX Trading',
    purpose: 'Executes DEX offers (limit, market, TWAP, VWAP) on XRPL order book. All offers require multisig. Circuit breaker enforced.',
    address: null,
    flags: {
      requireDestTag: true,
      depositAuth: false,
    },
    signerList: {
      quorum: 2,
      entries: [
        { role: 'treasury', address: null, weight: 1 },
        { role: 'compliance', address: null, weight: 1 },
        { role: 'trustee', address: null, weight: 1 },
      ],
    },
    trustlines: [
      { currency: 'BOND', issuerAccount: 'issuer', limit: '100000000' },
      { currency: 'ESCROW', issuerAccount: 'issuer', limit: '500000000' },
      { currency: 'USD', issuerAccount: 'gateway_bitstamp', limit: '50000000' },
      { currency: 'USD', issuerAccount: 'gateway_gatehub', limit: '50000000' },
      { currency: 'USDT', issuerAccount: 'gateway_tether', limit: '50000000' },
      { currency: 'USDC', issuerAccount: 'gateway_circle', limit: '50000000' },
    ],
    reserveXrp: 200, // Open offers add to owner count
  });

  // ─── 6. AMM LIQUIDITY ACCOUNT ─────────────────────────────────
  // Provisions and manages AMM pool liquidity
  accounts.set('amm_liquidity', {
    name: 'amm_liquidity',
    role: 'AMM Liquidity Provider',
    purpose: 'Deposits and manages liquidity in XRPL AMM pools. LP tokens held here. Fee voting and auction slot management.',
    address: null,
    flags: {
      depositAuth: false,
    },
    signerList: {
      quorum: 2,
      entries: [
        { role: 'treasury', address: null, weight: 1 },
        { role: 'compliance', address: null, weight: 1 },
        { role: 'trustee', address: null, weight: 1 },
      ],
    },
    trustlines: [
      { currency: 'BOND', issuerAccount: 'issuer', limit: '100000000' },
      { currency: 'USD', issuerAccount: 'gateway_bitstamp', limit: '50000000' },
      { currency: 'USDT', issuerAccount: 'gateway_tether', limit: '50000000' },
      { currency: 'USDC', issuerAccount: 'gateway_circle', limit: '50000000' },
    ],
    reserveXrp: 500, // AMM requires significant reserves
  });

  // ─── 7. DISTRIBUTION ACCOUNT ──────────────────────────────────
  // Distributes IOUs to bond participants after issuance
  accounts.set('distribution', {
    name: 'distribution',
    role: 'IOU Distribution',
    purpose: 'Receives newly minted IOUs from issuer and distributes to verified bond participants. Coupon payment intermediary.',
    address: null,
    flags: {
      requireDestTag: true,
    },
    signerList: {
      quorum: 2,
      entries: [
        { role: 'treasury', address: null, weight: 1 },
        { role: 'compliance', address: null, weight: 1 },
        { role: 'trustee', address: null, weight: 1 },
      ],
    },
    trustlines: [
      { currency: 'BOND', issuerAccount: 'issuer', limit: '100000000', noRipple: true },
      { currency: 'ESCROW', issuerAccount: 'issuer', limit: '500000000', noRipple: true },
      { currency: 'USD', issuerAccount: 'gateway_bitstamp', limit: '50000000' },
      { currency: 'USDC', issuerAccount: 'gateway_circle', limit: '50000000' },
    ],
    reserveXrp: 50,
  });

  // ─── 8. COUPON ACCOUNT ────────────────────────────────────────
  // Handles periodic coupon (interest) payments to bond holders
  accounts.set('coupon', {
    name: 'coupon',
    role: 'Coupon Payment Agent',
    purpose: 'Executes periodic coupon payments to bond holders in stablecoins. Funded by treasury per coupon schedule.',
    address: null,
    flags: {
      requireDestTag: true,
    },
    signerList: {
      quorum: 2,
      entries: [
        { role: 'treasury', address: null, weight: 1 },
        { role: 'compliance', address: null, weight: 1 },
        { role: 'trustee', address: null, weight: 1 },
      ],
    },
    trustlines: [
      { currency: 'USD', issuerAccount: 'gateway_bitstamp', limit: '10000000' },
      { currency: 'USDC', issuerAccount: 'gateway_circle', limit: '10000000' },
      { currency: 'USDT', issuerAccount: 'gateway_tether', limit: '10000000' },
    ],
    reserveXrp: 30,
  });

  // ─── 9. SETTLEMENT ACCOUNT ────────────────────────────────────
  // Atomic DVP (Delivery vs Payment) settlement
  accounts.set('settlement', {
    name: 'settlement',
    role: 'Settlement & Clearing',
    purpose: 'Executes atomic DVP settlement — simultaneous IOU delivery and stablecoin payment. Cross-currency path payments.',
    address: null,
    flags: {
      requireDestTag: true,
    },
    signerList: {
      quorum: 2,
      entries: [
        { role: 'treasury', address: null, weight: 1 },
        { role: 'compliance', address: null, weight: 1 },
        { role: 'trustee', address: null, weight: 1 },
      ],
    },
    trustlines: [
      { currency: 'BOND', issuerAccount: 'issuer', limit: '100000000' },
      { currency: 'ESCROW', issuerAccount: 'issuer', limit: '500000000' },
      { currency: 'USD', issuerAccount: 'gateway_bitstamp', limit: '100000000' },
      { currency: 'USD', issuerAccount: 'gateway_gatehub', limit: '100000000' },
      { currency: 'USDT', issuerAccount: 'gateway_tether', limit: '100000000' },
      { currency: 'USDC', issuerAccount: 'gateway_circle', limit: '100000000' },
    ],
    reserveXrp: 100,
  });

  // ─── EXTERNAL GATEWAY ACCOUNTS (NOT OPTKAS-OWNED) ─────────────
  // These are stablecoin/fiat gateway issuers on XRPL.
  // Addresses are REAL mainnet gateways (shown as placeholders for testnet).

  accounts.set('gateway_bitstamp', {
    name: 'gateway_bitstamp',
    role: 'External Gateway — Bitstamp USD',
    purpose: 'Bitstamp USD IOU issuer on XRPL. Regulated exchange. Real mainnet: rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
    address: null, // Testnet placeholder — mainnet: rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B
    flags: {},
    trustlines: [],
    reserveXrp: 0, // External — not funded by us
  });

  accounts.set('gateway_gatehub', {
    name: 'gateway_gatehub',
    role: 'External Gateway — GateHub USD',
    purpose: 'GateHub USD IOU issuer on XRPL. EU-regulated. Real mainnet: rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
    address: null, // Testnet placeholder — mainnet: rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq
    flags: {},
    trustlines: [],
    reserveXrp: 0,
  });

  accounts.set('gateway_tether', {
    name: 'gateway_tether',
    role: 'External Gateway — Tether USDT',
    purpose: 'Tether USDT on XRPL. Placeholder — Tether does not currently issue on XRPL mainnet. Would use authorized gateway.',
    address: null,
    flags: {},
    trustlines: [],
    reserveXrp: 0,
  });

  accounts.set('gateway_circle', {
    name: 'gateway_circle',
    role: 'External Gateway — Circle USDC',
    purpose: 'Circle USDC on XRPL. Placeholder — would be issued via authorized XRPL gateway partner.',
    address: null,
    flags: {},
    trustlines: [],
    reserveXrp: 0,
  });

  // ─── STABLECOIN DEFINITIONS ───────────────────────────────────

  const stablecoins: StablecoinDefinition[] = [
    {
      code: 'USD',
      name: 'Bitstamp USD',
      issuer: 'gateway_bitstamp',
      type: 'fiat_backed',
      pegCurrency: 'USD',
      decimalPrecision: 2,
      trustlineLimit: '50000000',
    },
    {
      code: 'USD',
      name: 'GateHub USD',
      issuer: 'gateway_gatehub',
      type: 'fiat_backed',
      pegCurrency: 'USD',
      decimalPrecision: 2,
      trustlineLimit: '50000000',
    },
    {
      code: 'USDT',
      name: 'Tether USDT',
      issuer: 'gateway_tether',
      type: 'fiat_backed',
      pegCurrency: 'USD',
      decimalPrecision: 6,
      trustlineLimit: '50000000',
    },
    {
      code: 'USDC',
      name: 'Circle USDC',
      issuer: 'gateway_circle',
      type: 'fiat_backed',
      pegCurrency: 'USD',
      decimalPrecision: 6,
      trustlineLimit: '50000000',
    },
  ];

  // ─── TRUSTLINE WIRING ─────────────────────────────────────────

  const trustlines: TrustlineWiring[] = [];

  // Collect all trustline wirings from account definitions
  for (const [accountName, account] of accounts) {
    for (const tl of account.trustlines) {
      trustlines.push({
        from: accountName,
        to: tl.issuerAccount,
        currency: tl.currency,
        limit: tl.limit,
        purpose: `${account.role} → ${tl.currency} trustline for ${account.purpose.substring(0, 60)}`,
      });
    }
  }

  // ─── AMM POOLS ────────────────────────────────────────────────

  const ammPools: AMMPoolDefinition[] = [
    {
      name: 'BOND/XRP',
      asset1: { currency: 'BOND', issuer: 'issuer' },
      asset2: { currency: 'XRP' },
      initialFee: 100, // 1%
      purpose: 'Primary liquidity pool for BOND claim receipts against XRP',
    },
    {
      name: 'BOND/USD.Bitstamp',
      asset1: { currency: 'BOND', issuer: 'issuer' },
      asset2: { currency: 'USD', issuer: 'gateway_bitstamp' },
      initialFee: 50, // 0.5%
      purpose: 'BOND/USD liquidity for fiat-denominated settlement',
    },
    {
      name: 'USD.Bitstamp/XRP',
      asset1: { currency: 'USD', issuer: 'gateway_bitstamp' },
      asset2: { currency: 'XRP' },
      initialFee: 30, // 0.3%
      purpose: 'XRP/USD on-ramp liquidity for stablecoin operations',
    },
    {
      name: 'USDT/XRP',
      asset1: { currency: 'USDT', issuer: 'gateway_tether' },
      asset2: { currency: 'XRP' },
      initialFee: 30,
      purpose: 'USDT/XRP on-ramp liquidity',
    },
    {
      name: 'USDC/XRP',
      asset1: { currency: 'USDC', issuer: 'gateway_circle' },
      asset2: { currency: 'XRP' },
      initialFee: 30,
      purpose: 'USDC/XRP on-ramp liquidity',
    },
  ];

  return {
    network,
    accounts,
    trustlines,
    stablecoins,
    ammPools,
  };
}

// ─── Ledger Bootstrap Engine ──────────────────────────────────────────

export class LedgerBootstrap extends EventEmitter {
  private client: XRPLClient;
  private topology: LedgerTopology;

  constructor(client: XRPLClient, topology?: LedgerTopology) {
    super();
    this.client = client;
    this.topology = topology || buildDefaultTopology(client.network);
  }

  get accountCount(): number {
    return this.topology.accounts.size;
  }

  get trustlineCount(): number {
    return this.topology.trustlines.length;
  }

  getTopology(): Readonly<LedgerTopology> {
    return this.topology;
  }

  getAccount(name: string): AccountDefinition | undefined {
    return this.topology.accounts.get(name);
  }

  // ─── Step 1: Fund Testnet Accounts ─────────────────────────────

  async fundTestnetAccounts(): Promise<Map<string, { address: string; secret: string }>> {
    if (this.topology.network !== 'testnet') {
      throw new Error('fundTestnetAccounts() can only be used on testnet');
    }

    const funded = new Map<string, { address: string; secret: string }>();

    for (const [name, account] of this.topology.accounts) {
      // Skip external gateways
      if (name.startsWith('gateway_')) continue;
      if (account.reserveXrp === 0) continue;

      // Use XRPL testnet faucet
      const response = await fetch('https://faucet.altnet.rippletest.net/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Faucet request failed for ${name}: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const info = {
        address: data.account.address,
        secret: data.account.secret,
      };

      account.address = info.address;
      funded.set(name, info);

      this.emit('account_funded', { name, address: info.address });
    }

    return funded;
  }

  // ─── Step 2: Configure Issuer Flags ────────────────────────────

  async configureAccountFlags(dryRun = true): Promise<PreparedTransaction[]> {
    const txns: PreparedTransaction[] = [];

    for (const [name, account] of this.topology.accounts) {
      if (!account.address || name.startsWith('gateway_')) continue;

      const flagsToSet: number[] = [];
      const flagsToClear: number[] = [];

      if (account.flags.defaultRipple) flagsToSet.push(XRPL_FLAGS.asfDefaultRipple);
      if (account.flags.requireAuth) flagsToSet.push(XRPL_FLAGS.asfRequireAuth);
      if (account.flags.requireDestTag) flagsToSet.push(XRPL_FLAGS.asfRequireDest);
      if (account.flags.depositAuth) flagsToSet.push(XRPL_FLAGS.asfDepositAuth);
      if (account.flags.allowTrustLineClawback) flagsToSet.push(XRPL_FLAGS.asfAllowTrustLineClawback);
      if (account.flags.disableMaster) flagsToSet.push(XRPL_FLAGS.asfDisableMaster);

      // Each flag must be set in a separate AccountSet transaction
      for (const flag of flagsToSet) {
        const tx = {
          TransactionType: 'AccountSet' as const,
          Account: account.address,
          SetFlag: flag,
        };

        const prepared = await this.client.prepareTransaction(
          tx,
          `Set flag ${flag} on ${name} (${account.address})`,
          dryRun
        );
        txns.push(prepared);
      }

      this.emit('flags_configured', { name, address: account.address, flagsSet: flagsToSet });
    }

    return txns;
  }

  // ─── Step 3: Deploy All Trustlines ─────────────────────────────

  async deployTrustlines(dryRun = true): Promise<PreparedTransaction[]> {
    const txns: PreparedTransaction[] = [];

    for (const wiring of this.topology.trustlines) {
      const fromAccount = this.topology.accounts.get(wiring.from);
      const toAccount = this.topology.accounts.get(wiring.to);

      if (!fromAccount?.address) continue;

      // Resolve issuer address — for external gateways, may be null on testnet
      const issuerAddress = toAccount?.address;
      if (!issuerAddress) continue;

      const tx: any = {
        TransactionType: 'TrustSet',
        Account: fromAccount.address,
        LimitAmount: {
          currency: wiring.currency,
          issuer: issuerAddress,
          value: wiring.limit,
        },
      };

      // Set NoRipple on non-issuer trustlines
      const def = fromAccount.trustlines.find(
        (t) => t.currency === wiring.currency && t.issuerAccount === wiring.to
      );
      if (def?.noRipple) {
        tx.Flags = TRUSTSET_FLAGS.tfSetNoRipple;
      }

      const prepared = await this.client.prepareTransaction(
        tx,
        `Trustline: ${wiring.from} → ${wiring.to} (${wiring.currency}, limit: ${wiring.limit})`,
        dryRun
      );
      txns.push(prepared);

      this.emit('trustline_deployed', {
        from: wiring.from,
        to: wiring.to,
        currency: wiring.currency,
        limit: wiring.limit,
      });
    }

    return txns;
  }

  // ─── Step 4: Configure Multisig Signer Lists ──────────────────

  async configureMultisig(dryRun = true): Promise<PreparedTransaction[]> {
    const txns: PreparedTransaction[] = [];

    for (const [name, account] of this.topology.accounts) {
      if (!account.address || !account.signerList || name.startsWith('gateway_')) continue;

      // Only include entries with resolved addresses
      const validEntries = account.signerList.entries.filter((e) => e.address);
      if (validEntries.length === 0) continue;

      const tx = {
        TransactionType: 'SignerListSet' as const,
        Account: account.address,
        SignerQuorum: account.signerList.quorum,
        SignerEntries: validEntries.map((entry) => ({
          SignerEntry: {
            Account: entry.address!,
            SignerWeight: entry.weight,
          },
        })),
      };

      const prepared = await this.client.prepareTransaction(
        tx,
        `Multisig: ${name} — ${account.signerList.quorum}-of-${validEntries.length} (${validEntries.map((e) => e.role).join(', ')})`,
        dryRun
      );
      txns.push(prepared);

      this.emit('multisig_configured', {
        account: name,
        quorum: account.signerList.quorum,
        signers: validEntries.length,
      });
    }

    return txns;
  }

  // ─── Step 5: Verify Topology ───────────────────────────────────

  async verifyTopology(): Promise<TopologyVerification> {
    const result: TopologyVerification = {
      timestamp: new Date().toISOString(),
      network: this.topology.network,
      accounts: [],
      trustlines: [],
      issues: [],
      passed: true,
    };

    for (const [name, account] of this.topology.accounts) {
      if (!account.address || name.startsWith('gateway_')) continue;

      try {
        const info = await this.client.getAccountInfo(account.address);
        const trustlines = await this.client.getTrustlines(account.address);

        result.accounts.push({
          name,
          address: account.address,
          balance: info.balance,
          flags: info.flags,
          signerList: info.signerList || null,
          trustlineCount: trustlines.length,
          status: 'verified',
        });

        // Verify expected trustlines exist
        for (const expectedTl of account.trustlines) {
          const issuer = this.topology.accounts.get(expectedTl.issuerAccount);
          if (!issuer?.address) continue;

          const found = trustlines.find(
            (tl) => tl.currency === expectedTl.currency && tl.issuer === issuer.address
          );

          if (found) {
            result.trustlines.push({
              from: name,
              currency: expectedTl.currency,
              issuer: issuer.address,
              limit: found.limit,
              balance: found.balance,
              status: 'verified',
            });
          } else {
            result.trustlines.push({
              from: name,
              currency: expectedTl.currency,
              issuer: issuer.address,
              limit: '0',
              balance: '0',
              status: 'missing',
            });
            result.issues.push(`MISSING trustline: ${name} → ${expectedTl.currency} (issuer: ${expectedTl.issuerAccount})`);
            result.passed = false;
          }
        }
      } catch (err: any) {
        result.accounts.push({
          name,
          address: account.address,
          balance: '0',
          flags: 0,
          signerList: null,
          trustlineCount: 0,
          status: 'error',
        });
        result.issues.push(`ERROR: ${name} (${account.address}) — ${err.message}`);
        result.passed = false;
      }
    }

    this.emit('topology_verified', result);
    return result;
  }

  // ─── Topology Summary (Human-Readable) ─────────────────────────

  printTopology(): string {
    const lines: string[] = [];
    lines.push('╔══════════════════════════════════════════════════════════════╗');
    lines.push('║    OPTKAS XRPL LEDGER TOPOLOGY                             ║');
    lines.push(`║    Network: ${this.topology.network.toUpperCase().padEnd(48)}║`);
    lines.push('╚══════════════════════════════════════════════════════════════╝');
    lines.push('');

    // Accounts
    lines.push('─── ACCOUNTS ─────────────────────────────────────────────────');
    for (const [name, account] of this.topology.accounts) {
      const addr = account.address || '<PLACEHOLDER>';
      const flags = Object.entries(account.flags)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ') || 'none';
      lines.push(`  ${name.padEnd(20)} ${addr}`);
      lines.push(`  ${''.padEnd(20)} Role: ${account.role}`);
      lines.push(`  ${''.padEnd(20)} Flags: ${flags}`);
      if (account.signerList) {
        lines.push(`  ${''.padEnd(20)} Multisig: ${account.signerList.quorum}-of-${account.signerList.entries.length}`);
      }
      lines.push(`  ${''.padEnd(20)} Reserve: ${account.reserveXrp} XRP`);
      lines.push('');
    }

    // Trustlines
    lines.push('─── TRUSTLINES ───────────────────────────────────────────────');
    for (const tl of this.topology.trustlines) {
      lines.push(`  ${tl.from.padEnd(20)} → ${tl.to.padEnd(20)} ${tl.currency.padEnd(6)} limit: ${tl.limit}`);
    }
    lines.push('');

    // Stablecoins
    lines.push('─── STABLECOINS ──────────────────────────────────────────────');
    for (const sc of this.topology.stablecoins) {
      lines.push(`  ${sc.code.padEnd(6)} ${sc.name.padEnd(20)} (${sc.type}) peg: ${sc.pegCurrency}`);
    }
    lines.push('');

    // AMM Pools
    lines.push('─── AMM POOLS ────────────────────────────────────────────────');
    for (const pool of this.topology.ammPools) {
      lines.push(`  ${pool.name.padEnd(25)} fee: ${pool.initialFee} bps — ${pool.purpose}`);
    }

    return lines.join('\n');
  }
}

// ─── Verification Result Types ────────────────────────────────────────

export interface TopologyVerification {
  timestamp: string;
  network: 'testnet' | 'mainnet';
  accounts: AccountVerification[];
  trustlines: TrustlineVerification[];
  issues: string[];
  passed: boolean;
}

export interface AccountVerification {
  name: string;
  address: string;
  balance: string;
  flags: number;
  signerList: { signerQuorum: number; signerEntries: Array<{ account: string; signerWeight: number }> } | null;
  trustlineCount: number;
  status: 'verified' | 'error' | 'missing';
}

export interface TrustlineVerification {
  from: string;
  currency: string;
  issuer: string;
  limit: string;
  balance: string;
  status: 'verified' | 'missing' | 'mismatch';
}

export default LedgerBootstrap;
