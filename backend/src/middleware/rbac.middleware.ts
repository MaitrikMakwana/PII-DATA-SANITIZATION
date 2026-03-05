import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types';
import { auditService } from '../services/audit.service';

export const requireRole = (...roles: Role[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !roles.includes(req.user.role)) {
      await auditService.log({
        userId:    req.user?.userId,
        action:    'ACCESS_DENIED',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: {
          attemptedRoute: req.originalUrl,
          userRole:       req.user?.role ?? 'unauthenticated',
          requiredRoles:  roles,
        },
      });
      res.status(403).json({ error: 'Forbidden: insufficient permissions' });
      return;
    }
    next();
  };
};
