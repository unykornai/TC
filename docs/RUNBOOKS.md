# OPTKAS Operational Runbooks

> Owner: OPTKAS1-MAIN SPV
> Version: 1.0.0 | 2026-02-06

---

## Runbook 1: Platform Initialization

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] TypeScript 5+ installed
- [ ] `platform-config.yaml` reviewed and approved by Treasury + Compliance
- [ ] HSM/KMS access configured for signer keys
- [ ] Network selected (default: testnet)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Validate configuration
npx ts-node scripts/validate-config.ts --config config/platform-config.yaml

# 3. Initialize platform (dry-run first)
npx ts-node scripts/init-platform.ts --network testnet --dry-run

# 4. Review dry-run output — confirm all operations look correct
# 5. Execute initialization (requires 2-of-3 multisig)
npx ts-node scripts/init-platform.ts --network testnet

# 6. Verify accounts
npx ts-node scripts/validate-config.ts --config config/platform-config.yaml --verify-accounts

# 7. Record initialization — hash and attest
npx ts-node scripts/xrpl-attest-hash.ts --hash <init_report_hash> --type platform_init --network testnet
```

### Verification
- [ ] All XRPL accounts created and funded
- [ ] All Stellar accounts created and funded
- [ ] Multi-sig configured on all accounts
- [ ] Trustlines deployed
- [ ] Issuer flags set correctly
- [ ] Attestation of initialization recorded

---

## Runbook 2: Bond Funding Execution

### Prerequisites
- [ ] Platform initialized (Runbook 1 complete)
- [ ] Bond indenture executed (off-chain)
- [ ] Collateral deposited with custodian
- [ ] Lender KYC/AML verified
- [ ] All documents hash-attested

### Steps

```bash
# 1. Attest all documents
npx ts-node scripts/xrpl-attest-hash.ts --documents ./data_room/ --network testnet --dry-run
npx ts-node scripts/xrpl-attest-hash.ts --documents ./data_room/ --network testnet

# 2. Create escrow (evidence of funding commitment)
npx ts-node scripts/xrpl-create-escrow.ts \
  --template bond_funding \
  --amount 1000000 \
  --lender LENDER-001 \
  --network testnet \
  --dry-run

# 3. Review escrow parameters, then execute
npx ts-node scripts/xrpl-create-escrow.ts \
  --template bond_funding \
  --amount 1000000 \
  --lender LENDER-001 \
  --network testnet

# 4. Lender wires fiat to escrow account (off-chain — wait for custodian confirmation)

# 5. After custodian confirmation + compliance clearance:
# Release escrow (requires multisig)
# Issue IOU to lender
npx ts-node scripts/xrpl-issue-iou.ts \
  --token OPTKAS.BOND \
  --amount 1000000 \
  --recipient <lender_xrpl_address> \
  --network testnet \
  --dry-run

npx ts-node scripts/xrpl-issue-iou.ts \
  --token OPTKAS.BOND \
  --amount 1000000 \
  --recipient <lender_xrpl_address> \
  --network testnet

# 6. Attest settlement
npx ts-node scripts/xrpl-attest-hash.ts --hash <settlement_hash> --type settlement --network testnet

# 7. Generate audit report
npx ts-node scripts/generate-audit-report.ts --type transaction --network testnet
```

### Verification
- [ ] Escrow created on XRPL with correct conditions
- [ ] Custodian confirmed fiat receipt
- [ ] Compliance checks passed
- [ ] IOU issued to lender
- [ ] Settlement attested on-chain
- [ ] Audit report generated and hashed

---

## Runbook 3: Stellar Cross-Border Onboarding

### Steps

```bash
# 1. Authenticate lender via SEP-10
npx ts-node scripts/stellar-sep10-auth.ts \
  --account <lender_stellar_address> \
  --network testnet

# 2. Authorize lender for OPTKAS-USD
npx ts-node scripts/stellar-issue-asset.ts \
  --action authorize \
  --holder <lender_stellar_address> \
  --network testnet \
  --dry-run

# 3. Process deposit via SEP-24
npx ts-node scripts/stellar-sep24-deposit-withdraw.ts \
  --action deposit \
  --amount 1000000 \
  --holder <lender_stellar_address> \
  --network testnet \
  --dry-run

# 4. After banking confirmation:
npx ts-node scripts/stellar-sep24-deposit-withdraw.ts \
  --action deposit \
  --amount 1000000 \
  --holder <lender_stellar_address> \
  --network testnet

# 5. Attest on Stellar
npx ts-node scripts/stellar-attest-hash.ts --hash <deposit_hash> --type deposit --network testnet
```

---

## Runbook 4: Emergency Pause

### When to Use
- Suspected unauthorized access
- Regulatory order
- Collateral breach
- Any signer compromise

### Steps

```bash
# 1. ANY signer can trigger pause (1-of-3)
# This is executed via the platform governance module
# The pause is recorded on-chain

# 2. Verify pause is active
npx ts-node scripts/validate-config.ts --config config/platform-config.yaml --check-pause

# 3. Investigate root cause
# 4. Document findings

# 5. Resume requires 3-of-3 approval
# All three signers must approve resume
# Resume is attested on both ledgers

# 6. Post-incident report
npx ts-node scripts/xrpl-attest-hash.ts --hash <incident_report_hash> --type incident --network testnet
npx ts-node scripts/generate-audit-report.ts --type governance --network testnet
```

---

## Runbook 5: Signer Rotation

### Steps

```bash
# 1. Identify outgoing and incoming signer
# 2. Vet incoming signer (KYC/AML + conflict check)
# 3. Key ceremony for new signer (HSM)

# 4. Update XRPL SignerListSet (requires 2-of-3 current signers)
# 5. Update Stellar account signers (requires 2-of-3 current signers)
# 6. Revoke old signer keys from HSM
# 7. Attest rotation event

npx ts-node scripts/xrpl-attest-hash.ts --hash <rotation_hash> --type signer_rotation --network testnet
npx ts-node scripts/stellar-attest-hash.ts --hash <rotation_hash> --type signer_rotation --network testnet

# 8. Generate governance audit report
npx ts-node scripts/generate-audit-report.ts --type governance --network testnet
```

---

## Runbook 6: Daily Reconciliation

### Steps

```bash
# 1. Run reconciliation
npx ts-node scripts/reconcile-ledgers.ts \
  --config config/platform-config.yaml \
  --network testnet

# 2. Review output
# - All checks should show 'pass'
# - Any 'fail' requires immediate investigation
# - Any 'warning' requires review within 24 hours

# 3. Attest reconciliation report
npx ts-node scripts/xrpl-attest-hash.ts --hash <reconciliation_hash> --type reconciliation --network testnet
```

---

## Runbook 7: AMM Provisioning (When Enabled)

### Prerequisites
- [ ] AMM enabled in platform-config.yaml
- [ ] Treasury + Compliance approval (2-of-3)
- [ ] Risk limits reviewed

### Steps

```bash
# 1. Dry-run
npx ts-node scripts/xrpl-provision-amm.ts \
  --pair BOND/XRP \
  --amount 100000 \
  --fee 500 \
  --network testnet \
  --dry-run

# 2. Review parameters
# 3. Execute (requires multisig)
npx ts-node scripts/xrpl-provision-amm.ts \
  --pair BOND/XRP \
  --amount 100000 \
  --fee 500 \
  --network testnet

# 4. Verify AMM created
# 5. Attest provisioning
```

---

## Runbook 8: Generating Reports for Auditors

### Steps

```bash
# Full audit report
npx ts-node scripts/generate-audit-report.ts \
  --type full \
  --from 2026-01-01 \
  --to 2026-12-31 \
  --network testnet \
  --config config/platform-config.yaml

# The report includes:
# - All events
# - Reconciliation
# - Governance actions
# - Compliance status
# - XRPL/Stellar attestation hashes for independent verification

# Attest the report itself
npx ts-node scripts/xrpl-attest-hash.ts --hash <report_hash> --type audit_report --network testnet
```

---

## Common Flags for All Scripts

| Flag | Description | Default |
|---|---|---|
| `--dry-run` | Simulate without executing | **Recommended always first** |
| `--network testnet\|mainnet` | Target network | `testnet` |
| `--config <path>` | Path to platform config | `config/platform-config.yaml` |
| `--verbose` | Detailed output | `false` |
| `--json` | Output as JSON | `false` |
