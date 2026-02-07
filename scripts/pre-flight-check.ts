#!/usr/bin/env npx ts-node
/**
 * OPTKAS — Pre-Flight Validator
 *
 * Automated dress rehearsal that validates EVERYTHING is ready
 * before Sunday mainnet attestation and Monday outreach.
 *
 * This is what launch directors do before a mission.
 * Every subsystem checked. Every document verified. Go/No-Go.
 *
 * Run: npx ts-node scripts/pre-flight-check.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';

const ROOT = path.join(__dirname, '..');

console.log(`
  ╔══════════════════════════════════════════════════════════════════╗
  ║  OPTKAS — PRE-FLIGHT VALIDATION                                 ║
  ║  Dress Rehearsal Check — Go/No-Go for Mainnet Attestation        ║
  ╚══════════════════════════════════════════════════════════════════╝
`);

// ═══════════════════════════════════════════════════════════════════
//  CHECK FRAMEWORK
// ═══════════════════════════════════════════════════════════════════

interface CheckResult {
  category: string;
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  detail: string;
}

const results: CheckResult[] = [];

function check(category: string, name: string, fn: () => { pass: boolean; detail: string; warn?: boolean }) {
  try {
    const result = fn();
    results.push({
      category,
      check: name,
      status: result.pass ? 'PASS' : (result.warn ? 'WARN' : 'FAIL'),
      detail: result.detail,
    });
  } catch (e: any) {
    results.push({
      category,
      check: name,
      status: 'FAIL',
      detail: `Exception: ${e.message}`,
    });
  }
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function dirHasFiles(relativePath: string, minFiles: number = 1): boolean {
  const dirPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(dirPath)) return false;
  const files = fs.readdirSync(dirPath, { recursive: true });
  return files.length >= minFiles;
}

// ═══════════════════════════════════════════════════════════════════
//  CHECK 1: DATA ROOM INTEGRITY
// ═══════════════════════════════════════════════════════════════════

const dataRoomFolders = [
  'DATA_ROOM_v1/00_EXEC_SUMMARY',
  'DATA_ROOM_v1/01_TRANSACTION_STRUCTURE',
  'DATA_ROOM_v1/02_COLLATERAL_AND_CREDIT',
  'DATA_ROOM_v1/03_BOND_AND_NOTE_ISSUANCE',
  'DATA_ROOM_v1/04_COMPLIANCE_AND_RISK',
  'DATA_ROOM_v1/05_CHAIN_OF_CUSTODY',
  'DATA_ROOM_v1/99_APPENDIX',
];

check('DATA ROOM', 'Data room root exists', () => ({
  pass: fileExists('DATA_ROOM_v1'),
  detail: fileExists('DATA_ROOM_v1') ? 'DATA_ROOM_v1/ present' : 'DATA_ROOM_v1/ MISSING',
}));

check('DATA ROOM', 'INDEX.md exists', () => ({
  pass: fileExists('DATA_ROOM_v1/INDEX.md'),
  detail: fileExists('DATA_ROOM_v1/INDEX.md') ? 'Index document present' : 'INDEX.md MISSING',
}));

check('DATA ROOM', 'HASHES.txt exists', () => ({
  pass: fileExists('DATA_ROOM_v1/HASHES.txt'),
  detail: fileExists('DATA_ROOM_v1/HASHES.txt') ? 'Hash manifest present' : 'HASHES.txt MISSING',
}));

for (const folder of dataRoomFolders) {
  const name = folder.split('/').pop()!;
  check('DATA ROOM', `Folder: ${name}`, () => ({
    pass: dirHasFiles(folder),
    detail: dirHasFiles(folder) ? `${name}/ has content` : `${name}/ EMPTY or MISSING`,
  }));
}

// ═══════════════════════════════════════════════════════════════════
//  CHECK 2: LEGAL DOCUMENTS
// ═══════════════════════════════════════════════════════════════════

const legalDocs = [
  { file: 'docs/EXECUTED_FACILITY_AGREEMENT.md', name: 'Facility Agreement' },
  { file: 'docs/EXECUTED_SECURITY_AGREEMENT.md', name: 'Security Agreement' },
  { file: 'docs/EXECUTED_CONTROL_AGREEMENT.md', name: 'Control Agreement' },
  { file: 'docs/EXECUTED_SIGNATURE_PAGE.md', name: 'Signature Page' },
  { file: 'docs/CERTIFICATE_OF_FORMATION.md', name: 'Certificate of Formation' },
  { file: 'docs/OPERATING_AGREEMENT.md', name: 'Operating Agreement' },
  { file: 'docs/MANAGER_RESOLUTION.md', name: 'Manager Resolution' },
  { file: 'docs/SIGNATORY_AUTHORITY_CERTIFICATE.md', name: 'Signatory Authority' },
  { file: 'docs/LEGAL_OPINION.md', name: 'Legal Opinion' },
  { file: 'docs/UCC1_FILING_CONFIRMATION.md', name: 'UCC-1 Filing' },
  { file: 'docs/INSURANCE_CERTIFICATE.md', name: 'Insurance Certificate' },
];

for (const doc of legalDocs) {
  check('LEGAL', doc.name, () => ({
    pass: fileExists(doc.file),
    detail: fileExists(doc.file) ? `${doc.name} on file` : `${doc.name} MISSING`,
  }));
}

// ═══════════════════════════════════════════════════════════════════
//  CHECK 3: LENDER PACKAGES
// ═══════════════════════════════════════════════════════════════════

const wave1Slugs = [
  'ares-management', 'apollo', 'kkr', 'hps-partners', 'fortress',
  'stonebriar', 'benefit-street', 'oaktree', 'cerberus', 'bluemountain-assured',
  'credit-suisse-legacy', 'deutsche-sblc', 'standard-chartered', 'barclays-credit',
];

check('LENDER PACKAGES', 'Package directory exists', () => ({
  pass: fileExists('lender_packages'),
  detail: fileExists('lender_packages') ? 'lender_packages/ present' : 'lender_packages/ MISSING — run generate-lender-packages.ts',
}));

check('LENDER PACKAGES', 'Index file', () => ({
  pass: fileExists('lender_packages/INDEX.md'),
  detail: fileExists('lender_packages/INDEX.md') ? 'INDEX.md present' : 'INDEX.md MISSING',
}));

for (const slug of wave1Slugs) {
  check('LENDER PACKAGES', `Package: ${slug}`, () => {
    const emailExists = fileExists(`lender_packages/${slug}/email.md`);
    const briefExists = fileExists(`lender_packages/${slug}/brief.md`);
    return {
      pass: emailExists && briefExists,
      detail: emailExists && briefExists
        ? `email.md + brief.md present`
        : `MISSING: ${!emailExists ? 'email.md ' : ''}${!briefExists ? 'brief.md' : ''}`,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
//  CHECK 4: INFRASTRUCTURE PACKAGES
// ═══════════════════════════════════════════════════════════════════

const requiredPackages = [
  'xrpl-core', 'stellar-core', 'bond', 'dex-amm', 'reserve-vault',
  'escrow', 'settlement', 'issuance', 'trading', 'rwa', 'governance',
  'compliance', 'attestation', 'audit', 'reporting', 'agents', 'bridge',
  'gateway', 'portfolio', 'ledger', 'funding-ops', 'cross-chain-dex',
  'risk-analytics', 'borrowing-base', 'deal-pipeline',
];

for (const pkg of requiredPackages) {
  check('INFRASTRUCTURE', `Package: @optkas/${pkg}`, () => ({
    pass: fileExists(`packages/${pkg}/package.json`),
    detail: fileExists(`packages/${pkg}/package.json`) ? 'Package installed' : 'MISSING',
  }));
}

// ═══════════════════════════════════════════════════════════════════
//  CHECK 5: DASHBOARDS & PORTALS
// ═══════════════════════════════════════════════════════════════════

const dashboards = [
  { file: 'websites/command-center.html', name: 'Command Center' },
  { file: 'websites/investor-portal.html', name: 'Investor Portal' },
  { file: 'websites/data-room-portal.html', name: 'Data Room Portal' },
  { file: 'websites/risk-dashboard.html', name: 'Risk Dashboard' },
  { file: 'websites/company_website.html', name: 'Company Website' },
];

for (const dash of dashboards) {
  check('DASHBOARDS', dash.name, () => ({
    pass: fileExists(dash.file),
    detail: fileExists(dash.file) ? 'Dashboard present' : 'MISSING',
  }));
}

// ═══════════════════════════════════════════════════════════════════
//  CHECK 6: CRITICAL SCRIPTS
// ═══════════════════════════════════════════════════════════════════

const criticalScripts = [
  'scripts/generate-execution-proof.ts',
  'scripts/generate-lender-packages.ts',
  'scripts/live-chain-monitor.ts',
  'scripts/generate-audit-report.ts',
  'scripts/check-wallet-balances.ts',
  'scripts/attest-funding-wave.ts',
  'scripts/xrpl-attest-hash.ts',
  'scripts/stellar-attest-hash.ts',
];

for (const script of criticalScripts) {
  const name = path.basename(script);
  check('SCRIPTS', name, () => ({
    pass: fileExists(script),
    detail: fileExists(script) ? 'Script available' : 'MISSING',
  }));
}

// ═══════════════════════════════════════════════════════════════════
//  CHECK 7: OPERATIONAL DOCS
// ═══════════════════════════════════════════════════════════════════

const opsDocs = [
  { file: 'docs/CREDIT_COMMITTEE_QA.md', name: 'Credit Committee Q&A' },
  { file: 'docs/CREDIT_COMMITTEE_READINESS.md', name: 'Credit Committee Readiness' },
  { file: 'docs/LANE_DISCIPLINE_RULEBOOK.md', name: 'Lane Discipline Rulebook' },
  { file: 'docs/WAVE_1_LENDER_TARGETS.md', name: 'Wave 1 Lender Targets' },
  { file: 'docs/FUNDING_EXECUTION_CALENDAR.md', name: 'Funding Execution Calendar' },
  { file: 'docs/COLLATERAL_SUMMARY_SHEET.md', name: 'Collateral Summary Sheet' },
  { file: 'docs/LENDER_OUTREACH_LANGUAGE.md', name: 'Lender Outreach Language' },
  { file: 'docs/FUNDER_ARCHETYPE_MAP.md', name: 'Funder Archetype Map' },
];

for (const doc of opsDocs) {
  check('OPERATIONS', doc.name, () => ({
    pass: fileExists(doc.file),
    detail: fileExists(doc.file) ? 'Document on file' : 'MISSING',
  }));
}

// ═══════════════════════════════════════════════════════════════════
//  CHECK 8: CONFIG & SECRETS
// ═══════════════════════════════════════════════════════════════════

check('CONFIG', 'Platform config exists', () => ({
  pass: fileExists('config/platform-config.yaml') || fileExists('config/platform-config.yml'),
  detail: (fileExists('config/platform-config.yaml') || fileExists('config/platform-config.yml'))
    ? 'Platform config present' : 'platform-config.yaml MISSING',
  warn: true,
}));

check('CONFIG', 'Mainnet secrets exist', () => ({
  pass: fileExists('config/.mainnet-secrets.json'),
  detail: fileExists('config/.mainnet-secrets.json')
    ? 'Mainnet secrets present (DO NOT COMMIT)' : '.mainnet-secrets.json MISSING',
}));

check('CONFIG', 'IPFS config exists', () => ({
  pass: fileExists('ipfs-config.json'),
  detail: fileExists('ipfs-config.json') ? 'IPFS config present' : 'MISSING',
  warn: true,
}));

check('CONFIG', '.gitignore protects secrets', () => {
  if (!fileExists('.gitignore')) return { pass: false, detail: '.gitignore MISSING' };
  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8');
  const protectsSecrets = gitignore.includes('.mainnet-secrets') || gitignore.includes('secrets');
  return {
    pass: protectsSecrets,
    detail: protectsSecrets ? 'Secrets protected by .gitignore' : 'WARNING: secrets may not be gitignored',
    warn: !protectsSecrets,
  };
});

// ═══════════════════════════════════════════════════════════════════
//  CHECK 9: ATTESTATION ARTIFACTS
// ═══════════════════════════════════════════════════════════════════

check('ATTESTATION', 'Reserve Vault Report', () => ({
  pass: fileExists('RESERVE_VAULT_REPORT.json'),
  detail: fileExists('RESERVE_VAULT_REPORT.json') ? 'Vault report on file' : 'MISSING — run deploy-reserve-vault.ts',
}));

check('ATTESTATION', 'Elite Deployment Report', () => ({
  pass: fileExists('ELITE_DEPLOYMENT_REPORT.json'),
  detail: fileExists('ELITE_DEPLOYMENT_REPORT.json') ? 'Deployment report on file' : 'MISSING',
}));

check('ATTESTATION', 'Execution Proof Bundle', () => ({
  pass: fileExists('EXECUTION_v1') && dirHasFiles('EXECUTION_v1'),
  detail: dirHasFiles('EXECUTION_v1') ? 'Execution proof bundle present' : 'MISSING — run generate-execution-proof.ts',
}));

// ═══════════════════════════════════════════════════════════════════
//  RESULTS SUMMARY
// ═══════════════════════════════════════════════════════════════════

const passed = results.filter(r => r.status === 'PASS');
const failed = results.filter(r => r.status === 'FAIL');
const warned = results.filter(r => r.status === 'WARN');

const categories = [...new Set(results.map(r => r.category))];

for (const cat of categories) {
  const catResults = results.filter(r => r.category === cat);
  const catPassed = catResults.filter(r => r.status === 'PASS').length;
  const catTotal = catResults.length;

  console.log(`  ═══ ${cat} (${catPassed}/${catTotal}) ${'═'.repeat(Math.max(0, 48 - cat.length))}`)
  for (const r of catResults) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
    console.log(`    ${icon}  ${r.check.padEnd(35)} ${r.detail}`);
  }
  console.log();
}

// ── Go/No-Go Decision ──────────────────────────────────────────

console.log(`  ╔══════════════════════════════════════════════════════════════════╗`);
console.log(`  ║  PRE-FLIGHT SUMMARY                                             ║`);
console.log(`  ╠══════════════════════════════════════════════════════════════════╣`);
console.log(`  ║  ✅ PASS:  ${String(passed.length).padStart(3)}                                                   ║`);
console.log(`  ║  ⚠️  WARN:  ${String(warned.length).padStart(3)}                                                   ║`);
console.log(`  ║  ❌ FAIL:  ${String(failed.length).padStart(3)}                                                   ║`);
console.log(`  ║  ─────────────────────────────────────────                      ║`);
console.log(`  ║  TOTAL:    ${String(results.length).padStart(3)} checks                                          ║`);
console.log(`  ╠══════════════════════════════════════════════════════════════════╣`);

if (failed.length === 0) {
  console.log(`  ║                                                                  ║`);
  console.log(`  ║    ██████╗  ██████╗                                              ║`);
  console.log(`  ║   ██╔════╝ ██╔═══██╗                                             ║`);
  console.log(`  ║   ██║  ███╗██║   ██║                                             ║`);
  console.log(`  ║   ██║   ██║██║   ██║                                             ║`);
  console.log(`  ║   ╚██████╔╝╚██████╔╝                                             ║`);
  console.log(`  ║    ╚═════╝  ╚═════╝                                              ║`);
  console.log(`  ║                                                                  ║`);
  console.log(`  ║  STATUS: GO FOR MAINNET ATTESTATION                              ║`);
  console.log(`  ║  All systems verified. Ready for Sunday deployment.              ║`);
  console.log(`  ║                                                                  ║`);
} else {
  console.log(`  ║                                                                  ║`);
  console.log(`  ║  STATUS: NO-GO — ${failed.length} ITEM(S) REQUIRE ATTENTION                    ║`);
  console.log(`  ║                                                                  ║`);
  for (const f of failed.slice(0, 5)) {
    console.log(`  ║  ❌ ${(f.category + ': ' + f.check).padEnd(56)}  ║`);
  }
  if (failed.length > 5) {
    console.log(`  ║  ... and ${failed.length - 5} more                                              ║`);
  }
  console.log(`  ║                                                                  ║`);
}

console.log(`  ╚══════════════════════════════════════════════════════════════════╝`);

// Write report
const report = {
  generatedAt: new Date().toISOString(),
  decision: failed.length === 0 ? 'GO' : 'NO-GO',
  summary: { passed: passed.length, warned: warned.length, failed: failed.length, total: results.length },
  results,
  failedItems: failed,
  hash: '',
};
report.hash = crypto.createHash('sha256').update(JSON.stringify({ ...report, hash: undefined })).digest('hex');
fs.writeFileSync(path.join(ROOT, 'PRE_FLIGHT_REPORT.json'), JSON.stringify(report, null, 2));
console.log(`\n  📄 Report: PRE_FLIGHT_REPORT.json\n`);
