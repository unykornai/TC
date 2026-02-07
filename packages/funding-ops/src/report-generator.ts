/**
 * @optkas/funding-ops — Funding Execution Report Generator
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Generates human-readable Markdown and machine-readable JSON reports
 * for funding pipeline executions. Reports include:
 * - Readiness check results
 * - Account readiness across XRPL + Stellar
 * - Trustline deployment status
 * - Bond creation details
 * - Escrow creation details
 * - IOU issuance summary
 * - Attestation proofs
 * - Unsigned transaction manifest
 */

import {
  FundingPipelineState,
  FundingReadinessReport,
  ActivationReport,
  PhaseResult,
  UnsignedTransactionRecord,
} from './pipeline';
import { AccountReadiness, ActivationResult } from './xrpl-activator';
import { StellarAccountReadiness, StellarActivationResult } from './stellar-activator';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────

export interface FundingReport {
  id: string;
  generatedAt: string;
  format: 'markdown' | 'json';
  pipelineId: string;
  pipelineStatus: string;
  sections: ReportSection[];
  hash: string; // SHA-256 of report content for integrity
}

export interface ReportSection {
  title: string;
  order: number;
  content: string; // Markdown formatted
  data?: Record<string, unknown>; // Structured data for JSON output
}

// ─── Report Generator ────────────────────────────────────────────

export class FundingReportGenerator {
  /**
   * Generate a comprehensive Markdown report from pipeline state.
   */
  static generateMarkdown(
    state: FundingPipelineState,
    readiness?: FundingReadinessReport,
    xrplActivation?: ActivationResult,
    stellarActivation?: StellarActivationResult,
  ): string {
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    // ── Header ──────────────────────────────────────────────────
    lines.push('# OPTKAS Funding Execution Report');
    lines.push('');
    lines.push(`> Generated: ${timestamp}`);
    lines.push(`> Pipeline ID: \`${state.id}\``);
    lines.push(`> Status: **${state.status.toUpperCase()}**`);
    lines.push(`> Phases Completed: ${state.phases.filter(p => p.status === 'completed').length}/${state.phases.length}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // ── Readiness Check ─────────────────────────────────────────
    if (readiness) {
      lines.push('## 1. Readiness Assessment');
      lines.push('');
      lines.push(`Overall: ${readiness.overall ? '✅ **READY**' : '❌ **NOT READY**'}`);
      lines.push('');

      if (readiness.blockingIssues.length > 0) {
        lines.push('### Blocking Issues');
        for (const issue of readiness.blockingIssues) {
          lines.push(`- ❌ ${issue}`);
        }
        lines.push('');
      }

      if (readiness.warnings.length > 0) {
        lines.push('### Warnings');
        for (const warning of readiness.warnings) {
          lines.push(`- ⚠️ ${warning}`);
        }
        lines.push('');
      }

      lines.push('### Check Results');
      lines.push('');
      lines.push('| Check | Category | Status | Details |');
      lines.push('|-------|----------|--------|---------|');
      for (const check of readiness.checks) {
        lines.push(`| ${check.name} | ${check.category} | ${check.passed ? '✅' : '❌'} | ${check.details} |`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // ── XRPL Activation ─────────────────────────────────────────
    if (xrplActivation) {
      lines.push('## 2. XRPL Infrastructure Activation');
      lines.push('');
      lines.push(`All Accounts Ready: ${xrplActivation.allAccountsReady ? '✅' : '❌'}`);
      lines.push(`All Trustlines Deployed: ${xrplActivation.allTrustlinesDeployed ? '✅' : '⏳ Pending'}`);
      lines.push(`Total Transactions: **${xrplActivation.totalTransactions}**`);
      lines.push('');

      lines.push('### Account Readiness');
      lines.push('');
      lines.push('| Role | Address | Balance (XRP) | Reserve Met | DefaultRipple | Trustlines |');
      lines.push('|------|---------|---------------|-------------|---------------|------------|');
      for (const acct of xrplActivation.accountReadiness) {
        lines.push(
          `| ${acct.role} | \`${acct.address.substring(0, 12)}...\` | ${acct.balance} | ${acct.reserveMet ? '✅' : '❌'} | ${acct.role === 'issuer' ? (acct.hasDefaultRipple ? '✅' : '❌') : '—'} | ${acct.trustlines.length} |`
        );
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // ── Stellar Activation ──────────────────────────────────────
    if (stellarActivation) {
      lines.push('## 3. Stellar Infrastructure Activation');
      lines.push('');
      lines.push(`All Accounts Ready: ${stellarActivation.allAccountsReady ? '✅' : '❌'}`);
      lines.push(`Regulated Asset Configured: ${stellarActivation.regulatedAssetConfigured ? '✅' : '❌'}`);
      lines.push(`Total Transactions: **${stellarActivation.totalTransactions}**`);
      lines.push('');

      lines.push('### Account Readiness');
      lines.push('');
      lines.push('| Role | Address | XLM Balance | auth_required | auth_revocable | clawback | Trustlines |');
      lines.push('|------|---------|-------------|---------------|----------------|----------|------------|');
      for (const acct of stellarActivation.accountReadiness) {
        lines.push(
          `| ${acct.role} | \`${acct.address.substring(0, 12)}...\` | ${acct.xlmBalance} | ${acct.flags.authRequired ? '✅' : '❌'} | ${acct.flags.authRevocable ? '✅' : '❌'} | ${acct.flags.authClawbackEnabled ? '✅' : '❌'} | ${acct.existingTrustlines.length} |`
        );
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // ── Pipeline Phases ─────────────────────────────────────────
    lines.push('## 4. Pipeline Phase Summary');
    lines.push('');
    lines.push('| # | Phase | Status | Transactions | Summary |');
    lines.push('|---|-------|--------|--------------|---------|');
    for (let i = 0; i < state.phases.length; i++) {
      const phase = state.phases[i];
      const icon = phase.status === 'completed' ? '✅' : phase.status === 'failed' ? '❌' : '⏳';
      lines.push(`| ${i + 1} | ${phase.phase} | ${icon} ${phase.status} | ${phase.transactionCount} | ${phase.summary} |`);
    }
    lines.push('');

    // ── Bond Details ────────────────────────────────────────────
    if (state.bondId) {
      lines.push('## 5. Bond Details');
      lines.push('');
      lines.push(`- **Bond ID:** \`${state.bondId}\``);
      const bondPhase = state.phases.find(p => p.phase === 'bond_creation');
      if (bondPhase?.details) {
        const d = bondPhase.details as any;
        lines.push(`- **Face Value:** $${d.faceValue || 'N/A'}`);
        lines.push(`- **Coupon Rate:** ${d.couponRate ? (d.couponRate * 100).toFixed(2) + '%' : 'N/A'}`);
        lines.push(`- **Maturity Date:** ${d.maturityDate || 'N/A'}`);
        lines.push(`- **Coupon Payments:** ${d.couponScheduleCount || 0}`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // ── Escrow Details ──────────────────────────────────────────
    if (state.escrowIds.length > 0) {
      lines.push('## 6. Escrow Conditions');
      lines.push('');
      for (const escrowId of state.escrowIds) {
        lines.push(`- **Escrow ID:** \`${escrowId}\``);
      }
      const escrowPhase = state.phases.find(p => p.phase === 'escrow_creation');
      if (escrowPhase?.details) {
        const d = escrowPhase.details as any;
        lines.push(`- **Amount:** ${d.amount || 'N/A'} XRP`);
        lines.push(`- **Source:** \`${d.source || 'N/A'}\``);
        lines.push(`- **Destination:** \`${d.destination || 'N/A'}\``);
        lines.push(`- **Crypto-Condition:** ${d.hasCryptoCondition ? '✅ Yes' : '❌ No'}`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // ── Attestation Hashes ──────────────────────────────────────
    if (state.attestationHashes.length > 0) {
      lines.push('## 7. Cross-Ledger Attestation Proofs');
      lines.push('');
      for (const hash of state.attestationHashes) {
        lines.push(`- **Hash:** \`${hash}\``);
      }
      lines.push('');
      lines.push('> These hashes are anchored to both XRPL and Stellar as immutable evidence.');
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // ── Unsigned Transaction Manifest ───────────────────────────
    lines.push(`## 8. Unsigned Transaction Manifest`);
    lines.push('');
    lines.push(`Total: **${state.unsignedTransactions.length}** transactions requiring 2-of-3 multisig`);
    lines.push('');
    if (state.unsignedTransactions.length > 0) {
      lines.push('| # | Phase | Ledger | Status | Description |');
      lines.push('|---|-------|--------|--------|-------------|');
      for (let i = 0; i < state.unsignedTransactions.length; i++) {
        const tx = state.unsignedTransactions[i];
        lines.push(`| ${i + 1} | ${tx.phase} | ${tx.ledger.toUpperCase()} | ${tx.status} | ${tx.description} |`);
      }
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // ── Errors ──────────────────────────────────────────────────
    if (state.errors.length > 0) {
      lines.push('## ⚠️ Errors');
      lines.push('');
      for (const err of state.errors) {
        lines.push(`- **[${err.code}]** ${err.phase}: ${err.message} (${err.recoverable ? 'recoverable' : '**non-recoverable**'})`);
      }
      lines.push('');
    }

    // ── Footer ──────────────────────────────────────────────────
    lines.push('---');
    lines.push('');
    lines.push(`*Report generated by @optkas/funding-ops v1.0.0*`);
    lines.push(`*Owner: OPTKAS1-MAIN SPV — Built by Unykorn 7777, Inc.*`);
    lines.push(`*Report Hash: \`${crypto.createHash('sha256').update(lines.join('\n')).digest('hex').substring(0, 16)}...\`*`);

    return lines.join('\n');
  }

  /**
   * Generate a JSON execution report.
   */
  static generateJSON(
    state: FundingPipelineState,
    readiness?: FundingReadinessReport,
    xrplActivation?: ActivationResult,
    stellarActivation?: StellarActivationResult,
  ): object {
    const report = {
      reportId: `RPT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      generatedAt: new Date().toISOString(),
      pipeline: {
        id: state.id,
        status: state.status,
        currentPhase: state.currentPhase,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
        phasesCompleted: state.phases.filter(p => p.status === 'completed').length,
        totalPhases: state.phases.length,
      },
      readiness: readiness ? {
        overall: readiness.overall,
        checksTotal: readiness.checks.length,
        checksPassed: readiness.checks.filter(c => c.passed).length,
        blockingIssues: readiness.blockingIssues,
        warnings: readiness.warnings,
      } : null,
      xrpl: xrplActivation ? {
        allAccountsReady: xrplActivation.allAccountsReady,
        allTrustlinesDeployed: xrplActivation.allTrustlinesDeployed,
        transactions: xrplActivation.totalTransactions,
        accounts: xrplActivation.accountReadiness.map(a => ({
          role: a.role,
          address: a.address,
          exists: a.exists,
          balance: a.balance,
          reserveMet: a.reserveMet,
          trustlineCount: a.trustlines.length,
        })),
      } : null,
      stellar: stellarActivation ? {
        allAccountsReady: stellarActivation.allAccountsReady,
        regulatedAssetConfigured: stellarActivation.regulatedAssetConfigured,
        transactions: stellarActivation.totalTransactions,
        accounts: stellarActivation.accountReadiness.map(a => ({
          role: a.role,
          address: a.address,
          exists: a.exists,
          xlmBalance: a.xlmBalance,
          flags: a.flags,
          trustlineCount: a.existingTrustlines.length,
        })),
      } : null,
      bond: state.bondId ? {
        bondId: state.bondId,
        ...(state.phases.find(p => p.phase === 'bond_creation')?.details || {}),
      } : null,
      escrows: state.escrowIds.map((id, i) => ({
        escrowId: id,
        ...(i === 0 ? state.phases.find(p => p.phase === 'escrow_creation')?.details || {} : {}),
      })),
      attestations: state.attestationHashes,
      unsignedTransactions: {
        total: state.unsignedTransactions.length,
        byLedger: {
          xrpl: state.unsignedTransactions.filter(t => t.ledger === 'xrpl').length,
          stellar: state.unsignedTransactions.filter(t => t.ledger === 'stellar').length,
        },
        byPhase: state.phases.reduce((acc, p) => {
          acc[p.phase] = p.transactionCount;
          return acc;
        }, {} as Record<string, number>),
      },
      errors: state.errors,
    };

    return report;
  }

  /**
   * Save a report to disk in both Markdown and JSON formats.
   */
  static saveReport(
    outputDir: string,
    state: FundingPipelineState,
    readiness?: FundingReadinessReport,
    xrplActivation?: ActivationResult,
    stellarActivation?: StellarActivationResult,
  ): { markdownPath: string; jsonPath: string } {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');

    const mdContent = FundingReportGenerator.generateMarkdown(state, readiness, xrplActivation, stellarActivation);
    const mdPath = path.join(outputDir, `FUNDING_REPORT_${timestamp}.md`);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    const jsonContent = FundingReportGenerator.generateJSON(state, readiness, xrplActivation, stellarActivation);
    const jsonPath = path.join(outputDir, `funding_report_${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2), 'utf-8');

    return { markdownPath: mdPath, jsonPath: jsonPath };
  }
}

export default FundingReportGenerator;
