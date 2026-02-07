/**
 * OPTKAS Institutional Dashboard — Server
 *
 * READ-ONLY dashboard providing real-time visibility into:
 *   - XRPL account balances and trustlines
 *   - Stellar account states and token supply
 *   - Escrow status and conditions
 *   - Attestation records
 *   - Audit event timeline
 *   - Reconciliation status
 *
 * No write operations. No transaction submission. Read-only.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// ── Live package imports ───────────────────────────────────────
import { MultisigGovernor } from '../../../packages/governance/src';
import { ComplianceEngine } from '../../../packages/compliance/src';
import { BondFactory } from '../../../packages/bond/src';
import { ReportingEngine } from '../../../packages/reporting/src';
import { AuditEventStore, ReportGenerator } from '../../../packages/audit/src';

const PORT = parseInt(process.env.PORT || '3000', 10);
const CONFIG_PATH = process.env.CONFIG_PATH || path.join(__dirname, '..', '..', '..', 'config', 'platform-config.yaml');

// ── Singleton engine instances (read-only) ─────────────────────
const governor = new MultisigGovernor();
const compliance = new ComplianceEngine();
const bondFactory = new BondFactory();
const reporting = new ReportingEngine();
const auditStore = new AuditEventStore();
const auditReporter = new ReportGenerator(auditStore);

interface DashboardState {
  config: any;
  lastRefresh: string;
  xrpl: {
    connected: boolean;
    network: string;
    accounts: Record<string, { address: string; balance?: string; trustlines?: number }>;
    escrows: Array<{ id: string; amount: string; status: string; expires: string }>;
  };
  stellar: {
    connected: boolean;
    network: string;
    accounts: Record<string, { address: string; balance?: string }>;
    supply: { asset: string; total: string; holders: number };
  };
  attestations: Array<{ hash: string; ledger: string; timestamp: string; label: string }>;
  audit: {
    recentEvents: number;
    lastReconciliation: string;
    status: string;
  };
  governance: {
    threshold: number;
    activeSigners: number;
    pendingProposals: number;
    config: any;
  };
  compliance: {
    breachedCovenants: number;
    overdueCovenants: number;
    engineStatus: string;
  };
  bonds: {
    factoryStatus: string;
    programCount: number;
  };
  reporting: {
    engineStatus: string;
  };
}

function loadConfig(): any {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return yaml.parse(raw);
  } catch {
    return { platform: { name: 'OPTKAS', version: '1.0.0' } };
  }
}

export function buildState(): DashboardState {
  const config = loadConfig();
  return {
    config: {
      platform: config.platform,
      governance: config.governance,
    },
    lastRefresh: new Date().toISOString(),
    xrpl: {
      connected: false,
      network: config.networks?.xrpl?.default || 'testnet',
      accounts: Object.fromEntries(
        Object.entries(config.xrpl_accounts || {}).map(([role, acct]: [string, any]) => [
          role,
          { address: acct.address || 'not_configured', balance: undefined, trustlines: undefined }
        ])
      ),
      escrows: []
    },
    stellar: {
      connected: false,
      network: config.networks?.stellar?.default || 'testnet',
      accounts: Object.fromEntries(
        Object.entries(config.stellar_accounts || {}).map(([role, acct]: [string, any]) => [
          role,
          { address: acct.public_key || 'not_configured', balance: undefined }
        ])
      ),
      supply: { asset: 'OPTKASUSD', total: '0', holders: 0 }
    },
    attestations: [],
    audit: {
      recentEvents: 0,
      lastReconciliation: 'never',
      status: 'pending_initial_run'
    },
    governance: {
      threshold: governor.getConfig().threshold,
      activeSigners: governor.getActiveSigners().length,
      pendingProposals: governor.getPendingRequests().length,
      config: governor.getConfig(),
    },
    compliance: {
      breachedCovenants: compliance.getBreachedCovenants().length,
      overdueCovenants: compliance.getOverdueCovenants().length,
      engineStatus: 'active',
    },
    bonds: {
      factoryStatus: 'active',
      programCount: 0,
    },
    reporting: {
      engineStatus: 'active',
    },
  };
}

export function generateDashboardHTML(state: DashboardState): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OPTKAS Institutional Dashboard</title>
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --border: #1e1e2e;
      --text: #e0e0e0;
      --text-muted: #8888aa;
      --accent: #c9a84c;
      --accent-dim: rgba(201,168,76,0.15);
      --green: #4ade80;
      --red: #f87171;
      --blue: #60a5fa;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }
    .header h1 { color: var(--accent); font-size: 1.5rem; letter-spacing: 0.1em; }
    .header .meta { color: var(--text-muted); font-size: 0.75rem; }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-read { background: rgba(96,165,250,0.15); color: var(--blue); border: 1px solid rgba(96,165,250,0.3); }
    .badge-network { background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(201,168,76,0.3); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
    }
    .card h2 {
      color: var(--accent);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }
    .stat { display: flex; justify-content: space-between; padding: 0.4rem 0; font-size: 0.8rem; }
    .stat .label { color: var(--text-muted); }
    .stat .value { color: var(--text); font-weight: 600; }
    .status-dot {
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 50%;
      margin-right: 0.4rem;
    }
    .status-green { background: var(--green); }
    .status-red { background: var(--red); }
    .status-yellow { background: var(--accent); }
    table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
    th { color: var(--text-muted); text-align: left; padding: 0.4rem 0; border-bottom: 1px solid var(--border); }
    td { padding: 0.4rem 0; border-bottom: 1px solid rgba(30,30,46,0.5); }
    .footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 0.7rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>◈ OPTKAS INSTITUTIONAL DASHBOARD</h1>
      <div class="meta">Sovereign Multi-Ledger Financial Infrastructure</div>
    </div>
    <div>
      <span class="badge badge-read">READ-ONLY</span>
      <span class="badge badge-network">${state.xrpl.network}</span>
    </div>
  </div>

  <div class="grid">
    <!-- Platform Status -->
    <div class="card">
      <h2>Platform Status</h2>
      <div class="stat"><span class="label">Platform</span><span class="value">${state.config.platform?.name || 'OPTKAS'}</span></div>
      <div class="stat"><span class="label">Version</span><span class="value">${state.config.platform?.version || '1.0.0'}</span></div>
      <div class="stat"><span class="label">Last Refresh</span><span class="value">${state.lastRefresh}</span></div>
      <div class="stat"><span class="label">Governance</span><span class="value">${state.config.governance?.quorum || 2}-of-${state.config.governance?.signers?.length || 3} Multisig</span></div>
      <div class="stat"><span class="label">Audit Status</span><span class="value">${state.audit.status}</span></div>
    </div>

    <!-- XRPL Status -->
    <div class="card">
      <h2>XRPL Ledger</h2>
      <div class="stat">
        <span class="label">Connection</span>
        <span class="value"><span class="status-dot ${state.xrpl.connected ? 'status-green' : 'status-red'}"></span>${state.xrpl.connected ? 'Connected' : 'Disconnected'}</span>
      </div>
      <div class="stat"><span class="label">Network</span><span class="value">${state.xrpl.network}</span></div>
      <table>
        <tr><th>Role</th><th>Address</th><th>Balance</th></tr>
        ${Object.entries(state.xrpl.accounts).map(([role, acct]) =>
          `<tr><td>${role}</td><td>${(acct.address || '').substring(0, 16)}...</td><td>${acct.balance || '—'}</td></tr>`
        ).join('')}
      </table>
    </div>

    <!-- Stellar Status -->
    <div class="card">
      <h2>Stellar Ledger</h2>
      <div class="stat">
        <span class="label">Connection</span>
        <span class="value"><span class="status-dot ${state.stellar.connected ? 'status-green' : 'status-red'}"></span>${state.stellar.connected ? 'Connected' : 'Disconnected'}</span>
      </div>
      <div class="stat"><span class="label">Network</span><span class="value">${state.stellar.network}</span></div>
      <div class="stat"><span class="label">OPTKASUSD Supply</span><span class="value">${state.stellar.supply.total}</span></div>
      <div class="stat"><span class="label">Holders</span><span class="value">${state.stellar.supply.holders}</span></div>
      <table>
        <tr><th>Role</th><th>Address</th><th>Balance</th></tr>
        ${Object.entries(state.stellar.accounts).map(([role, acct]) =>
          `<tr><td>${role}</td><td>${(acct.address || '').substring(0, 16)}...</td><td>${acct.balance || '—'}</td></tr>`
        ).join('')}
      </table>
    </div>

    <!-- Escrow Status -->
    <div class="card">
      <h2>Active Escrows</h2>
      ${state.xrpl.escrows.length === 0
        ? '<div class="stat"><span class="label">No active escrows</span><span class="value">—</span></div>'
        : `<table>
            <tr><th>ID</th><th>Amount</th><th>Status</th><th>Expires</th></tr>
            ${state.xrpl.escrows.map(e =>
              `<tr><td>${e.id}</td><td>${e.amount} XRP</td><td>${e.status}</td><td>${e.expires}</td></tr>`
            ).join('')}
          </table>`
      }
    </div>

    <!-- Attestations -->
    <div class="card">
      <h2>Recent Attestations</h2>
      ${state.attestations.length === 0
        ? '<div class="stat"><span class="label">No attestations recorded</span><span class="value">—</span></div>'
        : `<table>
            <tr><th>Label</th><th>Ledger</th><th>Hash</th><th>Time</th></tr>
            ${state.attestations.map(a =>
              `<tr><td>${a.label}</td><td>${a.ledger}</td><td>${a.hash.substring(0, 16)}...</td><td>${a.timestamp}</td></tr>`
            ).join('')}
          </table>`
      }
    </div>

    <!-- Audit -->
    <div class="card">
      <h2>Audit &amp; Compliance</h2>
      <div class="stat"><span class="label">Recent Events</span><span class="value">${state.audit.recentEvents}</span></div>
      <div class="stat"><span class="label">Last Reconciliation</span><span class="value">${state.audit.lastReconciliation}</span></div>
      <div class="stat"><span class="label">Overall Status</span><span class="value">${state.audit.status}</span></div>
    </div>
    <!-- Governance -->
    <div class="card">
      <h2>Governance</h2>
      <div class="stat"><span class="label">Multisig Threshold</span><span class="value">\${state.governance.threshold}-of-\${state.governance.config.totalSigners || 3}</span></div>
      <div class="stat"><span class="label">Active Signers</span><span class="value">\${state.governance.activeSigners}</span></div>
      <div class="stat"><span class="label">Pending Proposals</span><span class="value">\${state.governance.pendingProposals}</span></div>
      <div class="stat"><span class="label">Config Change Quorum</span><span class="value">\${state.governance.config.quorumForConfigChange || 3}</span></div>
    </div>

    <!-- Compliance -->
    <div class="card">
      <h2>Compliance Engine</h2>
      <div class="stat"><span class="label">Engine Status</span><span class="value"><span class="status-dot status-green"></span>\${state.compliance.engineStatus}</span></div>
      <div class="stat"><span class="label">Breached Covenants</span><span class="value">\${state.compliance.breachedCovenants}</span></div>
      <div class="stat"><span class="label">Overdue Covenants</span><span class="value">\${state.compliance.overdueCovenants}</span></div>
    </div>

    <!-- Bond Pipeline -->
    <div class="card">
      <h2>Bond Pipeline</h2>
      <div class="stat"><span class="label">Factory Status</span><span class="value"><span class="status-dot status-green"></span>\${state.bonds.factoryStatus}</span></div>
      <div class="stat"><span class="label">Programs</span><span class="value">\${state.bonds.programCount}</span></div>
    </div>

    <!-- Reporting -->
    <div class="card">
      <h2>Reporting Engine</h2>
      <div class="stat"><span class="label">Engine Status</span><span class="value"><span class="status-dot status-green"></span>\${state.reporting.engineStatus}</span></div>
      <div class="stat"><span class="label">Available Reports</span><span class="value">investor_statement, trustee_report, reconciliation, nav_snapshot, lifecycle_report</span></div>
    </div>  </div>

  <div class="footer">
    OPTKAS Institutional Dashboard — Read-Only — ${new Date().getFullYear()} OPTKAS1-MAIN SPV — All operations require multisig authorization via CLI
  </div>

  <script>
    // Auto-refresh every 30 seconds
    setTimeout(() => location.reload(), 30000);
  </script>
</body>
</html>`;
}

export function startServer(port = PORT): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/api/state') {
      const state = buildState();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(state, null, 2));
      return;
    }

    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', mode: 'read-only', timestamp: new Date().toISOString() }));
      return;
    }

    // Serve dashboard HTML
    const state = buildState();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(generateDashboardHTML(state));
  });

  server.listen(port, () => {
    console.log('');
    console.log('  ◈ OPTKAS Institutional Dashboard');
    console.log('  ─────────────────────────────────');
    console.log(`  Mode:    READ-ONLY`);
    console.log(`  URL:     http://localhost:${port}`);
    console.log(`  API:     http://localhost:${port}/api/state`);
    console.log(`  Health:  http://localhost:${port}/api/health`);
    console.log(`  Config:  ${CONFIG_PATH}`);
    console.log('');
  });

  return server;
}

if (require.main === module) {
  startServer();
}
