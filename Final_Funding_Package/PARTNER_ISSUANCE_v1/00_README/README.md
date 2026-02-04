# PARTNER ISSUANCE PACKAGE v1.0

**Document Status:** EXECUTION READY  
**Issuance Date:** February 2, 2026  
**Contact:** jimmy@optkas.com

---

## Purpose

This package contains all documents required for the formal execution of the Strategic Infrastructure & Execution Agreement between:

| Party | Entity | Role |
|-------|--------|------|
| **Unykorn 7777, Inc.** | Wyoming Corporation | RWA Infrastructure Partner |
| **OPTKAS1-MAIN SPV** | Wyoming Series LLC | Borrower / Collateral Holder |

This is a **self-contained, IPFS-pinnable, cryptographically verifiable** issuance package.

---

## Package Contents

```
PARTNER_ISSUANCE_v1/
├── 00_README/
│   ├── README.md                          ← You are here
│   └── ISSUANCE_CHECKLIST.md              ← Step-by-step execution workflow
│
├── 01_AGREEMENT/
│   ├── STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md
│   ├── EXHIBIT_A_ECONOMIC_PARTICIPATION.md
│   ├── EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md
│   └── SIGNATURE_PAGE.md
│
├── 02_DISCLOSURES/
│   ├── ROLE_DISCLOSURE_NON_FIDUCIARY.md
│   ├── RISK_DISCLOSURE_TECH_AND_SETTLEMENT.md
│   └── CONFIDENTIALITY_NOTICE.md
│
├── 03_CRYPTO_PROOFS/
│   ├── HASHES.txt                         ← SHA-256 of all files
│   ├── manifest.json                      ← Machine-readable file index
│   ├── SIGNING_INSTRUCTIONS.md            ← How to verify and sign
│   └── MULTISIG_CONFIG.json               ← 2-of-3 signer configuration
│
└── 99_APPENDIX/
    ├── PARTNERSHIP_OVERVIEW_ONEPAGER.md
    └── DATA_ROOM_v1_POINTERS.md
```

---

## How to Execute

1. **Review** all documents in `01_AGREEMENT/`
2. **Read disclosures** in `02_DISCLOSURES/`
3. **Verify hashes** using `03_CRYPTO_PROOFS/HASHES.txt`
4. **Sign** the `SIGNATURE_PAGE.md` (ink/PDF or digital)
5. **Pin to IPFS** and record CID
6. **Anchor** hash to XRPL (optional but recommended)

See `ISSUANCE_CHECKLIST.md` for detailed instructions.

---

## Verification

All files in this package are hashed using SHA-256. The complete manifest is available in:

- `03_CRYPTO_PROOFS/HASHES.txt` (human-readable)
- `03_CRYPTO_PROOFS/manifest.json` (machine-readable)

**After IPFS pinning**, the CID will be recorded in:
- `03_CRYPTO_PROOFS/IPFS_CID.txt`

---

## Legal Framework

- **Governing Law:** Wyoming
- **Dispute Resolution:** Arbitration (per agreement terms)
- **Payment Rail:** XRPL primary, wire fallback
- **Settlement Denomination:** USD (stablecoin at par)

---

## Contact

| Role | Contact |
|------|---------|
| SPV Manager | jimmy@optkas.com |
| Unykorn Contact | [To be furnished] |

---

*This package is confidential and intended for the named parties only.*
