# MULTISIG SIGNER C — SELECTION GUIDE

**Purpose:** Sanity-check governance candidates for neutral third signer  
**Status:** Pre-Designation Analysis  
**Date:** February 2, 2026

---

## 🎯 WHAT SIGNER C MUST BE

A neutral control signer whose presence:

- ✅ Satisfies lender governance expectations
- ✅ Passes legal independence tests
- ✅ Does **not** create economic or control conflicts
- ✅ Can credibly testify to process integrity if required

**Signer C is not about speed. It's about trust and defensibility.**

---

## 🥇 OPTION 1: DEAL COUNSEL (RECOMMENDED)

**Role:** Independent legal counsel to OPTKAS1-MAIN SPV (or transaction-specific special counsel)

### Why This is the Gold Standard

- ✔ **Fiduciary duty already defined** — Professional responsibility framework exists
- ✔ **No economic participation** — No benefit from settlement timing or volume
- ✔ **Independence easily defensible** — Clear separation from both parties
- ✔ **Familiar to lenders and auditors** — Standard governance practice
- ✔ **Clean explanation in credit committee memo** — "As expected" response

### Typical Objections (Rebutted)

**Objection:** *"Counsel doesn't like holding keys"*  
**Response:** They don't hold custody. They co-authorize settlement mechanics. This is governance oversight, not asset control.

**Objection:** *"What about malpractice exposure?"*  
**Response:** Covered by standard engagement language + role disclosure already drafted in SIGNER_ATTESTATIONS.md.

### Lender Perception

> "This is exactly what we expect to see."

### Engagement Requirements

- Written engagement letter specifying governance-only role
- No asset custody language
- Multisig authorization scope defined
- Conflicts check cleared
- Professional liability insurance confirmed

### Recommendation

**If available, choose this immediately.**  
This ends governance questions before they start.

---

## 🥈 OPTION 2: INDEPENDENT DIRECTOR / INDEPENDENT MANAGER

**Role:** Non-economic, non-affiliate director or manager appointed for governance only

### Pros

- ✔ **Structurally neutral** — No operational or economic ties
- ✔ **Can be documented cleanly** — Board resolution + appointment letter
- ✔ **Acceptable to most private credit funds** — Standard governance structure

### Cons

- ⚠ **Requires formal appointment documentation** — Board resolution, appointment letter, conflicts disclosure
- ⚠ **Background diligence may be requested** — Resume, conflicts check, references
- ⚠ **Slightly slower than counsel option** — Additional documentation round

### Lender Perception

> "Acceptable, but we'll want to see the appointment docs."

### Appointment Requirements

- Board resolution appointing independent director/manager
- Written acceptance of appointment
- Conflicts of interest disclosure
- Resume/background (for lender diligence)
- Indemnification agreement (standard)

### Recommendation

**Strong fallback if counsel declines.**

---

## 🥉 OPTION 3: LENDER REPRESENTATIVE

**Role:** A representative of the eventual lender

### Pros

- ✔ **Lender comfort once selected** — Direct control representation
- ✔ **Aligns control with capital provider** — Natural governance fit post-close

### Cons (Material)

- ❌ **Cannot be designated pre-lender** — No lender exists yet
- ❌ **Creates timing dependency** — Delays governance closure
- ❌ **May require amendment later** — If lender changes or exits
- ❌ **Reduces your control optionality** — Lender veto on all settlements

### Lender Perception

> "Fine once we're in — not before."

### When to Use

**Only viable post-close as replacement Signer C** (requires unanimous 3-of-3 approval for config change).

### Recommendation

**Do not use as initial Signer C.**  
Blocks execution progress and creates unnecessary dependency.

---

## 🚫 OPTIONS TO AVOID (RED FLAGS)

These will trigger lender hesitation immediately:

- ❌ **Affiliate of Unykorn** — Control conflict, not neutral
- ❌ **Affiliate of OPTKAS1 sponsor** — Economic interest conflict
- ❌ **Anyone with success-based compensation** — Timing incentive conflict
- ❌ **Any person/entity holding collateral, funds, or tokens** — Custody conflict
- ❌ **"Trusted friend" or informal advisor** — No professional duty, appears collusive

**Lender response to any of these:**

> "We need to see a truly independent third party. This doesn't meet our governance standards."

---

## ✅ FINAL RECOMMENDATION (VERBATIM FOR STAKEHOLDERS)

> Signer C should be designated as independent deal counsel to OPTKAS1-MAIN SPV, acting solely in a non-custodial governance capacity for multisig authorization. This provides lender-standard neutrality, avoids economic conflicts, and satisfies audit and credit-committee expectations without introducing timing or amendment risk.

**Use this language in:**
- Lender presentations
- Credit committee memos
- Audit responses
- Legal opinions

---

## 🔜 ONCE YOU SELECT SIGNER C

Execution is mechanical (15 minutes):

### Step 1: Update Configuration
- Insert wallet address into `MULTISIG_CONFIG_LIVE.json`
- Update entity name and contact information
- Set status to "PENDING_ATTESTATION"

### Step 2: Obtain Attestation
- Send `SIGNER_ATTESTATIONS.md` to Signer C
- Receive completed attestation + signature proof
- Verify signature proves address control

### Step 3: Cryptographic Finality
- Pin updated config to IPFS
- Run `node xrpl_attest.js <CID> "Multisig Config v1.0 - Live"`
- Record TX hash in `XRPL_ATTESTATION_TXs.md`

### Step 4: Governance Closure
- Update `MULTISIG_CONFIG_LIVE.json` status to "LIVE"
- Update `03_MULTISIG/README.md` status to ✅ COMPLETE
- Commit and push to GitHub

**Result:** Governance layer closes. System becomes **fully live-controlled**.

---

## 📊 SELECTION DECISION MATRIX

| Criterion | Deal Counsel | Independent Director | Lender Rep | Affiliate |
|:----------|:------------:|:-------------------:|:----------:|:---------:|
| **Lender Acceptance** | ✅ Preferred | ✅ Acceptable | ⚠️ Post-close only | ❌ Rejected |
| **Independence** | ✅ Clear | ✅ Clear | ⚠️ Capital-aligned | ❌ Conflicted |
| **Speed to Execute** | ✅ Fast | ⚠️ Moderate | ❌ Blocks | ❌ Delays |
| **Documentation** | ✅ Minimal | ⚠️ Moderate | ⚠️ Moderate | ❌ Heavy |
| **Audit Defensibility** | ✅ High | ✅ High | ⚠️ Moderate | ❌ Low |
| **Cost** | $ Reasonable | $ Reasonable | $$ Lender-borne | $ N/A |

**Clear winner: Deal Counsel**

---

## 🎬 IMMEDIATE NEXT ACTION

**If you have a deal counsel candidate:**
1. Review this guide with them
2. Send engagement letter specifying governance-only role
3. Request XRPL/EVM wallet address
4. Have them complete SIGNER_ATTESTATIONS.md
5. Execute Steps 1-4 above

**If you don't have a deal counsel candidate:**
1. Identify transaction counsel for OPTKAS1-MAIN SPV
2. Send outreach email (template available on request)
3. Once confirmed, execute Steps 1-4 above

**Timeline:** Can be completed in 1-2 business days with responsive counsel.

---

## 📞 SIGNER C OUTREACH TEMPLATE (AVAILABLE)

If needed, request:
- **Signer C outreach email** (one-pager, neutral tone, role clarity)
- **Engagement letter language** (governance-only scope)
- **FAQ for counsel** (common objections + responses)

---

**Document Status:** ACTIVE DECISION GUIDE  
**Next Update:** After Signer C designation  
**Owner:** Unykorn + OPTKAS1 (joint decision)
