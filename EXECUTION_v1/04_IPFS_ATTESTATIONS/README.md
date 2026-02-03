# 04_IPFS_ATTESTATIONS — Immutable Anchoring

Status: 🔴 PENDING

This folder records IPFS CIDs and XRPL transaction hashes for executed artifacts.

---

## REQUIRED ITEMS

| Artifact | CID | XRPL TX |
|-------|-----|--------|
| Partner Agreement | ⏳ | ⏳ |
| Multisig Config | ⏳ | ⏳ |
| DATA_ROOM_v1 Hash Set | ⏳ | ⏳ |

---

## PROCESS

1. Generate SHA-256 hash
2. Pin to IPFS
3. Record CID
4. Anchor hash to XRPL
5. Store TX hash here

---

## RULE

This folder is **append-only**.
