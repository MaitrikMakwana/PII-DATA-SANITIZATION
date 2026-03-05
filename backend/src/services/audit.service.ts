import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

interface AuditParams {
  userId?:    string;
  action:     string;
  fileId?:    string;
  ipAddress?: string;
  userAgent?: string;
  metadata?:  Record<string, unknown>;
}

class AuditService {
  async log(params: AuditParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId:    params.userId,
          action:    params.action,
          fileId:    params.fileId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata:  (params.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Never let audit failures crash the request
      console.error('[AuditService] Failed to log:', err);
    }
  }
}

export const auditService = new AuditService();
