# 🏛️ OPTKAS — Sovereign Financial Platform

<div align="center">

![OPTKAS](https://img.shields.io/badge/OPTKAS-Sovereign%20Financial%20Platform-0052CC?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJMMyA3djEwbDkgNSA5LTVWN2wtOS01eiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)
![Version](https://img.shields.io/badge/Version-1.0.0-brightgreen?style=for-the-badge)
![Ledgers](https://img.shields.io/badge/Ledgers-XRPL%20%7C%20Stellar-blue?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-367%20Passing-success?style=for-the-badge)
![Phase](https://img.shields.io/badge/Phase-8%20Complete-blueviolet?style=for-the-badge)

**Multi-Ledger Bond Infrastructure · Institutional-Grade · Fully Auditable · Multisig Governed**

*Built by [Unykorn 7777, Inc.](https://github.com/unykornai) for OPTKAS1-MAIN SPV (Wyoming, USA)*

---

![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![XRPL](https://img.shields.io/badge/XRPL-v3.1.0-2B2D42?logo=ripple&logoColor=white)
![Stellar](https://img.shields.io/badge/Stellar-v11.3.0-7C3AED?logo=stellar&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-27%20Suites-C21325?logo=jest&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red)

</div>

---

## 📑 Table of Contents

> Color Legend:
> 🔴 **Critical / Security** · 🟠 **Infrastructure** · 🟡 **Configuration** · 🟢 **Operations** · 🔵 **Development** · 🟣 **Architecture**

| # | Section | Category | Description |
|---|---|---|---|
| 1 | [🟣 System Overview](#-system-overview) | Architecture | Platform identity, mission, and capabilities |
| 2 | [🟣 Architecture Layers](#-architecture-layers) | Architecture | 5-layer sovereign infrastructure model |
| 3 | [🟠 Infrastructure Map](#-infrastructure-map) | Infrastructure | Complete package tree, apps, scripts |
| 4 | [🔵 Multi-Ledger Network](#-multi-ledger-network) | Development | XRPL + Stellar network config and accounts |
| 5 | [🟡 Token Registry](#-token-registry) | Configuration | All issued tokens and their properties |
| 6 | [🔴 Governance & Multisig](#-governance--multisig) | Security | Signer roles, thresholds, emergency controls |
| 7 | [🟢 Operational Flows](#-operational-flows) | Operations | Bond lifecycle, escrow, settlement, trading |
| 8 | [🟣 Data Flow Architecture](#-data-flow-architecture) | Architecture | Transaction pipeline, attestation chain, audit trail |
| 9 | [🔴 Compliance & Audit](#-compliance--audit) | Security | KYC/AML, 7-year retention, dual-ledger hash anchoring |
| 10 | [🟠 Bridge Infrastructure](#-bridge-infrastructure) | Infrastructure | XRPL XChain sidechain bridge system |
| 11 | [🟢 AI Execution Systems](#-ai-execution-systems) | Operations | 4 AI agent systems with HITL controls |
| 12 | [🟢 CLI & Dashboard](#-cli--dashboard) | Operations | Unified CLI and institutional dashboard |
| 13 | [🟣 Institutional Funding Architecture](#-institutional-funding-architecture) | Architecture | $4M facility structure and lender pipeline |
| 14 | [🔵 Test Coverage](#-test-coverage) | Development | 27 suites, 367 tests, all green |
| 15 | [🟡 Quick Start](#-quick-start) | Configuration | Setup, install, run |

---

## 🟣 System Overview

```
╔══════════════════════════════════════════════════════════════════╗
║                OPTKAS SOVEREIGN FINANCIAL PLATFORM               ║
║                                                                  ║
║  Owner:    OPTKAS1-MAIN SPV (Wyoming, USA)                       ║
║  Builder:  Unykorn 7777, Inc.                                    ║
║  Version:  1.0.0 | Deployed: 2026-02-06                          ║
║  Ledgers:  XRPL (6 accounts) + Stellar (3 accounts)             ║
║  Tokens:   OPTKAS.BOND · OPTKAS.ESCROW · OPTKAS.ATTEST · USD    ║
║  Security: 2-of-3 multisig · never auto-signs · full audit      ║
║  Tests:    27 suites · 367 tests · 100% green                   ║
╚══════════════════════════════════════════════════════════════════╝
```

### What This System Does

OPTKAS is a **sovereign, multi-ledger bond funding infrastructure** that:

- 🏦 **Issues regulated claim receipts** on XRPL (IOUs backed by real-world assets)
- 💰 **Manages conditional escrow** with crypto-condition and time-based release
- 📜 **Anchors document hashes** on both XRPL and Stellar for dual-ledger attestation
- 🔐 **Enforces 2-of-3 multisig governance** — no single party controls funds
- 📊 **Runs algorithmic trading** with TWAP/VWAP/limit strategies and circuit breakers
- 🌉 **Bridges assets** between XRPL locking and issuing chains
- 🤖 **Deploys 4 AI execution systems** with human-in-the-loop at every critical step
- 📋 **Generates 8 types of audit reports** with 7-year retention and hash verification
- ⚖️ **Handles regulatory compliance** for US jurisdictions with freeze/clawback controls

---

## 🟣 Architecture Layers

```mermaid
graph TB
    subgraph "Layer 5 — Automation & AI"
        L5A[AI Agent Systems]
        L5B[Algorithmic Trading]
        L5C[Reconciliation Engine]
        L5D[Report Generation]
    end

    subgraph "Layer 4 — Application"
        L4A[Dashboard :3000]
        L4B[CLI Tool]
        L4C[Docs Site]
        L4D[Funding Portal]
    end

    subgraph "Layer 3 — Business Logic"
        L3A[Bond Factory]
        L3B[Escrow Manager]
        L3C[Compliance Engine]
        L3D[Portfolio Manager]
        L3E[Trading Engine]
        L3F[Settlement Engine]
        L3G[Bridge Manager]
        L3H[DEX/AMM]
    end

    subgraph "Layer 2 — Governance"
        L2A[Multisig Governor]
        L2B[Signer Registry]
        L2C[Emergency Controls]
        L2D[Audit Event Store]
    end

    subgraph "Layer 1 — Ledger Connectivity"
        L1A[XRPLClient]
        L1B[StellarClient]
        L1C[Gateway]
        L1D[Ledger Abstraction]
    end

    L5A --> L4A
    L5B --> L3E
    L5C --> L3D
    L5D --> L2D

    L4A --> L3A
    L4A --> L3B
    L4A --> L3C
    L4B --> L3A
    L4B --> L3B
    L4B --> L3D
    L4B --> L3E

    L3A --> L2A
    L3B --> L2A
    L3C --> L2D
    L3D --> L1A
    L3E --> L1A
    L3F --> L1A
    L3F --> L1B
    L3G --> L1A
    L3H --> L1A

    L2A --> L1A
    L2A --> L1B

    L1A --> XRPL[(XRPL Testnet)]
    L1B --> Stellar[(Stellar Testnet)]

    style L5A fill:#7C3AED,color:#fff
    style L5B fill:#7C3AED,color:#fff
    style L5C fill:#7C3AED,color:#fff
    style L5D fill:#7C3AED,color:#fff
    style L4A fill:#2563EB,color:#fff
    style L4B fill:#2563EB,color:#fff
    style L4C fill:#2563EB,color:#fff
    style L4D fill:#2563EB,color:#fff
    style L3A fill:#059669,color:#fff
    style L3B fill:#059669,color:#fff
    style L3C fill:#059669,color:#fff
    style L3D fill:#059669,color:#fff
    style L3E fill:#059669,color:#fff
    style L3F fill:#059669,color:#fff
    style L3G fill:#059669,color:#fff
    style L3H fill:#059669,color:#fff
    style L2A fill:#DC2626,color:#fff
    style L2B fill:#DC2626,color:#fff
    style L2C fill:#DC2626,color:#fff
    style L2D fill:#DC2626,color:#fff
    style L1A fill:#D97706,color:#fff
    style L1B fill:#D97706,color:#fff
    style L1C fill:#D97706,color:#fff
    style L1D fill:#D97706,color:#fff
    style XRPL fill:#1a1a2e,color:#fff
    style Stellar fill:#1a1a2e,color:#fff
```

### Layer Color Legend

| Layer | Color | Purpose | Packages |
|---|---|---|---|
| **Layer 5** | 🟣 Purple | Automation, AI, Reporting | `agents`, `trading`, `reporting`, `reconciliation` |
| **Layer 4** | 🔵 Blue | User-facing Applications | `dashboard`, `cli`, `docs-site`, `funding-portal` |
| **Layer 3** | 🟢 Green | Business Logic & Domain | `bond`, `escrow`, `compliance`, `portfolio`, `trading`, `settlement`, `bridge`, `dex-amm` |
| **Layer 2** | 🔴 Red | Governance & Security | `governance`, `audit`, `compliance` |
| **Layer 1** | 🟠 Orange | Ledger Connectivity | `xrpl-core`, `stellar-core`, `gateway`, `ledger` |

---

## 🟠 Infrastructure Map

### Complete Package Tree

```
OPTKAS1-Funding-System/
│
├── 📦 packages/                          # 20 Core Modules
│   ├── 🟠 xrpl-core/                    # XRPL WebSocket client, account queries, tx prep
│   ├── 🟠 stellar-core/                 # Stellar Horizon client, asset ops, SEP protocols
│   ├── 🟠 ledger/                       # Cross-ledger abstraction layer
│   ├── 🟠 gateway/                      # Fiat on/off-ramp gateway (SEP-24)
│   ├── 🔴 governance/                   # MultisigGovernor, signer registry, emergency controls
│   ├── 🔴 compliance/                   # KYC/AML, jurisdiction rules, freeze/clawback
│   ├── 🔴 audit/                        # AuditEventStore, ReportGenerator, hash anchoring
│   ├── 🟢 bond/                         # BondFactory, lifecycle management, waterfall
│   ├── 🟢 issuance/                     # IOU issuance engine, regulated asset creation
│   ├── 🟢 escrow/                       # EscrowManager, crypto-condition, time-based
│   ├── 🟢 attestation/                  # Document hash anchoring on XRPL + Stellar
│   ├── 🟢 settlement/                   # SettlementEngine, atomic cross-ledger settlement
│   ├── 🟢 portfolio/                    # PortfolioManager, NAV, P&L, exposure, IOU sync
│   ├── 🟢 rwa/                          # RWA tokenization, collateral management
│   ├── 🟢 bridge/                       # BridgeManager, XChain ops, witness config
│   ├── 🟢 dex/                          # DEX order management, pathfinding
│   ├── 🟢 dex-amm/                      # AMMManager, liquidity provision, pool creation
│   ├── 🟣 trading/                      # TradingEngine, TWAP/VWAP/limit, risk controls
│   ├── 🟣 agents/                       # AgentManager, strategy execution, dry-run
│   └── 🟣 reporting/                    # ReportingEngine, 8 report types
│
├── 🔵 apps/                              # 3 Applications
│   ├── dashboard/                        # Institutional dashboard (port 3000)
│   ├── cli/                              # Unified optkas CLI
│   └── docs-site/                        # Documentation site builder
│
├── 📜 scripts/                           # 30+ Operational Scripts
│   ├── lib/cli-utils.ts                  # Shared CLI utilities
│   ├── reconcile-ledgers.ts              # Cross-ledger reconciliation
│   ├── setup-trustlines.ts               # Trustline configuration
│   ├── provision-testnet.ts              # Testnet faucet funding
│   ├── verify-testnet.ts                 # Account verification
│   ├── generate-audit-report.ts          # 8 audit report types
│   ├── xrpl-*.ts                         # XRPL-specific operations (7 scripts)
│   ├── stellar-*.ts                      # Stellar-specific operations (4 scripts)
│   └── bond-*.ts                         # Bond lifecycle scripts (3 scripts)
│
├── ⚙️ config/
│   └── platform-config.yaml              # Master configuration (389 lines)
│
├── 🧪 tests/                             # 27 Test Suites
│   ├── phase3-infrastructure.test.ts
│   ├── phase4-capital-markets.test.ts
│   ├── phase5-infrastructure.test.ts
│   ├── phase6-e2e.test.ts
│   ├── phase7-connectivity.test.ts
│   └── phase8-operations.test.ts
│
├── 📄 docs/                              # 48 Documentation Files
│   ├── ARCHITECTURE.md
│   ├── GOVERNANCE.md
│   ├── COMPLIANCE_CONTROLS.md
│   ├── AUDIT_SPEC.md
│   ├── XRPL_SPEC.md
│   ├── STELLAR_SPEC.md
│   ├── RISK.md
│   ├── SECURITY.md
│   └── ... (40 more)
│
├── 📁 data_room/                         # Institutional Data Room
│   ├── 01_Entity/
│   ├── 02_Asset/
│   ├── 03_Facility/
│   ├── 04_Offering/
│   ├── 05_Compliance/
│   └── 06_Technical/
│
└── 📁 DATA_ROOM_v1/                      # Versioned Data Room
    ├── 00_EXEC_SUMMARY/
    ├── 01_TRANSACTION_STRUCTURE/
    ├── 02_COLLATERAL_AND_CREDIT/
    ├── 03_BOND_AND_NOTE_ISSUANCE/
    ├── 04_COMPLIANCE_AND_RISK/
    ├── 05_CHAIN_OF_CUSTODY/
    └── 99_APPENDIX/
```

### Package Dependency Graph

```mermaid
graph LR
    subgraph "Layer 1 — Ledger"
        XC[xrpl-core]
        SC[stellar-core]
        LD[ledger]
        GW[gateway]
    end

    subgraph "Layer 2 — Governance"
        GOV[governance]
        AUD[audit]
        COM[compliance]
    end

    subgraph "Layer 3 — Business"
        BND[bond]
        ESC[escrow]
        ATT[attestation]
        ISS[issuance]
        SET[settlement]
        PRT[portfolio]
        RWA[rwa]
        BRG[bridge]
        DEX[dex]
        AMM[dex-amm]
        TRD[trading]
    end

    subgraph "Layer 5 — AI"
        AGT[agents]
        RPT[reporting]
    end

    BND --> GOV
    BND --> XC
    ESC --> XC
    ESC --> GOV
    ATT --> XC
    ATT --> SC
    ISS --> XC
    ISS --> SC
    SET --> XC
    SET --> SC
    PRT --> XC
    BRG --> XC
    DEX --> XC
    AMM --> XC
    TRD --> XC
    TRD --> DEX
    GW --> SC
    LD --> XC
    LD --> SC
    AGT --> TRD
    AGT --> PRT
    RPT --> AUD
    COM --> AUD

    style XC fill:#D97706,color:#fff
    style SC fill:#D97706,color:#fff
    style LD fill:#D97706,color:#fff
    style GW fill:#D97706,color:#fff
    style GOV fill:#DC2626,color:#fff
    style AUD fill:#DC2626,color:#fff
    style COM fill:#DC2626,color:#fff
    style BND fill:#059669,color:#fff
    style ESC fill:#059669,color:#fff
    style ATT fill:#059669,color:#fff
    style ISS fill:#059669,color:#fff
    style SET fill:#059669,color:#fff
    style PRT fill:#059669,color:#fff
    style RWA fill:#059669,color:#fff
    style BRG fill:#059669,color:#fff
    style DEX fill:#059669,color:#fff
    style AMM fill:#059669,color:#fff
    style TRD fill:#059669,color:#fff
    style AGT fill:#7C3AED,color:#fff
    style RPT fill:#7C3AED,color:#fff
```

---

## 🔵 Multi-Ledger Network

### Network Topology

```mermaid
graph TB
    subgraph "XRPL Network"
        direction TB
        XN[XRPL Testnet<br/>wss://s.altnet.rippletest.net:51233]

        XI[🏦 Issuer<br/>raNh4uL8...] -->|IOUs| XN
        XT[💰 Treasury<br/>rEkMNbJ7C...] -->|Escrow Funding| XN
        XE[🔒 Escrow<br/>rwfYLR5W...] -->|Conditional Hold| XN
        XA[📜 Attestation<br/>rBp5mKc3...] -->|Hash Anchoring| XN
        XM[💧 AMM Liquidity<br/>rpoWtepE...] -->|Pool Provision| XN
        XD[📈 Trading<br/>rL17BZsL...] -->|DEX Operations| XN
    end

    subgraph "Stellar Network"
        direction TB
        SN[Stellar Testnet<br/>horizon-testnet.stellar.org]

        SI[🏦 Issuer<br/>GCYIHBAM...] -->|Regulated Assets| SN
        SD[📤 Distribution<br/>GBIBRCOA...] -->|Settlement| SN
        SA[⚓ Anchor<br/>GAMGTMQU...] -->|Fiat On/Off Ramp| SN
    end

    XN <-->|Cross-Ledger<br/>Attestation| SN

    style XN fill:#2B2D42,color:#fff
    style SN fill:#7C3AED,color:#fff
    style XI fill:#0052CC,color:#fff
    style XT fill:#059669,color:#fff
    style XE fill:#DC2626,color:#fff
    style XA fill:#D97706,color:#fff
    style XM fill:#6366F1,color:#fff
    style XD fill:#EC4899,color:#fff
    style SI fill:#0052CC,color:#fff
    style SD fill:#059669,color:#fff
    style SA fill:#D97706,color:#fff
```

### XRPL Accounts

| Role | Address | Purpose | Settings |
|---|---|---|---|
| 🏦 **Issuer** | `raNh4uL8UxiEec2nXADxFX4fFgPMaNAUYk` | IOU issuance (bonds, escrow tokens, attestation markers) | `default_ripple: true` |
| 💰 **Treasury** | `rEkMNbJ7CgnK8JnmHW2nKUpc3d5ujDqLB4` | Operational treasury, escrow funding | `require_dest_tag: true` |
| 🔒 **Escrow** | `rwfYLR5W2BXat7zKT9mA94j9kJN6cYJNNs` | Conditional settlement escrow | — |
| 📜 **Attestation** | `rBp5mKc3iY7URVmf6tiqha7uJCM3V2oVfP` | Document hash anchoring (evidence only) | No value issuance |
| 💧 **AMM Liquidity** | `rpoWtepEhM4hye2KyC5UiLdBerBNgik4bR` | AMM liquidity provision | — |
| 📈 **Trading** | `rL17BZsLq7ejPiJiY28QwmrK8NWWG8987o` | Algorithmic trading and DEX | `require_dest_tag: true` |

### Stellar Accounts

| Role | Public Key | Purpose | Settings |
|---|---|---|---|
| 🏦 **Issuer** | `GCYIHBAM2ND4E3XRUWDLVKZCLEHLH63PPXE2ZNIUXDMAETEZMSPA6U3C` | Regulated asset issuance | `auth_required`, `auth_revocable`, `clawback_enabled` |
| 📤 **Distribution** | `GBIBRCOADUPB7BDJEGLS3ZXQ2MPMDGPIEZQZF37XA5LFVO4R35Y7RNSI` | Asset distribution and settlement | — |
| ⚓ **Anchor** | `GAMGTMQUC22RLDEVIG3ZLPKENHARCCBDXGLZTTIIWYOIIQNSNZJVPK4V` | Fiat on/off-ramp (SEP-24) | — |

---

## 🟡 Token Registry

```mermaid
graph LR
    subgraph "XRPL Tokens"
        BOND[🟦 OPTKAS.BOND<br/>Claim Receipt<br/>Limit: 100M]
        ESCROW[🟩 OPTKAS.ESCROW<br/>Settlement Token<br/>Limit: 500M<br/>1:1 USD Backed]
        ATTEST[🟧 OPTKAS.ATTEST<br/>Evidence Marker<br/>Limit: 1<br/>Non-transferable]
    end

    subgraph "Stellar Tokens"
        USD[🟪 OPTKAS-USD<br/>Regulated Asset<br/>SEP-Compliant]
    end

    ISS_X[XRPL Issuer] --> BOND
    ISS_X --> ESCROW
    ATT_X[Attestation Account] --> ATTEST
    ISS_S[Stellar Issuer] --> USD

    style BOND fill:#2563EB,color:#fff
    style ESCROW fill:#059669,color:#fff
    style ATTEST fill:#D97706,color:#fff
    style USD fill:#7C3AED,color:#fff
    style ISS_X fill:#1a1a2e,color:#fff
    style ATT_X fill:#1a1a2e,color:#fff
    style ISS_S fill:#1a1a2e,color:#fff
```

| Token | Ledger | Type | Issuer | Limit | Freeze | Transferable | Purpose |
|---|---|---|---|---|---|---|---|
| **OPTKAS.BOND** | XRPL | `claim_receipt` | Issuer | 100,000,000 | ✅ | ❌ | Claim receipt for bond participation |
| **OPTKAS.ESCROW** | XRPL | `settlement_token` | Issuer | 500,000,000 | ✅ | ❌ | Settlement coordination (1:1 USD) |
| **OPTKAS.ATTEST** | XRPL | `evidence_token` | Attestation | 1 | ❌ | ❌ | Non-transferable proof of document existence |
| **OPTKAS-USD** | Stellar | `regulated_asset` | Issuer | — | — | SEP | USD-denominated regulated asset |

---

## 🔴 Governance & Multisig

### Signer Architecture

```mermaid
graph TB
    subgraph "Multisig Governance — 2-of-3 Required"
        S1[🔑 Treasury<br/>Issue IOUs · Create Escrow<br/>Provision AMM]
        S2[🔑 Compliance<br/>Freeze IOUs · Pause Issuance<br/>Generate Audit]
        S3[🔑 Trustee<br/>Release Escrow · Approve Settlement]
    end

    subgraph "Emergency Controls"
        EP[⏸️ PAUSE<br/>Any 1 signer]
        ER[▶️ RESUME<br/>2 signers required]
        EF[🧊 FREEZE ALL<br/>2 signers required]
    end

    subgraph "Config Changes"
        CC[⚙️ Config Change<br/>3-of-3 UNANIMOUS]
        SR[🔄 Signer Rotation<br/>2 signers + 30-day notice]
    end

    S1 --> EP
    S2 --> EP
    S3 --> EP
    S1 & S2 --> ER
    S1 & S2 --> EF
    S2 & S3 --> EF
    S1 & S2 & S3 --> CC
    S1 & S2 --> SR
    S1 & S3 --> SR

    style S1 fill:#059669,color:#fff
    style S2 fill:#DC2626,color:#fff
    style S3 fill:#2563EB,color:#fff
    style EP fill:#F59E0B,color:#000
    style ER fill:#10B981,color:#fff
    style EF fill:#7C3AED,color:#fff
    style CC fill:#1a1a2e,color:#fff
    style SR fill:#6366F1,color:#fff
```

### Governance Rules Matrix

| Action | Treasury | Compliance | Trustee | Threshold |
|---|---|---|---|---|
| Issue IOUs | ✅ | — | — | 2-of-3 |
| Create Escrow | ✅ | — | — | 2-of-3 |
| Release Escrow | — | — | ✅ | 2-of-3 |
| Freeze IOUs | — | ✅ | — | 2-of-3 |
| Pause Platform | ✅ | ✅ | ✅ | 1-of-3 |
| Resume Platform | ✅ | ✅ | — | 2-of-3 |
| Config Change | ✅ | ✅ | ✅ | **3-of-3** |
| Signer Rotation | ✅ | ✅ | ✅ | 2-of-3 + 30d notice |
| Enable Trading | ✅ | ✅ | ✅ | 2-of-3 |
| Kill Switch (Trading) | ✅ | ✅ | ✅ | 1-of-3 |

---

## 🟢 Operational Flows

### Bond Lifecycle Flow

```mermaid
stateDiagram-v2
    [*] --> Draft: Create Bond
    Draft --> Active: Multisig Approval (2/3)
    Active --> Funded: Escrow Created + Funded
    Funded --> Distributing: Settlement Triggered
    Distributing --> Settled: All Claims Paid
    Settled --> [*]: Complete

    Active --> Defaulted: Covenant Breach
    Defaulted --> Cured: Default Remediated
    Cured --> Active: Reinstated
    Defaulted --> Liquidating: Cure Period Expired
    Liquidating --> [*]: Liquidation Complete

    Active --> Paused: Emergency Pause (1 signer)
    Paused --> Active: Resume (2 signers)
```

### Escrow Settlement Flow

```mermaid
sequenceDiagram
    participant T as Treasury
    participant E as Escrow Account
    participant C as Compliance
    participant TR as Trustee
    participant L as XRPL Ledger

    T->>L: Prepare EscrowCreate (unsigned)
    Note over T,L: Amount + Condition + CancelAfter
    T->>C: Request compliance clearance
    C->>C: Run KYC/AML checks
    C-->>T: Clearance granted
    T->>TR: Request multisig approval
    TR->>L: Co-sign + Submit transaction
    L->>E: Escrow object created on-ledger

    Note over E: ⏳ Condition period...

    TR->>L: Prepare EscrowFinish (unsigned)
    TR->>T: Request co-signature
    T->>L: Co-sign + Submit
    L->>E: Escrow released to destination
    L-->>C: Audit event logged
```

### Trading Execution Flow

```mermaid
flowchart TD
    A[Order Received] --> B{Strategy Type?}
    B -->|TWAP| C[Split into time slices]
    B -->|VWAP| D[2x TWAP slices for volume weighting]
    B -->|Limit| E[Single OfferCreate with tfPassive]

    C --> F[Risk Controller Check]
    D --> F
    E --> F

    F -->|Pass| G{Dry Run?}
    F -->|Fail| H[❌ Reject — Risk Limit]

    G -->|Yes| I[📋 Return unsigned transactions]
    G -->|No| J[Submit to multisig queue]

    J --> K[2-of-3 Approval]
    K --> L[Submit to XRPL DEX]
    L --> M[✅ Execution confirmed]

    H --> N[🔴 Circuit Breaker: 5% loss]
    N --> O[🔴 Kill Switch: 10% loss — 1 signer halt]

    style A fill:#2563EB,color:#fff
    style B fill:#7C3AED,color:#fff
    style F fill:#DC2626,color:#fff
    style I fill:#059669,color:#fff
    style M fill:#059669,color:#fff
    style N fill:#F59E0B,color:#000
    style O fill:#DC2626,color:#fff
```

### Cross-Ledger Attestation Flow

```mermaid
sequenceDiagram
    participant DOC as Document
    participant ATT as Attestation Engine
    participant XRP as XRPL
    participant STL as Stellar
    participant AUD as Audit Store

    DOC->>ATT: Submit document for attestation
    ATT->>ATT: SHA-256 hash computation
    ATT->>XRP: Anchor hash in Payment memo<br/>(rBp5mKc3... attestation account)
    ATT->>STL: Anchor hash in ManageData<br/>(GCYIHBAM... issuer)
    XRP-->>ATT: XRPL tx hash
    STL-->>ATT: Stellar tx hash
    ATT->>AUD: Log attestation_anchored event
    Note over AUD: Both ledger hashes stored<br/>for independent verification
```

---

## 🟣 Data Flow Architecture

### Complete Transaction Pipeline

```mermaid
flowchart TB
    subgraph "Input Sources"
        U[User/Operator]
        AI[AI Agent System]
        SCH[Scheduled Tasks]
    end

    subgraph "Layer 4 — Interface"
        CLI[CLI Tool]
        DASH[Dashboard]
        API[Internal API]
    end

    subgraph "Layer 3 — Business Logic"
        BF[Bond Factory]
        EM[Escrow Manager]
        TE[Trading Engine]
        SE[Settlement Engine]
        PM[Portfolio Manager]
        BM[Bridge Manager]
        AM[AMM Manager]
    end

    subgraph "Layer 2 — Governance Gate"
        MG[Multisig Governor<br/>2-of-3 Required]
        CE[Compliance Engine<br/>KYC/AML/Sanctions]
        AES[Audit Event Store<br/>Every Action Logged]
    end

    subgraph "Layer 1 — Ledger Operations"
        XC[XRPLClient<br/>Prepare UNSIGNED tx]
        SC[StellarClient<br/>Build UNSIGNED XDR]
    end

    subgraph "External Ledgers"
        XRPL[(XRPL<br/>6 Accounts)]
        STLR[(Stellar<br/>3 Accounts)]
    end

    U --> CLI
    U --> DASH
    AI --> API
    SCH --> API

    CLI --> BF & EM & TE & PM
    DASH --> BF & EM
    API --> BF & EM & TE & SE & PM & BM & AM

    BF & EM & TE & SE & PM & BM & AM --> MG
    MG --> CE
    CE --> AES
    AES --> XC & SC

    XC -->|Submit signed tx| XRPL
    SC -->|Submit signed XDR| STLR

    XRPL -->|Event stream| AES
    STLR -->|Horizon stream| AES

    style MG fill:#DC2626,color:#fff
    style CE fill:#DC2626,color:#fff
    style AES fill:#DC2626,color:#fff
    style XC fill:#D97706,color:#fff
    style SC fill:#D97706,color:#fff
    style XRPL fill:#1a1a2e,color:#fff
    style STLR fill:#1a1a2e,color:#fff
```

### Data Storage Architecture

```mermaid
graph TB
    subgraph "On-Ledger (Immutable)"
        XO[XRPL Objects<br/>Escrows, Trustlines, Offers<br/>Payment Memos]
        SO[Stellar Records<br/>Assets, Trustlines<br/>ManageData entries]
    end

    subgraph "Platform Storage"
        AL[Audit Event Log<br/>./logs/audit-events.jsonl<br/>Append-only, SHA-256]
        RP[Reports<br/>./reports/*.json<br/>8 report types]
        CF[Configuration<br/>config/platform-config.yaml<br/>389 lines]
    end

    subgraph "Data Room"
        DR[Institutional Data Room<br/>6 categories<br/>Document hashes attested]
    end

    subgraph "Hash Verification Chain"
        H1[Event Created] --> H2[SHA-256 Hash]
        H2 --> H3[Anchor on XRPL]
        H2 --> H4[Anchor on Stellar]
        H3 & H4 --> H5[Independently Verifiable<br/>by auditors]
    end

    style XO fill:#D97706,color:#fff
    style SO fill:#7C3AED,color:#fff
    style AL fill:#DC2626,color:#fff
    style H5 fill:#059669,color:#fff
```

---

## 🔴 Compliance & Audit

### Audit Pipeline

```mermaid
flowchart LR
    subgraph "Collection"
        E1[XRPL Tx Monitor]
        E2[Stellar Horizon Stream]
        E3[Platform Event Logger]
        E4[Governance Action Log]
    end

    subgraph "Processing"
        AES[Audit Event Store<br/>15 event types<br/>UUID + sequence + timestamp]
    end

    subgraph "Attestation"
        HA[SHA-256 Hash]
        XA[XRPL Anchor<br/>Payment Memo]
        SA[Stellar Anchor<br/>ManageData]
    end

    subgraph "Storage"
        LOG[audit-events.jsonl<br/>7-year retention<br/>AES-256-GCM encrypted]
    end

    subgraph "Reporting — 8 Types"
        R1[📊 Full Audit]
        R2[💰 Financial]
        R3[⚖️ Compliance]
        R4[🔐 Governance]
        R5[📜 Attestation]
        R6[🚫 Sanctions]
        R7[📋 Regulatory]
        R8[📅 Annual]
    end

    E1 & E2 & E3 & E4 --> AES
    AES --> HA
    HA --> XA & SA
    AES --> LOG
    LOG --> R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8

    style AES fill:#DC2626,color:#fff
    style HA fill:#F59E0B,color:#000
    style LOG fill:#1a1a2e,color:#fff
```

### 34 Required Audit Event Types

| Category | Events |
|---|---|
| **IOU Operations** | `iou_issued`, `iou_frozen` |
| **Escrow Operations** | `escrow_created`, `escrow_released`, `escrow_cancelled` |
| **Attestation** | `attestation_anchored`, `document_attested` |
| **AMM/DEX** | `amm_provisioned`, `amm_withdrawn`, `trade_executed`, `trade_cancelled` |
| **Governance** | `signer_added`, `signer_removed`, `config_changed`, `emergency_pause`, `emergency_resume` |
| **Bond Lifecycle** | `bond_created`, `bond_transitioned`, `bond_defaulted`, `bond_cured` |
| **Structured Finance** | `series_created`, `tranche_activated`, `waterfall_distributed`, `allocation_completed` |
| **Covenants** | `covenant_breach`, `covenant_cured` |
| **Bridge** | `bridge_configured`, `bridge_activated`, `witness_registered`, `claim_completed` |
| **AI Agents** | `strategy_approved`, `agent_executed` |
| **Reporting** | `report_generated` |

### Daily Reconciliation Checks

| Check | Tolerance | Method |
|---|---|---|
| IOU supply vs. funded amounts | **Exact match** | XRPL account_lines query |
| Escrow state vs. custodian records | ±0.01% | XRPL account_objects query |
| Stellar asset supply vs. platform records | **Exact match** | Horizon account query |
| Attestation completeness | 100% coverage | Cross-reference event log |
| Signer action log vs. ledger multisig records | **Exact match** | Compare audit log to on-chain txns |

---

## 🟠 Bridge Infrastructure

```mermaid
graph TB
    subgraph "Locking Chain (XRPL Mainnet/Testnet)"
        LD[🚪 Locking Door Account]
        LU[User Account]
        LU -->|XChainCommit| LD
    end

    subgraph "Witness Servers (67% Quorum)"
        W1[🔭 Witness 1]
        W2[🔭 Witness 2]
        W3[🔭 Witness 3]
    end

    subgraph "Issuing Chain"
        ID[🚪 Issuing Door Account]
        IU[Destination Account]
        ID -->|XChainClaim| IU
    end

    LD --> W1 & W2 & W3
    W1 & W2 & W3 --> ID

    style LD fill:#D97706,color:#fff
    style ID fill:#7C3AED,color:#fff
    style W1 fill:#059669,color:#fff
    style W2 fill:#059669,color:#fff
    style W3 fill:#059669,color:#fff
```

| Setting | Value |
|---|---|
| Enabled | `false` (requires multisig activation) |
| Witness minimum per chain | 1 |
| Witness quorum | 67% |
| Rotation notice | 14 days |
| Pause | 1 signer (any) |

### Bridge Transaction Types

| Transaction | Method | Description |
|---|---|---|
| `XChainCreateBridge` | `prepareXChainCreateBridge()` | Create bridge between locking and issuing chains |
| `XChainCommit` | `prepareXChainCommit()` | Lock assets on source chain |
| `XChainClaim` | `prepareXChainClaim()` | Claim assets on destination chain |

---

## 🟢 AI Execution Systems

```mermaid
graph TB
    subgraph "System 1 — Asset Intake & Verification"
        S1A[Read registries]
        S1B[Verify CUSIPs]
        S1C[Generate collateral summaries]
        S1D[❌ Cannot: Initiate transactions]
    end

    subgraph "System 2 — Credit & Structure"
        S2A[Evaluate assets]
        S2B[Generate term sheets]
        S2C[Compare structures]
        S2D[❌ Cannot: Negotiate terms]
    end

    subgraph "System 3 — Lender Interaction"
        S3A[Send templated comms]
        S3B[Analyze responses]
        S3C[Score seriousness]
        S3D[❌ Cannot: Agree to terms]
    end

    subgraph "System 4 — Governance Sentinel"
        S4A[Monitor health]
        S4B[Detect anomalies]
        S4C[Generate alerts]
        S4D[❌ Cannot: Override decisions]
    end

    HITL[👤 Human-in-the-Loop<br/>Required at EVERY critical step]

    S1C --> HITL
    S2B --> HITL
    S3B --> HITL
    S4C --> HITL

    style HITL fill:#DC2626,color:#fff,stroke:#DC2626
    style S1D fill:#fee2e2,color:#991b1b
    style S2D fill:#fee2e2,color:#991b1b
    style S3D fill:#fee2e2,color:#991b1b
    style S4D fill:#fee2e2,color:#991b1b
```

---

## 🟢 CLI & Dashboard

### Unified CLI Commands

```
$ npx ts-node apps/cli/src/cli.ts <command> [options]

Commands:
  balance          Query all account balances across XRPL and Stellar
  escrow list      List all tracked escrows
  escrow create    Prepare unsigned escrow creation transaction
  trustline verify Verify all configured trustlines on-ledger
  audit report     Generate compliance audit report
  reconcile        Run cross-ledger reconciliation
  status           Show platform infrastructure status

Global Options:
  --network <net>  Target network: testnet | mainnet (default: testnet)
  --config <path>  Path to platform-config.yaml
  --dry-run        Simulate without executing (default: true)
  --json           Output as JSON
```

### Dashboard (Port 3000)

The institutional dashboard provides **read-only** real-time visibility into:

| Card | Data Source | Content |
|---|---|---|
| XRPL Balances | Live `getAccountInfo()` × 6 | XRP balances for all accounts |
| Stellar Balances | Live `getAccountInfo()` × 3 | XLM + asset balances |
| Trustline Status | `getTrustlines()` | Active IOUs and limits |
| Escrow Status | `getEscrows()` | Active/pending escrows |
| Attestation Records | Audit event store | Hash-anchored documents |
| Bond Lifecycle | Bond factory state | Current bond status |
| Governance | Multisig governor | Signer registry + thresholds |
| Compliance | Compliance engine | KYC/AML status |
| Audit Timeline | Audit event store | Recent events |
| Reconciliation | Last reconciliation run | Match/mismatch counts |
| Platform Status | Config + connectivity | Network health |

---

## 🟣 Institutional Funding Architecture

```mermaid
flowchart TB
    subgraph "Collateral"
        MTN[📄 TC Advantage MTN<br/>CUSIP: 87225HAB4<br/>Face Value: $10M]
    end

    subgraph "Structure"
        FAC[🏦 $4M Facility<br/>Advance Rate: 40%<br/>SOFR + 8-12%<br/>12-24 Month Tenor]
    end

    subgraph "Economic Terms"
        FEE[💰 2% Success Fee<br/>+ 4% Ongoing Cash Flow]
    end

    subgraph "15+ Lender Pipeline"
        L1[Goldman Sachs]
        L2[Morgan Stanley]
        L3[JPMorgan]
        L4[NYDIG]
        L5[Galaxy Digital]
        L6[Circle]
        L7[Fidelity]
        L8[+ 8 more...]
    end

    MTN --> FAC
    FAC --> FEE
    FAC --> L1 & L2 & L3 & L4 & L5 & L6 & L7 & L8

    style MTN fill:#D97706,color:#fff
    style FAC fill:#2563EB,color:#fff
    style FEE fill:#059669,color:#fff
```

### 45-Day Execution Timeline

| Phase | Duration | Activities |
|---|---|---|
| **Phase A** | Days 1-10 | Data room population, term sheet generation, lender outreach |
| **Phase B** | Days 11-30 | Due diligence, credit committee presentations, term negotiation |
| **Phase C** | Days 31-45 | Documentation, escrow funding, settlement execution |

---

## 🔵 Test Coverage

| Suite | Tests | Phase | Focus |
|---|---|---|---|
| Phase 3 — Infrastructure | ~50 | 3 | Core packages, config validation, basic operations |
| Phase 4 — Capital Markets | ~60 | 4 | Bond factory, escrow, settlement, structured finance |
| Phase 5 — Infrastructure | ~55 | 5 | DEX, AMM, bridge, agents, gateway |
| Phase 6 — E2E | ~70 | 6 | Full pipeline testing, cross-module integration |
| Phase 7 — Connectivity | ~65 | 7 | Live XRPL/Stellar clients, dashboard, testnet verification |
| Phase 8 — Operations | ~55 | 8 | Bridge XChain, trading VWAP/limit, CLI, reconciliation |
| Package Unit Tests | ~12 | All | Individual package tests |
| **TOTAL** | **367** | — | **27 suites · 100% passing** |

---

## 🟡 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Installation

```bash
git clone https://github.com/unykornai/Optkas---funding-system-.git
cd Optkas---funding-system-
npm install
```

### Run Tests

```bash
npx jest                    # All 367 tests
npx jest --testPathPattern phase8   # Phase 8 only
```

### Start Dashboard

```bash
npx ts-node apps/dashboard/src/index.ts
# → http://localhost:3000
```

### Run CLI

```bash
npx ts-node apps/cli/src/cli.ts status --network testnet
npx ts-node apps/cli/src/cli.ts balance --network testnet
npx ts-node apps/cli/src/cli.ts reconcile --scope full
```

### Run Reconciliation

```bash
npx ts-node scripts/reconcile-ledgers.ts --network testnet --scope full
```

---

## 📄 Documentation Index

| Document | Description |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture specification |
| [GOVERNANCE.md](docs/GOVERNANCE.md) | Multisig governance rules |
| [COMPLIANCE_CONTROLS.md](docs/COMPLIANCE_CONTROLS.md) | KYC/AML/Sanctions framework |
| [AUDIT_SPEC.md](docs/AUDIT_SPEC.md) | Audit event schema and reporting |
| [XRPL_SPEC.md](docs/XRPL_SPEC.md) | XRPL integration specification |
| [STELLAR_SPEC.md](docs/STELLAR_SPEC.md) | Stellar integration specification |
| [RISK.md](docs/RISK.md) | Risk management framework |
| [SECURITY.md](docs/SECURITY.md) | Security architecture |
| [TRUST_BOUNDARIES.md](docs/TRUST_BOUNDARIES.md) | Trust boundary definitions |
| [RUNBOOKS.md](docs/RUNBOOKS.md) | Operational runbooks |
| [BOND_FUNDING_LIFECYCLE.md](docs/BOND_FUNDING_LIFECYCLE.md) | Bond lifecycle state machine |
| [RWA_HANDLING.md](docs/RWA_HANDLING.md) | Real-world asset tokenization |

---

<div align="center">

**Built with precision by [Unykorn 7777, Inc.](https://github.com/unykornai)**

![OPTKAS](https://img.shields.io/badge/OPTKAS-Sovereign%20Infrastructure-0052CC?style=flat-square)
![Multisig](https://img.shields.io/badge/Multisig-2--of--3-DC2626?style=flat-square)
![Ledgers](https://img.shields.io/badge/XRPL%20+%20Stellar-Multi--Ledger-7C3AED?style=flat-square)
![Audit](https://img.shields.io/badge/Audit-7%20Year%20Retention-059669?style=flat-square)

</div>
