# TC Advantage RWA Infrastructure

[![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)](https://github.com/unykornai/TC)
[![License](https://img.shields.io/badge/License-Proprietary-blue?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange?style=for-the-badge)](CHANGELOG.md)
[![Blockchain](https://img.shields.io/badge/Blockchain-XRPL-purple?style=for-the-badge)](https://xrpl.org)

> **Enterprise-grade Real World Asset (RWA) infrastructure for institutional bond-backed credit facilities**

---

## 🎯 Overview

This repository contains the complete infrastructure for the **TC Advantage Secured Notes** collateralized credit facility.

### Key Components

| Component | Description | Status |
|:----------|:------------|:------:|
| 🏛️ **SPV Structure** | Wyoming Series LLC bankruptcy-remote vehicle | ✅ Active |
| 📊 **Borrowing Base** | 40% haircut methodology with 250%+ coverage | ✅ Implemented |
| ⛓️ **XRPL Attestation** | Immutable chain-of-custody verification | ✅ Live |
| 🔐 **Smart Contracts** | 2-of-3 multisig automated settlement | ✅ Configured |
| 📁 **Data Room** | Institutional-grade document repository | ✅ Frozen |

---

## 💎 Asset Details

### TC Advantage 5% Secured Medium Term Notes

| Attribute | Value |
|:----------|:------|
| **Issuer** | TC Advantage Traders, Inc. |
| **CUSIP** | `87225HAB4` |
| **ISIN** | `US87225HAB42` |
| **Face Value** | $10,000,000.00 |
| **Coupon Rate** | 5.00% per annum |
| **Maturity Date** | May 31, 2030 |
| **Transfer Agent** | Securities Transfer Corporation |
| **Insurance** | C.J. Coleman & Co. ($25.75M) |

---

## 📊 Facility Metrics

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FACILITY OVERVIEW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   COLLATERAL VALUE          ADVANCE RATE         FACILITY SIZE     │
│   ═══════════════          ════════════         ══════════════     │
│     $10,000,000               20-40%             $2M - $4M         │
│                                                                     │
│   COVERAGE RATIO            HAIRCUT              COUPON            │
│   ══════════════           ═════════            ════════           │
│       250%+                   40%                 5.00%            │
│                                                                     │
│   MATURITY                  INSURANCE            TRANSFER AGENT    │
│   ════════                 ═══════════          ════════════════   │
│   May 31, 2030             $25.75M              STC (Plano, TX)    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Documentation Structure

### [DATA_ROOM_v1](data-room.html)
Frozen institutional data room with 33 documents across 7 categories:

- **00_EXEC_SUMMARY** - Executive overviews and pitch materials
- **01_TRANSACTION_STRUCTURE** - Core deal documents
- **02_COLLATERAL_AND_CREDIT** - Collateral documentation
- **03_BOND_AND_NOTE_ISSUANCE** - Bond specifications
- **04_COMPLIANCE_AND_RISK** - Regulatory compliance
- **05_CHAIN_OF_CUSTODY** - Verification artifacts
- **99_APPENDIX** - Templates and supplementary materials

### [PARTNER_ISSUANCE_v1](partner-issuance.html)
Partner agreement execution package with cryptographic proofs and multisig configuration.

---

## 🔐 Verification

### XRPL Attestation

| Parameter | Value |
|:----------|:------|
| **Network** | XRP Ledger Mainnet |
| **Account** | `rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV` |
| **Explorer** | [View on XRPL](https://livenet.xrpl.org/accounts/rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV) |

All documents are hashed using SHA-256 and can be verified against the immutable XRPL ledger.

---

## 📞 Contact

| Role | Contact |
|:-----|:--------|
| **SPV Manager** | jimmy@optkas.com |
| **Technical Lead** | [Unykorn 7777](https://github.com/unykornai) |

---

## 📄 License

Copyright © 2026 OPTKAS1-MAIN SPV & Unykorn 7777, Inc. All rights reserved.

This repository contains proprietary and confidential information. Unauthorized access, use, or distribution is prohibited.

---

<div align="center">

**Built by [Unykorn 7777](https://github.com/unykornai)**

*RWA Infrastructure • Blockchain Verification • Institutional-Grade Documentation*

[![GitHub](https://img.shields.io/badge/GitHub-unykornai%2FTC-black?style=flat-square&logo=github)](https://github.com/unykornai/TC)
[![XRPL](https://img.shields.io/badge/Powered%20by-XRPL-purple?style=flat-square)](https://xrpl.org)

</div>
