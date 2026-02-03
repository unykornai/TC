# PARTNER AGREEMENT EXECUTION INSTRUCTIONS

**Document Type:** Operational Execution Guide  
**Parties:** Unykorn 7777, Inc. × OPTKAS1-MAIN SPV  
**Agreement:** Strategic Infrastructure & Execution Agreement  
**Effective Date:** January 26, 2026  
**Execution Deadline:** February 9, 2026

---

## 🎯 OBJECTIVE

Execute the Strategic Infrastructure & Execution Agreement between Unykorn 7777, Inc. and OPTKAS1-MAIN SPV with cryptographic proof of execution.

---

## 📋 PRE-EXECUTION CHECKLIST

### Both Parties Must Complete

- [ ] Review `PARTNER_ISSUANCE_v1/01_AGREEMENT/STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md`
- [ ] Review `PARTNER_ISSUANCE_v1/01_AGREEMENT/EXHIBIT_A_ECONOMIC_PARTICIPATION.md`
- [ ] Review `PARTNER_ISSUANCE_v1/01_AGREEMENT/EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md`
- [ ] Review all disclosures in `PARTNER_ISSUANCE_v1/02_DISCLOSURES/`
- [ ] Verify hashes in `PARTNER_ISSUANCE_v1/03_CRYPTO_PROOFS/HASHES.txt`

---

## ⚠️ CRITICAL DECISION REQUIRED

**Select ONE economic option in Exhibit A:**

### Option A: Net Cash Flow Participation (Recommended)
- 10% of Net Distributable Cash Flow
- Paid per distribution event
- No upfront fee

### Option B: Hybrid Model
- 2% success fee (at facility close)
- 4% of Net Distributable Cash Flow (ongoing)

**Both parties must select the SAME option.**

---

## 📝 EXECUTION WORKFLOW

### STEP 1: Economic Option Election

**Both parties independently:**

1. Open `PARTNER_ISSUANCE_v1/01_AGREEMENT/EXHIBIT_A_ECONOMIC_PARTICIPATION.md`
2. Choose Option A OR Option B
3. Record choice (do not modify document yet)

**Conference call to confirm:**
- Both parties verbally confirm same option selected
- If mismatch: discuss and align
- If aligned: proceed to Step 2

---

### STEP 2: Signature Page Completion

**Location:** `PARTNER_ISSUANCE_v1/01_AGREEMENT/SIGNATURE_PAGE.md`

#### Unykorn 7777, Inc. Completes:

```markdown
### UNYKORN 7777, INC.

| Field | Entry |
|:------|:------|
| **By:** | [Authorized Signatory Name] |
| **Name:** | [Print Name] |
| **Title:** | [Title] |
| **Date:** | 2026-02-[XX] |

**Exhibit A Election:**  
☑ Option [A/B] ([description])

**Initial:** [XX]
```

#### OPTKAS1-MAIN SPV Completes:

```markdown
### OPTKAS1-MAIN SPV

| Field | Entry |
|:------|:------|
| **By:** | [Manager Name] |
| **Name:** | [Print Name] |
| **Title:** | Manager |
| **Date:** | 2026-02-[XX] |

**Exhibit A Election:**  
☑ Option [A/B] ([description])

**Initial:** [XX]
```

---

### STEP 3: Document Execution

**Method 1: Digital Signature (Recommended)**
- Export SIGNATURE_PAGE.md to PDF
- Sign PDF using DocuSign, Adobe Sign, or equivalent
- Save as: `SIGNATURE_PAGE_SIGNED.pdf`

**Method 2: Wet Signature**
- Print SIGNATURE_PAGE.md
- Sign in ink
- Scan to PDF
- Save as: `SIGNATURE_PAGE_SIGNED.pdf`

**Both parties must sign the same document.**

---

### STEP 4: Create Signed Package

**Action:** Create new folder

**Location:** `EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED/`

**Contents:**
```
PARTNER_AGREEMENT_SIGNED/
├── STRATEGIC_INFRASTRUCTURE_EXECUTION_AGREEMENT.md (copy from PARTNER_ISSUANCE_v1)
├── EXHIBIT_A_ECONOMIC_PARTICIPATION.md (copy from PARTNER_ISSUANCE_v1)
├── EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md (copy from PARTNER_ISSUANCE_v1)
├── SIGNATURE_PAGE_SIGNED.pdf (newly signed)
├── HASHES_SIGNED.txt (to be generated)
└── IPFS_CID.txt (to be generated)
```

---

### STEP 5: Generate Signed Package Hashes

**PowerShell Command:**

```powershell
cd EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED

Get-ChildItem -File | ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC"
    "$hash  $($_.Name)  [$timestamp]"
} | Out-File -FilePath "HASHES_SIGNED.txt" -Encoding UTF8

Write-Host "HASHES_SIGNED.txt generated"
```

**Bash Command:**

```bash
cd EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED

find . -maxdepth 1 -type f ! -name "HASHES_SIGNED.txt" -exec shasum -a 256 {} \; | \
  awk '{print $1 "  " $2 "  [" strftime("%Y-%m-%d %H:%M:%S UTC") "]"}' > HASHES_SIGNED.txt

echo "HASHES_SIGNED.txt generated"
```

---

### STEP 6: Pin to IPFS

**Prerequisites:**
- IPFS daemon running (`ipfs daemon`)
- OR use pinning service (Pinata, Infura, etc.)

**Command:**

```bash
ipfs add -r EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED

# Returns CID (example):
# added QmYHNYAaYK5hm51D7b84D6eKt6pKqvB4JxH2z... PARTNER_AGREEMENT_SIGNED
```

**Record CID:**

```bash
echo "QmYHNYAaYK5hm51D7b84D6eKt6pKqvB4JxH2z..." > EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED/IPFS_CID.txt
```

**Also record in:**
```bash
echo "QmYHNYAaYK5hm51D7b84D6eKt6pKqvB4JxH2z..." > EXECUTION_v1/04_IPFS_ATTESTATIONS/PARTNER_AGREEMENT_SIGNED_CID.txt
```

---

### STEP 7: XRPL Attestation (Optional but Recommended)

**Purpose:** Anchor signed package hash to immutable blockchain

**Process:**

1. **Compute SHA-256 of IPFS CID:**

```powershell
$cid = Get-Content "EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED/IPFS_CID.txt"
$cidBytes = [System.Text.Encoding]::UTF8.GetBytes($cid)
$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($cidBytes)
$hashHex = [BitConverter]::ToString($hash).Replace("-","").ToLower()
Write-Host "CID Hash: $hashHex"
```

2. **Submit XRPL Payment TX:**

```javascript
const xrpl = require("xrpl");

async function attestToXRPL(cidHash) {
  const client = new xrpl.Client("wss://xrplcluster.com");
  await client.connect();
  
  const wallet = xrpl.Wallet.fromSeed("s..."); // XRPL account seed
  
  const tx = {
    TransactionType: "Payment",
    Account: "rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV",
    Destination: "rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV",
    Amount: "1", // 1 drop
    Memos: [{
      Memo: {
        MemoType: Buffer.from("attestation").toString("hex"),
        MemoData: cidHash
      }
    }]
  };
  
  const result = await client.submitAndWait(tx, { wallet });
  console.log("TX Hash:", result.result.hash);
  
  await client.disconnect();
  return result.result.hash;
}

// Execute
const cidHash = "<hash from step 1>";
attestToXRPL(cidHash).then(txHash => {
  console.log("XRPL Attestation TX:", txHash);
});
```

3. **Record XRPL TX:**

Create file: `EXECUTION_v1/04_IPFS_ATTESTATIONS/XRPL_ATTESTATION_TXs.md`

```markdown
# XRPL ATTESTATION TRANSACTIONS

## Partner Agreement (Signed)

- **Date:** 2026-02-[XX]
- **IPFS CID:** QmYHNYAaYK5hm51D7b84D6eKt6pKqvB4JxH2z...
- **SHA-256 of CID:** abcdef123456789...
- **XRPL TX Hash:** 8A7F2B3C4D5E6F7G8H9I0J...
- **Explorer:** https://livenet.xrpl.org/transactions/8A7F2B3C4D5E6F7G8H9I0J...
- **Status:** ✅ Confirmed
```

---

## ✅ POST-EXECUTION CHECKLIST

### Immediately After Signing

- [ ] SIGNATURE_PAGE_SIGNED.pdf created
- [ ] Signed package folder created in `EXECUTION_v1/02_SIGNED_AGREEMENTS/`
- [ ] HASHES_SIGNED.txt generated
- [ ] IPFS CID recorded
- [ ] XRPL attestation TX submitted (optional)
- [ ] Both parties have copy of signed package
- [ ] Both parties have IPFS CID

### Within 24 Hours

- [ ] Update `EXECUTION_v1/00_EXECUTION_README.md` status (PHASE 1 complete)
- [ ] Notify stakeholders of execution
- [ ] Archive unsigned template (do not delete)

### Within 1 Week

- [ ] Designate Multisig Signer C
- [ ] Update `EXECUTION_v1/03_MULTISIG/MULTISIG_CONFIG_LIVE.json`
- [ ] Begin entity document collection

---

## 🔐 VERIFICATION (For Third Parties)

**Any party can verify the signed agreement:**

1. **Retrieve from IPFS:**
   ```bash
   ipfs get <CID>
   ```

2. **Compute hashes:**
   ```powershell
   Get-FileHash -Algorithm SHA256 *.* | Format-Table Hash, Path
   ```

3. **Compare to HASHES_SIGNED.txt:**
   - All hashes must match exactly
   - Match = document unchanged since signing

4. **Verify XRPL attestation:**
   - Look up TX hash on XRPL explorer
   - Extract memo data
   - Compare to SHA-256 of IPFS CID
   - Match = CID was attested to blockchain

---

## ⚠️ CRITICAL RULES

### DO NOT

❌ **Modify PARTNER_ISSUANCE_v1 after signing** — Templates are frozen  
❌ **Edit signed documents** — Invalidates hashes  
❌ **Delete unsigned package** — Needed for audit trail  
❌ **Share private keys** — XRPL attestation account is evidence-only

### DO

✅ **Store signed package separately** — In EXECUTION_v1/02_SIGNED_AGREEMENTS/  
✅ **Generate new hashes for signed version** — Different from unsigned  
✅ **Record IPFS CID immediately** — Don't rely on memory  
✅ **Keep both unsigned and signed packages** — Complete audit trail

---

## 📞 EXECUTION CONTACTS

| Party | Contact | Role |
|:------|:--------|:-----|
| **Unykorn 7777, Inc.** | Technical Lead | Execution + IPFS/XRPL |
| **OPTKAS1-MAIN SPV** | jimmy@optkas.com | Signature authority |

---

## 📊 EXECUTION TIMELINE

| Milestone | Target Date | Status |
|:----------|:------------|:------:|
| Economic option selected | 2026-02-05 | ⏳ |
| Signature pages completed | 2026-02-06 | ⏳ |
| Agreement executed | 2026-02-07 | ⏳ |
| IPFS pinning complete | 2026-02-08 | ⏳ |
| XRPL attestation (optional) | 2026-02-09 | ⏳ |

---

## 🎬 IMMEDIATE NEXT STEP

**Both parties:**

1. Read this document completely
2. Review PARTNER_ISSUANCE_v1 package
3. Independently select Option A or Option B
4. Schedule execution call for February 6, 2026

**On execution call:**

1. Confirm option selection (must match)
2. Complete signature pages
3. Exchange signed copies
4. Designate party responsible for IPFS pinning
5. Execute Steps 4-7 above

---

**Document Status:** READY FOR EXECUTION  
**Last Updated:** February 2, 2026  
**Version:** 1.0
