# OPTKAS1 LLC - On-Chain Bond Issuance Guide

## Entity Information
- **Legal Name:** OPTKAS1 LLC
- **Jurisdiction:** Wyoming
- **Filed:** December 19, 2025
- **Filing Agent:** Robin Jones
- **Secretary of State:** Chuck Gray

---

## Executive Summary

Convert traditional $5B MTN into XRPL-native tokenized debt instrument backed by 185M USDT reserves.

**Structure:**
- Traditional MTN remains (Euroclear/DTC)
- Parallel digital note issued on XRPL
- USDT reserves held in multi-sig escrow
- Full on-chain transparency

---

## Phase 1: XRPL Token Issuance Setup

### 1.1 Create Issuer Wallet

```javascript
// Generate OPTKAS1 cold wallet (OFFLINE, air-gapped)
const { Wallet } = require('xrpl');

const issuerWallet = Wallet.generate();

console.log('OPTKAS1 Issuer Wallet:');
console.log('Address:', issuerWallet.address);
console.log('Seed:', issuerWallet.seed);
console.log('Public Key:', issuerWallet.publicKey);

// CRITICAL: Store seed offline, encrypted, backed up
// This wallet will issue all bond tokens
```

**Security Requirements:**
- ✅ Generate offline on air-gapped machine
- ✅ Store seed in hardware wallet (Ledger/Tangem)
- ✅ Create 3 physical backups (fireproof safes)
- ✅ Never expose seed online
- ✅ Use multi-sig for operational control

---

### 1.2 Fund & Configure Issuer Account

```javascript
const xrpl = require('xrpl');

async function setupIssuerAccount() {
  const client = new xrpl.Client('wss://xrplcluster.com');
  await client.connect();

  const issuerAddress = 'rYourOPTKAS1IssuerAddress';

  // 1. Fund account with 50+ XRP (reserve + operations)
  // Use Xaman or exchange to send initial XRP

  // 2. Set account flags for institutional control
  const accountSetTx = {
    TransactionType: 'AccountSet',
    Account: issuerAddress,
    SetFlag: 8, // asfRequireAuth - all trustlines must be authorized
    // This prevents unauthorized token holders
  };

  // 3. Set domain for verification
  const domainHex = Buffer.from('optkas1.unykorn.org').toString('hex').toUpperCase();
  const domainSetTx = {
    TransactionType: 'AccountSet',
    Account: issuerAddress,
    Domain: domainHex
  };

  await client.disconnect();
}
```

**Account Configuration:**
- ✅ Minimum 50 XRP reserve
- ✅ `asfRequireAuth` flag (issuer must approve all trustlines)
- ✅ Domain set to `optkas1.unykorn.org`
- ✅ Email hash for contact verification

---

## Phase 2: Bond Token Definition

### 2.1 Token Specification

**Currency Code:** `OPT` or `OPT144` (3-char standard or HEX for full name)

**Token Properties:**
- **Symbol:** OPT144 (144A qualified bond)
- **Total Supply:** 5,000,000,000 tokens (5B face value)
- **Denomination:** $1 per token
- **Issuer:** OPTKAS1 LLC (rYourAddress...)
- **Backing:** 185M USDT + Traditional MTN
- **Maturity:** [Specify date]
- **Coupon:** [Specify rate]
- **ISIN Reference:** [Link to traditional instrument]

---

### 2.2 Create Token on XRPL

```javascript
async function issueOPT144Token() {
  const client = new xrpl.Client('wss://xrplcluster.com');
  await client.connect();

  const issuer = 'rOPTKAS1IssuerAddress';
  const custodian = 'rCustodianWalletAddress'; // Multi-sig controlled

  // Step 1: Custodian creates trustline for OPT144
  const trustlineTx = {
    TransactionType: 'TrustSet',
    Account: custodian,
    LimitAmount: {
      currency: 'OPT144', // Use hex: '4F50543134340000000000000000000000000000' for full name
      issuer: issuer,
      value: '5000000000' // 5B max supply
    }
  };

  // Step 2: Issuer authorizes trustline (if asfRequireAuth is set)
  const authorizeTx = {
    TransactionType: 'TrustSet',
    Account: issuer,
    LimitAmount: {
      currency: 'OPT144',
      issuer: custodian,
      value: '0'
    },
    Flags: 65536 // tfSetfAuth
  };

  // Step 3: Issuer sends tokens to custodian (creates supply)
  const issuanceTx = {
    TransactionType: 'Payment',
    Account: issuer,
    Destination: custodian,
    Amount: {
      currency: 'OPT144',
      issuer: issuer,
      value: '5000000000'
    },
    Memos: [{
      Memo: {
        MemoType: Buffer.from('BOND_ISSUANCE').toString('hex').toUpperCase(),
        MemoData: Buffer.from('OPTKAS1 LLC 144A Bond - $5B Face Value').toString('hex').toUpperCase(),
        MemoFormat: Buffer.from('text/plain').toString('hex').toUpperCase()
      }
    }]
  };

  await client.disconnect();
}
```

---

## Phase 3: USDT Reserve Escrow (Multi-Sig)

### 3.1 Multi-Signature Wallet Setup

**Purpose:** Hold 185M USDT as reserve backing

**Signers:**
1. OPTKAS1 LLC (you)
2. Independent Trustee
3. Third-party custody (Xaman Pro / institutional)

**Configuration:**
- 2-of-3 signature requirement
- Time-locked release conditions
- Linked to bond covenant compliance

```javascript
async function setupMultiSigEscrow() {
  const client = new xrpl.Client('wss://xrplcluster.com');
  await client.connect();

  const masterAccount = 'rMultiSigMasterAddress';

  // Add signers
  const signerListTx = {
    TransactionType: 'SignerListSet',
    Account: masterAccount,
    SignerQuorum: 2, // 2 signatures required
    SignerEntries: [
      {
        SignerEntry: {
          Account: 'rOPTKAS1SignerAddress',
          SignerWeight: 1
        }
      },
      {
        SignerEntry: {
          Account: 'rTrusteeSignerAddress',
          SignerWeight: 1
        }
      },
      {
        SignerEntry: {
          Account: 'rCustodySignerAddress',
          SignerWeight: 1
        }
      }
    ]
  };

  // Disable master key (force multi-sig)
  const disableMasterTx = {
    TransactionType: 'AccountSet',
    Account: masterAccount,
    SetFlag: 4 // asfDisableMaster
  };

  await client.disconnect();
}
```

---

## Phase 4: Trustline Distribution Network

### 4.1 Qualified Investor Trustlines

Create trustlines for:
- Private placement investors
- Qualified institutional buyers (QIBs)
- Accredited investors

```javascript
async function authorizeInvestorTrustline(investorAddress) {
  const client = new xrpl.Client('wss://xrplcluster.com');
  await client.connect();

  const issuer = 'rOPTKAS1IssuerAddress';

  // Investor creates trustline first (off-chain KYC required)
  // Then issuer authorizes:
  const authorizeTx = {
    TransactionType: 'TrustSet',
    Account: issuer,
    LimitAmount: {
      currency: 'OPT144',
      issuer: investorAddress,
      value: '0'
    },
    Flags: 65536 // tfSetfAuth - authorize this trustline
  };

  // Sign and submit
  await client.disconnect();
}
```

---

## Phase 5: Legal Documentation Links

### 5.1 On-Chain References

Use **Memos** on issuer account to link to:

```javascript
const documentationTx = {
  TransactionType: 'Payment',
  Account: issuer,
  Destination: issuer, // Self-payment for memo storage
  Amount: '1', // 1 drop XRP
  Memos: [
    {
      Memo: {
        MemoType: Buffer.from('OFFERING_MEMORANDUM').toString('hex').toUpperCase(),
        MemoData: Buffer.from('https://optkas1.unykorn.org/offering-memo.pdf').toString('hex').toUpperCase()
      }
    },
    {
      Memo: {
        MemoType: Buffer.from('ISIN').toString('hex').toUpperCase(),
        MemoData: Buffer.from('US######').toString('hex').toUpperCase()
      }
    },
    {
      Memo: {
        MemoType: Buffer.from('COLLATERAL_DEED').toString('hex').toUpperCase(),
        MemoData: Buffer.from('https://optkas1.unykorn.org/collateral.pdf').toString('hex').toUpperCase()
      }
    },
    {
      Memo: {
        MemoType: Buffer.from('RESERVE_ATTESTATION').toString('hex').toUpperCase(),
        MemoData: Buffer.from('https://optkas1.unykorn.org/reserves.json').toString('hex').toUpperCase()
      }
    }
  ]
};
```

---

## Phase 6: Real-Time Reserve Proof

### 6.1 Public Reserve Dashboard

Create public API showing:

```json
{
  "entity": "OPTKAS1 LLC",
  "bondToken": {
    "currency": "OPT144",
    "issuer": "rOPTKAS1...",
    "totalSupply": "5000000000",
    "outstanding": "5000000000",
    "denomination": "$1 USD per token"
  },
  "reserves": {
    "usdt": {
      "amount": "185000000",
      "wallet": "rMultiSig...",
      "lastVerified": "2026-01-06T12:00:00Z",
      "signers": 3,
      "requiredSignatures": 2
    },
    "backing": {
      "traditionalMTN": {
        "isin": "US######",
        "faceValue": "5000000000",
        "status": "active"
      }
    }
  },
  "compliance": {
    "rule144a": true,
    "accreditedOnly": true,
    "kycRequired": true
  }
}
```

---

## Phase 7: Operational Flows

### 7.1 Investor Subscription

1. **KYC/AML Check** (off-chain)
2. **Investor creates trustline** for OPT144
3. **Issuer authorizes trustline** (after verification)
4. **Payment received** (USDT/XRP/fiat)
5. **Bond tokens sent** to investor wallet

### 7.2 Coupon Payments

```javascript
async function payCoupon(investors, couponRate) {
  const client = new xrpl.Client('wss://xrplcluster.com');
  await client.connect();

  for (const investor of investors) {
    const payment = {
      TransactionType: 'Payment',
      Account: 'rOPTKAS1IssuerAddress',
      Destination: investor.address,
      Amount: {
        currency: 'USD', // Or use USDT
        issuer: 'rUSDTIssuer...',
        value: String(investor.balance * couponRate)
      },
      Memos: [{
        Memo: {
          MemoType: Buffer.from('COUPON_PAYMENT').toString('hex').toUpperCase(),
          MemoData: Buffer.from(`Q1 2026 Coupon - ${couponRate}%`).toString('hex').toUpperCase()
        }
      }]
    };

    // Sign and submit
  }

  await client.disconnect();
}
```

---

## Critical Compliance Notes

⚠️ **Securities Law:**
- Rule 144A requires QIB verification
- All investors must be accredited
- Secondary trading restricted
- This is a SECURITY, not a utility token

⚠️ **Reserve Requirements:**
- 185M USDT must remain in multi-sig escrow
- Monthly attestation required
- Cannot be withdrawn without trustee approval

⚠️ **Documentation:**
- Offering Memorandum must reference on-chain component
- Legal opinion required
- Trustee engagement mandatory

---

## Next Steps

1. ✅ **OPTKAS1 LLC established** (Wyoming)
2. ⏳ Generate issuer wallet (offline, secure)
3. ⏳ Fund with 50 XRP
4. ⏳ Set up multi-sig escrow for USDT
5. ⏳ Issue OPT144 token
6. ⏳ Create offering documentation
7. ⏳ Set up reserve dashboard
8. ⏳ Begin investor onboarding

---

## Technical Support

For implementation assistance:
- XRPL integration: support@unykorn.org
- Legal structure: (securities counsel required)
- Trustee services: (institutional trustee required)

---

**Document Version:** 1.0  
**Last Updated:** January 6, 2026  
**Entity:** OPTKAS1 LLC (Wyoming)  
**Purpose:** On-chain tokenized bond issuance backed by USDT reserves
