# FUNDING EXECUTION CALENDAR

**Track:** 1 (Bond / Collateral Facility)  
**Status:** Active execution  
**Effective:** February 7, 2026

---

## Phase A — Internal Signing (Now → Friday, Feb 6–7)

**OPTKAS executes internal sponsor/operator documents (privately)**

Documents to sign:
1. Master Platform / Infrastructure Agreement
2. Sponsor Consideration Note
3. Sponsor Note Estoppel (internal version)
4. IP / License / Dependency Clauses
5. Governance Acknowledgment (mission-critical platform)

**Why first:**
- Crystallizes sponsor claim before public delivery
- Removes "still negotiating internally" risk
- Strengthens Sponsor Note as issued paper, not a draft
- Clean answer if asked: "Is the sponsor already papered?" → **Yes**

**These do NOT go to funders.** They are prerequisites, not marketing.

---

## Phase B — Dress Rehearsal (Saturday, Feb 8)

**Replace stand-ins with final PDFs. Full internal ceremony.**

Steps:
1. Replace stand-in documents in `Final_Funding_Package/` with final signed versions
2. Run full dry-run ceremony:
   ```
   npx ts-node scripts/attest-funding-wave.ts --documents ./Final_Funding_Package --dry-run
   ```
3. Verify all hashes:
   ```
   npx ts-node scripts/attest-funding-wave.ts --verify ./logs/funding-wave-receipt-*.json --documents ./Final_Funding_Package
   ```
4. Generate data room manifest:
   ```
   npx ts-node scripts/attest-funding-wave.ts --data-room-manifest
   ```
5. Generate Channel 3 email:
   ```
   npx ts-node scripts/attest-funding-wave.ts --generate-email --recipient "[Name]" --sender "Jimmy"
   ```

**No mainnet. No audience. This is the dress rehearsal.**

---

## Phase C — Mainnet Attestation (Sunday, Feb 9, 2:00–4:00 PM)

**Live XRPL attestation with finalized documents.**

```
npx ts-node scripts/attest-funding-wave.ts --documents ./Final_Funding_Package --network mainnet --no-dry-run
```

Outputs:
- XRPL TX hash (permanent, verifiable)
- Wave receipt (JSON, with integrity hash)
- Locked data room snapshot

**Key strategic point:** Mainnet attestation is stronger if it already exists when funders open the email. The package is frozen and verifiable before anyone sees it.

---

## Phase D — Channel 3 Outreach (Sunday Evening or Monday AM, Feb 9–10)

**Send Track 1 lender emails.**

Wave 1 first (7 lenders):
1. Ares (Alternative Credit / ABF)
2. Apollo (Asset-Backed Finance)
3. KKR (Asset-Based Finance)
4. HPS (Asset-Based Financing)
5. Fortress (Asset-Based Credit)
6. White Oak (ABL)
7. Gordon Brothers (Asset Lending)

**Posture:** "This package is already frozen and verifiable. Review when ready."

---

## Phase E — Diligence & Follow-Up (Monday–Wednesday, Feb 10–12)

- Respond to diligence questions within 24 hours
- Schedule calls within 48 hours of data room opens
- Track term sheet / LOI responses
- Wave 2 expansion (10–20 additional lenders) if needed

---

## Strategic Windows

| Window | What it's good for | What it's NOT for |
|---|---|---|
| Sunday afternoon | First exposure, quiet review, analysts reading | Same-day term sheets, urgent wires |
| Monday morning | Follow-up, "let's discuss this week" | Weekend chaos, negotiation marathons |
| Mid-week | Term sheet negotiation, calls, LOIs | Initial cold outreach |

---

## Decision Framework

### Option A (Recommended — "Confidence Move")
- OPTKAS signs internal docs → Dry-run Saturday → **Mainnet Sunday afternoon** → Emails Sunday evening or Monday AM
- Message: "This package is already frozen and verifiable."

### Option B (Conservative)
- OPTKAS signs → Dry-run Saturday → Soft heads-up to 1–2 friendly parties → **Mainnet Monday morning** → Emails immediately after
- Message: "Attestation just completed. Package attached."

---

## What Funders Will See

✅ XRPL TX hash  
✅ Clean data room  
✅ Professional email  
✅ No desperation  
✅ No "please sign"

❌ Internal negotiations  
❌ Draft economics  
❌ Leverage mechanics  
❌ Sponsor details  

---

*Calendar is Track 1 only. Track 2 (Sponsor) timeline is separate.*
