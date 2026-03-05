export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export type FileStatus = 'pending' | 'processing' | 'analyzed' | 'sanitized' | 'error';

export interface FileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploaderName: string;
  uploadedAt: string;
  status: FileStatus;
  entityCount: number;
  entitiesByType: Record<string, number>;
  sanitizedAt?: string;
  processingDuration?: number;
  errorMsg?: string;
  riskScore?: 'low' | 'medium' | 'high';
}

export interface PIIEntity {
  type: string;
  count: number;
  confidence: number;
  maskingStrategy: 'redact' | 'mask' | 'tokenize' | 'hash';
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  fileId?: string;
  fileName?: string;
  ipAddress: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardStats {
  totalFiles: number;
  pendingFiles: number;
  sanitizedFiles: number;
  failedFiles: number;
  processingFiles: number;
  piiDetectionsByType: Array<{ type: string; count: number }>;
  recentActivity: Array<{
    id: string;
    fileName: string;
    status: FileStatus;
    timestamp: string;
    entityCount: number;
  }>;
  topRiskFiles: Array<{
    id: string;
    fileName: string;
    riskScore: string;
    entityCount: number;
  }>;
}
