1) Project Understanding
What this project is

A PII Data Sanitization Platform that lets organizations upload documents/data, automatically detect PII, and generate sanitized (redacted/masked) versions for sharing with non-privileged users. It supports multiple formats (SQL/CSV/JSON/PDF/DOCX/TXT/images) and includes RBAC, audit logs, and scalable async processing. 

PII_Vibe_Coding_Plan

Main goal

Prevent privacy leaks by ensuring only sanitized outputs are shared outside privileged roles.

Provide a repeatable, auditable workflow: upload → scan → sanitize → download, with logs.

Primary users

Admin (Security/Data Owner): uploads data, reviews PII findings, manages users, downloads originals and sanitized files.

Standard User (Analyst/Consumer): can only access sanitized data.

Auditor/Compliance (optional role): reviews logs and compliance reports.

Core features (MVP)

Login + role-based access

File upload + file list + status tracking

PII detection (Presidio + spaCy + custom Indian PII recognizers)

Sanitization (mask/redact/tokenize) + sanitized file generation

Download sanitized files (admins optionally download originals)

Audit logging for all sensitive actions

Async processing queue + workers for scale 

PII_Vibe_Coding_Plan

2) User Roles & Permissions
1) Admin

Can

Create/manage users (activate/deactivate, role changes)

Upload files (all supported types)

View original + sanitized

View PII entities and confidence scores

Trigger re-scan / re-sanitize with different policies

Download original and sanitized

View audit logs + analytics dashboard

Cannot

Nothing (full access)

2) Standard User

Can

View only sanitized files

Download sanitized versions

See summary stats (entity counts), not raw PII values

Search/filter files

Cannot

Upload

Download original

View raw PII entities text/value

See user management / audit logs

______________________________________________________________

3) Complete Page-by-Page Breakdown

Below is a judge-friendly, developer-ready page inventory.

A) Public / Auth
1. Landing / Marketing (Optional for hackathon)

Purpose: Explain what the platform does + CTA to login

UI Components: hero, features grid, sample redaction preview, login button

Data: none / static

Actions: go to login

API: none

2. Login

Purpose: authenticate

UI Components: email, password, submit; error toast; “forgot password” link (optional)

Data: none

Actions: login

API: POST /api/auth/login (returns JWT + role) 

PII_Vibe_Coding_Plan

3. Register (Admin-only in production; hackathon may allow open)

Purpose: create account

UI Components: name, email, password, role (admin/user), submit

Actions: register

API: POST /api/auth/register 

PII_Vibe_Coding_Plan

B) Admin Area
4. Admin Dashboard

Purpose: operational overview

UI Components:

KPI cards: total uploads, pending/processing, sanitized, failed

Chart: detections by PII type (7 days)

Recent activity feed

Data: aggregated counts, type breakdowns, recent uploads

Actions: navigate to files/users/audit

API: GET /api/admin/stats 

PII_Vibe_Coding_Plan

5. Admin File Manager (Files List)

Purpose: upload + manage processing

UI Components:

Upload button + drag/drop modal

Table with: filename, type icon, size, uploader, date, status badge, actions

Filters: status, type, uploader; search box; pagination

Data: file metadata list

Actions: upload, view details, download original/sanitized, retry job

API:

POST /api/admin/upload

GET /api/admin/files?page=…

GET /api/admin/files/:id/original

GET /api/files/:id/sanitized 

PII_Vibe_Coding_Plan

6. File Detail (Admin)

Purpose: deep view of one file + PII results

UI Components:

Header: filename, status, timestamps, processing time

Summary cards: entityCount, risk score, top entity types

Table: entity type, count, masking strategy, confidence distribution

Diff/Preview: Original vs Sanitized (admin sees both)

Actions: re-scan, re-sanitize (choose policy), download original/sanitized

Data: entities summary, (optionally) entity list with start/end and score

Actions: rerun processing, export report

API:

GET /api/admin/files/:id

GET /api/files/:id/status

POST /api/admin/files/:id/rescan (optional)

POST /api/admin/files/:id/resanitize (optional)

7. User Management (Admin)

Purpose: manage accounts and permissions

UI Components: table (name, email, role badge, status), search, filters, action buttons

Actions: promote/demote, deactivate, create user

API:

GET /api/admin/users

PATCH /api/admin/users/:id/role

PATCH /api/admin/users/:id/deactivate 

PII_Vibe_Coding_Plan

8. Audit Logs (Admin)

Purpose: prove compliance and traceability

UI Components: table with filters (date range, action type), pagination, export CSV

Data: action, user, file, timestamp, IP, user-agent

Actions: filter, export, drill into file

API: GET /api/admin/audit 

PII_Vibe_Coding_Plan

9. System Health / Queue Monitor (Optional but impressive)

Purpose: monitor jobs + failures

UI Components: queue metrics cards, job list, retry button, worker status

API: GET /api/admin/queue, POST /api/admin/jobs/:id/retry (optional)

C) Standard User Area
10. User Dashboard

Purpose: access sanitized data safely

UI Components: searchable table of sanitized files, file type filter, download buttons

Data: filename, sanitizedAt, entityCount (only count), file type

Actions: download sanitized, view sanitized preview

API: GET /api/files?status=sanitized and GET /api/files/:id/sanitized 

PII_Vibe_Coding_Plan

11. File Detail (User)

Purpose: preview sanitized data only

UI Components: sanitized preview pane, entity count breakdown (no raw values), download button

Actions: download sanitized

API: GET /api/files/:id (sanitized view projection), GET /api/files/:id/sanitized

4) UI/UX Layout Suggestion
Global layout

Left Sidebar (desktop): Dashboard, Files, (Admin) Users, Audit Logs, Settings

Top Bar: search, notifications (job complete), profile menu

Main Content: page-specific

Navigation structure

Admin

Dashboard

Files

Users

Audit Logs

Health (optional)

User

Dashboard

Sanitized Files

Dashboard widgets (judge-friendly)

KPI cards: Total Files, Pending, Sanitized, Failed

Chart: PII detections by type (Aadhaar/PAN/Email/Phone/etc.)

“Recent Scans” table

“Top Risk Files” list (by entity count / types)

Mobile + web compatibility

Mobile: bottom nav (Dashboard / Files / Profile)

Tables become card lists on mobile

Upload uses full-screen sheet modal

Diff view collapses to “toggle original/sanitized” (admin only)

AI-powered UI touches (small but impressive)

Auto risk label: “High / Medium / Low” based on entityCount + types

Smart masking policy selector: recommended policy based on file type

PII heat highlights in preview pane (only highlight sanitized placeholders for user role)

5) Feature Modules
1) Authentication & Authorization

JWT auth, password hashing

RBAC middleware (admin/user)

Optional: refresh tokens, forgot password

2) File Intake & Storage

Upload API, validation, virus scan hook (optional)

Storage: MinIO/S3 + metadata DB

Versioning: original + sanitized keys 

PII_Vibe_Coding_Plan

3) PII Detection (AI/NLP)

Presidio Analyzer + spaCy NER

Custom recognizers: Aadhaar, PAN, UPI, IFSC, Indian phone 

PII_Vibe_Coding_Plan

Entity scoring + stats

4) Sanitization Engine

Operators per entity type:

redact, mask, tokenize, hash

Output regeneration by format (TXT/CSV/JSON/SQL easiest; DOCX/PDF harder) 

PII_Vibe_Coding_Plan

5) Async Processing & Scalability

BullMQ queue, worker process, retries, concurrency 

PII_Vibe_Coding_Plan

Status polling endpoint

6) Audit & Compliance

Immutable audit logs for login/upload/download/access denied 

PII_Vibe_Coding_Plan

Exportable reports

7) Analytics & Reporting

Counts by day/type

Top risky files and trends

8) Notifications

In-app toast + bell icon

Optional email/webhook on scan completion

6) Database Design (Entities & Relationships)
Core collections/tables
users

_id

name, email (unique)

passwordHash

role: admin | user | auditor

isActive

createdAt, lastLoginAt

files

_id

originalName, mimeType, size

uploadedBy (FK → users)

uploadedAt

status: pending | processing | analyzed | sanitized | error

originalStorageKey

sanitizedStorageKey

sanitizedAt

entityCount

entitiesByType (map: type → count)

processingMeta: duration, engineVersion, errorMsg

pii_entities (optional: store full entity list separately)

_id

fileId (FK → files)

type, start, end, score

sampleMaskedText (admin only) OR store only aggregates for safety

audit_logs

_id

userId, userEmail

action: LOGIN, UPLOAD, DOWNLOAD_SANITIZED, DOWNLOAD_ORIGINAL, ACCESS_DENIED, SCAN_COMPLETE…

fileId (optional)

ipAddress, userAgent

timestamp

metadata (object)

jobs (optional if queue UI)

_id

fileId

state, progress

attempts, error

Relationships

user 1—N files

file 1—N entities (optional)

user 1—N audit logs

file 1—N audit logs

7) System Architecture
Frontend

React + Vite + Tailwind + shadcn/ui 

PII_Vibe_Coding_Plan

React Router v6

AuthContext storing JWT (memory)

Polling status for processing

Backend (API Gateway)

Node.js + Express

Multer for uploads 

PII_Vibe_Coding_Plan

RBAC middleware

Audit logging middleware

Streams file from storage

PII Engine (Microservice)

Python FastAPI

Microsoft Presidio Analyzer/Anonymizer + spaCy

Custom Indian recognizers

File text extraction: pdfplumber, python-docx, pandas, pytesseract 

PII_Vibe_Coding_Plan

Async queue & workers

BullMQ queue + separate worker process, Redis (Upstash) 

PII_Vibe_Coding_Plan

Worker flow: fetch original → analyze → sanitize → store sanitized → update DB

Storage

MinIO (S3-compatible) or Cloudflare R2 

PII_Vibe_Coding_Plan

Buckets: pii-originals, pii-sanitized

Database

MongoDB Atlas (free tier) 

PII_Vibe_Coding_Plan

Deployment (hackathon-friendly)

Docker Compose for local demo (strong reliability)

Optional cloud: Railway (backend + pii-engine), Vercel (frontend)

8) Advanced Improvements (Smart Add-ons)
Security & compliance upgrades

Encryption-at-rest for file objects + per-tenant keys

Signed URLs for downloads (short-lived)

DLP policies per org/team (configurable masking rules)

Watermark sanitized downloads (“Sanitized by Platform”)

Product “wow” features

Policy templates: “Share with vendors”, “Share with interns”, “Public dataset”

PII risk score: weighted score by sensitive types (Aadhaar/PAN > email)

Explainability panel: why an entity was flagged (pattern vs NER)

AI enhancements

Optional HuggingFace NER second-pass (bonus) 

PII_Vibe_Coding_Plan

Auto-detect document language + locale tuning (India-first)

Ops improvements

Retry failed jobs, dead-letter queue

Admin “reprocess with new policy”

Observability: basic metrics endpoint

What I recommend for your 40-hour hackathon build order

Auth + RBAC + File upload/list

PII analyze for TXT/CSV/JSON/SQL end-to-end

Sanitization outputs for those formats

Add DOCX, then PDF

Add queue + worker + audit logs + dashboard polish

That sequence ensures you always have a demoable pipeline early.