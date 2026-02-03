# LENDER SUBMISSION REQUIREMENTS

**TC Advantage / OPTKAS1-MAIN SPV**  
**Source of Truth:** `unykornai/TC` repository  
**Purpose:** Checklist of everything funding sources require

---

## ✅ WHAT THIS DOCUMENT IS

The **authoritative, lender-facing checklist** of everything you must supply to funding sources, mapped **exactly to what already exists in your repo**, plus the **few items that are execution-dependent** (not architectural gaps).

Written the way **credit committees, private credit funds, and bank deal teams** think. No fluff. No theory.

---

## I. EXECUTIVE & TRANSACTION OVERVIEW (FIRST READ)

These determine whether the lender keeps reading.

### Required

* **EXECUTIVE_SUMMARY.md**  
  📁 `DATA_ROOM_v1/00_EXEC_SUMMARY/`
* **README.md (Repo Overview)**  
  Explains structure, controls, and verification
* **Facility Terms (High Level)**  
  Advance rate, collateral, maturity, coupon, coverage

### Purpose

* Deal comprehension in <15 minutes
* Used by credit committee chair + screening analysts

✅ **Already complete**

---

## II. BORROWER & STRUCTURAL DOCUMENTS

### Required

* **SPV Structure Description**  
  Wyoming Series LLC, bankruptcy-remote
* **Transaction Structure Docs**
  - `LOAN_COMMITMENT_PACKAGE-v2.md`
  - Annexes (Tranche, System Architecture)

📁 `DATA_ROOM_v1/01_TRANSACTION_STRUCTURE/`

### Plus (Execution-Phase, if asked)

* Certificate of Formation (Wyoming)
* Operating Agreement
* Certificate of Good Standing

📁 `EXECUTION_v1/01_ENTITY/`

⚠️ Lenders often allow these **post–term sheet**, not upfront.

---

## III. COLLATERAL & CREDIT SUPPORT (MOST IMPORTANT)

This is the core of the credit decision.

### Required

* **STC Custody Statement (Critical)**  
  Confirms bond position
* **Bond Details**  
  CUSIP, ISIN, issuer, maturity, coupon
* **Borrowing Base Policy**  
  Haircuts, advance rates, coverage math
* **Coverage Ratios**  
  Conservative / Standard / Aggressive scenarios

📁 `DATA_ROOM_v1/02_COLLATERAL_AND_CREDIT/`

✅ **Institutional-grade and complete**

---

## IV. BOND & NOTE ISSUANCE DOCUMENTATION

### Required

* **Bond Issuance Guide**
* Confirmation of:
  - Transfer agent
  - DTC eligibility
  - Book-entry custody

📁 `DATA_ROOM_v1/03_BOND_AND_NOTE_ISSUANCE/`

Used by:
* Credit
* Ops
* Back-office settlement teams

---

## V. COMPLIANCE, RISK & INSURANCE

### Required

* **KYC / AML Compliance Package**
* **Insurance Underwriting Package**
  - C.J. Coleman & Co.
  - $25.75M Lloyd's-backed wrapper
* Jurisdictional disclosures

📁 `DATA_ROOM_v1/04_COMPLIANCE_AND_RISK/`

This answers:
* "Is this financeable?"
* "Can we defend this internally?"

---

## VI. CHAIN OF CUSTODY & VERIFICATION (DIFFERENTIATOR)

This is where your package is unusually strong.

### Required

* **XRPL Attestation Spec**
* **Audit Runbook**
* **FedEx / Evidence Artifacts**
* **SHA-256 Hashes**
* **data-room.json (machine manifest)**

📁 `DATA_ROOM_v1/05_CHAIN_OF_CUSTODY/`

Plus:
* `HASHES.txt`
* `INDEX.md`

This enables:
* Immutable audit proof
* Dispute reconstruction
* Third-party verification

---

## VII. PARTNER & GOVERNANCE DOCUMENTS (IF DISCLOSED)

Some lenders ask, some don't. You are ready either way.

### If disclosed

* **Strategic Infrastructure Execution Agreement**
* **Economic Participation Exhibit**
* **Smart Contract Settlement Exhibit**
* **Role & Non-Fiduciary Disclosures**

📁 `PARTNER_ISSUANCE_v1/`

This shows:
* Infrastructure partner is **non-lender, non-broker**
* No hidden control or fees

---

## VIII. SMART CONTRACT & SETTLEMENT MECHANICS

### Required (Conceptual)

* Distribution waterfall
* USD-denominated obligations
* Multisig authorization logic
* Wire fallback provisions

📁 `DATA_ROOM_v1 + bond-smart-contracts/`

### Optional (Execution)

* Multisig config
* XRPL attestation tx examples

📁 `EXECUTION_v1/03_MULTISIG/`  
📁 `EXECUTION_v1/04_IPFS_ATTESTATIONS/`

Most lenders review **logic**, not code.

---

## IX. DATA ROOM INTEGRITY & IMMUTABILITY (VERY IMPORTANT)

### Required

Confirmation that:
* DATA_ROOM_v1 is frozen
* Hashes match
* No retroactive edits

Artifacts:
* `HASHES.txt`
* `data-room.json`
* XRPL attestation (if provided)

This satisfies:
* Audit
* Legal
* Internal risk controls

---

## X. WHAT FUNDERS MAY REQUEST LATER (NOT DAY-1)

These are **closing-stage**, not screening-stage.

### Post–Term Sheet

* Executed Facility Agreement
* Security Agreement
* Control Agreement (with STC)
* UCC-1 filing confirmation
* Legal opinion (WY counsel)
* Final multisig signer designation

📁 `EXECUTION_v1/`

You **do not** need these to start conversations.

---

## XI. ONE-PAGE "WHAT YOU ARE SUBMITTING" (HOW YOU FRAME IT)

When sending to funding sources, describe it as:

> "A secured, bond-backed credit facility with third-party custody, insurance enhancement, conservative borrowing base, and cryptographic chain-of-custody verification, supported by a frozen institutional data room."

That framing matches how credit teams think.

---

## FINAL VERDICT

### You already have:

* ✅ All **screening-stage** requirements
* ✅ All **credit-committee** requirements
* ✅ All **audit & verification** requirements

### You are missing:

* ❌ Nothing architectural
* ⏳ Only execution artifacts that logically come **after lender selection**

---

## SUBMISSION PACKAGE STRUCTURE

When distributing to lenders, provide access via:

**Option 1: GitHub Repository Link**
- Share: https://github.com/unykornai/TC
- Point to: README.md (starts here)
- Then: DATA_ROOM_v1/ (comprehensive)

**Option 2: Zip Archive**
- Export DATA_ROOM_v1/ as zip
- Include README.md at root
- Include LENDER_SUBMISSION_REQUIREMENTS.md (this file)

**Option 3: Secure Data Room**
- Upload to Intralinks, Datasite, or similar
- Mirror GitHub structure
- Include verification instructions

---

## SCREENING VS DILIGENCE DISTINCTION

### Screening Stage (Weeks 0-2)
**What lenders need:**
- Executive summary
- Collateral description
- Borrowing base policy
- Insurance confirmation
- High-level structure

**From your repo:**
- DATA_ROOM_v1/00_EXEC_SUMMARY/
- DATA_ROOM_v1/02_COLLATERAL_AND_CREDIT/
- DATA_ROOM_v1/04_COMPLIANCE_AND_RISK/

### Diligence Stage (Weeks 3-5)
**What lenders need:**
- Full transaction docs
- Legal opinions
- UCC searches
- Insurance policies (full text)
- Custody agreements

**From your repo:**
- Complete DATA_ROOM_v1/
- EXECUTION_v1/ (as artifacts become available)

### Closing Stage (Weeks 8-10)
**What lenders need:**
- Executed agreements
- Filed UCC-1
- Certified good standing
- Final legal opinions
- Funded escrow confirmation

**From your repo:**
- EXECUTION_v1/02_SIGNED_AGREEMENTS/
- EXECUTION_v1/05_UCC_FILINGS/
- EXECUTION_v1/01_ENTITY/

---

## COMPETITIVE DIFFERENTIATION

### What most borrowers provide:
- PDF data room
- Static documents
- Manual verification

### What you provide:
- ✅ GitHub-hosted, version-controlled
- ✅ Cryptographic verification (SHA-256 + IPFS + XRPL)
- ✅ Machine-readable manifests
- ✅ Immutable audit trail
- ✅ Third-party verifiable

**Lender perception:**
> "This is more sophisticated than what we typically see."

---

## NEXT STEPS

**Ready now:**
- Send GitHub link to lenders
- Provide README.md as entry point
- Answer questions from DATA_ROOM_v1

**After partner agreement signed:**
- Update lenders on execution progress
- Share IPFS CIDs (optional, demonstrates integrity)

**After Signer C designated:**
- Confirm governance structure finalized
- Demonstrates control readiness

---

**Document Status:** LENDER-READY  
**Last Updated:** February 2, 2026  
**Owner:** OPTKAS1-MAIN SPV + Unykorn 7777, Inc.
