# PARTNER_ISSUANCE_v1

**Status:** EXECUTION READY  
**Issuance Date:** February 2, 2026

---

## Purpose

This package contains all documents required for the formal execution of the Strategic Infrastructure & Execution Agreement between:

- **Unykorn 7777, Inc.** - RWA Infrastructure Partner
- **OPTKAS1-MAIN SPV** - Borrower / Collateral Holder

This is a self-contained, IPFS-pinnable, cryptographically verifiable issuance package.

---

## Package Contents

### 00_README (2 documents)
- **README.md** - Package overview and instructions
- **ISSUANCE_CHECKLIST.md** - Step-by-step execution workflow

### 01_AGREEMENT (4 documents)
- **STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md** - Master agreement
- **EXHIBIT_A_ECONOMIC_PARTICIPATION.md** - Payment terms (Option A or B)
- **EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md** - Settlement mechanics
- **SIGNATURE_PAGE.md** - Execution page

### 02_DISCLOSURES (3 documents)
- **ROLE_DISCLOSURE_NON_FIDUCIARY.md** - Clarifies Unykorn's role
- **RISK_DISCLOSURE_TECH_AND_SETTLEMENT.md** - Technology and settlement risks
- **CONFIDENTIALITY_NOTICE.md** - Confidentiality obligations

### 03_CRYPTO_PROOFS (4 documents)
- **HASHES.txt** - SHA-256 hashes for all files
- **manifest.json** - Machine-readable file index
- **MULTISIG_CONFIG.json** - 2-of-3 signer configuration
- **SIGNING_INSTRUCTIONS.md** - How to verify and sign

### 99_APPENDIX (2 documents)
- **PARTNERSHIP_OVERVIEW_ONEPAGER.md** - One-page summary
- **DATA_ROOM_v1_POINTERS.md** - References to complete data room

---

## Economic Terms

### Option A: Net Cash Flow Participation (Recommended)

| Component | Value |
|:----------|:------|
| Participation Rate | 10% of Net Distributable |
| Waterfall Position | After senior debt service |
| Payment Frequency | Per distribution event |

### Option B: Hybrid Success Fee + Participation

| Component | Value |
|:----------|:------|
| Success Fee | 2% of funded amount (at close) |
| Ongoing Participation | 4% of Net Distributable |

---

## Settlement Architecture

```
USD Obligation (Primary)
        │
        ▼
┌───────────────────────┐
│  Smart Contract Rail  │ ◄─── XRPL / EVM
│  (USDT/USDC at par)   │      2-of-3 Multisig
└───────────────────────┘
        │
        ▼ (fallback)
┌───────────────────────┐
│   Wire Transfer/ACH   │ ◄─── Within 5 business days
│   (USD direct)        │
└───────────────────────┘
```

**Payment Address:** `rnAF6Ki5sbmPZ4dTNCVzH5iyb9ScdSqyNr`

---

## Multisig Configuration

**Threshold:** 2-of-3 signatures required

| Signer | Role | Status |
|--------|------|--------|
| **SIGNER_A** | Unykorn 7777, Inc. | Pending Confirmation |
| **SIGNER_B** | OPTKAS1 SPV Manager | Pending Confirmation |
| **SIGNER_C** | Neutral Escrow / Co-Manager | To Be Designated |

---

## Execution Process

1. **Review** all documents in `01_AGREEMENT/`
2. **Read disclosures** in `02_DISCLOSURES/`
3. **Verify hashes** using `03_CRYPTO_PROOFS/HASHES.txt`
4. **Sign** the `SIGNATURE_PAGE.md`
5. **Pin to IPFS** and record CID
6. **Anchor** hash to XRPL (optional)

---

## Verification

All files are hashed using SHA-256. The complete manifest is available in:

- `03_CRYPTO_PROOFS/HASHES.txt` (human-readable)
- `03_CRYPTO_PROOFS/manifest.json` (machine-readable)

After IPFS pinning, the CID will be recorded in:
- `03_CRYPTO_PROOFS/IPFS_CID.txt`

---

## Hash Verification

```powershell
# PowerShell
Get-ChildItem -Path "PARTNER_ISSUANCE_v1" -Recurse -File |
  Where-Object { $_.Name -notin @("HASHES.txt","manifest.json") } |
  ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    "$hash  $($_.Name)"
  }
```

```bash
# Bash
find PARTNER_ISSUANCE_v1 -type f ! -name "HASHES.txt" ! -name "manifest.json" \
  -exec shasum -a 256 {} \;
```

Compare output to `HASHES.txt`.

---

## IPFS Pinning

```bash
# Add entire package to IPFS
ipfs add -r PARTNER_ISSUANCE_v1
# Returns: <CID>

# Record CID
echo "<CID>" > PARTNER_ISSUANCE_v1/03_CRYPTO_PROOFS/IPFS_CID.txt
```

---

## Access

The PARTNER_ISSUANCE_v1 package is available in the [GitHub repository](https://github.com/unykornai/TC/tree/main/PARTNER_ISSUANCE_v1).

For execution assistance, contact: **jimmy@optkas.com**

---

[← Back to Home](index.html)
