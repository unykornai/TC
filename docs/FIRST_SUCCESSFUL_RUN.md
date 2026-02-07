# OPTKAS First Successful Run

> Owner: OPTKAS1-MAIN SPV
> Version: 1.0.0 | 2026-02-06

---

## Objective

Execute a complete bond funding lifecycle on XRPL **testnet** to validate that every component works end-to-end before any mainnet deployment.

---

## Pre-Flight Checklist

- [ ] `npm install` completed without errors
- [ ] `validate-config.ts` passes all checks
- [ ] XRPL testnet accounts funded via faucet
- [ ] Stellar testnet accounts funded via friendbot
- [ ] HSM/KMS mock configured for testnet (or test wallets)

---

## Step-by-Step First Run

### Step 1: Validate Configuration

```bash
npx ts-node scripts/validate-config.ts --config config/platform-config.yaml
```

**Expected output**:
```
✓ Configuration file parsed successfully
✓ Entity definitions complete
✓ Governance configuration valid (2-of-3 threshold)
✓ Network configuration valid (testnet selected)
✓ Token definitions valid (4 tokens defined)
✓ Escrow templates valid (2 templates)
✓ Compliance stubs defined
✓ Audit configuration valid (15 event types, 7-year retention)
⚠ XRPL accounts: addresses not yet populated (expected for first run)
⚠ Stellar accounts: addresses not yet populated (expected for first run)
```

### Step 2: Initialize Platform

```bash
npx ts-node scripts/init-platform.ts --network testnet --dry-run
```

**Expected output**:
```
DRY RUN — No transactions will be submitted

[XRPL] Would create issuer account
[XRPL] Would create treasury account
[XRPL] Would create escrow account
[XRPL] Would create attestation account
[XRPL] Would configure multisig on all accounts (2-of-3)
[XRPL] Would set DefaultRipple on issuer
[XRPL] Would deploy trustline: treasury → issuer (BOND, limit: 50000000)
[XRPL] Would deploy trustline: treasury → issuer (ESCROW, limit: 50000000)
[XRPL] Would deploy trustline: treasury → issuer (ATTEST, limit: 1000000)
[Stellar] Would create issuer account
[Stellar] Would create distribution account
[Stellar] Would create anchor account
[Stellar] Would configure signers on all accounts
[Stellar] Would set AUTH_REQUIRED, AUTH_REVOCABLE, AUTH_CLAWBACK on issuer

Dry run complete. 17 operations would be executed.
Review and run without --dry-run to execute.
```

Then execute:
```bash
npx ts-node scripts/init-platform.ts --network testnet
```

### Step 3: Deploy Trustlines

```bash
npx ts-node scripts/xrpl-deploy-trustlines.ts \
  --token BOND \
  --accounts treasury,escrow \
  --network testnet
```

**Expected output**:
```
✓ Trustline deployed: treasury → issuer (BOND, limit: 50000000)
  TX: ABC123...
✓ Trustline deployed: escrow → issuer (BOND, limit: 50000000)
  TX: DEF456...
```

### Step 4: Attest Data Room Documents

```bash
npx ts-node scripts/xrpl-attest-hash.ts \
  --documents ./data_room/ \
  --network testnet
```

**Expected output**:
```
Hashing documents in ./data_room/...
  DOCUMENT_INDEX.md → sha256:a1b2c3...
  01_Entity/... → sha256:d4e5f6...
  ...

Anchoring 15 document hashes to XRPL testnet...
✓ Attestation TX: GHI789... (DOCUMENT_INDEX.md)
✓ Attestation TX: JKL012... (01_Entity/...)
...
All 15 documents attested successfully.
```

### Step 5: Create Escrow (Bond Funding)

```bash
npx ts-node scripts/xrpl-create-escrow.ts \
  --template bond_funding \
  --amount 100000 \
  --lender TEST-LENDER-001 \
  --network testnet
```

**Expected output**:
```
Creating escrow from template: bond_funding
  Amount: 100,000 (evidence)
  Duration: 90 days
  Condition: PREIMAGE-SHA-256
  Cancel after: 2026-05-07T00:00:00Z

✓ EscrowCreate TX: MNO345...
  Escrow sequence: 12345
  Destination: treasury
  Condition set: yes
```

### Step 6: Issue IOU (Claim Receipt)

```bash
npx ts-node scripts/xrpl-issue-iou.ts \
  --token OPTKAS.BOND \
  --amount 100000 \
  --recipient <test_lender_address> \
  --network testnet
```

**Expected output**:
```
Issuing OPTKAS.BOND IOU:
  From: issuer
  To: <test_lender_address>
  Amount: 100,000 BOND
  Type: claim_receipt

✓ Payment TX: PQR678...
  IOU issued successfully.
  Recipient balance: 100,000 BOND
```

### Step 7: Run Reconciliation

```bash
npx ts-node scripts/reconcile-ledgers.ts --config config/platform-config.yaml --network testnet
```

**Expected output**:
```
Running daily reconciliation...

✓ PASS: IOU supply matches funded amounts (100,000 = 100,000)
✓ PASS: Escrow state matches platform records (1 active)
✓ PASS: Attestation completeness (17/17 events attested)
⚠ SKIP: Stellar assets (not yet issued in this run)
⚠ SKIP: Custodian records (testnet — no custodian integration)

Overall: PASS (2 pass, 0 fail, 2 skip)
Report hash: sha256:stu901...
```

### Step 8: Generate Audit Report

```bash
npx ts-node scripts/generate-audit-report.ts \
  --type full \
  --from 2026-02-06 \
  --to 2026-02-06 \
  --network testnet
```

**Expected output**:
```
Generating full audit report...

Report Summary:
  Events: 22
  IOUs issued: 1 (100,000 BOND)
  Escrows created: 1
  Attestations: 17
  Governance actions: 1 (platform init)
  Compliance: all pass

Report saved: ./reports/audit_full_20260206.json
Report hash: sha256:vwx234...

Attesting report on XRPL...
✓ Attestation TX: YZA567...

First successful run complete.
```

---

## Success Criteria

| Criterion | Verified |
|---|---|
| Config validates without error | [ ] |
| All testnet accounts created and funded | [ ] |
| Multisig configured on all accounts | [ ] |
| Trustlines deployed | [ ] |
| Documents attested on XRPL | [ ] |
| Escrow created with correct conditions | [ ] |
| IOU issued to test lender | [ ] |
| Reconciliation passes | [ ] |
| Audit report generated and attested | [ ] |

When all boxes are checked: **the platform is ready for mainnet preparation.**

---

## Next Steps After First Run

1. Review all testnet transactions on XRPL explorer.
2. Verify attestation hashes independently.
3. Run the same sequence with Stellar operations included.
4. Conduct security review of all scripts.
5. Plan key ceremony for mainnet signer keys.
6. Obtain 3-of-3 approval for mainnet deployment.
