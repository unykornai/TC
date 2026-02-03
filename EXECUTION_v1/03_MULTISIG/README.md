# MULTISIG CONFIGURATION

**Purpose:** Live 2-of-3 multisig wallet configuration  
**Status:** ⏳ PENDING SIGNER C DESIGNATION

---

## 🎯 OBJECTIVE

Configure a **2-of-3 multisig wallet** for automated settlement of partner participation payments per EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md.

---

## 👥 SIGNER ROSTER

### Required Signers

| Signer | Entity | Role | Wallet Address | Status |
|:-------|:-------|:-----|:---------------|:------:|
| **SIGNER_A** | Unykorn 7777, Inc. | Infrastructure Partner | TBD | ⏳ PENDING |
| **SIGNER_B** | OPTKAS1-MAIN SPV | SPV Manager | TBD | ⏳ PENDING |
| **SIGNER_C** | [To Be Designated] | Neutral Escrow | TBD | ❌ NOT DESIGNATED |

---

## ❌ SIGNER C: CRITICAL GAP

**Status:** NOT DESIGNATED

**Options for Signer C:**
1. **Deal Counsel** (preferred) — Independent, professional, fiduciary duty
2. **Independent Director / Admin Service** — Specialized SPV administrators
3. **Lender Representative** (only after lender selected) — Lender designee

**Action Required:**
- Designate Signer C by **February 7, 2026**
- Obtain wallet address (XRPL or EVM-compatible)
- Record confirmation in `SIGNER_C_CONFIRMATION.txt`

---

## 📋 CONFIRMATION WORKFLOW

### Step 1: Signer Designation
Each signer must provide:
- Entity name
- Authorized signatory name
- Wallet address (public key)
- Confirmation of willingness to sign

### Step 2: Create Confirmation Files

**Template (SIGNER_X_CONFIRMATION.txt):**
```
MULTISIG SIGNER CONFIRMATION

Signer: [SIGNER_A / SIGNER_B / SIGNER_C]
Entity: [Entity Legal Name]
Authorized By: [Name + Title]
Wallet Address: [Public Key / Address]
Network: [XRPL / Ethereum / Polygon]
Date: [YYYY-MM-DD]

I confirm that the above wallet address is controlled by our entity and I am authorized to approve transactions on behalf of [Entity Name] for the TC Advantage RWA settlement multisig.

Signature: _______________________
Date: _____________________________
```

---

## 🔧 MULTISIG_CONFIG_LIVE.json

**Purpose:** Final source of truth for multisig configuration

**Template:**
```json
{
  "version": "1.0",
  "created": "2026-02-XX",
  "threshold": "2-of-3",
  "network": "XRPL",
  "signers": [
    {
      "signer_id": "SIGNER_A",
      "entity": "Unykorn 7777, Inc.",
      "role": "Infrastructure Partner",
      "wallet_address": "rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "confirmed": false,
      "confirmation_date": null
    },
    {
      "signer_id": "SIGNER_B",
      "entity": "OPTKAS1-MAIN SPV",
      "role": "SPV Manager",
      "wallet_address": "rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "confirmed": false,
      "confirmation_date": null
    },
    {
      "signer_id": "SIGNER_C",
      "entity": "[To Be Designated]",
      "role": "Neutral Escrow / Co-Manager",
      "wallet_address": null,
      "confirmed": false,
      "confirmation_date": null
    }
  ],
  "payment_address": "rnAF6Ki5sbmPZ4dTNCVzH5iyb9ScdSqyNr",
  "settlement_spec_reference": "PARTNER_ISSUANCE_v1/01_AGREEMENT/EXHIBIT_B_SMART_CONTRACT_SETTLEMENT_SPEC.md"
}
```

**Action:** Update this file with real wallet addresses as they are confirmed.

---

## 🧪 TEST TRANSACTIONS

### Purpose
Before going live, test the multisig workflow with small amounts.

### Test Procedure

1. **Configure Multisig Wallet**
   - Use wallet addresses from MULTISIG_CONFIG_LIVE.json
   - Set threshold to 2-of-3
   - Confirm wallet creation

2. **Execute Test TX #1: Simple Payment**
   - Amount: 1 XRP or 1 USDT
   - Destination: Test address
   - Signers: SIGNER_A + SIGNER_B
   - Expected: TX successful

3. **Execute Test TX #2: Different Pair**
   - Amount: 1 XRP or 1 USDT
   - Destination: Test address
   - Signers: SIGNER_A + SIGNER_C
   - Expected: TX successful

4. **Execute Test TX #3: Rejection**
   - Amount: 1 XRP or 1 USDT
   - Signers: SIGNER_A only (insufficient)
   - Expected: TX rejected (needs 2 signatures)

### Record Results

Document all test transactions in `TEST_TRANSACTIONS.md`:
- TX hash
- Date/time
- Signers
- Result (success/failure)
- Notes

---

## ⚠️ SECURITY RULES

### DO NOT

❌ **Deploy multisig before all 3 signers confirmed** — Risk of locked funds  
❌ **Share private keys** — Each signer controls their own key  
❌ **Use personal wallets** — Use dedicated entity wallets  
❌ **Configure with < 3 signers** — Defeats security purpose

### DO

✅ **Verify each wallet address independently**  
✅ **Test with small amounts first**  
✅ **Document all transactions**  
✅ **Keep MULTISIG_CONFIG_LIVE.json updated**  
✅ **Maintain signer confirmations on file**

---

## 📞 CONTACTS

| Signer | Contact | Phone/Email |
|:-------|:--------|:------------|
| SIGNER_A (Unykorn) | Technical Lead | [Contact Info] |
| SIGNER_B (OPTKAS1) | jimmy@optkas.com | [Phone] |
| SIGNER_C | TBD | TBD |

---

## ✅ COMPLETION CRITERIA

Multisig configuration is complete when:
1. ✅ All 3 signers designated
2. ✅ All 3 wallet addresses confirmed
3. ✅ MULTISIG_CONFIG_LIVE.json updated with real addresses
4. ✅ All 3 signer confirmations on file
5. ✅ Test transactions successful
6. ✅ Multisig wallet deployed to mainnet

---

**Last Updated:** February 2, 2026  
**Status:** AWAITING SIGNER C DESIGNATION
