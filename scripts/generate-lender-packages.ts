#!/usr/bin/env npx ts-node
/**
 * OPTKAS — Lender Package Generator
 *
 * Generates personalized outreach packages for each Wave 1 target lender.
 * Each package includes a tailored email, data room access brief,
 * and lender-specific positioning based on their known mandate.
 *
 * Output: lender_packages/<lender-slug>/ — email.md + brief.md
 *
 * This is what placement agents charge $50K to do manually.
 * We automate it and get it right the first time.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'lender_packages');

console.log(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║  OPTKAS — LENDER PACKAGE GENERATOR                           ║
  ║  Personalized Wave 1 outreach for credit committee review     ║
  ╚═══════════════════════════════════════════════════════════════╝
`);

// ═══════════════════════════════════════════════════════════════════
//  LENDER REGISTRY — Wave 1 Tier 1A + 1B
// ═══════════════════════════════════════════════════════════════════

interface LenderTarget {
  id: number;
  name: string;
  slug: string;
  tier: '1A' | '1B';
  focus: string;
  fitReason: string;
  approachAngle: string;
  diligenceCycle: string;
  keyQuestion: string;
  keyAnswer: string;
}

const WAVE_1_TARGETS: LenderTarget[] = [
  {
    id: 1, name: 'Ares Management', slug: 'ares-management', tier: '1A',
    focus: 'Alternative Credit / ABF',
    fitReason: 'ABF is their explicit mandate; borrowing base + reporting is native to their process',
    approachAngle: 'advance rate ask + collateral type + automated reporting cadence',
    diligenceCycle: '3–6 weeks',
    keyQuestion: 'Can you automate borrowing base reporting?',
    keyAnswer: 'Yes. Monthly certificates are auto-generated with real-time collateral valuation, advance rate calculations, and covenant compliance — hash-attested on XRPL.',
  },
  {
    id: 2, name: 'Apollo', slug: 'apollo', tier: '1A',
    focus: 'Asset-Backed Finance',
    fitReason: 'Dedicated ABF strategy mirrors OPTKAS collateral-first framing',
    approachAngle: 'collateral verification + custody/control + reporting cadence',
    diligenceCycle: '4–8 weeks',
    keyQuestion: 'How is collateral custody verified?',
    keyAnswer: 'Securities Transfer Corporation holds the TC Advantage Notes. Position statement on file (Jan 23, 2026). Control agreement template ready for execution. Full chain of custody documented.',
  },
  {
    id: 3, name: 'KKR', slug: 'kkr', tier: '1A',
    focus: 'Asset-Based Finance',
    fitReason: 'Publishes ABF primers that mirror our collateral-first framing exactly',
    approachAngle: 'borrowing base automation + XRPL attestation as enhanced verification',
    diligenceCycle: '4–8 weeks',
    keyQuestion: 'What makes this different from a standard ABL?',
    keyAnswer: 'Same UCC enforcement mechanics, same custody framework — but with automated reporting, real-time collateral monitoring, and immutable delivery attestation via XRPL. Traditional structure, enhanced verification.',
  },
  {
    id: 4, name: 'HPS Partners', slug: 'hps-partners', tier: '1A',
    focus: 'Asset-Based Financing',
    fitReason: 'Full capital structure approach, comfortable with bespoke controls',
    approachAngle: 'structure clarity + reporting covenant strength',
    diligenceCycle: '3–6 weeks',
    keyQuestion: 'What are the reporting covenants?',
    keyAnswer: 'Monthly borrowing base certificates (auto-generated), quarterly NAV snapshots, real-time exception reporting, annual audit. All hash-signed for verifiability.',
  },
  {
    id: 5, name: 'Fortress Investment Group', slug: 'fortress', tier: '1A',
    focus: 'Asset-Based Credit',
    fitReason: 'Asset-based credit strategy aligns directly with OPTKAS collateral approach',
    approachAngle: 'custody confirmation + valuation methodology + exception reporting',
    diligenceCycle: '3–6 weeks',
    keyQuestion: 'What is the valuation methodology?',
    keyAnswer: 'Mark-to-market based on broker quotes for the TC Advantage Notes (CUSIP 87225HAB4). Conservative advance rates (50–65%). Independent verification via STC position confirmation. Monthly revaluation.',
  },
  {
    id: 6, name: 'Stonebriar Commercial Finance', slug: 'stonebriar', tier: '1A',
    focus: 'Structured Lending',
    fitReason: 'Underwrite documents, custody, and enforceability directly',
    approachAngle: 'STC custody + UCC perfection + conservative LTV',
    diligenceCycle: '2–4 weeks',
    keyQuestion: 'How is the security interest perfected?',
    keyAnswer: 'UCC-1 financing statement (Article 8/9). Control agreement with STC. Physical chain of custody documented from issuance through current custody. Standard enforcement mechanics — no blockchain dependency.',
  },
  {
    id: 7, name: 'Benefit Street Partners', slug: 'benefit-street', tier: '1A',
    focus: 'Structured Credit / ABL',
    fitReason: 'Comfortable with UCC + transfer agent control frameworks',
    approachAngle: 'collateral verification + enforcement path clarity',
    diligenceCycle: '3–6 weeks',
    keyQuestion: 'What is the enforcement path?',
    keyAnswer: 'Standard UCC framework. Control agreement with STC gives lender direct access upon event of default. No dependency on blockchain, smart contracts, or digital infrastructure for enforcement.',
  },
  {
    id: 8, name: 'Oaktree Capital (Structured Credit)', slug: 'oaktree', tier: '1A',
    focus: 'Structured Credit',
    fitReason: 'Underwrite collateral quality, not issuer story',
    approachAngle: 'valuation methodology + borrowing base math + reporting',
    diligenceCycle: '4–8 weeks',
    keyQuestion: 'What is the collateral quality?',
    keyAnswer: 'TC Advantage 5% Secured Medium-Term Notes at Securities Transfer Corporation. Rated collateral with documented custody chain. Conservative 20–40% target LTV. 4.98× collateral coverage ratio at current valuations.',
  },
  {
    id: 9, name: 'Cerberus Capital', slug: 'cerberus', tier: '1A',
    focus: 'Asset-Based Credit',
    fitReason: 'Collateral-first; do not require issuer relationship equity',
    approachAngle: 'chain of custody + STC verification + haircut math',
    diligenceCycle: '3–5 weeks',
    keyQuestion: 'Can we verify the collateral independently?',
    keyAnswer: 'Yes. (1) STC position statement on file. (2) FedEx chain of custody documented. (3) XRPL attestation with verifiable TX hash. (4) SHA-256 document hashes. All independently verifiable without our cooperation.',
  },
  {
    id: 10, name: 'BlueMountain / Assured IM', slug: 'bluemountain-assured', tier: '1A',
    focus: 'Structured Credit',
    fitReason: 'Bond-backed lending is core competency; comfortable with 144A paper',
    approachAngle: 'note structure + custody confirmation + advance rates',
    diligenceCycle: '3–6 weeks',
    keyQuestion: 'What is the note structure?',
    keyAnswer: '$10M face value TC Advantage 5% Secured Medium-Term Notes. CUSIP 87225HAB4. Held at STC. SPV structure (OPTKAS1-MAIN SPV, LLC — Wyoming). Clean UCC perfection path. No subordination.',
  },
  {
    id: 11, name: 'Credit Suisse Legacy Desks', slug: 'credit-suisse-legacy', tier: '1B',
    focus: 'MT760 / Structured Credit',
    fitReason: 'MT760 familiarity, structured credit DNA from CS era',
    approachAngle: 'instrument legitimacy + SBLC enhancement potential',
    diligenceCycle: '2–4 weeks',
    keyQuestion: 'Is this MT760-compatible?',
    keyAnswer: 'The collateral can support SBLC issuance (Path C). The notes are held at STC with full custody documentation. MT760 wrapper is a natural enhancement to the base facility structure.',
  },
  {
    id: 12, name: 'Deutsche Bank–Linked SBLC Desks', slug: 'deutsche-sblc', tier: '1B',
    focus: 'SBLC Warehousing / Note Monetization',
    fitReason: 'SBLC warehousing, note monetization experience via DB conduits',
    approachAngle: 'note monetization experience + short diligence cycle',
    diligenceCycle: '2–4 weeks',
    keyQuestion: 'What is the monetization path?',
    keyAnswer: 'Path A: Direct lending against the notes (primary). Path C: SBLC enhancement if preferred. Notes are STC-held, UCC-perfectable, with conservative LTV. Ready for immediate monetization.',
  },
  {
    id: 13, name: 'Standard Chartered Trade Finance', slug: 'standard-chartered', tier: '1B',
    focus: 'Trade Finance / Instrument Legitimacy',
    fitReason: 'Instrument legitimacy focus, custody confirmation standard',
    approachAngle: 'custody chain + instrument verification + reporting',
    diligenceCycle: '3–6 weeks',
    keyQuestion: 'How is instrument legitimacy established?',
    keyAnswer: 'STC transfer agent confirmation (on file). FedEx physical delivery chain documented. XRPL attestation provides immutable delivery timestamp. SHA-256 document hashes for data room integrity.',
  },
  {
    id: 14, name: 'Barclays-Adjacent Private Credit', slug: 'barclays-credit', tier: '1B',
    focus: 'Structured Credit / MT760',
    fitReason: 'Structured credit background with MT760 comfort from Barclays heritage',
    approachAngle: 'structured credit framework + conservative positioning',
    diligenceCycle: '3–5 weeks',
    keyQuestion: 'What makes this credit-committee ready?',
    keyAnswer: 'Zero gating items. STC holder confirmation on file. Complete data room (34 documents, SHA-256 verified). Automated reporting. Conservative LTV (20–40%). Dual-chain attestation. Professional presentation, clean structure.',
  },
];

// ═══════════════════════════════════════════════════════════════════
//  GENERATE PACKAGES
// ═══════════════════════════════════════════════════════════════════

const ATTESTATION_TX = '8C8922A650A8EA0ABA03024567535D9DA9B65AA547B57CC728B16B1338842BC2';
const SUBJECT = 'Senior Secured Facility | Collateral Verified | Borrowing Base + Reporting Ready | XRPL-Attested Delivery';

let generatedCount = 0;

for (const lender of WAVE_1_TARGETS) {
  const lenderDir = path.join(OUTPUT_DIR, lender.slug);
  fs.mkdirSync(lenderDir, { recursive: true });

  // ── Generate personalized email ──────────────────────────────

  const email = `# Outreach Email — ${lender.name}

**To:** Credit / ABF Desk  
**From:** OPTKAS1-MAIN SPV, LLC  
**Subject:** ${SUBJECT}  
**Date:** February 10, 2026  
**Priority:** Wave 1 — Tier ${lender.tier}

---

We are seeking a senior secured revolving credit facility at 50–65% advance rate against $10M in TC Advantage 5% Secured Medium-Term Notes (CUSIP 87225HAB4) held at Securities Transfer Corporation. STC holder position statement confirmed February 1, 2026.

Monthly borrowing base certificates are auto-generated with real-time collateral valuation, covenant compliance tracking, and hash-attested delivery — no manual reporting burden. LTV target: 20–40%.

XRPL delivery attestation: \`${ATTESTATION_TX.substring(0, 16)}...${ATTESTATION_TX.substring(56)}\`  
Verify: https://livenet.xrpl.org/transactions/${ATTESTATION_TX}

Data room is available for immediate review — 34 documents, SHA-256 verified, 7 categories.

We welcome a term sheet or LOI at your earliest convenience.

---

**Positioning Notes (internal — not in email):**

- **Why ${lender.name} fits:** ${lender.fitReason}
- **Approach angle:** ${lender.approachAngle}
- **Expected diligence cycle:** ${lender.diligenceCycle}
- **Likely first question:** "${lender.keyQuestion}"
- **Prepared answer:** "${lender.keyAnswer}"

---

*This email follows the collateral-first template: advance rate + collateral type + custody/control → borrowing base + reporting → attestation proof → ask for term sheet. No document list. No desperation. No "please sign."*
`;

  fs.writeFileSync(path.join(lenderDir, 'email.md'), email);

  // ── Generate lender-specific brief ───────────────────────────

  const brief = `# ${lender.name} — Lender Brief

**Tier:** ${lender.tier}  
**Focus:** ${lender.focus}  
**Target Desk:** Credit / ABF / Structured Credit  
**Expected Diligence:** ${lender.diligenceCycle}

---

## Why ${lender.name}

${lender.fitReason}

## Approach Strategy

Lead with: **${lender.approachAngle}**

Do NOT lead with: platform technology, token details, AI trading capabilities, or sponsor economics.

## Anticipated Q&A

### Q: "${lender.keyQuestion}"

**A:** "${lender.keyAnswer}"

### Q: "Can you prove holder position?"

**A:** "Yes. The STC position statement is in the data room (02_COLLATERAL_AND_CREDIT folder). It confirms the $10M MTN position. We can walk you through the full custody trail on a call."

### Q: "What is the XRPL attestation?"

**A:** "It's a supplementary verification layer — an immutable timestamp on the XRP Ledger confirming when documents were frozen and delivered. Think of it as a notarized delivery receipt. Not required for enforcement; the facility uses standard UCC mechanics."

### Q: "Is there blockchain dependency?"

**A:** "No. The blockchain attestation is supplementary verification only. Enforcement uses standard UCC Article 8/9 framework. The control agreement with STC gives the lender direct access to collateral upon event of default. No smart contract, no token, no blockchain required for enforcement."

## Data Room Reading Order (for ${lender.name} analyst)

1. \`00_EXEC_SUMMARY/EXECUTIVE_SUMMARY.md\` — 2-page deal overview
2. \`01_TRANSACTION_STRUCTURE/LOAN_COMMITMENT_PACKAGE-v2.md\` — Full submission
3. \`02_COLLATERAL_AND_CREDIT/STC_Statement.pdf\` — Collateral verification
4. \`02_COLLATERAL_AND_CREDIT/BORROWING_BASE_POLICY.md\` — Haircut methodology
5. \`01_TRANSACTION_STRUCTURE/ANNEX_A_Tranche_Details.md\` — CUSIP / valuation

## Key Metrics to Highlight

| Metric | Value |
|---|---|
| Collateral | $10M TC Advantage 5% Secured MTN |
| CUSIP | 87225HAB4 |
| Custodian | Securities Transfer Corporation |
| Advance Rate Ask | 50–65% |
| Target LTV | 20–40% |
| Current Coverage Ratio | 4.98× |
| Reporting | Monthly BBC (auto-generated) |
| Attestation | XRPL NFT (Taxon 100) + Stellar manage_data |
| Data Room | 34 documents, SHA-256 verified |
| Gating Items | Zero |

## Post-Outreach Checklist

- [ ] Email sent
- [ ] Data room access provided
- [ ] Acknowledge receipt (within 24h)
- [ ] Schedule diligence call (within 48h)
- [ ] Track term sheet / LOI response
- [ ] Log in CRM / tracking sheet

---

*Generated by OPTKAS Lender Package Generator — ${new Date().toISOString()}*
`;

  fs.writeFileSync(path.join(lenderDir, 'brief.md'), brief);

  generatedCount++;
  console.log(`  ✅ ${String(lender.id).padStart(2)}. ${lender.name.padEnd(35)} → lender_packages/${lender.slug}/`);
}

// ── Generate master index ──────────────────────────────────────

const index = `# LENDER PACKAGE INDEX

**Generated:** ${new Date().toISOString()}  
**Wave:** 1 (Tier 1A + 1B)  
**Total Packages:** ${generatedCount}  
**Status:** Ready for Feb 10 outreach

---

## Tier 1A — Bond-Backed Credit Funds

| # | Lender | Package | Diligence Cycle |
|---|---|---|---|
${WAVE_1_TARGETS.filter(l => l.tier === '1A').map(l => `| ${l.id} | ${l.name} | [${l.slug}/](${l.slug}/) | ${l.diligenceCycle} |`).join('\n')}

## Tier 1B — SBLC / MT760 Desks

| # | Lender | Package | Diligence Cycle |
|---|---|---|---|
${WAVE_1_TARGETS.filter(l => l.tier === '1B').map(l => `| ${l.id} | ${l.name} | [${l.slug}/](${l.slug}/) | ${l.diligenceCycle} |`).join('\n')}

---

## Each Package Contains

- \`email.md\` — Personalized outreach email (collateral-first template)
- \`brief.md\` — Internal lender brief with approach strategy, Q&A, reading order

## Email Subject Line (Consistent Across All)

> ${SUBJECT}

---

*Do NOT modify individual packages. Re-run the generator to update all packages simultaneously.*
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'INDEX.md'), index);

console.log(`\n  ═══════════════════════════════════════════════════════════════`);
console.log(`  ✅ ${generatedCount} lender packages generated`);
console.log(`  📁 Output: lender_packages/`);
console.log(`  📄 Index: lender_packages/INDEX.md`);
console.log(`  ═══════════════════════════════════════════════════════════════\n`);
