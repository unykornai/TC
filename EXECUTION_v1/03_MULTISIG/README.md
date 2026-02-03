# 03_MULTISIG — Live Authorization Configuration

Status: 🟡 PARTIAL

This folder defines the **live settlement authorization model** for smart contract execution.

---

## REQUIRED CONFIGURATION

- Threshold: 2-of-3
- Signer A: Unykorn 7777, Inc.
- Signer B: OPTKAS1-MAIN SPV
- Signer C: Neutral third party (TBD)

---

## FILES

| File | Purpose |
|----|--------|
| MULTISIG_CONFIG_LIVE.json | Final signer configuration |
| SIGNER_ATTESTATIONS.md | Signer role acknowledgments |

---

## RULES

- No signer added without written consent
- No contract deployment before Signer C designated
- Changes require written amendment + hash update
