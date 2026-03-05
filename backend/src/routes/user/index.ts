import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import filesRouter   from './files.routes';
import profileRouter from './profile.routes';

const router = Router();

// All user routes require a valid Bearer JWT
router.use(authenticate);

router.use('/files',   filesRouter);
router.use('/profile', profileRouter);

export default router;
