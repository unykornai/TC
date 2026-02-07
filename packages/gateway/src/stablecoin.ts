/**
 * @optkas/gateway — Stablecoin Gateway & Cross-Currency Engine
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Manages stablecoin operations on XRPL:
 * - USD/USDC/USDT trustline management with multiple gateways
 * - Gateway IOU issuance and redemption flows
 * - Cross-currency payments (path payments)
 * - Path finding for optimal exchange routes
 * - Fiat on-ramp / off-ramp coordination
 * - Multi-gateway arbitrage protection
 *
 * XRPL's built-in cross-currency payment engine uses rippling to find
 * the best path between any two currencies automatically.
 */

import { XRPLClient, PreparedTransaction } from '@optkas/xrpl-core';
import { EventEmitter } from 'events';

// ─── Types ───────────────────────────────────────────────────────────

export interface GatewayDefinition {
  id: string;
  name: string;
  currency: string;
  issuerAddress: string;
  type: 'fiat_backed' | 'crypto_backed' | 'algorithmic';
  pegCurrency: string;
  trustlineLimit: string;
  status: 'active' | 'inactive' | 'suspended';
  kycRequired: boolean;
  jurisdiction: string;
  fees: {
    depositPct: number;
    withdrawalPct: number;
    minimumDeposit: string;
    minimumWithdrawal: string;
  };
}

export interface DepositRequest {
  gatewayId: string;
  depositorAddress: string;
  amount: string;
  currency: string;
  sourceFiatAccount?: string;
  reference?: string;
}

export interface WithdrawalRequest {
  gatewayId: string;
  withdrawerAddress: string;
  amount: string;
  currency: string;
  destinationFiatAccount?: string;
  reference?: string;
}

export interface CrossCurrencyPayment {
  sourceAddress: string;
  destinationAddress: string;
  sourceCurrency: CurrencySpec;
  destinationCurrency: CurrencySpec;
  destinationAmount: string;
  maxSourceAmount: string;
  paths?: PaymentPath[];
  memo?: string;
}

export interface CurrencySpec {
  currency: string;
  issuer?: string;
}

export interface PaymentPath {
  hops: Array<{
    currency: string;
    issuer?: string;
    account?: string;
  }>;
  sourceAmount: string;
  destinationAmount: string;
}

export interface PathFindResult {
  sourceCurrency: CurrencySpec;
  destinationCurrency: CurrencySpec;
  alternatives: Array<{
    sourceAmount: string;
    paths: any[];
  }>;
  destinationAmount: string;
}

export interface GatewayBalance {
  gateway: string;
  currency: string;
  balance: string;
  limit: string;
  obligations: string;
  trustlineCount: number;
}

// ─── Stablecoin Gateway Manager ───────────────────────────────────────

export class StablecoinGateway extends EventEmitter {
  private client: XRPLClient;
  private gateways: Map<string, GatewayDefinition> = new Map();

  constructor(client: XRPLClient) {
    super();
    this.client = client;
  }

  // ─── Gateway Registry ──────────────────────────────────────────

  registerGateway(gateway: GatewayDefinition): void {
    this.gateways.set(gateway.id, gateway);
    this.emit('gateway_registered', gateway);
  }

  getGateway(id: string): GatewayDefinition | undefined {
    return this.gateways.get(id);
  }

  getGatewaysByCurrency(currency: string): GatewayDefinition[] {
    return Array.from(this.gateways.values()).filter(
      (g) => g.currency === currency && g.status === 'active'
    );
  }

  getAllGateways(): GatewayDefinition[] {
    return Array.from(this.gateways.values());
  }

  // ─── Trustline Setup ───────────────────────────────────────────

  /**
   * Set up a trustline to a stablecoin gateway.
   * Must be done before receiving any gateway IOUs.
   */
  async prepareTrustlineToGateway(
    accountAddress: string,
    gatewayId: string,
    customLimit?: string,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const gateway = this.gateways.get(gatewayId);
    if (!gateway) throw new Error(`Unknown gateway: ${gatewayId}`);

    const tx = {
      TransactionType: 'TrustSet' as const,
      Account: accountAddress,
      LimitAmount: {
        currency: gateway.currency,
        issuer: gateway.issuerAddress,
        value: customLimit || gateway.trustlineLimit,
      },
    };

    return this.client.prepareTransaction(
      tx,
      `TRUSTLINE: ${accountAddress} → ${gateway.name} (${gateway.currency}, limit: ${customLimit || gateway.trustlineLimit})`,
      dryRun
    );
  }

  /**
   * Set up trustlines to ALL active gateways for a given currency.
   */
  async prepareMultiGatewayTrustlines(
    accountAddress: string,
    currency: string,
    dryRun = true
  ): Promise<PreparedTransaction[]> {
    const gateways = this.getGatewaysByCurrency(currency);
    const txns: PreparedTransaction[] = [];

    for (const gw of gateways) {
      const tx = await this.prepareTrustlineToGateway(accountAddress, gw.id, undefined, dryRun);
      txns.push(tx);
    }

    return txns;
  }

  // ─── Gateway Issuance (Deposit) ────────────────────────────────

  /**
   * Prepare a stablecoin issuance from gateway to depositor.
   * This represents the gateway issuing IOUs after receiving fiat.
   *
   * Flow: User deposits fiat → Gateway verifies → Gateway issues IOU on XRPL
   */
  async prepareDeposit(
    request: DepositRequest,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const gateway = this.gateways.get(request.gatewayId);
    if (!gateway) throw new Error(`Unknown gateway: ${request.gatewayId}`);

    const depositAmount = parseFloat(request.amount);
    if (depositAmount < parseFloat(gateway.fees.minimumDeposit)) {
      throw new Error(`Minimum deposit: ${gateway.fees.minimumDeposit} ${gateway.currency}`);
    }

    // Calculate net amount after fees
    const feeAmount = depositAmount * (gateway.fees.depositPct / 100);
    const netAmount = (depositAmount - feeAmount).toFixed(8);

    const tx: any = {
      TransactionType: 'Payment',
      Account: gateway.issuerAddress,
      Destination: request.depositorAddress,
      Amount: {
        currency: gateway.currency,
        issuer: gateway.issuerAddress,
        value: netAmount,
      },
      Memos: [{
        Memo: {
          MemoType: XRPLClient.hexEncode('gateway/deposit'),
          MemoData: XRPLClient.hexEncode(JSON.stringify({
            gateway: gateway.id,
            grossAmount: request.amount,
            fee: feeAmount.toFixed(8),
            netAmount,
            reference: request.reference || '',
            timestamp: new Date().toISOString(),
          })),
        },
      }],
    };

    if (request.depositorAddress !== gateway.issuerAddress) {
      // Add destination tag if gateway requires it
    }

    const prepared = await this.client.prepareTransaction(
      tx,
      `GATEWAY DEPOSIT: ${netAmount} ${gateway.currency} (${gateway.name}) → ${request.depositorAddress}`,
      dryRun
    );

    this.emit('deposit_prepared', {
      gateway: gateway.id,
      depositor: request.depositorAddress,
      amount: netAmount,
      fee: feeAmount.toFixed(8),
    });

    return prepared;
  }

  // ─── Gateway Redemption (Withdrawal) ───────────────────────────

  /**
   * Prepare a stablecoin redemption — user sends IOU back to gateway.
   * Gateway then releases fiat to the user's bank account.
   *
   * Flow: User sends IOU → Gateway receives (burns) → Gateway releases fiat
   */
  async prepareWithdrawal(
    request: WithdrawalRequest,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const gateway = this.gateways.get(request.gatewayId);
    if (!gateway) throw new Error(`Unknown gateway: ${request.gatewayId}`);

    const withdrawAmount = parseFloat(request.amount);
    if (withdrawAmount < parseFloat(gateway.fees.minimumWithdrawal)) {
      throw new Error(`Minimum withdrawal: ${gateway.fees.minimumWithdrawal} ${gateway.currency}`);
    }

    // User sends IOU back to issuer (gateway)
    const tx: any = {
      TransactionType: 'Payment',
      Account: request.withdrawerAddress,
      Destination: gateway.issuerAddress,
      Amount: {
        currency: gateway.currency,
        issuer: gateway.issuerAddress,
        value: request.amount,
      },
      Memos: [{
        Memo: {
          MemoType: XRPLClient.hexEncode('gateway/withdrawal'),
          MemoData: XRPLClient.hexEncode(JSON.stringify({
            gateway: gateway.id,
            amount: request.amount,
            destinationAccount: request.destinationFiatAccount || 'on-file',
            reference: request.reference || '',
            timestamp: new Date().toISOString(),
          })),
        },
      }],
    };

    const prepared = await this.client.prepareTransaction(
      tx,
      `GATEWAY WITHDRAWAL: ${request.amount} ${gateway.currency} from ${request.withdrawerAddress} → ${gateway.name}`,
      dryRun
    );

    this.emit('withdrawal_prepared', {
      gateway: gateway.id,
      withdrawer: request.withdrawerAddress,
      amount: request.amount,
    });

    return prepared;
  }

  // ─── Cross-Currency Payments ───────────────────────────────────

  /**
   * Prepare a cross-currency payment using XRPL's built-in path finding.
   * Automatically finds the best route between any two currencies.
   *
   * Example: Pay 1000 USD.Bitstamp and receive BOND tokens
   *          Pay XRP and receive USD.GateHub
   */
  async prepareCrossCurrencyPayment(
    payment: CrossCurrencyPayment,
    dryRun = true
  ): Promise<PreparedTransaction> {
    const formatAmount = (spec: CurrencySpec, value: string) => {
      if (spec.currency === 'XRP') return XRPLClient.xrpToDrops(value);
      return { currency: spec.currency, issuer: spec.issuer!, value };
    };

    const tx: any = {
      TransactionType: 'Payment',
      Account: payment.sourceAddress,
      Destination: payment.destinationAddress,
      Amount: formatAmount(payment.destinationCurrency, payment.destinationAmount),
      SendMax: formatAmount(payment.sourceCurrency, payment.maxSourceAmount),
    };

    // Use provided paths or let XRPL auto-path
    if (payment.paths && payment.paths.length > 0) {
      tx.Paths = payment.paths.map((p) =>
        p.hops.map((hop) => {
          const pathStep: any = {};
          if (hop.currency && hop.currency !== 'XRP') {
            pathStep.currency = hop.currency;
          }
          if (hop.issuer) pathStep.issuer = hop.issuer;
          if (hop.account) pathStep.account = hop.account;
          return pathStep;
        })
      );
    }

    if (payment.memo) {
      tx.Memos = [{
        Memo: {
          MemoType: XRPLClient.hexEncode('payment/cross-currency'),
          MemoData: XRPLClient.hexEncode(payment.memo),
        },
      }];
    }

    return this.client.prepareTransaction(
      tx,
      `CROSS-CURRENCY: ${payment.maxSourceAmount} ${payment.sourceCurrency.currency} → ${payment.destinationAmount} ${payment.destinationCurrency.currency}`,
      dryRun
    );
  }

  // ─── Path Finding ──────────────────────────────────────────────

  /**
   * Find the best payment paths between two currencies.
   * Uses XRPL's ripple_path_find RPC command.
   */
  async findPaths(
    sourceAccount: string,
    destinationAccount: string,
    destinationCurrency: CurrencySpec,
    destinationAmount: string
  ): Promise<PathFindResult> {
    const client = (this.client as any).client;
    if (!client) throw new Error('Not connected');

    const destAmount = destinationCurrency.currency === 'XRP'
      ? XRPLClient.xrpToDrops(destinationAmount)
      : {
          currency: destinationCurrency.currency,
          issuer: destinationCurrency.issuer!,
          value: destinationAmount,
        };

    const response = await client.request({
      command: 'ripple_path_find',
      source_account: sourceAccount,
      destination_account: destinationAccount,
      destination_amount: destAmount,
    });

    return {
      sourceCurrency: { currency: 'XRP' }, // Source is determined by alternatives
      destinationCurrency,
      alternatives: (response.result.alternatives || []).map((alt: any) => ({
        sourceAmount: typeof alt.source_amount === 'string'
          ? XRPLClient.dropsToXrp(alt.source_amount)
          : alt.source_amount.value,
        paths: alt.paths_computed || [],
      })),
      destinationAmount,
    };
  }

  // ─── Gateway Balance Queries ───────────────────────────────────

  /**
   * Get the outstanding IOU obligations for a gateway.
   */
  async getGatewayObligations(gatewayId: string): Promise<GatewayBalance> {
    const gateway = this.gateways.get(gatewayId);
    if (!gateway) throw new Error(`Unknown gateway: ${gatewayId}`);

    const client = (this.client as any).client;
    if (!client) throw new Error('Not connected');

    const response = await client.request({
      command: 'gateway_balances',
      account: gateway.issuerAddress,
    });

    const obligations = response.result.obligations || {};
    const totalObligation = obligations[gateway.currency] || '0';

    return {
      gateway: gateway.id,
      currency: gateway.currency,
      balance: '0', // Gateway's own balance
      limit: gateway.trustlineLimit,
      obligations: totalObligation,
      trustlineCount: Object.keys(response.result.balances || {}).length,
    };
  }

  /**
   * Get a specific account's balance for all gateway stablecoins.
   */
  async getStablecoinBalances(accountAddress: string): Promise<Array<{
    currency: string;
    gateway: string;
    balance: string;
    limit: string;
  }>> {
    const trustlines = await this.client.getTrustlines(accountAddress);
    const balances: Array<{
      currency: string;
      gateway: string;
      balance: string;
      limit: string;
    }> = [];

    for (const tl of trustlines) {
      // Find matching gateway
      const gateway = Array.from(this.gateways.values()).find(
        (g) => g.issuerAddress === tl.issuer && g.currency === tl.currency
      );

      if (gateway) {
        balances.push({
          currency: tl.currency,
          gateway: gateway.name,
          balance: tl.balance,
          limit: tl.limit,
        });
      }
    }

    return balances;
  }
}

export default StablecoinGateway;
