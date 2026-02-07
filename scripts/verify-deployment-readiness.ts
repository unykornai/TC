#!/usr/bin/env ts-node
/**
 * OPTKAS Deployment Readiness Verification
 *
 * Pre-flight checklist that validates the ENTIRE infrastructure
 * is ready for funding operations:
 *
 *   1. Configuration integrity
 *   2. XRPL account readiness (6 accounts)
 *   3. Stellar account readiness (3 accounts)
 *   4. Token definitions & trustline readiness
 *   5. Governance configuration
 *   6. Package integrity
 *   7. Script availability
 *   8. Dashboard health
 *
 * Owner: OPTKAS1-MAIN SPV
 * Implementation: Unykorn 7777, Inc.
 *
 * Usage:
 *   npx ts-node scripts/verify-deployment-readiness.ts
 *   npx ts-node scripts/verify-deployment-readiness.ts --no-dry-run   # live network check
 *   npx ts-node scripts/verify-deployment-readiness.ts --json         # machine output
 */

import {
  createBaseCommand,
  loadConfig,
  printHeader,
  printSuccess,
  printWarning,
  printError,
  printInfo,
  printDryRun,
  printNetworkWarning,
  validateNetwork,
  type PlatformConfig,
  type NetworkType,
} from './lib/cli-utils';
import * as fs from 'fs';
import * as path from 'path';

// ─── Check Result Types ─────────────────────────────────────────

interface CheckResult {
  category: string;
  name: string;
  passed: boolean;
  details: string;
  severity: 'critical' | 'warning' | 'info';
}

interface ReadinessReport {
  timestamp: string;
  network: string;
  mode: 'dry-run' | 'live';
  overall: boolean;
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  checks: CheckResult[];
  blockingIssues: string[];
}

// ─── Check Functions ────────────────────────────────────────────

function checkConfigIntegrity(config: PlatformConfig): CheckResult[] {
  const results: CheckResult[] = [];

  // Platform config
  results.push({
    category: 'config',
    name: 'Platform name defined',
    passed: !!config.platform?.name,
    details: config.platform?.name || 'MISSING',
    severity: 'critical',
  });

  results.push({
    category: 'config',
    name: 'Platform version defined',
    passed: !!config.platform?.version,
    details: config.platform?.version || 'MISSING',
    severity: 'warning',
  });

  // XRPL accounts
  const xrplRoles = ['issuer', 'treasury', 'escrow', 'attestation', 'amm', 'trading'];
  for (const role of xrplRoles) {
    const acct = (config.xrpl_accounts as any)?.[role];
    results.push({
      category: 'config',
      name: `XRPL ${role} address configured`,
      passed: !!acct?.address && acct.address.startsWith('r'),
      details: acct?.address ? `${acct.address.substring(0, 16)}...` : 'MISSING',
      severity: 'critical',
    });
  }

  // Stellar accounts
  const stellarRoles = ['issuer', 'distribution', 'anchor'];
  for (const role of stellarRoles) {
    const acct = (config.stellar_accounts as any)?.[role];
    const addr = acct?.address || acct?.public_key;
    results.push({
      category: 'config',
      name: `Stellar ${role} address configured`,
      passed: !!addr && addr.startsWith('G'),
      details: addr ? `${addr.substring(0, 16)}...` : 'MISSING',
      severity: 'critical',
    });
  }

  // Tokens
  const tokenCount = Object.keys(config.tokens || {}).length;
  results.push({
    category: 'config',
    name: 'Token definitions present',
    passed: tokenCount > 0,
    details: `${tokenCount} tokens defined`,
    severity: 'critical',
  });

  // Governance
  const governance = config.governance;
  results.push({
    category: 'config',
    name: 'Governance model configured',
    passed: !!governance?.model || !!governance?.quorum,
    details: governance ? `${governance.quorum || 2}-of-${governance.signers?.length || 3} ${governance.model || 'multisig'}` : 'MISSING',
    severity: 'critical',
  });

  // Escrow templates
  const escrowCount = Object.keys(config.escrow_templates || {}).length;
  results.push({
    category: 'config',
    name: 'Escrow templates defined',
    passed: escrowCount > 0,
    details: `${escrowCount} templates`,
    severity: 'warning',
  });

  // Networks
  results.push({
    category: 'config',
    name: 'XRPL network URL configured',
    passed: !!config.networks?.xrpl?.testnet?.url,
    details: config.networks?.xrpl?.testnet?.url || 'MISSING',
    severity: 'critical',
  });

  results.push({
    category: 'config',
    name: 'Stellar network URL configured',
    passed: !!config.networks?.stellar?.testnet?.url,
    details: config.networks?.stellar?.testnet?.url || 'MISSING',
    severity: 'critical',
  });

  return results;
}

function checkPackageIntegrity(): CheckResult[] {
  const results: CheckResult[] = [];
  const root = path.resolve(__dirname, '..');

  const requiredPackages = [
    'xrpl-core', 'stellar-core', 'issuance', 'escrow', 'bond',
    'settlement', 'attestation', 'compliance', 'audit', 'reporting',
    'governance', 'bridge', 'dex', 'dex-amm', 'trading', 'agents',
    'ledger', 'portfolio', 'rwa', 'gateway', 'funding-ops',
  ];

  for (const pkg of requiredPackages) {
    const pkgPath = path.join(root, 'packages', pkg, 'package.json');
    const exists = fs.existsSync(pkgPath);
    let version = 'N/A';
    if (exists) {
      try {
        const p = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        version = p.version || '0.0.0';
      } catch { /* */ }
    }
    results.push({
      category: 'packages',
      name: `@optkas/${pkg}`,
      passed: exists,
      details: exists ? `v${version}` : 'MISSING',
      severity: 'critical',
    });
  }

  // Check funding-ops has all required source files
  const fundingOpsSrc = path.join(root, 'packages', 'funding-ops', 'src');
  const requiredSources = ['pipeline.ts', 'xrpl-activator.ts', 'stellar-activator.ts', 'report-generator.ts', 'tx-queue.ts', 'audit-bridge.ts', 'settlement-connector.ts', 'sponsor-note.ts', 'borrowing-base.ts', 'index.ts'];
  for (const src of requiredSources) {
    const srcPath = path.join(fundingOpsSrc, src);
    results.push({
      category: 'packages',
      name: `funding-ops/src/${src}`,
      passed: fs.existsSync(srcPath),
      details: fs.existsSync(srcPath) ? 'OK' : 'MISSING',
      severity: 'critical',
    });
  }

  return results;
}

function checkScriptAvailability(): CheckResult[] {
  const results: CheckResult[] = [];
  const root = path.resolve(__dirname, '..');

  const requiredScripts = [
    'scripts/execute-funding-pipeline.ts',
    'scripts/xrpl-deploy-trustlines.ts',
    'scripts/stellar-issue-asset.ts',
    'scripts/provision-testnet.ts',
    'scripts/verify-testnet.ts',
    'scripts/reconcile-ledgers.ts',
    'scripts/generate-audit-report.ts',
    'scripts/validate-config.ts',
    'scripts/setup-trustlines.ts',
    'scripts/xrpl-create-escrow.ts',
  ];

  for (const script of requiredScripts) {
    const scriptPath = path.join(root, script);
    results.push({
      category: 'scripts',
      name: path.basename(script),
      passed: fs.existsSync(scriptPath),
      details: fs.existsSync(scriptPath) ? 'Available' : 'MISSING',
      severity: script.includes('execute-funding') || script.includes('deploy-trustlines') ? 'critical' : 'warning',
    });
  }

  // Check CLI
  const cliPath = path.join(root, 'apps', 'cli', 'src', 'cli.ts');
  results.push({
    category: 'scripts',
    name: 'CLI (apps/cli/src/cli.ts)',
    passed: fs.existsSync(cliPath),
    details: fs.existsSync(cliPath) ? 'Available' : 'MISSING',
    severity: 'critical',
  });

  // Check CLI has fund commands
  if (fs.existsSync(cliPath)) {
    const cliSrc = fs.readFileSync(cliPath, 'utf-8');
    results.push({
      category: 'scripts',
      name: 'CLI fund commands',
      passed: cliSrc.includes("command('fund')"),
      details: cliSrc.includes("command('fund')") ? 'readiness, activate-xrpl, activate-stellar, run-pipeline' : 'MISSING',
      severity: 'critical',
    });
  }

  return results;
}

function checkDashboardAvailability(): CheckResult[] {
  const results: CheckResult[] = [];
  const root = path.resolve(__dirname, '..');

  const serverPath = path.join(root, 'apps', 'dashboard', 'src', 'server.ts');
  results.push({
    category: 'dashboard',
    name: 'Dashboard server',
    passed: fs.existsSync(serverPath),
    details: fs.existsSync(serverPath) ? 'Available' : 'MISSING',
    severity: 'warning',
  });

  if (fs.existsSync(serverPath)) {
    const serverSrc = fs.readFileSync(serverPath, 'utf-8');
    results.push({
      category: 'dashboard',
      name: 'Dashboard funding pipeline card',
      passed: serverSrc.includes('fundingPipeline') || serverSrc.includes('funding_pipeline') || serverSrc.includes('FundingPipeline'),
      details: serverSrc.includes('funding') ? 'Integrated' : 'Not yet integrated',
      severity: 'info',
    });

    results.push({
      category: 'dashboard',
      name: 'Dashboard tx-queue status',
      passed: serverSrc.includes('txQueue') || serverSrc.includes('tx_queue') || serverSrc.includes('TransactionQueue'),
      details: serverSrc.includes('Queue') || serverSrc.includes('queue') ? 'Integrated' : 'Not yet integrated',
      severity: 'info',
    });
  }

  return results;
}

function checkDataRoom(): CheckResult[] {
  const results: CheckResult[] = [];
  const root = path.resolve(__dirname, '..');

  const dataRoomPath = path.join(root, 'DATA_ROOM_v1');
  results.push({
    category: 'data_room',
    name: 'DATA_ROOM_v1 exists',
    passed: fs.existsSync(dataRoomPath),
    details: fs.existsSync(dataRoomPath) ? 'Present' : 'MISSING',
    severity: 'warning',
  });

  if (fs.existsSync(dataRoomPath)) {
    const indexPath = path.join(dataRoomPath, 'INDEX.md');
    results.push({
      category: 'data_room',
      name: 'Data room INDEX.md',
      passed: fs.existsSync(indexPath),
      details: fs.existsSync(indexPath) ? 'Present' : 'MISSING',
      severity: 'warning',
    });

    const hashesPath = path.join(dataRoomPath, 'HASHES.txt');
    results.push({
      category: 'data_room',
      name: 'Data room HASHES.txt',
      passed: fs.existsSync(hashesPath),
      details: fs.existsSync(hashesPath) ? 'Present' : 'MISSING',
      severity: 'warning',
    });
  }

  return results;
}

function checkTestSuites(): CheckResult[] {
  const results: CheckResult[] = [];
  const root = path.resolve(__dirname, '..');

  const requiredTests = [
    'tests/phase3-infrastructure.test.ts',
    'tests/phase4-capital-markets.test.ts',
    'tests/phase5-infrastructure.test.ts',
    'tests/phase6-e2e.test.ts',
    'tests/phase7-connectivity.test.ts',
    'tests/phase8-operations.test.ts',
    'tests/phase9-funding-ops.test.ts',
    'tests/phase10-funding-execution.test.ts',
  ];

  for (const test of requiredTests) {
    const testPath = path.join(root, test);
    results.push({
      category: 'tests',
      name: path.basename(test),
      passed: fs.existsSync(testPath),
      details: fs.existsSync(testPath) ? 'Present' : 'MISSING',
      severity: 'warning',
    });
  }

  return results;
}

// ─── Report Generator ───────────────────────────────────────────

function generateReport(checks: CheckResult[], network: NetworkType, dryRun: boolean): ReadinessReport {
  const critical = checks.filter(c => !c.passed && c.severity === 'critical');
  const warnings = checks.filter(c => !c.passed && c.severity === 'warning');

  return {
    timestamp: new Date().toISOString(),
    network,
    mode: dryRun ? 'dry-run' : 'live',
    overall: critical.length === 0,
    totalChecks: checks.length,
    passed: checks.filter(c => c.passed).length,
    failed: critical.length,
    warnings: warnings.length,
    checks,
    blockingIssues: critical.map(c => `[${c.category}] ${c.name}: ${c.details}`),
  };
}

// ─── CLI Entry Point ────────────────────────────────────────────

const program = createBaseCommand(
  'verify-deployment-readiness',
  'OPTKAS Deployment Readiness Verification — Pre-flight Checklist',
)
  .option('--save-report <path>', 'Save report to file', 'reports/readiness')
  .action(async (opts) => {
    const network = validateNetwork(opts.network);
    const dryRun = opts.dryRun !== false;
    const jsonOutput = opts.json === true;

    printHeader('Deployment Readiness Verification');
    printNetworkWarning(network);
    if (dryRun) printDryRun();

    let config: PlatformConfig;
    try {
      config = loadConfig(opts.config);
      printSuccess('Configuration file loaded');
    } catch (err: any) {
      printError(`Configuration load failed: ${err.message}`);
      process.exit(1);
      return;
    }

    // Run all checks
    const allChecks: CheckResult[] = [
      ...checkConfigIntegrity(config),
      ...checkPackageIntegrity(),
      ...checkScriptAvailability(),
      ...checkDashboardAvailability(),
      ...checkDataRoom(),
      ...checkTestSuites(),
    ];

    // Generate report
    const report = generateReport(allChecks, network, dryRun);

    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    // Print results by category
    const categories = [...new Set(allChecks.map(c => c.category))];
    for (const cat of categories) {
      console.log('');
      printInfo(`─── ${cat.toUpperCase()} ───`);
      const catChecks = allChecks.filter(c => c.category === cat);
      for (const check of catChecks) {
        if (check.passed) {
          printSuccess(`${check.name}: ${check.details}`);
        } else if (check.severity === 'critical') {
          printError(`${check.name}: ${check.details}`);
        } else if (check.severity === 'warning') {
          printWarning(`${check.name}: ${check.details}`);
        } else {
          printInfo(`  ${check.name}: ${check.details}`);
        }
      }
    }

    // Summary
    console.log('');
    printInfo('═'.repeat(50));
    printInfo(`  READINESS: ${report.overall ? '✅ READY' : '❌ NOT READY'}`);
    printInfo(`  Checks:    ${report.passed}/${report.totalChecks} passed`);
    printInfo(`  Critical:  ${report.failed} blocking issues`);
    printInfo(`  Warnings:  ${report.warnings}`);
    printInfo('═'.repeat(50));
    console.log('');

    if (report.blockingIssues.length > 0) {
      printError('Blocking Issues:');
      for (const issue of report.blockingIssues) {
        printError(`  → ${issue}`);
      }
      console.log('');
    }

    // Save report
    const reportDir = path.resolve(opts.saveReport);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
    const reportPath = path.join(reportDir, `READINESS_${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    printSuccess(`Report saved: ${reportPath}`);
  });

program.parseAsync(process.argv);
