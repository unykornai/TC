# OPTKAS Sovereign Multi-Ledger Financial Infrastructure

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              OPTKAS PLATFORM (v1.0.0)                   │
│         Sovereign Multi-Ledger Infrastructure           │
├─────────────────────────────────────────────────────────┤
│  Layer 5: Representation & Liquidity                    │
│  ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌─────────┐ │
│  │ DEX/AMM   │ │  Trading  │ │ Issuance │ │ Escrow  │ │
│  └───────────┘ └───────────┘ └──────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Ledger Evidence                               │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │   XRPL Core      │  │  Stellar Core    │            │
│  │  IOUs · Escrows   │  │  SEP-10/24/31   │            │
│  │  DEX · AMM · Memo │  │  Auth · Clawback│            │
│  └──────────────────┘  └──────────────────┘            │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Automation & Intelligence                     │
│  ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Attestation│ │   Audit   │ │ Reconcile│ │  CLI    │ │
│  └───────────┘ └───────────┘ └──────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Custody & Banking                             │
│  2-of-3 Multisig · HSM/KMS · No Keys In Code          │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Legal & Control                               │
│  OPTKAS1-MAIN SPV · Governance · Compliance            │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
OPTKAS1-Funding-System/
├── config/
│   └── platform-config.yaml        # Single source of truth
├── docs/                            # Architecture & specification docs (13 files)
│   ├── ARCHITECTURE.md
│   ├── BOND_FUNDING_LIFECYCLE.md
│   ├── GOVERNANCE.md
│   ├── TRUST_BOUNDARIES.md
│   ├── SECURITY.md
│   ├── RISK.md
│   ├── RWA_HANDLING.md
│   ├── XRPL_SPEC.md
│   ├── STELLAR_SPEC.md
│   ├── COMPLIANCE_CONTROLS.md
│   ├── AUDIT_SPEC.md
│   ├── RUNBOOKS.md
│   └── FIRST_SUCCESSFUL_RUN.md
├── packages/                        # TypeScript monorepo packages
│   ├── xrpl-core/                   # XRPL client, transactions, utilities
│   ├── stellar-core/                # Stellar client, operations, SEP support
│   ├── issuance/                    # Token issuance and trustline management
│   ├── escrow/                      # XRPL escrow with crypto-conditions
│   ├── attestation/                 # Dual-ledger hash attestation engine
│   ├── dex-amm/                     # XRPL DEX and AMM pool management
│   ├── trading/                     # Algorithmic trading with risk controls
│   └── audit/                       # Audit event store and report generation
├── scripts/                         # CLI tools (all support --dry-run)
│   ├── lib/cli-utils.ts             # Shared CLI utilities
│   ├── validate-config.ts           # Config validation
│   ├── init-platform.ts             # Platform initialization
│   ├── xrpl-*.ts                    # XRPL operations (6 scripts)
│   ├── stellar-*.ts                 # Stellar operations (4 scripts)
│   ├── reconcile-ledgers.ts         # Cross-ledger reconciliation
│   └── generate-audit-report.ts     # Audit report generation
├── apps/
│   ├── dashboard/                   # Institutional read-only dashboard
│   └── docs-site/                   # Documentation site generator
└── package.json                     # Monorepo root with npm workspaces
```

## Quick Start

```bash
# Install dependencies
npm install

# Validate configuration
npx ts-node scripts/validate-config.ts --dry-run

# Initialize platform (testnet, dry run)
npx ts-node scripts/init-platform.ts --network testnet --dry-run

# Deploy trustlines
npx ts-node scripts/xrpl-deploy-trustlines.ts --token OPTKAS.BOND --network testnet --dry-run

# Run reconciliation
npx ts-node scripts/reconcile-ledgers.ts --network testnet --dry-run

# Generate audit report
npx ts-node scripts/generate-audit-report.ts --type full --network testnet --dry-run

# Start dashboard
npx ts-node apps/dashboard/src/server.ts

# Build documentation site
npx ts-node apps/docs-site/src/build.ts
```

## Core Principles

1. **Asset ≠ Token ≠ Ownership ≠ Custody** — Ledgers provide evidence, not legal ownership
2. **All transactions prepared UNSIGNED** — Routed to 2-of-3 multisig
3. **No private keys in code** — HSM/KMS only
4. **Default: SAFE and READ-ONLY** — All scripts default to `--dry-run`
5. **Dual-ledger attestation** — Critical records anchored on both XRPL and Stellar

## Entities

| Entity | Role |
|--------|------|
| OPTKAS1-MAIN SPV | Platform owner/operator |
| Unykorn 7777, Inc. | Implementation partner |
| Independent Trustee | Escrow/collateral oversight |
| Qualified Custodian | Asset custody |

## Governance

- **Model**: 2-of-3 multisig
- **Signers**: Treasury Officer, Compliance Officer, Trustee Representative
- **Emergency**: Pause mechanism with 1-of-3 threshold
- **Rotation**: Quarterly review with attestation

---

*Built by Unykorn 7777, Inc. for OPTKAS1-MAIN SPV*
