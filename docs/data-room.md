# DATA_ROOM_v1

**Status:** FROZEN (Immutable as of February 2, 2026)

---

## Overview

The DATA_ROOM_v1 contains the complete institutional-grade documentation package for lender review, external counsel diligence, and auditor walk-through.

**Total Documents:** 33  
**Categories:** 7  
**Verification:** SHA-256 hashes in HASHES.txt

---

## Category Structure

### 00_EXEC_SUMMARY (4 documents)

Executive-level overviews for credit committee and senior decision-makers:

- **EXECUTIVE_SUMMARY.md** - 2-page lender overview
- **INVESTOR-PITCH-DECK.md** - Investment thesis
- **OPTKAS1-STRATEGIC-FINANCIAL-ROADMAP.md** - Long-term strategy
- **README.md** - Repository navigation

### 01_TRANSACTION_STRUCTURE (5 documents)

Core deal documents defining the credit facility structure:

- **LOAN_COMMITMENT_PACKAGE-v2.md** - PRIMARY lender submission
- **LOAN_COMMITMENT_PACKAGE.md** - Original version
- **STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md** - Unykorn partnership
- **ANNEX_A_Tranche_Details.md** - Asset identification and valuation
- **ANNEX_B_System_Architecture.md** - Technical infrastructure

### 02_COLLATERAL_AND_CREDIT (5 documents)

Collateral documentation and credit analysis:

- **STC_Statement.pdf** - CRITICAL - Securities Transfer Corp position statement
- **BORROWING_BASE_POLICY.md** - Haircut methodology
- **LENDER-PACKET.md** - Consolidated lender information
- **DUAL-TRACK-COLLATERAL-SIMULATION.md** - Scenario analysis
- **REAL-ESTATE-COLLATERAL-ANALYSIS.md** - Supplementary analysis

### 03_BOND_AND_NOTE_ISSUANCE (3 documents)

Bond structure and issuance documentation:

- **optkas1-bond-issuance-guide.md** - CORE bond specifications
- **Bedford_Bond_Workflow_Packet.pdf** - Workflow reference
- **CAT Bond Rail Blueprint.pdf** - Structure reference

### 04_COMPLIANCE_AND_RISK (3 documents)

Regulatory compliance and risk management:

- **KYC-AML-COMPLIANCE-PACKAGE.md** - Know Your Customer framework
- **INSURANCE-UNDERWRITING-PACKAGE.md** - Insurance coverage
- **LEGAL_OPINION_TEMPLATE.md** - Counsel opinion template

### 05_CHAIN_OF_CUSTODY (4 documents)

Verification, audit trails, and custody documentation:

- **XRPL_ATTESTATION_SPEC.md** - XRPL evidence layer specification
- **AUDIT_RUNBOOK.md** - Daily/monthly/quarterly procedures
- **FedEx_Scan_2026-01-22.pdf** - Physical delivery chain of custody
- **ipfs-config.json** - IPFS document storage configuration

### 99_APPENDIX (8 documents)

Templates, execution plans, and supplementary materials:

- **FACILITY_AGREEMENT_TEMPLATE.md**
- **SECURITY_AGREEMENT_TEMPLATE.md**
- **STC_CONTROL_AGREEMENT_TEMPLATE.md**
- **BORROWING_BASE_CERTIFICATE_TEMPLATE.md**
- **LEGAL_OPINION_TEMPLATE.md**
- **day0_snapshot_template.json**
- **funding-execution-plan.md**
- **OTC-OUTREACH-TEMPLATES.md**

---

## Verification Artifacts

### HASHES.txt
SHA-256 hashes for all 33 files. Use this to verify document integrity.

### data-room.json
Machine-readable manifest with file metadata including:
- Filename
- Relative path
- Category
- Size (bytes)
- Last modified timestamp
- SHA-256 hash

### INDEX.md
Human-readable navigation guide with:
- Folder descriptions
- Reading order by role (Credit Committee, Legal, Operations)
- Core document verification status
- Missing items flagged

---

## Reading Order by Role

### Credit Committee (45 minutes)

1. EXECUTIVE_SUMMARY.md
2. LOAN_COMMITMENT_PACKAGE-v2.md
3. STC_Statement.pdf
4. BORROWING_BASE_POLICY.md
5. ANNEX_A_Tranche_Details.md

### Legal Counsel (90 minutes)

1. STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md
2. EXHIBIT_A_ECONOMIC_PARTICIPATION.md
3. EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md
4. KYC-AML-COMPLIANCE-PACKAGE.md
5. LEGAL_OPINION_TEMPLATE.md

### Operations / Audit (60 minutes)

1. AUDIT_RUNBOOK.md
2. XRPL_ATTESTATION_SPEC.md
3. ANNEX_B_System_Architecture.md
4. HASHES.txt
5. data-room.json

---

## Hash Verification

To verify the integrity of the data room:

```powershell
# PowerShell
Get-ChildItem -Path "DATA_ROOM_v1" -Recurse -File |
  Where-Object { $_.Name -notin @("HASHES.txt","data-room.json","INDEX.md") } |
  ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    "$hash  $($_.Name)"
  }
```

```bash
# Bash
find DATA_ROOM_v1 -type f ! -name "HASHES.txt" ! -name "data-room.json" ! -name "INDEX.md" \
  -exec shasum -a 256 {} \;
```

Compare output to HASHES.txt.

---

## Access

The DATA_ROOM_v1 is available in the [GitHub repository](https://github.com/unykornai/TC/tree/main/DATA_ROOM_v1).

For authorized access to the complete package, contact: **jimmy@optkas.com**

---

[← Back to Home](index.html)
