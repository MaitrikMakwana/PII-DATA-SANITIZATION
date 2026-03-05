import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma }       from '../config/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { auditService } from '../services/audit.service';
import { emailService } from '../services/email.service';
import { AuthRequest }  from '../types';

const router = Router();

// ─── Schemas ─────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ─── POST /api/auth/login ─────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions,
    );

    await auditService.log({
      userId:    user.id,
      action:    'LOGIN',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      token,
      user: {
        id:       user.id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  await auditService.log({
    userId:    req.user?.userId,
    action:    'LOGOUT',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  res.json({ message: 'Logged out successfully' });
});

// ─── GET /api/auth/me ─────────────────────────────────────

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond the same to prevent email enumeration
    if (user) {
      const resetToken = jwt.sign(
        { userId: user.id, type: 'reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' } as jwt.SignOptions,
      );
      const resetLink = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      await emailService.sendPasswordReset(user.email, user.name, resetLink);
    }

    res.json({ message: 'If that email exists, a password reset link has been sent.' });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = z.object({
      token:    z.string(),
      password: z.string().min(8),
    }).parse(req.body);

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; type: string };

    if (payload.type !== 'reset') {
      res.status(400).json({ error: 'Invalid reset token' });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: payload.userId }, data: { password: hashed } });

    res.json({ message: 'Password reset successfully' });
  } catch {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

export default router;
