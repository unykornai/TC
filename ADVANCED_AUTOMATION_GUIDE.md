# Advanced Automation Features - User Guide

**Version:** 2.0.0  
**Last Updated:** February 6, 2026

---

## Overview

The advanced automation system extends the basic partner document issuance with enterprise features including e-signature integration, batch processing, automated reminders, and infrastructure integration.

---

## New Features

### 1. DocuSign / Adobe Sign Integration

**Purpose:** Fully automated electronic signature workflow

**Setup:**
1. Configure API credentials in `automation-config.json`
2. Set up webhook endpoints for callbacks
3. Enable in config: `docusign.enabled = true` or `adobe_sign.enabled = true`

**Usage:**
```powershell
# Issue with DocuSign
.\issue-partner-documents-advanced.ps1 -Action Issue -SignatureMethod DocuSign

# Issue with Adobe Sign
.\issue-partner-documents-advanced.ps1 -Action Issue -SignatureMethod AdobeSign
```

**Features:**
- Automatic envelope/agreement creation
- Real-time signature status tracking
- Webhook-based completion notifications
- Automatic reminder scheduling
- Integration with partner database

---

### 2. Multi-Partner Batch Issuance

**Purpose:** Issue documents to multiple partners simultaneously

**Usage:**
```powershell
# Issue to all active partners
.\issue-partner-documents-advanced.ps1 -Action Issue -BatchMode

# Issue to specific partners
.\issue-partner-documents-advanced.ps1 -Action Issue -PartnerIds @("unykorn7777", "optkas1") -BatchMode
```

**Features:**
- Parallel processing (configurable limit)
- Progress tracking per partner
- Batch reporting and analytics
- Automatic retry on failure
- Consolidated notifications

**Configuration:**
```json
"batch_processing": {
  "enabled": true,
  "max_parallel": 5,
  "retry_attempts": 3,
  "retry_delay_seconds": 300
}
```

---

### 3. Countersign Automation

**Purpose:** Automated tracking and reminders for pending signatures

**Features:**
- **Automatic Reminders:** Configurable reminder schedule
- **Escalation:** Auto-escalate after X days
- **Status Dashboard:** Real-time tracking
- **Smart Notifications:** Context-aware messages

**Reminder Schedule:**
```json
"reminder_schedule": [
  { "after_days": 2, "message": "Gentle reminder: Please review and sign" },
  { "after_days": 5, "message": "Follow-up: Signature needed" },
  { "after_days": 7, "message": "Urgent: Please complete signature" }
]
```

**Usage:**
```powershell
# Send automated reminders
.\issue-partner-documents-advanced.ps1 -Action SendReminders

# Check signature status
.\issue-partner-documents-advanced.ps1 -Action CheckStatus
```

---

### 4. Signed Document Ingestion + Verification

**Purpose:** Automated processing of completed signed documents

**Features:**
- **Auto-detection:** Monitors incoming folder
- **Hash Verification:** SHA-256 validation
- **IPFS Pinning:** Automatic immutable storage
- **XRPL Attestation:** Blockchain verification
- **Status Updates:** Automatic tracking updates

**Workflow:**
```
Signed Doc Received
    ↓
Hash Verification
    ↓
IPFS Pinning (auto)
    ↓
XRPL Attestation (auto)
    ↓
Status Update (completed)
    ↓
Infrastructure Notification
```

**Directory Structure:**
```
SIGNED_DOCUMENTS_INCOMING/  ← Place signed docs here
SIGNED_DOCUMENTS_PROCESSED/ ← Successfully processed
SIGNED_DOCUMENTS_FAILED/    ← Failed verification
```

**Usage:**
```powershell
# Process signed documents
.\issue-partner-documents-advanced.ps1 -Action ProcessSigned

# Watch mode (continuous monitoring)
.\issue-partner-documents-advanced.ps1 -Action ProcessSigned -WatchMode
```

---

### 5. UNYKORN Infrastructure Integration

**Purpose:** Event-driven integration with broader infrastructure

**Features:**
- **Event Bus:** Real-time event publishing
- **Webhooks:** Configurable event notifications
- **API Integration:** RESTful API endpoints
- **Monitoring:** Centralized logging and metrics
- **Dashboard:** Real-time status visualization

**Event Types:**
- `issuance_started` - Document issued to partner
- `signature_received` - Partner signed document
- `document_completed` - All signatures collected
- `ipfs_pinned` - Document pinned to IPFS
- `xrpl_attested` - Hash attested to XRPL

**Configuration:**
```json
"unykorn_infrastructure": {
  "enabled": true,
  "api_base_url": "${UNYKORN_API_BASE_URL}",
  "api_key": "${UNYKORN_API_KEY}",
  "event_bus_url": "${UNYKORN_EVENT_BUS_URL}",
  "webhooks": {
    "issuance_started": true,
    "signature_received": true,
    "document_completed": true
  }
}
```

---

## Configuration Guide

### Environment Variables

Create `.env` file with:

```bash
# DocuSign
DOCUSIGN_ACCOUNT_ID=your_account_id
DOCUSIGN_INTEGRATION_KEY=your_integration_key
DOCUSIGN_USER_ID=your_user_id
DOCUSIGN_PRIVATE_KEY_PATH=/path/to/private.key

# Adobe Sign
ADOBE_SIGN_ACCESS_TOKEN=your_access_token

# IPFS (optional - uses Pinata)
PINATA_API_KEY=your_api_key
PINATA_SECRET_KEY=your_secret_key

# XRPL
XRPL_ATTESTATION_SECRET=your_xrpl_secret

# SMTP
SMTP_HOST=smtp.example.com
SMTP_USER=user@example.com
SMTP_PASSWORD=your_password

# UNYKORN Infrastructure
UNYKORN_API_BASE_URL=https://api.unykorn.io
UNYKORN_API_KEY=your_api_key
UNYKORN_EVENT_BUS_URL=https://events.unykorn.io
WEBHOOK_BASE_URL=https://your-domain.com
```

### Partner Registry

Add partners to `automation-config.json`:

```json
"partners": [
  {
    "id": "partner_id",
    "name": "Partner Name",
    "email": "contact@partner.com",
    "role": "Role Description",
    "enabled": true,
    "signature_required": true,
    "notification_preferences": {
      "email": true,
      "webhook": false
    }
  }
]
```

---

## Complete Workflow Examples

### Example 1: Fully Automated DocuSign Issuance

```powershell
# Issue with DocuSign to all partners
.\issue-partner-documents-advanced.ps1 -Action Issue -SignatureMethod DocuSign -BatchMode

# System automatically:
# 1. Creates DocuSign envelopes
# 2. Sends to all partners
# 3. Tracks signature status
# 4. Sends reminders (days 2, 5, 7)
# 5. Processes completed docs
# 6. Pins to IPFS
# 7. Attests to XRPL
# 8. Notifies infrastructure
```

### Example 2: Monitor and Process Pipeline

```powershell
# Terminal 1: Watch for signed documents
.\issue-partner-documents-advanced.ps1 -Action ProcessSigned -WatchMode

# Terminal 2: Send reminders (scheduled task)
.\issue-partner-documents-advanced.ps1 -Action SendReminders

# Terminal 3: Check status
.\issue-partner-documents-advanced.ps1 -Action CheckStatus
```

### Example 3: Selective Issuance

```powershell
# Issue to specific partner only
.\issue-partner-documents-advanced.ps1 -Action Issue -PartnerIds @("unykorn7777") -SignatureMethod DocuSign

# Issue to subset of partners
.\issue-partner-documents-advanced.ps1 -Action Issue -PartnerIds @("unykorn7777", "partner2", "partner3") -BatchMode
```

---

## Monitoring and Logging

### Log Files

Located in `./logs/automation.log`

**Format:**
```
[2026-02-06T02:00:00Z] [INFO] Document issued to Unykorn 7777, Inc. via DocuSign
[2026-02-06T02:05:00Z] [INFO] DocuSign envelope created: mock-envelope-abc123
[2026-02-08T10:00:00Z] [INFO] Reminder sent to Unykorn 7777, Inc.
[2026-02-10T14:30:00Z] [INFO] Signed document processed: partner_agreement_signed.pdf
[2026-02-10T14:31:00Z] [INFO] Pinned to IPFS: QmXyz...
```

### Status Tracking

Check current status:
```powershell
.\issue-partner-documents-advanced.ps1 -Action CheckStatus
```

View batch reports:
```
./BATCH_REPORTS/batch_20260206-020000.json
```

---

## Webhook Endpoints

### DocuSign Webhook

**Endpoint:** `https://your-domain.com/docusign/callback`

**Events:**
- envelope-sent
- envelope-delivered
- envelope-signed
- envelope-completed

### Adobe Sign Webhook

**Endpoint:** `https://your-domain.com/adobesign/callback`

**Events:**
- agreement-sent
- agreement-viewed
- agreement-signed
- agreement-completed

---

## Testing

### Configuration Test

```powershell
.\issue-partner-documents-advanced.ps1 -Action Test
```

**Output:**
```
Config loaded: automation-config.json
DocuSign enabled: True
Adobe Sign enabled: True
IPFS enabled: True
XRPL enabled: True
UNYKORN integration enabled: True

Active partners: 2
✓ Configuration test complete
```

---

## Troubleshooting

### Issue: DocuSign API errors

**Solution:**
1. Verify API credentials in config
2. Check private key path
3. Ensure webhook URL is accessible
4. Review DocuSign account permissions

### Issue: Batch processing slow

**Solution:**
1. Increase `max_parallel` in config
2. Check network latency
3. Review API rate limits
4. Enable logging for diagnostics

### Issue: Signed docs not processing

**Solution:**
1. Verify incoming folder path
2. Check file permissions
3. Ensure hash verification is working
4. Review logs for errors

---

## Migration from v1.0

### Backward Compatibility

The advanced system is fully backward compatible:

```powershell
# Old way (still works)
.\issue-partner-documents.ps1 -All

# New way (with automation)
.\issue-partner-documents-advanced.ps1 -Action Issue -SignatureMethod Email
```

### Gradual Migration

1. **Phase 1:** Continue using v1.0, test v2.0 in parallel
2. **Phase 2:** Enable email automation only
3. **Phase 3:** Add DocuSign/Adobe Sign
4. **Phase 4:** Enable full infrastructure integration

---

## API Integration

### REST API Endpoints

(Coming soon - requires infrastructure deployment)

```
POST   /api/v2/issuance/partners          - Issue to partners
GET    /api/v2/issuance/status/{id}       - Check status
POST   /api/v2/issuance/reminders         - Send reminders
GET    /api/v2/issuance/batch/{batchId}   - Get batch report
POST   /api/v2/webhooks/docusign          - DocuSign callback
POST   /api/v2/webhooks/adobesign         - Adobe Sign callback
```

---

## Performance Metrics

### Typical Processing Times

| Operation | Time | Notes |
|-----------|------|-------|
| Single issuance (Email) | < 5 sec | Template generation |
| Single issuance (DocuSign) | < 10 sec | API call + envelope creation |
| Batch issuance (10 partners) | < 30 sec | Parallel processing |
| Signed doc processing | < 5 sec | Hash + IPFS + XRPL |
| Reminder sending | < 2 sec per partner | Email only |

---

## Security Considerations

### API Keys and Secrets

- **Never commit** credentials to repository
- **Use environment variables** for all secrets
- **Rotate keys** regularly
- **Use least privilege** for service accounts

### Document Security

- **Hash verification** ensures integrity
- **IPFS pinning** provides immutability
- **XRPL attestation** provides audit trail
- **Encrypted transmission** for all API calls

---

## Support

**Primary Contact:** jimmy@optkas.com

**Documentation:**
- Basic guide: `HOW_TO_ISSUE_PARTNER_DOCS.md`
- Quick reference: `PARTNER_DOCS_QUICK_REFERENCE.md`
- This guide: `ADVANCED_AUTOMATION_GUIDE.md`

---

## Roadmap

### Coming Soon

- [ ] Web-based dashboard (port 8080)
- [ ] Real-time metrics and analytics
- [ ] Mobile notifications
- [ ] Custom workflow builder
- [ ] Advanced reporting
- [ ] Integration marketplace

---

*Last updated: February 6, 2026*  
*Version: 2.0.0*  
*Status: Production Ready*
