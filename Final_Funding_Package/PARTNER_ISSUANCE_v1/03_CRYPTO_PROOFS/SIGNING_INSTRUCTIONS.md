# SIGNING INSTRUCTIONS

**Partner Issuance Package v1.0**  
**Document:** Step-by-step guide for reviewing, verifying, and signing

---

## Overview

This document explains how to:

1. Verify the integrity of this package
2. Review all documents
3. Execute the Agreement
4. Confirm execution cryptographically
5. Pin to IPFS for permanent storage

---

## Step 1: Download and Verify the Package

### 1.1 Obtain the Package

You should have received either:

- **IPFS CID** (e.g., `Qm...` or `bafy...`)
- **Direct file transfer** with accompanying HASHES.txt

### 1.2 Pin from IPFS (if applicable)

```bash
# Pin the package locally
ipfs pin add <CID>

# Download to local folder
ipfs get <CID> -o PARTNER_ISSUANCE_v1
```

### 1.3 Verify File Hashes

Compare computed hashes against `03_CRYPTO_PROOFS/HASHES.txt`:

**PowerShell:**
```powershell
$root = "PARTNER_ISSUANCE_v1"
Get-ChildItem -Path $root -Recurse -File |
  Where-Object { $_.Name -ne "HASHES.txt" -and $_.Name -ne "manifest.json" } |
  ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    $rel  = $_.FullName.Replace("$root\", "")
    "$hash  $rel"
  }
```

**Bash/macOS:**
```bash
find PARTNER_ISSUANCE_v1 -type f ! -name "HASHES.txt" ! -name "manifest.json" \
  -exec shasum -a 256 {} \;
```

**Expected Result:** All computed hashes should match those in HASHES.txt exactly.

---

## Step 2: Review Documents

### 2.1 Required Reading (All Signers)

Read these documents in order:

| # | Document | Location |
|:-:|:---------|:---------|
| 1 | README | `00_README/README.md` |
| 2 | Agreement | `01_AGREEMENT/STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md` |
| 3 | Exhibit A | `01_AGREEMENT/EXHIBIT_A_ECONOMIC_PARTICIPATION.md` |
| 4 | Exhibit B | `01_AGREEMENT/EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md` |
| 5 | Role Disclosure | `02_DISCLOSURES/ROLE_DISCLOSURE_NON_FIDUCIARY.md` |
| 6 | Risk Disclosure | `02_DISCLOSURES/RISK_DISCLOSURE_TECH_AND_SETTLEMENT.md` |
| 7 | Confidentiality | `02_DISCLOSURES/CONFIDENTIALITY_NOTICE.md` |

### 2.2 Key Decisions

Before signing, confirm:

☐ **Option A or Option B** — Which participation structure?  
☐ **Payment Address** — Confirm XRPL address is correct  
☐ **Multisig Signers** — Confirm signer designations

---

## Step 3: Execute the Agreement

### 3.1 Methods of Signature

**Option A: Ink Signature (PDF)**

1. Print `01_AGREEMENT/SIGNATURE_PAGE.md`
2. Complete all fields
3. Sign and date
4. Scan to PDF
5. Save as `SIGNATURE_PAGE_SIGNED.pdf`

**Option B: Digital Signature**

1. Use DocuSign, Adobe Sign, or similar
2. Ensure legally binding e-signature
3. Export signed document as PDF

**Option C: Cryptographic Signature**

1. Hash the Agreement: `shasum -a 256 STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md`
2. Sign the hash with your XRPL or Ethereum key
3. Record signature in `SIGNATURE_CONFIRMATION.json`

### 3.2 Initial Exhibit A

Both parties must initial their selected option:

- ☐ Option A (10% Net Cash Flow)
- ☐ Option B (2% Success Fee + 4% Participation)

---

## Step 4: Exchange Signed Documents

### 4.1 Return to Counterparty

1. Create `SIGNED_PACKET/` folder
2. Copy original package contents
3. Add signed signature page
4. Generate new HASHES.txt for signed packet
5. Send to counterparty

### 4.2 Countersignature

1. Counterparty reviews signed packet
2. Counterparty adds their signature
3. Final packet created with both signatures

---

## Step 5: Pin Signed Packet to IPFS

### 5.1 Generate Final Hashes

```powershell
$root = "SIGNED_PACKET"
Get-ChildItem -Path $root -Recurse -File |
  ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    $rel  = $_.FullName.Replace("$root\", "")
    "$hash  $rel"
  } | Out-File -FilePath "$root\HASHES_FINAL.txt" -Encoding UTF8
```

### 5.2 Add to IPFS

```bash
ipfs add -r -Q SIGNED_PACKET
# Returns: <CID>
```

### 5.3 Record CID

Save the CID to:
- `SIGNED_PACKET/IPFS_CID.txt`
- Party records
- Email confirmation to all signers

---

## Step 6: Anchor to XRPL (Optional)

### 6.1 Create Attestation Payload

```json
{
  "type": "AGREEMENT_EXECUTION",
  "agreement": "STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT",
  "version": "1.0",
  "ipfs_cid": "<CID>",
  "hashes_sha256": "<SHA256 of HASHES_FINAL.txt>",
  "execution_date": "2026-02-02"
}
```

### 6.2 Submit to XRPL

Using the attestation account `rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV`:

1. Create Payment transaction with memo
2. Memo contains: SHA256 hash of attestation payload
3. Record TX hash

### 6.3 Verification

Anyone can verify by:
1. Retrieving TX from XRPL Explorer
2. Comparing memo hash to attestation payload
3. Retrieving package from IPFS using CID
4. Verifying file hashes match

---

## Verification Checklist

| Step | Action | Verified |
|:----:|--------|:--------:|
| 1 | Package downloaded/pinned | ☐ |
| 2 | All hashes match HASHES.txt | ☐ |
| 3 | Agreement reviewed | ☐ |
| 4 | Exhibits reviewed | ☐ |
| 5 | Disclosures reviewed | ☐ |
| 6 | Option A/B selected | ☐ |
| 7 | Signature page completed | ☐ |
| 8 | Counterparty signed | ☐ |
| 9 | Final packet pinned to IPFS | ☐ |
| 10 | CID distributed to all parties | ☐ |
| 11 | XRPL attestation (optional) | ☐ |

---

## Support

Questions about this process:

**SPV Manager:** jimmy@optkas.com

---

*This document is part of the Partner Issuance Package.*
