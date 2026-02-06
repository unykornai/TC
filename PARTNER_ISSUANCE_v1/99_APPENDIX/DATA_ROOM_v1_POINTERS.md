# DATA ROOM v1 POINTERS

**Reference Document for Partner Issuance Package**  
**Date:** February 2, 2026

## Unykorn Agreements & Legal Documents

All Unykorn-related agreements, exhibits, and technical appendices are now organized in the `unykorn_agreements_legal/` folder at the root of the repository for legal review and reference.

### Key Files:
- Main Agreement: `unykorn_agreements_legal/STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md`
- Economic Participation: `unykorn_agreements_legal/EXHIBIT_A_ECONOMIC_PARTICIPATION.md`
- Smart Contract Settlement Spec: `unykorn_agreements_legal/EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md`
- Multisig Config: `unykorn_agreements_legal/MULTISIG_CONFIG.json`
- Signature Page: `unykorn_agreements_legal/SIGNATURE_PAGE.md`

For further supporting documents, see the main data room and appendix folders.

## Purpose

This document provides references to the complete institutional data room (DATA_ROOM_v1) for parties requiring additional due diligence beyond the Partner Issuance Package.

The Partner Issuance Package contains only the documents necessary for agreement execution. The full data room contains comprehensive documentation for:

- Credit committee review
- External counsel diligence
- Auditor walk-through
- Ongoing compliance

---

## DATA_ROOM_v1 Location

**Local Path:**
```
C:\Users\Kevan\Documents\OPTKAS1-Funding-System\DATA_ROOM_v1\
```

**Status:** FROZEN (immutable as of February 2, 2026)

---

## Data Room Structure

| Category | Contents | Documents |
|:---------|:---------|:---------:|
| 00_EXEC_SUMMARY | Executive overviews, pitch materials | 4 |
| 01_TRANSACTION_STRUCTURE | Deal documents, loan packages, annexes | 5 |
| 02_COLLATERAL_AND_CREDIT | STC statement, borrowing base, collateral analysis | 5 |
| 03_BOND_AND_NOTE_ISSUANCE | Bond specs, workflow references | 3 |
| 04_COMPLIANCE_AND_RISK | KYC/AML, insurance, legal templates | 3 |
| 05_CHAIN_OF_CUSTODY | FedEx scans, XRPL spec, audit runbook | 4 |
| 99_APPENDIX | Templates, execution plans, outreach | 8 |
| **TOTAL** | | **32+** |

---

## Key Documents by Role

### For Credit Committee

| Document | Location |
|:---------|:---------|
| EXECUTIVE_SUMMARY.md | 00_EXEC_SUMMARY |
| LOAN_COMMITMENT_PACKAGE-v2.md | 01_TRANSACTION_STRUCTURE |
| BORROWING_BASE_POLICY.md | 02_COLLATERAL_AND_CREDIT |
| STC_Statement.pdf | 02_COLLATERAL_AND_CREDIT |

### For Legal Counsel

| Document | Location |
|:---------|:---------|
| STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md | 01_TRANSACTION_STRUCTURE |
| ANNEX_A_Tranche_Details.md | 01_TRANSACTION_STRUCTURE |
| KYC-AML-COMPLIANCE-PACKAGE.md | 04_COMPLIANCE_AND_RISK |
| LEGAL_OPINION_TEMPLATE.md | 04_COMPLIANCE_AND_RISK |

### For Operations / Audit

| Document | Location |
|:---------|:---------|
| AUDIT_RUNBOOK.md | 05_CHAIN_OF_CUSTODY |
| XRPL_ATTESTATION_SPEC.md | 05_CHAIN_OF_CUSTODY |
| ANNEX_B_System_Architecture.md | 01_TRANSACTION_STRUCTURE |
| ipfs-config.json | 05_CHAIN_OF_CUSTODY |

---

## Verification Artifacts

| Artifact | Location | Purpose |
|:---------|:---------|:--------|
| INDEX.md | DATA_ROOM_v1/ | Human-readable navigation |
| HASHES.txt | DATA_ROOM_v1/ | SHA-256 hashes for all files |
| data-room.json | DATA_ROOM_v1/ | Machine-readable manifest |

---

## Access Instructions

### Direct Access (Authorized Parties)

1. Request access from SPV Manager (jimmy@optkas.com)
2. Receive secure file transfer or IPFS CID
3. Verify hashes against provided HASHES.txt
4. Review INDEX.md for navigation

### Hash Verification

```powershell
# Verify DATA_ROOM_v1 integrity
$root = "DATA_ROOM_v1"
Get-ChildItem -Path $root -Recurse -File |
  Where-Object { $_.Name -notin @("HASHES.txt", "data-room.json", "INDEX.md") } |
  ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    "$hash  $($_.FullName.Replace("$root\", ""))"
  }
```

---

## Relationship to Partner Issuance Package

| Package | Purpose | Status |
|:--------|:--------|:------:|
| **DATA_ROOM_v1** | Complete institutional due diligence | FROZEN |
| **PARTNER_ISSUANCE_v1** | Agreement execution only | ACTIVE |

The Partner Issuance Package is a **subset** focused on execution. Parties requiring full due diligence should request DATA_ROOM_v1 access.

---

## Document Lineage

The Agreement in this Partner Issuance Package is derived from:

```
Source: DATA_ROOM_v1/01_TRANSACTION_STRUCTURE/STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md
Hash:   B4ABA361D1839EEB9DC0E264CD83CC619EB61C24CDF1C6C34DC01A5303495563
```

The Partner Issuance version has been reformatted for execution (exhibits separated, signature page isolated) but the substantive terms are identical.

---

## Missing Documents (Flagged in DATA_ROOM_v1)

The following documents are identified as pending:

| Document | Category | Action Required |
|:---------|:---------|:----------------|
| Certificate of Formation | Entity | Obtain from Wyoming SOS |
| Operating Agreement | Entity | Execute and upload |
| Subscription Agreement | Collateral | Request from records |
| Insurance Policy Document | Compliance | Request from C.J. Coleman |
| Executed Legal Opinion | Compliance | Obtain at closing |

These are tracked in `DATA_ROOM_v1/INDEX.md` and will be added to DATA_ROOM_v2 when obtained.

---

## Contact for Data Room Access

| Role | Contact | Response Time |
|:-----|:--------|:--------------|
| SPV Manager | jimmy@optkas.com | 24-48 hours |

---

## Web3 Integration (uny-X)

The Partner Issuance Package is integrated with the [uny-X web3 automation framework](https://github.com/UnyKorn-x/uny-X) for:

- **IPFS Pinning** — Decentralized document storage
- **XRPL Attestation** — On-chain verification
- **Memory Graph** — Audit trail persistence
- **Proposal Governance** — Structured execution workflow

### Integration Location

```
OPTKAS1-Funding-System/web3_integration/
├── README.md                        # Integration guide
├── SYSTEM_AUDIT_REPORT.md           # Full audit report
├── policies/
│   └── optkas1_governor.json        # Governor policy
└── core/
    └── optkas1_bridge.py            # Bridge module
```

### Quick Commands

```powershell
# Initialize integration
python web3_integration/core/optkas1_bridge.py init

# Verify package integrity
python web3_integration/core/optkas1_bridge.py verify

# Pin to IPFS (requires IPFS daemon)
python web3_integration/core/optkas1_bridge.py pin
```

### XRPL Payment Address

```
Address: rnAF6Ki5sbmPZ4dTNCVzH5iyb9ScdSqyNr
Network: XRP Ledger Mainnet
Explorer: https://livenet.xrpl.org/accounts/rnAF6Ki5sbmPZ4dTNCVzH5iyb9ScdSqyNr
```

---

*This document is part of the Partner Issuance Package (99_APPENDIX).*
