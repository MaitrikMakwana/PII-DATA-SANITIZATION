import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole }  from '../../middleware/rbac.middleware';
import filesRouter from './files.routes';
import usersRouter from './users.routes';
import statsRouter from './stats.routes';
import auditRouter from './audit.routes';

const router = Router();

// All admin routes require a valid Bearer JWT + ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.use('/files',      filesRouter);
router.use('/users',      usersRouter);
router.use('/stats',      statsRouter);
router.use('/audit-logs', auditRouter);

export default router;
