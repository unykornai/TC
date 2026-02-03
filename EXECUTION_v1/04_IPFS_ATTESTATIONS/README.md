# IPFS ATTESTATIONS & XRPL ANCHORING

**Purpose:** IPFS content identifiers (CIDs) and XRPL attestation transactions  
**Status:** ⏳ PENDING INITIAL PINNING

---

## 🎯 OBJECTIVE

Create immutable, verifiable records of all key documents by:
1. Pinning to IPFS (decentralized storage)
2. Anchoring CID hashes to XRPL (blockchain attestation)

---

## 📋 PINNING SEQUENCE

### 1. PARTNER_ISSUANCE_v1 (Unsigned Reference)

**Purpose:** Create immutable snapshot BEFORE signature

**Action:**
```bash
ipfs add -r PARTNER_ISSUANCE_v1
# Returns: QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Record CID:**
- Create file: `PARTNER_ISSUANCE_v1_CID.txt`
- Content: `QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- Date: 2026-02-XX

**Verification:**
Anyone can retrieve this package via:
```bash
ipfs get QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

### 2. PARTNER_AGREEMENT_SIGNED (Post-Execution)

**Purpose:** Create immutable snapshot AFTER signature

**Action:**
1. After both parties sign SIGNATURE_PAGE.md
2. Create folder: `EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED/`
3. Copy all PARTNER_ISSUANCE_v1 files + signed SIGNATURE_PAGE
4. Generate new HASHES_SIGNED.txt
5. Pin to IPFS:
   ```bash
   ipfs add -r EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED
   # Returns: QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
   ```

**Record CID:**
- Create file: `PARTNER_AGREEMENT_SIGNED_CID.txt`
- Content: `QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY`
- Date: 2026-02-XX

---

### 3. DATA_ROOM_v1 (Optional)

**Purpose:** Pin entire institutional data room for lender access

**Action:**
```bash
ipfs add -r DATA_ROOM_v1
# Returns: QmZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
```

**Record CID:**
- Create file: `DATA_ROOM_v1_CID.txt`
- Content: `QmZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ`

**Use Case:** Share CID with lenders instead of sending 33 files individually

---

## ⛓️ XRPL ATTESTATION

### Account Details

| Parameter | Value |
|:----------|:------|
| **Network** | XRP Ledger Mainnet |
| **Account** | `rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV` |
| **Purpose** | Evidence-only (no custody of funds) |
| **Explorer** | livenet.xrpl.org |

---

### Attestation Transaction Structure

**Transaction Type:** Payment (1 drop to self)

**Memo Structure:**
```json
{
  "Memos": [{
    "Memo": {
      "MemoType": "61747465737461696F6E",  // "attestation" in hex
      "MemoData": "<SHA-256 of IPFS CID in hex>"
    }
  }]
}
```

---

### XRPL Attestation Workflow

**For each IPFS pin:**

1. **Compute SHA-256 of CID:**
   ```powershell
   $cid = "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
   $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($cid))
   $hashHex = [BitConverter]::ToString($hash).Replace("-","").ToLower()
   ```

2. **Create XRPL Payment TX:**
   ```javascript
   const tx = {
     TransactionType: "Payment",
     Account: "rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV",
     Destination: "rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV",
     Amount: "1",  // 1 drop
     Memos: [{
       Memo: {
         MemoType: Buffer.from("attestation").toString("hex"),
         MemoData: hashHex
       }
     }]
   };
   ```

3. **Submit to XRPL:**
   ```javascript
   const result = await client.submitAndWait(tx, { wallet });
   console.log("TX Hash:", result.result.hash);
   ```

4. **Record TX Hash:**
   - Update `XRPL_ATTESTATION_TXs.md`
   - Include: CID, TX hash, date, purpose

---

## 📊 ATTESTATION LOG

**File:** `XRPL_ATTESTATION_TXs.md`

**Format:**
```markdown
# XRPL ATTESTATION TRANSACTIONS

## 1. PARTNER_ISSUANCE_v1 (Unsigned)
- **Date:** 2026-02-XX
- **IPFS CID:** QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
- **SHA-256 of CID:** abcdef123456...
- **XRPL TX Hash:** 8A7F2B3C4D5E6F...
- **Explorer Link:** https://livenet.xrpl.org/transactions/8A7F2B3C4D5E6F...

## 2. PARTNER_AGREEMENT_SIGNED
- **Date:** 2026-02-XX
- **IPFS CID:** QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
- **SHA-256 of CID:** fedcba987654...
- **XRPL TX Hash:** 9B8G3C4D5E6F7G...
- **Explorer Link:** https://livenet.xrpl.org/transactions/9B8G3C4D5E6F7G...
```

---

## 🔍 VERIFICATION GUIDE

**Purpose:** Allow anyone to verify document integrity

**File:** `VERIFICATION_GUIDE.md`

**Contents:**

### How to Verify an IPFS-Pinned Document

1. **Retrieve IPFS CID** from this folder
2. **Download package** from IPFS:
   ```bash
   ipfs get <CID>
   ```
3. **Compute hashes** of downloaded files:
   ```powershell
   Get-FileHash -Algorithm SHA256 *.md
   ```
4. **Compare** to `HASHES.txt` or `HASHES_SIGNED.txt`
5. **Match = verified** (document unchanged since pinning)

### How to Verify XRPL Attestation

1. **Retrieve TX hash** from `XRPL_ATTESTATION_TXs.md`
2. **Look up TX** on XRPL explorer
3. **Extract memo data** (hex-encoded CID hash)
4. **Decode memo** to get CID hash
5. **Compare** to SHA-256 of IPFS CID
6. **Match = verified** (CID was attested to blockchain)

---

## ⚠️ IMPORTANT NOTES

### IPFS Pinning Best Practices

✅ **Use dedicated IPFS node or pinning service** (Pinata, Infura, etc.)  
✅ **Pin recursively** (`-r` flag) to include all files  
✅ **Record CID immediately** — don't rely on memory  
✅ **Verify pin before sharing** — confirm retrieval works

### XRPL Attestation Timing

⚠️ **Attest AFTER documents are finalized** — cannot undo  
⚠️ **One attestation per version** — don't re-attest same CID  
⚠️ **Optional but recommended** — provides blockchain proof

---

## ✅ COMPLETION CHECKLIST

- [ ] PARTNER_ISSUANCE_v1 pinned to IPFS
- [ ] CID recorded in `PARTNER_ISSUANCE_v1_CID.txt`
- [ ] (Optional) XRPL attestation TX for unsigned package
- [ ] PARTNER_AGREEMENT_SIGNED pinned to IPFS (post-execution)
- [ ] CID recorded in `PARTNER_AGREEMENT_SIGNED_CID.txt`
- [ ] XRPL attestation TX for signed package
- [ ] All TX hashes recorded in `XRPL_ATTESTATION_TXs.md`
- [ ] VERIFICATION_GUIDE.md created

---

**Last Updated:** February 2, 2026  
**Status:** READY FOR INITIAL PINNING
