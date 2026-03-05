# PII Data Sanitization Platform

A production-level frontend application for detecting and sanitizing Personally Identifiable Information (PII) across multiple file formats.

## Features

### Authentication & Authorization
- **Role-Based Access Control (RBAC)**: Admin and Standard User roles
- **Secure Login**: JWT-based authentication with separate admin/user portals
- **Session Management**: Persistent authentication state

### Admin Features
- **Comprehensive Dashboard**: Real-time analytics, KPI cards, and PII detection charts
- **File Management**: Upload, scan, and manage files with multiple format support
- **User Management**: Create, activate/deactivate, and manage user roles
- **Audit Logs**: Complete trail of all platform activities for compliance
- **File Detail View**: Side-by-side comparison of original and sanitized content
- **Advanced Analytics**: PII distribution charts, risk scoring, and trend analysis

### User Features
- **Sanitized File Access**: View and download only sanitized versions
- **Dashboard**: Overview of available files and PII statistics
- **File Preview**: View sanitized content safely
- **Download**: Secure download of sanitized files

### Technical Features
- **TypeScript**: Fully typed codebase for reliability
- **React + Vite**: Fast development and optimized builds
- **Tailwind CSS v4**: Modern, utility-first styling
- **shadcn/ui**: Professional, accessible UI components
- **Recharts**: Beautiful, responsive data visualizations
- **Mock Data**: Comprehensive demo data for testing

## Supported File Formats

- CSV (Comma-Separated Values)
- JSON (JavaScript Object Notation)
- PDF (Portable Document Format)
- DOCX (Microsoft Word)
- TXT (Plain Text)
- SQL (Database Scripts)
- Images (PNG, JPG)

## PII Detection Types

The platform detects and sanitizes:

- **Email Addresses**
- **Phone Numbers**
- **Aadhaar Numbers** (Indian National ID)
- **PAN Numbers** (Permanent Account Number)
- **Names**
- **Addresses**
- **Date of Birth**
- **Credit Card Numbers**
- **CVV Codes**
- **IP Addresses**
- **UPI IDs**
- **IFSC Codes**

## User Roles

### Admin
- Full platform access
- View original and sanitized files
- Upload new files
- Manage users and permissions
- Access audit logs
- View complete PII analytics

### Standard User
- View sanitized files only
- Download sanitized versions
- Limited dashboard with safe statistics
- No access to original files or PII values

## Getting Started

### Default Credentials

| Role  | Email             | Password  |
|-------|-------------------|-----------|
| Admin | admin@pill.com    | Admin@123 |
| User  | user@pill.com     | User@123  |

### Running the Application

You need **3 separate terminal windows** open at the same time.

---

**Terminal 1 — Backend API Server**

```bash
cd backend
npm run dev
```

Wait until you see: `🚀 Server running on http://localhost:3001`

---

**Terminal 2 — BullMQ Worker**

```bash
cd backend
npm run dev:worker
```

Wait until you see: `[Worker] Started`

---

**Terminal 3 — Frontend**

```bash
npm run dev
```

Wait until you see: `Local: http://localhost:5173/`

Then open **http://localhost:5173** in your browser.

---

### Database Setup (first time only)

```bash
cd backend

# Push schema to Neon PostgreSQL
npx prisma db push

# Seed default admin and user accounts
npm run db:seed
```

## Architecture

### Backend Stack
- **Express.js**: REST API server (port 3001)
- **TypeScript**: Fully typed backend
- **Prisma ORM**: Database access layer
- **Neon PostgreSQL 16**: Cloud-hosted relational database
- **BullMQ + Upstash Redis**: Job queue for async file processing
- **Cloudflare R2**: S3-compatible object storage for files
- **Brevo**: Transactional email service
- **JWT**: Stateless authentication tokens
- **bcryptjs**: Secure password hashing
- **Zod**: Runtime request validation
- **Helmet + CORS**: Security headers and cross-origin control

### Backend Structure

```
backend/
├── prisma/
│   ├── schema.prisma        # DB models: User, File, AuditLog
│   └── seed.ts              # Default admin + user accounts
├── src/
│   ├── config/
│   │   ├── prisma.ts        # Prisma client singleton
│   │   ├── redis.ts         # Upstash Redis connection
│   │   ├── r2.ts            # Cloudflare R2 S3 client
│   │   ├── queue.ts         # BullMQ pii-scan queue
│   │   └── multer.ts        # File upload middleware
│   ├── middleware/
│   │   ├── auth.middleware.ts   # JWT authentication
│   │   ├── rbac.middleware.ts   # Role-based access control
│   │   └── error.middleware.ts  # Global error handler
│   ├── services/
│   │   ├── audit.service.ts     # Audit log writer
│   │   ├── email.service.ts     # Brevo email sender
│   │   └── r2.service.ts        # R2 upload/download/presign
│   ├── routes/
│   │   ├── auth.routes.ts       # /api/auth — login, logout, reset
│   │   ├── admin/               # /api/admin — files, users, stats, audit
│   │   └── user/                # /api — user files, profile
│   ├── worker.ts            # BullMQ 7-stage PII pipeline worker
│   └── index.ts             # Express app entry point
└── .env                     # Environment variables (credentials)
```

### API Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Login and receive JWT |
| POST | `/api/auth/logout` | Auth | Invalidate session |
| GET | `/api/auth/me` | Auth | Current user info |
| POST | `/api/auth/forgot-password` | Public | Send reset email |
| POST | `/api/auth/reset-password` | Public | Reset with token |
| GET | `/api/admin/files` | Admin | List all files |
| POST | `/api/admin/files/upload` | Admin | Upload file |
| DELETE | `/api/admin/files/:id` | Admin | Delete file |
| POST | `/api/admin/files/:id/rescan` | Admin | Re-queue for scanning |
| GET | `/api/admin/users` | Admin | List all users |
| POST | `/api/admin/users` | Admin | Create user |
| PUT | `/api/admin/users/:id` | Admin | Update user |
| GET | `/api/admin/stats` | Admin | Dashboard KPIs |
| GET | `/api/admin/audit-logs` | Admin | Paginated audit trail |
| GET | `/api/admin/audit-logs/export` | Admin | Export CSV |
| GET | `/api/files` | User | List sanitized files |
| GET | `/api/files/:id/sanitized` | User | Download sanitized |
| GET | `/api/profile` | Auth | View profile |
| PUT | `/api/profile` | Auth | Update profile |
| PUT | `/api/profile/password` | Auth | Change password |

### 7-Stage PII Pipeline (BullMQ Worker)

1. **Download** — Fetch original file from Cloudflare R2
2. **Analyze** — POST to Python PII Engine `/analyze`
3. **Sanitize** — POST to Python PII Engine `/sanitize`
4. **Upload** — Store sanitized file back to R2
5. **Update DB** — Save entity count, types, processing time
6. **Audit Log** — Record scan completion
7. **Email** — Notify uploader via Brevo



### Frontend Stack
- **React 18**: Modern UI library
- **TypeScript**: Type-safe development
- **Vite**: Lightning-fast build tool
- **Tailwind CSS v4**: Utility-first styling
- **shadcn/ui**: High-quality component library
- **Recharts**: Data visualization
- **Lucide React**: Icon library
- **Sonner**: Toast notifications

### Project Structure

```
src/
├── app/
│   ├── App.tsx              # Main application component
│   └── components/ui/       # shadcn/ui components
├── components/
│   ├── LoginPage.tsx        # Authentication page
│   ├── Sidebar.tsx          # Navigation sidebar
│   ├── AdminDashboard.tsx   # Admin analytics dashboard
│   ├── UserDashboard.tsx    # User dashboard
│   ├── FilesPage.tsx        # File management
│   ├── FileDetailPage.tsx   # File details & PII analysis
│   ├── UsersPage.tsx        # User management (admin)
│   ├── AuditLogsPage.tsx    # Audit trail (admin)
│   └── SettingsPage.tsx     # User settings
├── lib/
│   ├── auth-context.tsx     # Authentication context
│   ├── mock-data.ts         # Demo data
│   └── utils.ts             # Utility functions
├── types/
│   └── index.ts             # TypeScript type definitions
└── styles/
    ├── index.css            # Main styles
    ├── theme.css            # Design tokens
    └── tailwind.css         # Tailwind imports
```

## Key Components

### Dashboard
- **KPI Cards**: Total files, sanitized count, processing status
- **Charts**: PII detection by type, distribution pie chart
- **Activity Feed**: Recent file processing updates
- **Risk Files**: High-risk files requiring attention

### File Management
- **Upload**: Drag & drop or click to upload
- **Filters**: Search, status filtering
- **Table View**: Comprehensive file listing with metadata
- **Actions**: View, download, re-scan (admin only)

### File Detail
- **Metadata**: Complete file information
- **PII Analysis**: Entity breakdown with confidence scores
- **Preview**: Side-by-side original vs sanitized (admin)
- **Download**: Sanitized and original (admin only)

### User Management (Admin)
- **User List**: All platform users
- **Role Management**: Promote/demote users
- **Status Control**: Activate/deactivate accounts
- **Statistics**: Active users, admin count

### Audit Logs (Admin)
- **Complete Trail**: All platform activities
- **Filtering**: By action type, user, date
- **Export**: CSV export for compliance
- **Details**: IP address, timestamps, metadata

## Security Features

1. **Role-Based Access Control**: Strict separation between admin and user capabilities
2. **Audit Logging**: All sensitive actions are logged
3. **Data Sanitization**: Multiple masking strategies (redact, mask, tokenize, hash)
4. **Access Restrictions**: Users cannot access original files or raw PII
5. **Session Management**: Secure authentication state

## Design System

### Color Palette
- **Primary**: Blue (trust, security)
- **Success**: Green (sanitized, safe)
- **Warning**: Amber (processing, medium risk)
- **Danger**: Red (errors, high risk)
- **Neutral**: Slate (content, backgrounds)

### Typography
- Clean, readable fonts
- Consistent hierarchy
- Proper spacing and contrast

### Components
- Modern card-based layouts
- Smooth transitions and animations
- Responsive grid systems
- Accessible form controls

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Future Enhancements

- Python FastAPI PII Engine integration (ML-based detection)
- Bulk file operations
- Custom sanitization policies
- Dark mode
- Export reports to PDF
- Multi-language support

## License

MIT

## Contact

For questions or support, please contact the development team.
