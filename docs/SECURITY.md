# OPTKAS Security Architecture

> Owner: OPTKAS1-MAIN SPV
> Version: 1.0.0 | 2026-02-06

---

## Key Management

### Principle

**No private key ever appears in source code, configuration files, environment variables, or logs.**

### Architecture

| Component | Key Storage | Access Method |
|---|---|---|
| XRPL signer keys | HSM (e.g., AWS CloudHSM, Azure Dedicated HSM) | Runtime request via KMS API |
| Stellar signer keys | HSM | Runtime request via KMS API |
| API credentials (custodian, KYC) | Secrets vault (e.g., HashiCorp Vault, AWS Secrets Manager) | Scoped API token |
| Encryption keys (data at rest) | KMS | KMS envelope encryption |
| TLS certificates | Certificate manager (e.g., ACM, Let's Encrypt) | Auto-rotation |

### Key Ceremony

Initial key generation and signer setup requires a formal key ceremony:
1. At least 2 of 3 signers present (physical or verified video).
2. Keys generated inside HSM — never exported.
3. Public keys recorded in `platform-config.yaml`.
4. Ceremony documented, signed, and hash-attested on XRPL.
5. Backup/recovery procedures tested before any mainnet operation.

---

## Authentication & Authorization

### Platform Access

| Role | Access Level | Authentication |
|---|---|---|
| Treasury Signer | Full fund operations | HSM-backed key + MFA |
| Compliance Signer | Compliance operations | HSM-backed key + MFA |
| Trustee Signer | Trustee operations | HSM-backed key + MFA |
| Automation Service | Prepare transactions (read/write to staging) | Service account + mTLS |
| Audit Read-Only | View logs, reports, attestations | API key + IP allowlist |
| Dashboard Viewer | Read-only metrics | SSO + role-based access |

### Authorization Model

```
Request Flow:
  User/Service → Authenticate → Check Role → Check Operation Permission → Execute

Operation Permission Matrix:
  prepare_transaction:  [automation_service]
  sign_transaction:     [treasury, compliance, trustee]  — per multisig rules
  query_ledger:         [all_authenticated]
  generate_report:      [automation_service, audit_readonly]
  trigger_pause:        [treasury, compliance, trustee]   — any single signer
  resume_from_pause:    [treasury AND compliance AND trustee]  — all three
  modify_config:        [treasury + compliance]  — 2 of 3
```

---

## Network Security

### XRPL Node Connection

- **Testnet**: Public wss://s.altnet.rippletest.net:51233 (acceptable for development).
- **Mainnet**: Dedicated XRPL node or vetted public node with TLS verification.
- All connections use WSS (WebSocket Secure).
- Certificate pinning for mainnet production connections.

### Stellar Horizon Connection

- **Testnet**: Public https://horizon-testnet.stellar.org (acceptable for development).
- **Mainnet**: SDF Horizon or dedicated Horizon instance with TLS verification.
- All connections use HTTPS.
- Rate limiting and circuit breaker on all Horizon calls.

### Internal Network

- All internal services communicate over mTLS.
- No services exposed to public internet except:
  - Dashboard (read-only, behind WAF + CDN).
  - Webhook endpoints (IP-restricted, signature-verified).

---

## Data Protection

### Data Classification

| Classification | Examples | Storage | Encryption |
|---|---|---|---|
| Public | XRPL/Stellar transaction hashes, attestation records | On-ledger | N/A (public by design) |
| Confidential | Audit reports, compliance logs, financial data | Encrypted database | AES-256-GCM at rest, TLS 1.3 in transit |
| Restricted | Fund movement instructions, signer approvals | Encrypted database + access logging | AES-256-GCM + field-level encryption |
| PII | Lender KYC data, personal information | Dedicated PII store (separate from platform) | AES-256-GCM + tokenization |
| Secret | Private keys, API credentials | HSM / Secrets vault | Hardware-protected |

### What Goes On-Ledger

**Permitted**: Transaction hashes, document hashes (SHA-256), timestamps, token balances, escrow conditions, attestation memos.

**Prohibited**: PII, private keys, full document content, internal system state, access credentials.

---

## Threat Model

### High-Priority Threats

| Threat | Mitigation |
|---|---|
| Private key compromise | HSM storage; keys never exported; signer rotation protocol |
| Unauthorized fund movement | Multi-signature requirement; no single point of approval |
| Insider threat (single signer) | 2-of-3 threshold for all fund operations; separation of duties |
| XRPL/Stellar node compromise | Multiple node connections; transaction verification against consensus |
| Automation compromise | Automation cannot sign transactions; can only prepare unsigned payloads |
| Data room tampering | Document hashes attested on immutable public ledgers |
| API credential leak | Scoped tokens with short TTL; secrets vault; rotation on suspicion |
| DDoS on dashboard | WAF + CDN; dashboard is read-only with no fund access |
| Supply chain attack (dependencies) | Dependency auditing; lockfiles; minimal dependency policy |

### Residual Risks

| Risk | Acceptance Rationale |
|---|---|
| XRPL/Stellar network unavailability | Ledgers provide evidence, not custody; off-chain operations continue |
| HSM vendor compromise | Industry-standard risk; mitigated by multi-vendor strategy |
| Regulatory change | Legal counsel engagement; platform designed for compliance adaptability |

---

## Incident Response

### Classification

| Severity | Definition | Response Time |
|---|---|---|
| P0 — Critical | Key compromise, unauthorized fund movement, data breach | Immediate — emergency pause |
| P1 — High | System compromise, automation failure, compliance violation | 1 hour |
| P2 — Medium | Service degradation, failed attestation, node connectivity | 4 hours |
| P3 — Low | Dashboard unavailable, non-critical log gap | 24 hours |

### P0 Response Protocol

1. Any signer triggers emergency pause.
2. All signer keys rotated immediately.
3. Forensic analysis initiated.
4. Regulators and affected parties notified per legal requirements.
5. Resume only after 3-of-3 signer approval and root cause resolution.
6. Post-incident report filed, hashed, and attested.

---

## Compliance Integration

- All security events are logged to the audit system.
- Security-relevant events are included in `generate-audit-report.ts` output.
- Annual penetration testing by independent firm.
- Quarterly access review of all signer and service accounts.
- All security documentation hash-attested on XRPL for integrity.
