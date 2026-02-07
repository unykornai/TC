/**
 * @optkas/issuance — Trustline Manager
 *
 * Batch trustline deployment and monitoring.
 */

import { XRPLClient, PreparedTransaction, TrustlineInfo } from '@optkas/xrpl-core';

export interface TrustlineDeployment {
  currency: string;
  issuerAddress: string;
  accounts: string[];
  limit: string;
}

export class TrustlineManager {
  private client: XRPLClient;

  constructor(client: XRPLClient) {
    this.client = client;
  }

  /**
   * Prepare trustline deployment for multiple accounts (unsigned).
   */
  async prepareDeployment(
    deployment: TrustlineDeployment,
    dryRun = true
  ): Promise<PreparedTransaction[]> {
    const prepared: PreparedTransaction[] = [];

    for (const account of deployment.accounts) {
      const tx = {
        TransactionType: 'TrustSet' as const,
        Account: account,
        LimitAmount: {
          currency: deployment.currency,
          issuer: deployment.issuerAddress,
          value: deployment.limit,
        },
      };

      prepared.push(
        await this.client.prepareTransaction(
          tx,
          `Trustline: ${account} → ${deployment.issuerAddress} (${deployment.currency})`,
          dryRun
        )
      );
    }

    return prepared;
  }

  /**
   * Verify that trustlines are properly configured for all expected accounts.
   */
  async verifyTrustlines(
    accounts: string[],
    currency: string,
    issuerAddress: string
  ): Promise<{ account: string; configured: boolean; balance: string; limit: string }[]> {
    const results = [];

    for (const account of accounts) {
      const trustlines = await this.client.getTrustlines(account);
      const match = trustlines.find(
        (t) => t.currency === currency && t.issuer === issuerAddress
      );

      results.push({
        account,
        configured: !!match,
        balance: match?.balance || '0',
        limit: match?.limit || '0',
      });
    }

    return results;
  }
}

export default TrustlineManager;
