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

### Demo Credentials

The application uses mock authentication. You can log in with any email/password combination.

**Admin Access**: Use the "Admin Login" tab
**User Access**: Use the "User Login" tab

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Architecture

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

- Real backend integration with Express.js API
- Live file processing with progress tracking
- Advanced PII detection with ML models
- Bulk file operations
- Custom sanitization policies
- Email notifications
- Multi-language support
- Dark mode
- Export reports to PDF

## License

MIT

## Contact

For questions or support, please contact the development team.
