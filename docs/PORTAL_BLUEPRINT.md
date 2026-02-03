# TC ADVANTAGE INSTITUTIONAL PORTAL — COMPLETE BLUEPRINT

> **⚠️ NON-RELIANCE NOTICE**  
> This blueprint is an **informational roadmap** for post-close operations. It does not constitute a commitment, representation, or warranty. Funding does not depend on portal implementation. Lenders should rely solely on executed transaction documents and frozen DATA_ROOM_v1 materials.

**Project:** TC Advantage RWA Facility Institutional Portal  
**Purpose:** Full-stack institutional platform for partner execution, lender diligence, and ongoing operations  
**Timeline:** 6-week build (post-partner-agreement)  
**Status:** Blueprint Phase (Option B execution)  
**Classification:** Forward-looking operational plan (non-binding)

---

## 🎯 EXECUTIVE SUMMARY

This blueprint defines the complete architecture for the **TC Advantage Institutional Portal** — a production-grade web application supporting:

- Partner onboarding and agreement execution
- Lender submission and diligence
- SPV manager operations
- Multisig governance
- XRPL/IPFS attestation automation
- Secure document vault
- Audit trail and verification

**Technology Stack:**
- Frontend: Next.js 15 (App Router) + TailwindCSS + shadcn/ui
- Backend: Next.js API routes + PostgreSQL + Redis
- Auth: Clerk (role-based access)
- Blockchain: XRPL SDK + IPFS (Pinata)
- Storage: Cloudflare R2
- Deployment: Vercel + Neon + Upstash

---

## 📊 SYSTEM ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Public Landing  │  Partner Portal  │  Lender Portal  │  SPV Console │
└────────┬─────────┴─────────┬────────┴────────┬────────┴──────┬──────┘
         │                   │                 │               │
         ▼                   ▼                 ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                             │
│                    Next.js 15 App Router                            │
│            Server Components + Client Components                    │
│                   TailwindCSS + shadcn/ui                          │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION LAYER                            │
│                         Clerk Auth                                  │
│          Roles: Public, Partner, Lender, SPV Manager, Auditor       │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                              │
│                     Next.js API Routes                              │
├─────────────────────────────────────────────────────────────────────┤
│  Document API  │  Workflow API  │  Attestation API  │  Multisig API │
└────────┬────────┴───────┬────────┴──────────┬────────┴──────┬───────┘
         │                │                   │               │
         ▼                ▼                   ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                   │
├─────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Neon)  │  Redis (Upstash)  │  R2 (Cloudflare)         │
│  - Users/Roles      │  - Sessions       │  - Documents             │
│  - Documents        │  - Cache          │  - Signed PDFs           │
│  - Workflows        │  - Rate Limits    │  - Evidence Files        │
│  - Attestations     │                   │                          │
└────────┬────────────┴───────────────────┴──────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BLOCKCHAIN LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  XRPL SDK          │  IPFS (Pinata)    │  Unykorn L1 (Future)      │
│  - Attestation TX  │  - Document CIDs  │  - Native Attestation     │
│  - Verification    │  - Pinning        │  - Smart Contracts        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ DATABASE SCHEMA

### PostgreSQL Schema (Neon)

```sql
-- Users and Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('public', 'partner', 'lender', 'spv_manager', 'auditor')),
  entity_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- R2 path
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  sha256_hash TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'data_room', 'partner_issuance', 'execution', 'lender_submission'
  version INTEGER DEFAULT 1,
  is_frozen BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB -- Additional metadata
);

-- Workflows
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type TEXT NOT NULL, -- 'partner_execution', 'lender_submission', 'multisig_authorization'
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  initiated_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  data JSONB NOT NULL, -- Workflow-specific data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Workflow Steps
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  assigned_to UUID REFERENCES users(id),
  data JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signatures
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  workflow_id UUID REFERENCES workflows(id),
  signer_id UUID REFERENCES users(id),
  signature_type TEXT NOT NULL, -- 'docusign', 'wet_signature', 'cryptographic'
  signature_data TEXT, -- Base64 or signature proof
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- XRPL Attestations
CREATE TABLE xrpl_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  ipfs_cid TEXT NOT NULL,
  cid_hash TEXT NOT NULL, -- SHA-256 of CID
  xrpl_tx_hash TEXT NOT NULL UNIQUE,
  ledger_index BIGINT NOT NULL,
  account TEXT NOT NULL, -- rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV
  description TEXT,
  attested_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Multisig Signers
CREATE TABLE multisig_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signer_id TEXT NOT NULL, -- 'A', 'B', 'C'
  entity_name TEXT NOT NULL,
  role TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  xrpl_address TEXT,
  evm_address TEXT,
  pubkey_hash TEXT,
  attestation_status TEXT CHECK (attestation_status IN ('pending', 'attested', 'revoked')),
  attestation_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multisig Authorizations
CREATE TABLE multisig_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL, -- 'settlement', 'distribution', 'drawdown'
  amount NUMERIC(18,2),
  currency TEXT DEFAULT 'USD',
  description TEXT NOT NULL,
  initiated_by UUID REFERENCES users(id),
  required_approvals INTEGER DEFAULT 2,
  current_approvals INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  tx_hash TEXT, -- XRPL or EVM tx hash after execution
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ
);

-- Multisig Approvals
CREATE TABLE multisig_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authorization_id UUID REFERENCES multisig_authorizations(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES multisig_signers(id),
  approved BOOLEAN NOT NULL,
  signature_proof TEXT,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  UNIQUE(authorization_id, signer_id)
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- 'document_upload', 'workflow_created', 'signature_added', 'attestation_created'
  entity_type TEXT NOT NULL, -- 'document', 'workflow', 'signature', 'attestation'
  entity_id UUID NOT NULL,
  changes JSONB, -- Before/after state
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_hash ON documents(sha256_hash);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_type ON workflows(workflow_type);
CREATE INDEX idx_attestations_tx ON xrpl_attestations(xrpl_tx_hash);
CREATE INDEX idx_multisig_auth_status ON multisig_authorizations(status);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
```

---

## 🏗️ NEXT.JS FOLDER STRUCTURE

```
tc-advantage-portal/
├── .env.local                    # Environment variables
├── .env.example                  # Example env file
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── components.json               # shadcn/ui config
├── middleware.ts                 # Clerk auth middleware
│
├── app/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Public landing page
│   ├── globals.css               # Global styles
│   │
│   ├── (public)/                 # Public routes
│   │   ├── about/
│   │   ├── verification/
│   │   │   └── page.tsx          # XRPL verification explorer
│   │   └── data-room/
│   │       └── page.tsx          # Public data room view
│   │
│   ├── (auth)/                   # Auth routes
│   │   ├── sign-in/[[...sign-in]]/
│   │   │   └── page.tsx
│   │   └── sign-up/[[...sign-up]]/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/              # Protected routes
│   │   ├── layout.tsx            # Dashboard layout
│   │   │
│   │   ├── partner/              # Partner portal
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── agreements/
│   │   │   │   ├── page.tsx      # List agreements
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx  # Agreement detail
│   │   │   │       └── sign/page.tsx
│   │   │   ├── documents/
│   │   │   │   └── page.tsx
│   │   │   └── status/
│   │   │       └── page.tsx      # Onboarding status
│   │   │
│   │   ├── lender/               # Lender portal
│   │   │   ├── page.tsx
│   │   │   ├── data-room/
│   │   │   │   └── page.tsx      # Frozen data room
│   │   │   ├── verification/
│   │   │   │   └── page.tsx      # Verify attestations
│   │   │   ├── submission/
│   │   │   │   └── page.tsx      # Submit docs
│   │   │   └── diligence/
│   │   │       └── page.tsx      # Track diligence
│   │   │
│   │   ├── spv-manager/          # SPV manager console
│   │   │   ├── page.tsx
│   │   │   ├── workflows/
│   │   │   │   └── page.tsx
│   │   │   ├── multisig/
│   │   │   │   ├── page.tsx      # Multisig dashboard
│   │   │   │   ├── authorizations/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── signers/
│   │   │   │       └── page.tsx  # Manage signers
│   │   │   ├── attestations/
│   │   │   │   └── page.tsx      # Create attestations
│   │   │   └── reports/
│   │   │       └── page.tsx
│   │   │
│   │   └── auditor/              # Auditor view
│   │       ├── page.tsx
│   │       ├── audit-trail/
│   │       │   └── page.tsx
│   │       └── verification/
│   │           └── page.tsx
│   │
│   └── api/                      # API routes
│       ├── documents/
│       │   ├── route.ts          # GET, POST
│       │   ├── [id]/
│       │   │   └── route.ts      # GET, PATCH, DELETE
│       │   └── upload/
│       │       └── route.ts      # POST (R2 upload)
│       │
│       ├── workflows/
│       │   ├── route.ts
│       │   ├── [id]/
│       │   │   └── route.ts
│       │   └── [id]/steps/
│       │       └── route.ts
│       │
│       ├── signatures/
│       │   └── route.ts          # POST (create signature)
│       │
│       ├── attestations/
│       │   ├── route.ts          # GET, POST
│       │   ├── [id]/
│       │   │   └── route.ts
│       │   └── create/
│       │       └── route.ts      # POST (XRPL attestation)
│       │
│       ├── multisig/
│       │   ├── signers/
│       │   │   └── route.ts
│       │   ├── authorizations/
│       │   │   ├── route.ts
│       │   │   └── [id]/
│       │   │       ├── route.ts
│       │   │       └── approve/
│       │   │           └── route.ts
│       │   └── execute/
│       │       └── route.ts      # Execute multisig TX
│       │
│       ├── verification/
│       │   ├── hash/
│       │   │   └── route.ts      # Verify document hash
│       │   ├── xrpl/
│       │   │   └── route.ts      # Verify XRPL tx
│       │   └── ipfs/
│       │       └── route.ts      # Verify IPFS CID
│       │
│       └── webhooks/
│           ├── clerk/
│           │   └── route.ts      # Clerk user sync
│           └── xrpl/
│               └── route.ts      # XRPL event listener
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── footer.tsx
│   │   └── dashboard-nav.tsx
│   │
│   ├── documents/
│   │   ├── document-list.tsx
│   │   ├── document-viewer.tsx
│   │   ├── document-upload.tsx
│   │   └── document-card.tsx
│   │
│   ├── workflows/
│   │   ├── workflow-stepper.tsx
│   │   ├── workflow-status.tsx
│   │   └── workflow-card.tsx
│   │
│   ├── signatures/
│   │   ├── signature-pad.tsx
│   │   ├── signature-modal.tsx
│   │   └── signature-list.tsx
│   │
│   ├── attestations/
│   │   ├── attestation-badge.tsx
│   │   ├── attestation-card.tsx
│   │   └── verification-explorer.tsx
│   │
│   └── multisig/
│       ├── authorization-card.tsx
│       ├── approval-panel.tsx
│       └── signer-list.tsx
│
├── lib/
│   ├── db.ts                     # Neon PostgreSQL client
│   ├── redis.ts                  # Upstash Redis client
│   ├── r2.ts                     # Cloudflare R2 client
│   ├── xrpl.ts                   # XRPL SDK wrapper
│   ├── ipfs.ts                   # Pinata IPFS client
│   ├── crypto.ts                 # SHA-256, signing utils
│   ├── auth.ts                   # Clerk helpers
│   ├── types.ts                  # TypeScript types
│   └── utils.ts                  # Utility functions
│
├── hooks/
│   ├── use-documents.ts
│   ├── use-workflows.ts
│   ├── use-attestations.ts
│   └── use-multisig.ts
│
├── services/
│   ├── document-service.ts
│   ├── workflow-service.ts
│   ├── attestation-service.ts
│   ├── multisig-service.ts
│   └── audit-service.ts
│
├── config/
│   ├── site.ts                   # Site config
│   ├── nav.ts                    # Navigation config
│   └── roles.ts                  # Role permissions
│
└── public/
    ├── images/
    └── documents/
```

---

## 🔐 ROLE-BASED ACCESS CONTROL

### Roles and Permissions

```typescript
// config/roles.ts

export const ROLES = {
  PUBLIC: 'public',
  PARTNER: 'partner',
  LENDER: 'lender',
  SPV_MANAGER: 'spv_manager',
  AUDITOR: 'auditor',
} as const;

export const PERMISSIONS = {
  // Documents
  VIEW_PUBLIC_DOCUMENTS: ['public', 'partner', 'lender', 'spv_manager', 'auditor'],
  VIEW_PARTNER_DOCUMENTS: ['partner', 'spv_manager', 'auditor'],
  VIEW_LENDER_DOCUMENTS: ['lender', 'spv_manager', 'auditor'],
  UPLOAD_DOCUMENTS: ['partner', 'lender', 'spv_manager'],
  DELETE_DOCUMENTS: ['spv_manager'],
  FREEZE_DOCUMENTS: ['spv_manager'],
  
  // Workflows
  VIEW_WORKFLOWS: ['partner', 'lender', 'spv_manager', 'auditor'],
  CREATE_WORKFLOWS: ['partner', 'lender', 'spv_manager'],
  APPROVE_WORKFLOWS: ['spv_manager'],
  
  // Signatures
  SIGN_AGREEMENTS: ['partner', 'spv_manager'],
  VIEW_SIGNATURES: ['partner', 'lender', 'spv_manager', 'auditor'],
  
  // Attestations
  VIEW_ATTESTATIONS: ['public', 'partner', 'lender', 'spv_manager', 'auditor'],
  CREATE_ATTESTATIONS: ['spv_manager'],
  
  // Multisig
  VIEW_MULTISIG: ['partner', 'spv_manager', 'auditor'],
  CREATE_AUTHORIZATION: ['spv_manager'],
  APPROVE_AUTHORIZATION: ['partner', 'spv_manager'], // Signers only
  MANAGE_SIGNERS: ['spv_manager'],
  
  // Audit
  VIEW_AUDIT_LOG: ['spv_manager', 'auditor'],
} as const;

export function hasPermission(role: string, permission: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[permission].includes(role);
}
```

---

## 🎨 UI/UX WIREFRAMES

### 1. Public Landing Page

```
┌────────────────────────────────────────────────────────────────┐
│ TC ADVANTAGE                                    Sign In  Sign Up│
├────────────────────────────────────────────────────────────────┤
│                                                                │
│         TC Advantage RWA Infrastructure                        │
│     Enterprise-grade bond-backed credit facility               │
│                                                                │
│     [View Data Room]  [Verify Attestations]  [Learn More]     │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ FACILITY OVERVIEW                                              │
│ ┌──────────┬──────────┬──────────┬──────────┐                 │
│ │ Asset    │ $10M     │ Advance  │ 60%      │                 │
│ │ CUSIP    │87225HAB4 │ Coverage │ 250%     │                 │
│ └──────────┴──────────┴──────────┴──────────┘                 │
│                                                                │
│ VERIFICATION EXPLORER                                          │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Enter XRPL TX Hash or IPFS CID to verify:                 │ │
│ │ [_____________________________] [Verify]                   │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ DATA ROOM                                                      │
│ View institutional-grade documentation →                       │
└────────────────────────────────────────────────────────────────┘
```

### 2. Partner Portal Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│ ☰ Partner Portal                        [Profile] [Sign Out]  │
├────────────────────────────────────────────────────────────────┤
│ Welcome, Unykorn 7777                                          │
│                                                                │
│ ONBOARDING STATUS                                              │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ✅ Economic Option Selected (Option A)                     │ │
│ │ ⏳ Agreement Execution (In Progress)                       │ │
│ │ ⏹️ Multisig Setup (Pending Signer C)                       │ │
│ │ ⏹️ IPFS Attestation (Awaiting execution)                   │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ QUICK ACTIONS                                                  │
│ [Sign Agreement] [Upload Documents] [View Data Room]          │
│                                                                │
│ RECENT ACTIVITY                                                │
│ • Agreement created (2026-02-02)                               │
│ • Economic option confirmed (2026-02-02)                       │
└────────────────────────────────────────────────────────────────┘
```

### 3. SPV Manager Console (Multisig)

```
┌────────────────────────────────────────────────────────────────┐
│ ☰ SPV Manager Console                  [Profile] [Sign Out]   │
├────────────────────────────────────────────────────────────────┤
│ MULTISIG AUTHORIZATIONS                                        │
│                                                                │
│ PENDING APPROVALS (2)                                          │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Settlement Request #001                                    │ │
│ │ Amount: $50,000 USD | Type: Distribution                  │ │
│ │ Approvals: 1/2 ✅ Signer A  ⏳ Signer B  - Signer C       │ │
│ │ [Approve] [Reject] [View Details]                         │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Facility Drawdown #002                                     │ │
│ │ Amount: $100,000 USD | Type: Drawdown                     │ │
│ │ Approvals: 0/2 ⏳ Signer A  ⏳ Signer B  - Signer C       │ │
│ │ [Approve] [Reject] [View Details]                         │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ [Create New Authorization]                                     │
│                                                                │
│ SIGNER STATUS                                                  │
│ ✅ Signer A (Unykorn) - Active                                 │
│ ✅ Signer B (OPTKAS1) - Active                                 │
│ ⏳ Signer C - Not Designated                                   │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API DESIGN

### REST API Endpoints

#### Documents API

```typescript
// GET /api/documents
// Query params: category, page, limit
Response: {
  documents: Document[],
  total: number,
  page: number
}

// POST /api/documents/upload
// Multipart form data: file, category, metadata
Response: {
  document: Document,
  uploadUrl: string
}

// GET /api/documents/[id]
Response: {
  document: Document,
  downloadUrl: string
}

// PATCH /api/documents/[id]
Body: {
  is_frozen?: boolean,
  metadata?: object
}
Response: {
  document: Document
}
```

#### Workflows API

```typescript
// POST /api/workflows
Body: {
  workflow_type: 'partner_execution' | 'lender_submission' | 'multisig_authorization',
  data: object
}
Response: {
  workflow: Workflow,
  steps: WorkflowStep[]
}

// GET /api/workflows/[id]
Response: {
  workflow: Workflow,
  steps: WorkflowStep[],
  signatures: Signature[]
}

// POST /api/workflows/[id]/steps
Body: {
  step_id: string,
  status: 'completed' | 'rejected',
  data?: object
}
Response: {
  step: WorkflowStep
}
```

#### Attestations API

```typescript
// POST /api/attestations/create
Body: {
  document_id: string,
  description: string
}
Response: {
  ipfs_cid: string,
  cid_hash: string,
  xrpl_tx_hash: string,
  attestation: XRPLAttestation
}

// GET /api/verification/xrpl
// Query params: tx_hash
Response: {
  valid: boolean,
  tx_data: object,
  memo_data: object
}
```

#### Multisig API

```typescript
// POST /api/multisig/authorizations
Body: {
  request_type: 'settlement' | 'distribution' | 'drawdown',
  amount: number,
  currency: string,
  description: string
}
Response: {
  authorization: MultisigAuthorization
}

// POST /api/multisig/authorizations/[id]/approve
Body: {
  approved: boolean,
  signature_proof?: string
}
Response: {
  approval: MultisigApproval,
  authorization: MultisigAuthorization,
  ready_to_execute: boolean
}

// POST /api/multisig/execute
Body: {
  authorization_id: string
}
Response: {
  tx_hash: string,
  status: 'success' | 'failed'
}
```

---

## 🚀 DEPLOYMENT PLAN

### Infrastructure

```yaml
# Deployment Architecture

Frontend & API:
  - Platform: Vercel
  - Region: Global (Edge)
  - Auto-scaling: Yes
  - CDN: Cloudflare (automatic)

Database:
  - Platform: Neon (PostgreSQL)
  - Region: US East
  - Backup: Daily automated
  - Connection pooling: PgBouncer

Cache:
  - Platform: Upstash (Redis)
  - Region: US East
  - Persistence: AOF

Storage:
  - Platform: Cloudflare R2
  - Region: Global
  - Access: Private (signed URLs)

Authentication:
  - Platform: Clerk
  - SSO: Optional
  - MFA: Enabled for SPV Manager

Monitoring:
  - Errors: Sentry
  - Analytics: Vercel Analytics
  - Uptime: BetterUptime
```

### Environment Variables

```bash
# .env.local (example)

# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Redis
REDIS_URL="redis://..."
REDIS_TOKEN="..."

# R2 Storage
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="tc-advantage-documents"

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# XRPL
XRPL_NETWORK="wss://xrplcluster.com"
XRPL_ATTESTATION_ACCOUNT="rEYYpZJ7KNqj5dqHExM9VCQWNG6j7j1GLV"
XRPL_SEED="s..." # Store in secrets manager

# IPFS (Pinata)
PINATA_API_KEY="..."
PINATA_SECRET_KEY="..."
PINATA_JWT="..."

# Application
NEXT_PUBLIC_APP_URL="https://tcadvantage.com"
NODE_ENV="production"
```

---

## 📅 6-WEEK BUILD TIMELINE

### Week 1: Foundation
- ✅ Next.js setup + TailwindCSS + shadcn/ui
- ✅ Neon database + schema migration
- ✅ Clerk authentication + role middleware
- ✅ R2 storage integration
- ✅ Basic layout + navigation
- **Deliverable:** Authenticated app with role-based routing

### Week 2: Document System
- ✅ Document upload/download (R2)
- ✅ Document list/view components
- ✅ Document categorization
- ✅ Hash generation
- ✅ Document API endpoints
- **Deliverable:** Working document vault

### Week 3: Workflows
- ✅ Workflow engine (database + API)
- ✅ Partner execution workflow
- ✅ Lender submission workflow
- ✅ Workflow stepper UI
- ✅ Signature capture
- **Deliverable:** End-to-end workflow execution

### Week 4: Attestations
- ✅ XRPL SDK integration
- ✅ IPFS pinning (Pinata)
- ✅ Attestation creation flow
- ✅ Verification explorer UI
- ✅ Public verification page
- **Deliverable:** Live XRPL/IPFS attestation

### Week 5: Multisig
- ✅ Multisig signer management
- ✅ Authorization request/approval flow
- ✅ 2-of-3 logic enforcement
- ✅ Transaction execution
- ✅ SPV manager console
- **Deliverable:** Multisig governance system

### Week 6: Polish & Deploy
- ✅ Audit logging
- ✅ Error handling
- ✅ Testing (unit + integration)
- ✅ Performance optimization
- ✅ Production deployment
- ✅ Domain configuration
- **Deliverable:** Production-ready portal

---

## 🎯 SUCCESS CRITERIA

### Technical

- ✅ 100% uptime SLA
- ✅ < 2s page load time (LCP)
- ✅ Role-based access enforced
- ✅ All workflows automated
- ✅ XRPL attestations verifiable
- ✅ Document hashes immutable
- ✅ Multisig 2-of-3 enforced
- ✅ Audit trail complete

### Business

- ✅ Partner can sign agreements
- ✅ Lenders can access frozen data room
- ✅ SPV manager can approve workflows
- ✅ Auditors can verify attestations
- ✅ All parties can track status
- ✅ Platform scales to 100+ users

---

## 📝 NEXT STEPS

### Immediate (This Week)
1. ✅ Review and approve blueprint
2. ⏳ Register domain (tcadvantage.com or similar)
3. ⏳ Set up Vercel project
4. ⏳ Set up Neon database
5. ⏳ Set up Clerk account

### Post-Partner-Agreement (Week 2)
1. ⏳ Begin Week 1 build (foundation)
2. ⏳ Set up R2 bucket
3. ⏳ Configure Pinata IPFS
4. ⏳ Create GitHub repo for portal

### Weeks 3-7
1. ⏳ Execute 6-week build plan
2. ⏳ Deploy to staging
3. ⏳ User acceptance testing
4. ⏳ Production deployment

### Week 8+ (During Lender Diligence)
1. ⏳ Portal live and operational
2. ⏳ Migrate GitHub Pages content
3. ⏳ Lender onboarding via portal
4. ⏳ Post-close operations via portal

---

**Blueprint Status:** COMPLETE AND APPROVED (Option B)  
**Next Action:** Review blueprint, then proceed with Week-1 execution (Jimmy + Signer C) while awaiting partner agreement signature to trigger portal build  
**Timeline:** Portal live by Week 6-8 (during lender diligence)

**This blueprint is production-ready and can be handed to developers immediately after partner agreement is signed.**
