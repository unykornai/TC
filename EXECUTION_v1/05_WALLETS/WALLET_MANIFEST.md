# 🏛️ OPTKAS Wallet Manifest

**Phase 18 — Live Wallet Provisioning & Trustline Deployment**

> This document describes the wallet architecture and funding requirements
> for the OPTKAS Sovereign Financial Platform across XRPL and Stellar.

---

## 📋 Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                    OPTKAS WALLET ARCHITECTURE                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────── XRPL (6 accounts) ───────────────────┐     │
│  │  ISSUER      — IOU issuance (DefaultRipple=ON)          │     │
│  │  TREASURY    — Operational treasury, escrow funding      │     │
│  │  ESCROW      — Conditional settlement escrow             │     │
│  │  ATTESTATION — Document hash anchoring (no value)        │     │
│  │  AMM_LIQUIDITY — AMM liquidity provision                 │     │
│  │  TRADING     — Algorithmic trading / DEX ops             │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌────────────── Stellar (3 accounts) ──────────────────────┐    │
│  │  ISSUER       — Regulated asset issuance (OPTKAS-USD)    │    │
│  │  DISTRIBUTION — Asset distribution / settlement          │    │
│  │  ANCHOR       — Fiat on/off-ramp operations              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  TOTAL: 9 accounts across 2 ledgers                              │
└───────────────────────────────────────────────────────────────────┘
```

---

## 💰 Funding Requirements

### XRPL

| Role | Reserve | Trustline Cost | Total Needed |
|------|---------|---------------|--------------|
| Issuer | 20 XRP | 0 (issuer) | 20 XRP |
| Treasury | 20 XRP | 8 XRP (4 stablecoin TLs) | 28 XRP |
| Escrow | 15 XRP | 8 XRP | 23 XRP |
| Attestation | 15 XRP | 2 XRP (1 TL) | 17 XRP |
| AMM Liquidity | 15 XRP | 8 XRP | 23 XRP |
| Trading | 15 XRP | 8 XRP | 23 XRP |
| **Operations buffer** | | | **20 XRP** |
| **TOTAL** | **100 XRP** | **34 XRP** | **154 XRP** |

### Stellar

| Role | Reserve | Trustline Cost | Total Needed |
|------|---------|---------------|--------------|
| Issuer | 5 XLM | 0 (issuer) | 5 XLM |
| Distribution | 5 XLM | 0.5 XLM | 5.5 XLM |
| Anchor | 5 XLM | 0.5 XLM | 5.5 XLM |
| **Operations buffer** | | | **5 XLM** |
| **TOTAL** | **15 XLM** | **1 XLM** | **21 XLM** |

---

## 🔗 Stablecoin Trustlines (XRPL)

Deployed to all operational accounts (Treasury, Escrow, AMM, Trading):

| Currency | Issuer | Name | Trust Limit | Tier |
|----------|--------|------|-------------|------|
| USD | `rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B` | Bitstamp | 500,000 | 1 |
| USD | `rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq` | GateHub | 250,000 | 2 |
| USD | `rE85pdvr4icCPh9cpPr1HrSCVJCUhZ1Dqm` | Tether | 1,000,000 | 1 |
| USD | `rcvxE9PS9YBwxtGg1qNeewV6ZB3wGubZq` | Circle | 1,000,000 | 1 |

---

## 🔐 Internal OPTKAS Tokens (XRPL)

| Token | Type | Accounts | Trust Limit |
|-------|------|----------|-------------|
| OPTKAS.BOND | Claim Receipt | Treasury, Escrow, AMM | 100,000,000 |
| OPTKAS.ESCROW | Settlement Token | Treasury, Escrow | 500,000,000 |
| OPTKAS.ATTEST | Evidence Marker | Attestation | 1 |

---

## ⭐ Regulated Asset (Stellar)

| Asset | Type | Issuer Flags | Accounts |
|-------|------|-------------|----------|
| OPTKAS-USD | Regulated Asset | auth_required, auth_revocable, clawback_enabled | Distribution, Anchor |

---

## 🔑 Key Management

- **Addresses**: Stored in `WALLET_MANIFEST.json` (safe for repo)
- **Seeds/Secrets**: Stored in `config/.mainnet-secrets.json` (GITIGNORED)
- **Backup**: Seeds MUST be backed up to offline cold storage immediately
- **Never**: Store seeds in version control, cloud drives, or unencrypted files

---

## 📦 Provisioning Workflow

```
Step 1: Generate Wallets
  npx ts-node scripts/provision-mainnet.ts
  → Creates WALLET_MANIFEST.json + .mainnet-secrets.json
  → Back up secrets file IMMEDIATELY

Step 2: Fund Accounts
  → Send XRP to each XRPL address (see table above)
  → Send XLM to each Stellar address (see table above)
  → Verify on livenet.xrpl.org / stellar.expert

Step 3: Deploy Trustlines
  npx ts-node scripts/deploy-mainnet-trustlines.ts --network mainnet
  → Sets DefaultRipple on XRPL issuer
  → Sets regulated asset flags on Stellar issuer
  → Deploys all trustlines
  → Authorizes Stellar accounts

Step 4: Verify
  → Check trustlines on livenet.xrpl.org
  → Check asset config on stellar.expert
  → Run verification: npx ts-node scripts/deploy-mainnet-trustlines.ts --network mainnet --dry-run
```

---

## 🛡️ Security Model

| Layer | Protection |
|-------|-----------|
| Key Generation | Cryptographically secure random (Node.js crypto) |
| Key Storage | .gitignored file, offline backup required |
| Account Access | Seeds never stored in config — only addresses |
| Multisig | 2-of-3 threshold (Unykorn + OPTKAS + Trustee) |
| XRPL Issuer | DefaultRipple ON, DisableMaster available post-multisig |
| Stellar Issuer | AUTH_REQUIRED + AUTH_REVOCABLE + CLAWBACK_ENABLED |

---

*Generated by Phase 18 — OPTKAS Sovereign Financial Platform*
*Script: `scripts/provision-mainnet.ts`*
