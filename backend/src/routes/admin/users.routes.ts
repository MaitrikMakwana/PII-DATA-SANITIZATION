import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma }       from '../../config/prisma';
import { auditService } from '../../services/audit.service';
import { emailService } from '../../services/email.service';
import { AuthRequest }  from '../../types';

const router = Router();

// ─── Schemas ─────────────────────────────────────────────

const createSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  role:     z.enum(['ADMIN', 'USER']).default('USER'),
  password: z.string().min(8).optional(),
});

const updateSchema = z.object({
  name:  z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role:  z.enum(['ADMIN', 'USER']).optional(),
});

// ─── GET /api/admin/users ─────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1', limit = '20', search, role, isActive,
    } = req.query as Record<string, string>;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role)     where.role     = role.toUpperCase();
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take:    parseInt(limit, 10),
        orderBy: { createdAt: 'desc' },
        select:  { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── POST /api/admin/users ────────────────────────────────

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }

    // Auto-generate a secure temp password if not provided
    const tempPassword = data.password
      ?? `Pill@${Math.random().toString(36).slice(-6).toUpperCase()}1`;

    const hashed = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        name:     data.name,
        email:    data.email,
        role:     data.role,
        password: hashed,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    // Send welcome email (non-blocking — may fail if email service not configured)
    try {
      await emailService.sendWelcome(user.email, user.name, tempPassword);
    } catch (emailErr) {
      console.warn('[CreateUser] Welcome email not sent:', (emailErr as Error).message);
    }

    await auditService.log({
      userId:    req.user!.userId,
      action:    'CREATE_USER',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata:  { createdUserId: user.id, email: user.email, role: user.role },
    });

    res.status(201).json(user);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ─── GET /api/admin/users/:id ─────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.params.id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── PUT /api/admin/users/:id ────────────────────────────

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = updateSchema.parse(req.body);

    // Guard: cannot demote last admin
    if (data.role === 'USER') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      const target     = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (adminCount <= 1 && target?.role === 'ADMIN') {
        res.status(400).json({ error: 'Cannot demote the only active admin' });
        return;
      }
    }

    const user = await prisma.user.update({
      where:  { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    await auditService.log({
      userId:    req.user!.userId,
      action:    'UPDATE_USER',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata:  { updatedUserId: req.params.id, changes: data },
    });

    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ─── PATCH /api/admin/users/:id/toggle-status ────────────

router.patch('/:id/toggle-status', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: 'User not found' }); return; }

    // Guard: cannot deactivate last admin
    if (existing.isActive && existing.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Cannot deactivate the only active admin' });
        return;
      }
    }

    const user = await prisma.user.update({
      where:  { id: req.params.id },
      data:   { isActive: !existing.isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    await auditService.log({
      userId:    req.user!.userId,
      action:    user.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata:  { affectedUserId: req.params.id },
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// ─── PATCH /api/admin/users/:id/reset-password ───────────

router.patch('/:id/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const tempPassword = `Pill@${Math.random().toString(36).slice(-6).toUpperCase()}1`;
    const hashed       = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    try {
      await emailService.sendWelcome(user.email, user.name, tempPassword);
    } catch (emailErr) {
      console.warn('[ResetPassword] Email not sent:', (emailErr as Error).message);
    }

    await auditService.log({
      userId:    req.user!.userId,
      action:    'RESET_USER_PASSWORD',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata:  { affectedUserId: user.id },
    });

    res.json({ message: 'Password reset. New credentials sent via email.', tempPassword });
  } catch {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ─── DELETE /api/admin/users/:id ─────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    await prisma.user.delete({ where: { id: req.params.id } });

    await auditService.log({
      userId:    req.user!.userId,
      action:    'DELETE_USER',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata:  { deletedUserId: req.params.id },
    });

    res.json({ message: 'User deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
