# MULTISIG SIGNER ATTESTATIONS

**Configuration:** 2-of-3 Threshold Multisig  
**Status:** 🔴 PENDING (Signer C not designated)  
**Last Updated:** February 2, 2026

---

## 🎯 PURPOSE

This document records the formal attestation of each multisig signer's:
- Identity
- Authority to bind their entity
- Public key ownership
- Settlement address control
- Acknowledgment of settlement authorization responsibilities

---

## 📋 ATTESTATION REQUIREMENTS

Each signer must provide:

1. **Legal name and entity**
2. **Title and authority basis** (resolution, operating agreement, etc.)
3. **XRPL address** (if using XRPL rail)
4. **EVM address** (if using EVM rail)
5. **Public key signature** proving address control
6. **Date of attestation**
7. **Acknowledgment of 2-of-3 authorization model**

---

## 🔐 SIGNER A: UNYKORN 7777, INC.

**Status:** ⏳ PENDING

| Field | Value |
|:------|:------|
| **Legal Entity** | Unykorn 7777, Inc. |
| **Signatory Name** | [Name] |
| **Title** | [Title] |
| **Authority Basis** | Board resolution dated [Date] |
| **XRPL Address** | [rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX] |
| **EVM Address** | [0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX] |
| **Attestation Date** | [YYYY-MM-DD] |

**Signature Proof:**
```
Message: "Unykorn 7777 multisig attestation for TC Advantage facility - 2026-02-XX"
Signature: [hex signature proving control of XRPL/EVM address]
```

**Acknowledgment:**

> I, [Name], as [Title] of Unykorn 7777, Inc., hereby attest that:
> 
> 1. I am authorized to bind Unykorn 7777, Inc. to settlement transactions
> 2. I control the private keys for the above addresses
> 3. I understand this is a 2-of-3 multisig requiring one additional signer approval
> 4. I will not authorize settlements without proper business justification
> 5. I acknowledge settlements are final and irreversible once broadcast
> 
> Signature: ___________________________  
> Date: _________________________________

---

## 🔐 SIGNER B: OPTKAS1-MAIN SPV

**Status:** ⏳ PENDING

| Field | Value |
|:------|:------|
| **Legal Entity** | OPTKAS1-MAIN SPV (Wyoming Series LLC) |
| **Signatory Name** | [Manager Name] |
| **Title** | Manager |
| **Authority Basis** | Operating Agreement Section [X], Manager authority |
| **XRPL Address** | [rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX] |
| **EVM Address** | [0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX] |
| **Attestation Date** | [YYYY-MM-DD] |

**Signature Proof:**
```
Message: "OPTKAS1-MAIN SPV multisig attestation for TC Advantage facility - 2026-02-XX"
Signature: [hex signature proving control of XRPL/EVM address]
```

**Acknowledgment:**

> I, [Manager Name], as Manager of OPTKAS1-MAIN SPV, hereby attest that:
> 
> 1. I am authorized to bind OPTKAS1-MAIN SPV to settlement transactions
> 2. I control the private keys for the above addresses
> 3. I understand this is a 2-of-3 multisig requiring one additional signer approval
> 4. I will not authorize settlements without proper business justification
> 5. I acknowledge settlements are final and irreversible once broadcast
> 
> Signature: ___________________________  
> Date: _________________________________

---

## 🔐 SIGNER C: [ENTITY TBD]

**Status:** 🔴 NOT DESIGNATED

**Designation Options:**

1. **Deal Counsel** (Preferred)
   - Independent legal counsel representing neither party
   - No economic interest in settlement timing
   - Professional fiduciary duty to both parties
   - Can verify settlement authorization against legal agreements

2. **Independent Director**
   - Board member with no operational role
   - No direct compensation tied to settlement events
   - Governance oversight function

3. **Lender Representative**
   - Only if lender is neutral to timing (e.g., fixed-rate facility)
   - Must not benefit from accelerated or delayed settlements
   - Requires written consent from both parties

**Selection Criteria:**
- ✅ No direct economic interest in settlement timing
- ✅ Professional fiduciary duty or governance role
- ✅ Technical capability to manage private keys securely
- ✅ Available to authorize within 48-hour SLA
- ❌ Cannot be employee or affiliate of Unykorn or OPTKAS1
- ❌ Cannot be compensated based on settlement volume or timing

---

### SIGNER C ATTESTATION (Complete After Designation)

| Field | Value |
|:------|:------|
| **Legal Entity** | [Entity Name] |
| **Signatory Name** | [Name] |
| **Title** | [Title] |
| **Authority Basis** | [Resolution, engagement letter, etc.] |
| **XRPL Address** | [rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX] |
| **EVM Address** | [0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX] |
| **Attestation Date** | [YYYY-MM-DD] |

**Signature Proof:**
```
Message: "[Entity] multisig attestation for TC Advantage facility - 2026-02-XX"
Signature: [hex signature proving control of XRPL/EVM address]
```

**Acknowledgment:**

> I, [Name], as [Title] of [Entity], hereby attest that:
> 
> 1. I am authorized to act as neutral governance signer
> 2. I control the private keys for the above addresses
> 3. I have no direct economic interest in settlement timing
> 4. I understand this is a 2-of-3 multisig requiring one additional signer approval
> 5. I will authorize settlements based on agreement compliance only
> 6. I acknowledge settlements are final and irreversible once broadcast
> 
> Signature: ___________________________  
> Date: _________________________________

---

## ✅ COMPLETION CHECKLIST

- [ ] Signer A attestation completed
- [ ] Signer A signature proof verified
- [ ] Signer B attestation completed
- [ ] Signer B signature proof verified
- [ ] Signer C designated
- [ ] Signer C attestation completed
- [ ] Signer C signature proof verified
- [ ] All addresses recorded in MULTISIG_CONFIG_LIVE.json
- [ ] Configuration pinned to IPFS
- [ ] IPFS CID attested to XRPL
- [ ] Smart contract deployed (if using EVM rail)
- [ ] Test transaction successful

---

## 🔒 IMMUTABILITY NOTICE

Once all three signers have attested and this configuration is pinned to IPFS/XRPL:

- **Addresses are final** — No changes without unanimous 3-of-3 approval
- **Signer removal requires new version** — Cannot remove signer from live config
- **Key rotation requires unanimous consent** — Emergency recovery only via legal process

---

## 📝 SIGNATURE PROOF INSTRUCTIONS

**How to generate signature proof:**

### XRPL (using xrpl.js)

```javascript
const xrpl = require("xrpl");
const wallet = xrpl.Wallet.fromSeed("sXXXXXXXXXXXXXXXXXXXX");

const message = "Unykorn 7777 multisig attestation for TC Advantage facility - 2026-02-XX";
const messageHex = Buffer.from(message).toString("hex");

// Sign message
const signature = wallet.sign(messageHex);
console.log("Signature:", signature);
```

### EVM (using ethers.js)

```javascript
const ethers = require("ethers");
const wallet = new ethers.Wallet("0xPRIVATE_KEY");

const message = "Unykorn 7777 multisig attestation for TC Advantage facility - 2026-02-XX";
const signature = await wallet.signMessage(message);
console.log("Signature:", signature);
```

**Verification:**
Any party can verify the signature proves address control using public blockchain verification tools.

---

**Document Status:** AWAITING SIGNER ATTESTATIONS  
**Next Action:** Designate Signer C, then collect all attestations  
**Critical Path Blocker:** Yes (required before contract deployment)
