# FUNDING EXECUTION CALENDAR

**Track:** 1 (Bond / Collateral Facility)  
**Status:** Active execution  
**Effective:** February 7, 2026  
**Updated:** February 7, 2026

---

## 🔴 CRITICAL-PATH GATING ITEM

### STC Holder Position Statement Confirming OPTKAS1

**Status:** Pending  
**Impact:** Blocks funded close. Does NOT block outreach or diligence.

Until this arrives, lenders will:
- Review ✔ → Soft-approve ✔ → Issue conditional terms ✔ → **Fund ✘**

When this arrives:
- "Is this real?" becomes "What are the terms?"
- Conditional interest converts to binding negotiations
- Credit committee can vote

**Immediate action upon receipt:**
1. Add to data room (01_COLLATERAL folder)
2. Re-attest on XRPL with updated document hash
3. Send follow-up to any lenders in active diligence
4. Push for term sheet / LOI commitments within 48 hours

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

**Never attest something that can still change.**

---

## Phase D — Channel 3 Outreach (Monday AM, Feb 10)

**Send Track 1 lender emails. Tier 1A ONLY in first wave.**

Monday Wave 1 (10 lenders — bond-backed credit funds):
1. Ares (Alternative Credit / ABF)
2. Apollo (Asset-Backed Finance)
3. KKR (Asset-Based Finance)
4. HPS (Asset-Based Financing)
5. Fortress (Asset-Based Credit)
6. Stonebriar (Commercial Finance)
7. Benefit Street Partners
8. Oaktree (Structured Credit)
9. Cerberus (Credit Arm)
10. BlueMountain / Assured IM

Monday Wave 1B (if relationships exist — SBLC/MT760 desks):
11. Credit Suisse legacy desks
12. Deutsche Bank–linked SBLC desks
13. Standard Chartered trade finance
14. Barclays-adjacent credit desks

**Posture:** "This package is already frozen and verifiable. Review when ready."

**NOT in Wave 1:** Tier 2 family offices, Tier 3 large credit, backstop groups.

---

## Phase E — Diligence & Follow-Up (Monday–Wednesday, Feb 10–12)

- Respond to diligence questions within 24 hours
- Schedule calls within 48 hours of data room opens
- Track term sheet / LOI responses
- Reference CREDIT_COMMITTEE_QA.md for anticipated questions
- Use one-sentence sponsor script if asked (see LANE_DISCIPLINE_RULEBOOK.md)

---

## Phase F — Wave 2 Expansion (After First Responses)

**Trigger:** Any of: first term sheet received, 3+ diligence calls completed, or 5 business days elapsed.

Wave 2 targets:
- Tier 2A: White Oak, Gordon Brothers
- Tier 2B: Family offices with credit arms (ME, Swiss, Singapore, US multi-family)
- Tier 3: Blue Owl, Neuberger Berman, Guggenheim (route to ABF desk)

---

## Phase G — Post-Term-Sheet (After Binding Interest)

**Trigger:** Signed term sheet or LOI from any Tier 1/1B lender.

Actions:
1. Open Track 2 conversations (sponsor note monetization)
2. Share SPONSOR_DATA_ROOM_STRUCTURE with Track 2 prospects
3. Leverage Track 1 term sheet as credibility anchor
4. Platform economics become negotiable from position of strength
5. Backstop groups (warehouse, insurance-wrapped) can be activated

**Do NOT open Track 2 before a Track 1 term sheet exists.**

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
- OPTKAS signs internal docs → Dry-run Saturday → **Mainnet Sunday afternoon** → Emails Monday AM
- Message: "This package is already frozen and verifiable."

### Option B (Conservative)
- OPTKAS signs → Dry-run Saturday → Soft heads-up to 1–2 friendly parties → **Mainnet Monday morning** → Emails immediately after
- Message: "Attestation just completed. Package attached."

---

## What Funders Will See

✅ XRPL TX hash  
✅ Clean data room (6 folders, 19 files — Track 1 only)  
✅ Professional email asking for term sheet / LOI  
✅ No desperation  
✅ No "please sign"

❌ Internal negotiations  
❌ Draft economics  
❌ Leverage mechanics  
❌ Sponsor details  
❌ Document list in email

---

*Calendar is Track 1 only. Track 2 (Sponsor) timeline begins after Phase G trigger.*
