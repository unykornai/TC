# XRPL ATTESTATION SCRIPT USAGE

**Script:** `xrpl_attest.js`  
**Purpose:** Anchor IPFS CIDs to XRPL for immutable timestamping  
**Account:** rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV

---

## 🚀 QUICK START

### 1. Install Dependencies

```bash
npm install xrpl
```

### 2. Set Environment Variable

**PowerShell:**
```powershell
$env:XRPL_SEED = "sXXXXXXXXXXXXXXXXXXXX"
```

**Bash:**
```bash
export XRPL_SEED="sXXXXXXXXXXXXXXXXXXXX"
```

### 3. Run Script

```bash
node xrpl_attest.js <IPFS_CID> <DESCRIPTION>
```

**Example:**
```bash
node xrpl_attest.js QmYHNYAaYK5hm51D7b84D6eKt6pKqvB4JxH2z... "Partner Agreement Signed"
```

---

## 📋 SCRIPT WORKFLOW

1. **Compute SHA-256 hash of IPFS CID**
2. **Connect to XRPL mainnet** (wss://xrplcluster.com)
3. **Create wallet from seed** (validates against rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV)
4. **Check account balance** (warns if < 1 XRP)
5. **Prepare Payment transaction:**
   - From: rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV
   - To: rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV (self-payment)
   - Amount: 1 drop (0.000001 XRP)
   - Memo: JSON with CID, hash, description, timestamp
6. **Submit and wait for validation**
7. **Record TX hash in XRPL_ATTESTATION_TXs.md**
8. **Generate JSON record** (timestamped file)

---

## 📄 OUTPUT FILES

### XRPL_ATTESTATION_TXs.md (Append-only)

```markdown
## Partner Agreement Signed

- **Date:** 2026-02-07
- **IPFS CID:** QmYHNYAaYK5hm51D7b84D6eKt6pKqvB4JxH2z...
- **SHA-256 of CID:** abcdef123456789...
- **XRPL TX Hash:** 8A7F2B3C4D5E6F7G8H9I0J...
- **Ledger Index:** 12345678
- **Explorer:** https://livenet.xrpl.org/transactions/8A7F2B3C4D5E6F7G8H9I0J...
- **Status:** ✅ Confirmed
```

### attestation_<timestamp>.json (Archive)

```json
{
  "ipfs_cid": "QmYHNYAaYK5hm51D7b84D6eKt6pKqvB4JxH2z...",
  "description": "Partner Agreement Signed",
  "cid_hash": "abcdef123456789...",
  "xrpl_tx_hash": "8A7F2B3C4D5E6F7G8H9I0J...",
  "ledger_index": 12345678,
  "timestamp": "2026-02-07T14:32:01.123Z",
  "explorer_url": "https://livenet.xrpl.org/transactions/8A7F2B3C4D5E6F7G8H9I0J...",
  "account": "rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV",
  "network": "wss://xrplcluster.com"
}
```

---

## ✅ VERIFICATION (Third Parties)

**Any party can verify attestation:**

1. **Look up TX on XRPL Explorer:**
   ```
   https://livenet.xrpl.org/transactions/<TX_HASH>
   ```

2. **Extract memo data from transaction**

3. **Decode hex memo to JSON:**
   ```javascript
   const memoData = "<hex_from_transaction>";
   const decoded = Buffer.from(memoData, "hex").toString("utf8");
   const data = JSON.parse(decoded);
   console.log(data.ipfs_cid);
   console.log(data.cid_hash);
   ```

4. **Retrieve document from IPFS:**
   ```bash
   ipfs get <ipfs_cid>
   ```

5. **Compute hash of CID:**
   ```bash
   echo -n "<ipfs_cid>" | shasum -a 256
   ```

6. **Compare:**
   - Hash from XRPL memo === Hash of CID → ✅ Match
   - CID retrieves correct document → ✅ Valid
   - TX timestamp proves when attestation occurred → ✅ Immutable

---

## 🔐 SECURITY NOTES

- **Private seed never leaves your machine** (set in environment variable only)
- **No custody of assets** (attestation account holds no user funds)
- **Read-only verification** (anyone can verify without seed)
- **Cost:** ~0.00001 XRP per attestation (~$0.00002 at $2/XRP)
- **Irreversible:** Once attested, transaction is permanent on XRPL ledger

---

## 🎯 USE CASES

### Partner Agreement (Post-Signature)

```bash
# After signing, pinning to IPFS returns CID
ipfs add -r EXECUTION_v1/02_SIGNED_AGREEMENTS/PARTNER_AGREEMENT_SIGNED

# Attest the CID
node xrpl_attest.js QmXXX... "Partner Agreement Signed - Unykorn × OPTKAS1"
```

### Multisig Config (After Signer C Designated)

```bash
# Pin multisig config
ipfs add EXECUTION_v1/03_MULTISIG/MULTISIG_CONFIG_LIVE.json

# Attest
node xrpl_attest.js QmYYY... "Multisig Configuration v1.0 - Live"
```

### DATA_ROOM_v1 Hash Set (Immutability Proof)

```bash
# Pin entire DATA_ROOM_v1
ipfs add -r DATA_ROOM_v1

# Attest
node xrpl_attest.js QmZZZ... "DATA_ROOM_v1 Complete Hash Set - Frozen"
```

---

## ⚠️ TROUBLESHOOTING

**Error: "XRPL_SEED environment variable not set"**
- Set the seed: `export XRPL_SEED="sXXX..."`

**Error: "Wallet address mismatch"**
- Seed does not correspond to rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV
- Verify you have the correct attestation account seed

**Error: "Insufficient XRP"**
- Fund account with at least 1 XRP
- Send to: rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV

**Error: "Transaction failed"**
- Check network connectivity
- Verify XRPL mainnet is operational
- Try alternative network: `export XRPL_NETWORK="wss://s1.ripple.com"`

---

## 📊 COST ANALYSIS

| Attestations | XRP Cost | USD Cost (@ $2/XRP) |
|:-------------|:---------|:--------------------|
| 1            | 0.00001  | $0.00002            |
| 10           | 0.0001   | $0.0002             |
| 100          | 0.001    | $0.002              |
| 1,000        | 0.01     | $0.02               |

**Note:** Actual network fees may vary. Script uses minimum 1-drop payment.

---

## 🔄 INTEGRATION WITH EXECUTION WORKFLOW

**When to run this script:**

1. **After partner agreement signing** (Week 1)
2. **After multisig config finalized** (Week 1-2)
3. **After lender agreement signing** (Week 8-10)
4. **After UCC-1 filing** (Week 10)

**Post-attestation:**
- Commit `XRPL_ATTESTATION_TXs.md` to git
- Push to GitHub
- Archive JSON records
- Share TX hash with counterparties

---

**Script Version:** 1.0  
**Last Updated:** February 2, 2026  
**Status:** Ready for Use
